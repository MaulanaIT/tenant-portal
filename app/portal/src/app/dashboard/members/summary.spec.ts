import { alice, bob, carol, member, response } from "@/test-utils/members";
import { buildSummary, counted } from "./summary";

describe("counted", () => {
  it("uses singular for one and plural otherwise", () => {
    expect(counted(1, "person", "people")).toBe("1 person");
    expect(counted(2, "person", "people")).toBe("2 people");
    expect(counted(0, "admin", "admins")).toBe("0 admins");
    expect(counted(1200, "admin", "admins")).toBe("1,200 admins");
  });
});

describe("buildSummary", () => {
  it("summarises the seed's Acme tenant for its admin", () => {
    expect(buildSummary(response([alice, bob]))).toBe(
      "2 people · 1 admin · You are an Admin",
    );
  });

  it("pluralises admins", () => {
    const admin = member({ ...carol, role: "ADMIN" });
    expect(buildSummary(response([alice, admin, bob]))).toBe(
      "3 people · 2 admins · You are an Admin",
    );
  });

  it("uses the singular person", () => {
    expect(buildSummary(response([alice]))).toBe("1 person · 1 admin · You are an Admin");
  });

  it("omits zero counts", () => {
    const self = member({ ...bob, isSelf: true });
    expect(
      buildSummary(response([self], { userId: bob.userId, role: "MEMBER", canManageRoles: false })),
    ).toBe("1 person · You are a Member · Only admins can change roles");
  });

  it("adds invited and suspended counts", () => {
    const invited = member({ ...bob, status: "INVITED" });
    const suspended = member({ ...carol, status: "SUSPENDED" });
    expect(buildSummary(response([alice, invited, suspended]))).toBe(
      "3 people · 1 admin · 1 invited · 1 suspended · You are an Admin",
    );
  });

  it("adds the read-only suffix only when the viewer cannot manage roles", () => {
    const readOnly = buildSummary(
      response([alice, bob], { userId: bob.userId, role: "MEMBER", canManageRoles: false }),
    );
    expect(readOnly).toBe("2 people · 1 admin · You are a Member · Only admins can change roles");
    expect(buildSummary(response([alice, bob]))).not.toContain("Only admins");
  });

  it("joins parts with a middle dot", () => {
    expect(buildSummary(response([alice, bob])).split(" · ")).toHaveLength(3);
  });
});
