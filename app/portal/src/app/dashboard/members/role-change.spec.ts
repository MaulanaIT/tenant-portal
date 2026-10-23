import type { RoleChangeErrorCode } from "@/lib/members-types";
import {
  ALICE_ID,
  BOB_ID,
  CAROL_ID,
  TENANT_A,
  TENANT_B,
  alice,
  bob,
  carol,
  member,
  response,
} from "@/test-utils/members";
import {
  RoleChangeError,
  applyMember,
  applyRoleChange,
  canStartRoleChange,
  findMember,
  invalidatesImmediately,
  isRoleChange,
  roleChangeErrorCode,
  roleChangeErrorDescription,
  roleChangeMessage,
  roleChangedDescription,
  roleChangedTitle,
  roleToastId,
  toRoleChangeError,
} from "./role-change";

const MESSAGES: [RoleChangeErrorCode, string][] = [
  ["SELF_DEMOTION_FORBIDDEN", "You can't remove your own admin access."],
  ["LAST_ADMIN_REQUIRED", "An organization needs at least one admin."],
  ["NOT_TENANT_ADMIN", "You no longer have permission to change roles."],
  ["MEMBER_NOT_FOUND", "This person is no longer a member."],
  ["TENANT_NOT_FOUND", "You no longer have access to this organization."],
  ["ROLE_CHANGE_CONFLICT", "Someone else changed roles at the same time. Please try again."],
  ["API_UNAVAILABLE", "Can't reach the server. Please try again."],
];

const FALLBACK = "Couldn't update the role. Please try again.";

describe("roleChangeMessage", () => {
  it.each(MESSAGES)("maps %s", (code, message) => {
    expect(roleChangeMessage(code)).toBe(message);
  });

  it.each([
    "VALIDATION_FAILED",
    "UPSTREAM_ERROR",
    "UPSTREAM_SHAPE",
    "UNAUTHENTICATED",
  ] as const)("falls back for %s", (code) => {
    expect(roleChangeMessage(code)).toBe(FALLBACK);
  });

  it("falls back for an unknown error", () => {
    expect(roleChangeMessage(null)).toBe(FALLBACK);
    expect(roleChangeMessage(roleChangeErrorCode(new Error("boom")))).toBe(FALLBACK);
  });
});

describe("toRoleChangeError", () => {
  it("keeps code and status", () => {
    const error = toRoleChangeError({ ok: false, status: 409, code: "SELF_DEMOTION_FORBIDDEN" });
    expect(error).toBeInstanceOf(RoleChangeError);
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe("SELF_DEMOTION_FORBIDDEN");
    expect(error.status).toBe(409);
    expect(roleChangeErrorCode(error)).toBe("SELF_DEMOTION_FORBIDDEN");
  });

  it("reads no code from other errors", () => {
    expect(roleChangeErrorCode(new Error("SELF_DEMOTION_FORBIDDEN"))).toBeNull();
    expect(roleChangeErrorCode("NOT_TENANT_ADMIN")).toBeNull();
  });
});

describe("error toast mapping", () => {
  it.each(["SELF_DEMOTION_FORBIDDEN", "LAST_ADMIN_REQUIRED", "API_UNAVAILABLE"] as const)(
    "%s describes the rolled-back role",
    (code) => {
      expect(roleChangeErrorDescription(code, "Bob Brown", "MEMBER")).toBe(
        "Bob Brown is still a Member.",
      );
      expect(roleChangeErrorDescription(code, "Bob Brown", "ADMIN")).toBe(
        "Bob Brown is still an Admin.",
      );
      expect(invalidatesImmediately(code)).toBe(false);
    },
  );

  it("describes the rolled-back role for an unknown code", () => {
    expect(roleChangeErrorDescription(null, "Bob Brown", "MEMBER")).toBe(
      "Bob Brown is still a Member.",
    );
    expect(roleChangeErrorDescription("UPSTREAM_ERROR", "Bob Brown", "ADMIN")).toBe(
      "Bob Brown is still an Admin.",
    );
    expect(roleChangeMessage("UPSTREAM_ERROR")).toBe(FALLBACK);
  });

  it.each([
    "NOT_TENANT_ADMIN",
    "MEMBER_NOT_FOUND",
    "TENANT_NOT_FOUND",
    "ROLE_CHANGE_CONFLICT",
  ] as const)("%s has no description and invalidates now", (code) => {
    expect(roleChangeErrorDescription(code, "Bob Brown", "MEMBER")).toBeUndefined();
    expect(invalidatesImmediately(code)).toBe(true);
  });

  it("UNAUTHENTICATED yields no toast description and no immediate invalidate", () => {
    expect(roleChangeErrorDescription("UNAUTHENTICATED", "Bob Brown", "MEMBER")).toBeUndefined();
    expect(invalidatesImmediately("UNAUTHENTICATED")).toBe(false);
    expect(invalidatesImmediately(null)).toBe(false);
  });
});

