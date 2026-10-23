import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { readErrorCode } from "@/lib/http-error";
import { isId, toMembersResponse } from "@/lib/members-types";
import { getSessionToken } from "@/lib/session";

const RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
};

const FORWARDED_CODES = new Set(["TENANT_NOT_FOUND", "NOT_TENANT_ADMIN"]);

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: RESPONSE_HEADERS });
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/bff/tenants/[tenantId]/members">,
) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") {
    return json({ code: "FORBIDDEN" }, 403);
  }

  const token = await getSessionToken();
  if (!token) {
    return json({ code: "UNAUTHENTICATED" }, 401);
  }

  const { tenantId } = await ctx.params;
  if (!isId(tenantId)) {
    return json({ code: "TENANT_NOT_FOUND" }, 404);
  }

  let upstream: Response;
  try {
    upstream = await apiFetch(
      `/tenants/${encodeURIComponent(tenantId)}/members`,
      { token, cache: "no-store" },
    );
  } catch {
    return json({ code: "API_UNAVAILABLE" }, 503);
  }

  if (upstream.status === 401) {
    return json({ code: "UNAUTHENTICATED" }, 401);
  }
  if (upstream.status === 403 || upstream.status === 404) {
    const code = await readErrorCode(upstream);
    return json(
      { code: code && FORWARDED_CODES.has(code) ? code : "UPSTREAM_ERROR" },
      upstream.status,
    );
  }
  if (!upstream.ok) {
    return json({ code: "UPSTREAM_ERROR" }, 502);
  }

  try {
    return json(toMembersResponse(await upstream.json()), 200);
  } catch {
    return json({ code: "UPSTREAM_SHAPE" }, 502);
  }
}
