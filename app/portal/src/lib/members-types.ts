export type Role = "ADMIN" | "MEMBER";

export type TenantRole = Role;

export type MemberStatus = "ACTIVE" | "INVITED" | "SUSPENDED";

export type MemberDto = {
  userId: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  joinedAt: string;
  isSelf: boolean;
  canChangeRole: boolean;
};

export type MembersResponse = {
  viewer: { userId: string; role: Role; canManageRoles: boolean };
  members: MemberDto[];
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
};

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  tenants: Tenant[];
};

export type RoleChangeErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "API_UNAVAILABLE"
  | "UPSTREAM_SHAPE"
  | "UPSTREAM_ERROR"
  | "NOT_TENANT_ADMIN"
  | "TENANT_NOT_FOUND"
  | "MEMBER_NOT_FOUND"
  | "SELF_DEMOTION_FORBIDDEN"
  | "LAST_ADMIN_REQUIRED"
  | "ROLE_CHANGE_CONFLICT";

export type UpdateMemberRoleInput = {
  tenantId: string;
  userId: string;
  role: Role;
};

export type UpdateMemberRoleResult =
  | { ok: true; member: MemberDto }
  | { ok: false; status: number; code: RoleChangeErrorCode };

export const ROLES = ["ADMIN", "MEMBER"] as const satisfies readonly Role[];

const MEMBER_STATUSES = [
  "ACTIVE",
  "INVITED",
  "SUSPENDED",
] as const satisfies readonly MemberStatus[];

const ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isId(value: unknown): value is string {
  return typeof value === "string" && ID_RE.test(value);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isMemberStatus(value: unknown): value is MemberStatus {
  return (
    typeof value === "string" &&
    (MEMBER_STATUSES as readonly string[]).includes(value)
  );
}

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`Invalid ${what}`);
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string") {
    throw new TypeError(`Invalid field: ${key}`);
  }
  return value;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new TypeError(`Invalid field: ${key}`);
  }
  return value;
}

function readRole(record: Record<string, unknown>, key: string): Role {
  const value = record[key];
  if (!isRole(value)) {
    throw new TypeError(`Invalid field: ${key}`);
  }
  return value;
}

export function toMemberDto(json: unknown): MemberDto {
  const record = asRecord(json, "member");
  const status = record.status;
  if (!isMemberStatus(status)) {
    throw new TypeError("Invalid field: status");
  }
  return {
    userId: readString(record, "userId"),
    name: readString(record, "name"),
    email: readString(record, "email"),
    role: readRole(record, "role"),
    status,
    joinedAt: readString(record, "joinedAt"),
    isSelf: readBoolean(record, "isSelf"),
    canChangeRole: readBoolean(record, "canChangeRole"),
  };
}

export function toMembersResponse(json: unknown): MembersResponse {
  const record = asRecord(json, "members response");
  const viewer = asRecord(record.viewer, "viewer");
  if (!Array.isArray(record.members)) {
    throw new TypeError("Invalid field: members");
  }
  return {
    viewer: {
      userId: readString(viewer, "userId"),
      role: readRole(viewer, "role"),
      canManageRoles: readBoolean(viewer, "canManageRoles"),
    },
    members: record.members.map(toMemberDto),
  };
}
