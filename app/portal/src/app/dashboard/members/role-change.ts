import type {
  MemberDto,
  MembersResponse,
  Role,
  RoleChangeErrorCode,
  UpdateMemberRoleResult,
} from "@/lib/members-types";

type RoleChangeFailure = Extract<UpdateMemberRoleResult, { ok: false }>;

export class RoleChangeError extends Error {
  readonly code: RoleChangeErrorCode;
  readonly status: number;

  constructor(code: RoleChangeErrorCode, status: number) {
    super(code);
    this.name = "RoleChangeError";
    this.code = code;
    this.status = status;
  }
}

export function toRoleChangeError(result: RoleChangeFailure): RoleChangeError {
  return new RoleChangeError(result.code, result.status);
}

export function roleChangeErrorCode(error: unknown): RoleChangeErrorCode | null {
  return error instanceof RoleChangeError ? error.code : null;
}

const MESSAGES: Partial<Record<RoleChangeErrorCode, string>> = {
  SELF_DEMOTION_FORBIDDEN: "You can't remove your own admin access.",
  LAST_ADMIN_REQUIRED: "An organization needs at least one admin.",
  NOT_TENANT_ADMIN: "You no longer have permission to change roles.",
  MEMBER_NOT_FOUND: "This person is no longer a member.",
  TENANT_NOT_FOUND: "You no longer have access to this organization.",
  ROLE_CHANGE_CONFLICT: "Someone else changed roles at the same time. Please try again.",
  API_UNAVAILABLE: "Can't reach the server. Please try again.",
};

const DEFAULT_MESSAGE = "Couldn't update the role. Please try again.";

export function roleChangeMessage(code: RoleChangeErrorCode | null): string {
  return (code && MESSAGES[code]) ?? DEFAULT_MESSAGE;
}

const INVALIDATING_CODES: ReadonlySet<RoleChangeErrorCode> = new Set<RoleChangeErrorCode>([
  "NOT_TENANT_ADMIN",
  "MEMBER_NOT_FOUND",
  "TENANT_NOT_FOUND",
  "ROLE_CHANGE_CONFLICT",
]);

export function invalidatesImmediately(code: RoleChangeErrorCode | null): boolean {
  return code !== null && INVALIDATING_CODES.has(code);
}

function roleWithArticle(role: Role): string {
  return role === "ADMIN" ? "an Admin" : "a Member";
}

export function roleChangedTitle(name: string, role: Role): string {
  return `${name} is now ${roleWithArticle(role)}`;
}

export function roleChangedDescription(email: string, tenantName: string): string {
  return `${email} · ${tenantName}`;
}

export function roleChangeErrorDescription(
  code: RoleChangeErrorCode | null,
  name: string,
  previousRole: Role,
): string | undefined {
  if (code === "UNAUTHENTICATED" || invalidatesImmediately(code)) {
    return undefined;
  }
  return `${name} is still ${roleWithArticle(previousRole)}.`;
}

export function roleToastId(tenantId: string, userId: string): string {
  return `role-${tenantId}-${userId}`;
}

export function isRoleChange(current: Role, next: Role): boolean {
  return current !== next;
}

export function canStartRoleChange(
  pendingUserIds: readonly string[],
  userId: string,
): boolean {
  return !pendingUserIds.includes(userId);
}

export function applyRoleChange(
  data: MembersResponse,
  userId: string,
  role: Role,
): MembersResponse {
  const index = data.members.findIndex((member) => member.userId === userId);
  if (index === -1) {
    return data;
  }
  const members = data.members.slice();
  members[index] = { ...members[index], role };
  return { ...data, members };
}

export function applyMember(data: MembersResponse, member: MemberDto): MembersResponse {
  const index = data.members.findIndex((item) => item.userId === member.userId);
  if (index === -1) {
    return data;
  }
  const members = data.members.slice();
  members[index] = member;
  return { ...data, members };
}

export function findMember(
  data: MembersResponse | undefined,
  userId: string,
): MemberDto | undefined {
  return data?.members.find((member) => member.userId === userId);
}
