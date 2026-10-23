import "server-only";
import { redirect } from "next/navigation";
import { apiFetch } from "./api";
import { HttpError, readErrorCode } from "./http-error";
import { toMembersResponse, type MembersResponse } from "./members-types";
import { getSessionToken } from "./session";

export async function getMembers(tenantId: string): Promise<MembersResponse> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const response = await apiFetch(
    `/tenants/${encodeURIComponent(tenantId)}/members`,
    { token, cache: "no-store" },
  );
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    throw new HttpError(response.status, await readErrorCode(response));
  }
  return toMembersResponse(await response.json());
}
