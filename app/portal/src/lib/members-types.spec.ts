import { alice, bob } from "@/test-utils/members";
import { isId, isMemberStatus, isRole, toMemberDto, toMembersResponse } from "./members-types";

const upstreamMember = {
  ...bob,
  passwordHash: "$2b$10$abcdefghijklmnopqrstuv",
  tenantId: "0b6d6a4e-1f3c-4c1e-9d6a-2a7f0c3b5e10",
};

describe("toMemberDto", () => {
  it("keeps every contract field", () => {
    expect(toMemberDto({ ...bob })).toEqual(bob);
  });

  it("strips extra fields such as passwordHash", () => {
    const dto = toMemberDto(upstreamMember);
    expect(dto).toEqual(bob);
    expect(dto).not.toHaveProperty("passwordHash");
    expect(dto).not.toHaveProperty("tenantId");
    expect(Object.keys(dto).sort()).toEqual(
      ["canChangeRole", "email", "isSelf", "joinedAt", "name", "role", "status", "userId"].sort(),
    );
  });

  it("returns a new object", () => {
    const source = { ...bob };
    expect(toMemberDto(source)).not.toBe(source);
  });

  it.each([
    ["a bad role", { role: "OWNER" }],
    ["a lowercase role", { role: "admin" }],
    ["a bad status", { status: "DELETED" }],
    ["a missing name", { name: undefined }],
    ["a numeric email", { email: 42 }],
    ["a string flag", { isSelf: "false" }],
    ["a missing canChangeRole", { canChangeRole: undefined }],
  ])("throws on %s", (_label, patch) => {
    expect(() => toMemberDto({ ...bob, ...patch })).toThrow(TypeError);
  });

  it.each([null, undefined, "member", 1, []])("throws on non-object %p", (value) => {
    expect(() => toMemberDto(value)).toThrow(TypeError);
  });
});

describe("toMembersResponse", () => {
  const upstream = {
    viewer: { userId: alice.userId, role: "ADMIN", canManageRoles: true, token: "secret" },
    members: [{ ...alice, passwordHash: "x" }, upstreamMember],
    total: 2,
  };

  it("keeps the viewer and members and strips extras", () => {
    const result = toMembersResponse(upstream);
    expect(result).toEqual({
      viewer: { userId: alice.userId, role: "ADMIN", canManageRoles: true },
      members: [alice, bob],
    });
    expect(result).not.toHaveProperty("total");
    expect(result.viewer).not.toHaveProperty("token");
    expect(result.members[1]).not.toHaveProperty("passwordHash");
  });

  it("throws when the viewer is missing", () => {
    expect(() => toMembersResponse({ members: [] })).toThrow(TypeError);
  });

  it("throws on a bad viewer role or flag", () => {
    expect(() =>
      toMembersResponse({ ...upstream, viewer: { ...upstream.viewer, role: "OWNER" } }),
    ).toThrow(TypeError);
    expect(() =>
      toMembersResponse({ ...upstream, viewer: { ...upstream.viewer, canManageRoles: 1 } }),
    ).toThrow(TypeError);
  });

  it("throws when members is not an array", () => {
    expect(() => toMembersResponse({ viewer: upstream.viewer, members: {} })).toThrow(TypeError);
  });

  it("throws when any member has a bad enum", () => {
    expect(() =>
      toMembersResponse({ ...upstream, members: [{ ...bob, status: "BANNED" }] }),
    ).toThrow(TypeError);
    expect(() =>
      toMembersResponse({ ...upstream, members: [{ ...bob, role: "SUPERADMIN" }] }),
    ).toThrow(TypeError);
  });
});

describe("guards", () => {
  it("validates ids, roles and statuses", () => {
    expect(isId(bob.userId)).toBe(true);
    expect(isId("acme")).toBe(false);
    expect(isId(`${bob.userId}x`)).toBe(false);
    expect(isRole("ADMIN")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isMemberStatus("SUSPENDED")).toBe(true);
    expect(isMemberStatus("DELETED")).toBe(false);
  });
});
