import { member } from "@/test-utils/members";
import {
  CLEAR_FILTERS_PATCH,
  MEMBER_SORTS,
  SORT_KEYS,
  compareMembers,
  isFiltering,
  matchesMember,
  nextSort,
  parseSort,
} from "./member-filters";

const bob = member({ name: "Bob Brown", email: "bob@example.com", role: "MEMBER" });
const alice = member({
  userId: "11111111-1111-4111-8111-111111111111",
  name: "Alice Anderson",
  email: "alice@example.com",
  role: "ADMIN",
});
const tricky = member({
  userId: "44444444-4444-4444-8444-444444444444",
  name: "Dot.Star (a+b)*",
  email: "dot.star@example.com",
});

describe("isFiltering", () => {
  it("is false for an empty or blank query and role all", () => {
    expect(isFiltering({ q: "", role: "all" })).toBe(false);
    expect(isFiltering({ q: "   ", role: "all" })).toBe(false);
  });

  it("is true for a query or a role", () => {
    expect(isFiltering({ q: "bob", role: "all" })).toBe(true);
    expect(isFiltering({ q: "", role: "ADMIN" })).toBe(true);
  });
});

describe("matchesMember", () => {
  it("matches name or email case-insensitively", () => {
    expect(matchesMember(bob, { q: "BOB", role: "all" })).toBe(true);
    expect(matchesMember(bob, { q: "Example.COM", role: "all" })).toBe(true);
    expect(matchesMember(bob, { q: "  brown ", role: "all" })).toBe(true);
    expect(matchesMember(bob, { q: "alice", role: "all" })).toBe(false);
  });

  it("filters by role", () => {
    expect(matchesMember(alice, { q: "", role: "ADMIN" })).toBe(true);
    expect(matchesMember(bob, { q: "", role: "ADMIN" })).toBe(false);
    expect(matchesMember(bob, { q: "", role: "MEMBER" })).toBe(true);
  });

  it("requires both query and role to match", () => {
    expect(matchesMember(bob, { q: "bob", role: "MEMBER" })).toBe(true);
    expect(matchesMember(bob, { q: "bob", role: "ADMIN" })).toBe(false);
    expect(matchesMember(alice, { q: "bob", role: "ADMIN" })).toBe(false);
  });

  it("treats regex metacharacters literally", () => {
    expect(matchesMember(tricky, { q: "(a+b)*", role: "all" })).toBe(true);
    expect(matchesMember(tricky, { q: "d.t", role: "all" })).toBe(false);
    expect(matchesMember(bob, { q: ".*", role: "all" })).toBe(false);
    expect(matchesMember(bob, { q: "[b]", role: "all" })).toBe(false);
  });
});

describe("parseSort and nextSort", () => {
  it("parses key and direction", () => {
    expect(parseSort("joined.desc")).toEqual({ key: "joined", direction: "desc" });
  });

  it("toggles the active key and starts a new key ascending", () => {
    expect(nextSort("name.asc", "name")).toBe("name.desc");
    expect(nextSort("name.desc", "name")).toBe("name.asc");
    expect(nextSort("name.desc", "email")).toBe("email.asc");
  });

  it("lists every key in both directions", () => {
    expect(MEMBER_SORTS).toHaveLength(SORT_KEYS.length * 2);
  });
});

describe("compareMembers", () => {
  const twinA = member({
    userId: "aaaaaaaa-0000-4000-8000-000000000001",
    name: "Sam Same",
    email: "same@example.com",
    role: "MEMBER",
    joinedAt: "2026-10-20T00:00:00.000Z",
  });
  const twinB = member({
    userId: "bbbbbbbb-0000-4000-8000-000000000002",
    name: "sam same",
    email: "SAME@example.com",
    role: "MEMBER",
    joinedAt: "2026-10-20T00:00:00.000Z",
  });
  const zed = member({
    userId: "cccccccc-0000-4000-8000-000000000003",
    name: "Zed Zane",
    email: "same@example.com",
    role: "MEMBER",
    joinedAt: "2026-10-20T00:00:00.000Z",
  });

  it.each(MEMBER_SORTS)("breaks ties by name then userId for %s", (sort) => {
    const sorted = [zed, twinB, twinA].sort(compareMembers(sort)).map((m) => m.userId);
    const reversed = [twinA, twinB, zed].sort(compareMembers(sort)).map((m) => m.userId);
    expect(sorted).toEqual(reversed);
    expect(sorted.indexOf(twinA.userId)).toBeLessThan(sorted.indexOf(twinB.userId));
  });

  it("orders name, email, role and joined", () => {
    const early = member({
      userId: "dddddddd-0000-4000-8000-000000000004",
      name: "Carol Clark",
      email: "z@example.com",
      role: "ADMIN",
      joinedAt: "2026-01-01T00:00:00.000Z",
    });
    const list = [bob, early, alice];
    expect([...list].sort(compareMembers("name.asc")).map((m) => m.name)).toEqual([
      "Alice Anderson",
      "Bob Brown",
      "Carol Clark",
    ]);
    expect([...list].sort(compareMembers("name.desc")).map((m) => m.name)).toEqual([
      "Carol Clark",
      "Bob Brown",
      "Alice Anderson",
    ]);
    expect([...list].sort(compareMembers("email.asc")).map((m) => m.email)).toEqual([
      "alice@example.com",
      "bob@example.com",
      "z@example.com",
    ]);
    expect([...list].sort(compareMembers("role.asc")).map((m) => m.name)).toEqual([
      "Alice Anderson",
      "Carol Clark",
      "Bob Brown",
    ]);
    expect([...list].sort(compareMembers("role.desc")).map((m) => m.name)).toEqual([
      "Bob Brown",
      "Alice Anderson",
      "Carol Clark",
    ]);
    expect([...list].sort(compareMembers("joined.asc"))[0].name).toBe("Carol Clark");
    expect([...list].sort(compareMembers("joined.desc"))[2].name).toBe("Carol Clark");
  });
});

describe("CLEAR_FILTERS_PATCH", () => {
  it("clears exactly q and role, keeping sort, view and tenant", () => {
    expect(Object.keys(CLEAR_FILTERS_PATCH).sort()).toEqual(["q", "role"]);
    expect(CLEAR_FILTERS_PATCH).toEqual({ q: null, role: null });
  });
});
