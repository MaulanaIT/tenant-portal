import { queryOptions } from "@tanstack/react-query";
import { HttpError, readErrorCode } from "@/lib/http-error";
import { toMembersResponse, type MembersResponse } from "@/lib/members-types";
import { handleUnauthenticated } from "@/lib/query/handle-unauthenticated";

export const memberKeys = {
  all: (tenantId: string) => ["tenants", tenantId, "members"] as const,
};

export function membersQueryOptions(
  tenantId: string,
  queryFn: () => Promise<MembersResponse>,
) {
  return queryOptions({
    queryKey: memberKeys.all(tenantId),
    queryFn,
  });
}

export async function fetchMembers(tenantId: string): Promise<MembersResponse> {
  const response = await fetch(
    `/bff/tenants/${encodeURIComponent(tenantId)}/members`,
    { cache: "no-store" },
  );
  if (response.status === 401) {
    void handleUnauthenticated();
    throw new HttpError(401, "UNAUTHENTICATED");
  }
  if (!response.ok) {
    throw new HttpError(response.status, await readErrorCode(response));
  }
  try {
    return toMembersResponse(await response.json());
  } catch {
    throw new HttpError(502, "UPSTREAM_SHAPE");
  }
}
