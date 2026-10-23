import { HttpError } from "@/lib/http-error";
import type { MembersResponse } from "@/lib/members-types";

type MembersViewState =
  | "loading"
  | "no-access"
  | "error"
  | "empty"
  | "only-you"
  | "no-results"
  | "ready";

export type MembersViewStateInput = {
  status: "pending" | "error" | "success";
  error: unknown;
  data: MembersResponse | undefined;
  filteredCount: number;
  filtersActive: boolean;
};

export function loadErrorCode(error: unknown): string {
  if (error instanceof HttpError) {
    return error.code ?? `HTTP_${error.status}`;
  }
  return "NETWORK";
}

export function deriveMembersViewState({
  status,
  error,
  data,
  filteredCount,
  filtersActive,
}: MembersViewStateInput): MembersViewState {
  if (status === "pending") {
    return "loading";
  }
  if (status === "error" || !data) {
    return loadErrorCode(error) === "TENANT_NOT_FOUND" ? "no-access" : "error";
  }
  if (data.members.length === 0) {
    return "empty";
  }
  if (!data.members.some((member) => !member.isSelf)) {
    return "only-you";
  }
  if (filtersActive && filteredCount === 0) {
    return "no-results";
  }
  return "ready";
}

export function showsToolbar(state: MembersViewState): boolean {
  return state !== "loading" && state !== "no-access" && state !== "error";
}
