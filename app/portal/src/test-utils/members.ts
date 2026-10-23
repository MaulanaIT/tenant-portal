import type { MemberDto, MembersResponse, Role } from "@/lib/members-types";

export const TENANT_A = "0b6d6a4e-1f3c-4c1e-9d6a-2a7f0c3b5e10";
export const TENANT_B = "7f2c9e1a-5b4d-4f8e-a3c2-9d1e6b7a8c20";

export const ALICE_ID = "11111111-1111-4111-8111-111111111111";
export const BOB_ID = "22222222-2222-4222-8222-222222222222";
export const CAROL_ID = "33333333-3333-4333-8333-333333333333";

export function member(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    userId: BOB_ID,
    name: "Bob Brown",
    email: "bob@example.com",
    role: "MEMBER",
    status: "ACTIVE",
    joinedAt: "2026-10-20T08:00:00.000Z",
    isSelf: false,
    canChangeRole: true,
    ...overrides,
  };
}

export const alice = member({
  userId: ALICE_ID,
  name: "Alice Anderson",
  email: "alice@example.com",
  role: "ADMIN",
  isSelf: true,
  canChangeRole: false,
});

export const bob = member();

export const carol = member({
  userId: CAROL_ID,
  name: "Carol Clark",
  email: "carol@example.com",
});

export function response(
  members: MemberDto[],
  viewer: { userId?: string; role?: Role; canManageRoles?: boolean } = {},
): MembersResponse {
  return {
    viewer: {
      userId: viewer.userId ?? ALICE_ID,
      role: viewer.role ?? "ADMIN",
      canManageRoles: viewer.canManageRoles ?? true,
    },
    members,
  };
}
