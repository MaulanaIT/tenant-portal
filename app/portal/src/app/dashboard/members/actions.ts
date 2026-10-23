"use server";

import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api";
import { readErrorCode } from "@/lib/http-error";
import {
  isId,
  isRole,
  toMemberDto,
  type RoleChangeErrorCode,
  type UpdateMemberRoleInput,
  type UpdateMemberRoleResult,
} from "@/lib/members-types";
import { SESSION_COOKIE } from "@/lib/session";

const FORWARDED_CODES: ReadonlySet<string> = new Set<RoleChangeErrorCode>([
  "VALIDATION_FAILED",
  "NOT_TENANT_ADMIN",
  "TENANT_NOT_FOUND",
  "MEMBER_NOT_FOUND",
  "SELF_DEMOTION_FORBIDDEN",
  "LAST_ADMIN_REQUIRED",
  "ROLE_CHANGE_CONFLICT",
]);

export async function updateMemberRole(
  input: UpdateMemberRoleInput,
): Promise<UpdateMemberRoleResult> {
  const { tenantId, userId, role } = (input ?? {}) as Partial<
    Record<keyof UpdateMemberRoleInput, unknown>
  >;
  if (!isId(tenantId) || !isId(userId) || !isRole(role)) {
    return { ok: false, status: 400, code: "VALIDATION_FAILED" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    cookieStore.delete(SESSION_COOKIE);
    return { ok: false, status: 401, code: "UNAUTHENTICATED" };
  }

  let response: Response;
  try {
    response = await apiFetch(
      `/tenants/${encodeURIComponent(tenantId)}/members/${encodeURIComponent(userId)}`,
      {
        token,
        method: "PATCH",
        body: JSON.stringify({ role }),
        cache: "no-store",
      },
    );
  } catch {
    return { ok: false, status: 503, code: "API_UNAVAILABLE" };
  }

  if (response.status === 401) {
    cookieStore.delete(SESSION_COOKIE);
    return { ok: false, status: 401, code: "UNAUTHENTICATED" };
  }

  if (response.ok) {
    try {
      return { ok: true, member: toMemberDto(await response.json()) };
    } catch {
      return { ok: false, status: 502, code: "UPSTREAM_SHAPE" };
    }
  }

  const code = await readErrorCode(response);
  if (code && FORWARDED_CODES.has(code)) {
    return { ok: false, status: response.status, code: code as RoleChangeErrorCode };
  }
  return {
    ok: false,
    status: response.status >= 500 ? 502 : response.status,
    code: "UPSTREAM_ERROR",
  };
}