describe("success toast copy", () => {
  it("titles promote and demote", () => {
    expect(roleChangedTitle("Bob Brown", "ADMIN")).toBe("Bob Brown is now an Admin");
    expect(roleChangedTitle("Bob Brown", "MEMBER")).toBe("Bob Brown is now a Member");
  });

  it("describes email and tenant", () => {
    expect(roleChangedDescription("bob@example.com", "Acme Corporation")).toBe(
      "bob@example.com · Acme Corporation",
    );
  });
});

describe("roleToastId", () => {
  it("differs for two people in one tenant", () => {
    expect(roleToastId(TENANT_A, BOB_ID)).not.toBe(roleToastId(TENANT_A, CAROL_ID));
  });

  it("differs for the same person in two tenants", () => {
    expect(roleToastId(TENANT_A, BOB_ID)).not.toBe(roleToastId(TENANT_B, BOB_ID));
  });

  it("is stable for the same tenant and person", () => {
    expect(roleToastId(TENANT_A, BOB_ID)).toBe(roleToastId(TENANT_A, BOB_ID));
    expect(roleToastId(TENANT_A, BOB_ID)).toBe(`role-${TENANT_A}-${BOB_ID}`);
  });
});

describe("isRoleChange", () => {
  it("is false for the same role", () => {
    expect(isRoleChange("ADMIN", "ADMIN")).toBe(false);
    expect(isRoleChange("MEMBER", "MEMBER")).toBe(false);
  });

  it("is true for a different role", () => {
    expect(isRoleChange("MEMBER", "ADMIN")).toBe(true);
    expect(isRoleChange("ADMIN", "MEMBER")).toBe(true);
  });
});

describe("canStartRoleChange", () => {
  it("blocks a member whose change is pending", () => {
    expect(canStartRoleChange([BOB_ID], BOB_ID)).toBe(false);
    expect(canStartRoleChange([CAROL_ID, BOB_ID], BOB_ID)).toBe(false);
  });

  it("allows a different member", () => {
    expect(canStartRoleChange([BOB_ID], CAROL_ID)).toBe(true);
    expect(canStartRoleChange([], BOB_ID)).toBe(true);
  });
});

describe("applyRoleChange", () => {
  const data = response([alice, bob, carol]);

  it("is immutable", () => {
    const snapshot = structuredClone(data);
    const next = applyRoleChange(data, BOB_ID, "ADMIN");
    expect(data).toEqual(snapshot);
    expect(next).not.toBe(data);
    expect(next.members).not.toBe(data.members);
    expect(next.members[1]).not.toBe(data.members[1]);
    expect(next.members[0]).toBe(data.members[0]);
    expect(next.members[2]).toBe(data.members[2]);
  });

  it("returns the same reference for an unknown id", () => {
    expect(applyRoleChange(data, "99999999-9999-4999-8999-999999999999", "ADMIN")).toBe(data);
  });

  it("copies isSelf, canChangeRole and the viewer unchanged", () => {
    const next = applyRoleChange(data, BOB_ID, "ADMIN");
    expect(next.viewer).toBe(data.viewer);
    expect(next.members[1]).toEqual({ ...bob, role: "ADMIN" });
    const self = applyRoleChange(data, ALICE_ID, "MEMBER");
    expect(self.members[0]).toEqual({ ...alice, role: "MEMBER" });
    expect(self.members[0].isSelf).toBe(true);
    expect(self.members[0].canChangeRole).toBe(false);
    expect(self.viewer).toEqual(data.viewer);
  });

  it("rolls back one member without touching another pending change", () => {
    const afterA = applyRoleChange(data, BOB_ID, "ADMIN");
    const afterB = applyRoleChange(afterA, CAROL_ID, "ADMIN");
    const rolledBackA = applyRoleChange(afterB, BOB_ID, "MEMBER");
    expect(findMember(rolledBackA, BOB_ID)?.role).toBe("MEMBER");
    expect(findMember(rolledBackA, CAROL_ID)?.role).toBe("ADMIN");
    expect(findMember(rolledBackA, ALICE_ID)).toBe(alice);
  });
});

describe("applyMember", () => {
  const data = response([alice, bob, carol]);

  it("replaces exactly one member with the server copy", () => {
    const server = member({ ...bob, role: "ADMIN", status: "SUSPENDED" });
    const next = applyMember(data, server);
    expect(next.members).toHaveLength(3);
    expect(next.members[1]).toBe(server);
    expect(next.members[0]).toBe(alice);
    expect(next.members[2]).toBe(carol);
    expect(next.viewer).toBe(data.viewer);
    expect(data.members[1]).toBe(bob);
  });

  it("returns the same reference for an unknown member", () => {
    expect(
      applyMember(data, member({ userId: "99999999-9999-4999-8999-999999999999" })),
    ).toBe(data);
  });
});

describe("findMember", () => {
  it("finds by id and tolerates missing data", () => {
    expect(findMember(response([alice, bob]), BOB_ID)).toBe(bob);
    expect(findMember(undefined, BOB_ID)).toBeUndefined();
  });
});
