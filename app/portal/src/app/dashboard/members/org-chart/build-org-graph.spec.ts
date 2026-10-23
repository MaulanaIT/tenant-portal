import type { MemberDto } from "@/lib/members-types";
import { alice, bob, carol, member } from "@/test-utils/members";
import { matchesMember, type MemberFilters } from "../member-filters";
import { EMPTY_GROUP } from "../members-copy";
import {
  CARD_H,
  CARD_W,
  COL_GAP,
  GROUP_BORDER,
  GROUP_Y,
  HEAD,
  ORG_W,
  PAD,
  TENANT_NODE_ID,
  buildOrgGraph,
  groupColumns,
  groupNodeId,
  type MemberNode,
  type OrgGraphInput,
  type OrgNode,
  type RoleGroupNode,
} from "./build-org-graph";

const NO_FILTERS: MemberFilters = { q: "", role: "all" };

function build(overrides: Partial<OrgGraphInput> = {}) {
  return buildOrgGraph({
    tenant: { name: "Acme Corporation" },
    members: [alice, bob],
    collapsed: { ADMIN: false, MEMBER: false },
    filters: NO_FILTERS,
    selectedId: null,
    ...overrides,
  });
}

function byId(nodes: OrgNode[], id: string): OrgNode {
  const node = nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error(`missing node ${id}`);
  }
  return node;
}

function group(nodes: OrgNode[], role: "ADMIN" | "MEMBER"): RoleGroupNode {
  return byId(nodes, groupNodeId(role)) as RoleGroupNode;
}

function cards(nodes: OrgNode[]): MemberNode[] {
  return nodes.filter((node): node is MemberNode => node.type === "member");
}

function people(count: number, role: "ADMIN" | "MEMBER" = "MEMBER"): MemberDto[] {
  const prefix = role === "ADMIN" ? "a" : "0";
  return Array.from({ length: count }, (_, index) =>
    member({
      userId: `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      name: `Person ${String(index).padStart(2, "0")}`,
      email: `person${index}@example.com`,
      role,
    }),
  );
}

describe("structure", () => {
  it("orders tenant, Admins, admin cards, Members, member cards", () => {
    const { nodes } = build();
    expect(nodes.map((node) => node.id)).toEqual([
      TENANT_NODE_ID,
      "group-admin",
      alice.userId,
      "group-member",
      bob.userId,
    ]);
  });

  it("puts every parent before its children", () => {
    const { nodes } = build({ members: [...people(5), ...people(3, "ADMIN")] });
    nodes.forEach((node, index) => {
      if (node.parentId) {
        expect(nodes.findIndex((item) => item.id === node.parentId)).toBeLessThan(index);
        expect(node.extent).toBe("parent");
      }
    });
  });

  it("has exactly two smoothstep edges from the tenant to the groups", () => {
    const { edges } = build({ members: [alice, bob, carol] });
    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => [edge.source, edge.target])).toEqual([
      [TENANT_NODE_ID, "group-admin"],
      [TENANT_NODE_ID, "group-member"],
    ]);
    for (const edge of edges) {
      expect(edge.type).toBe("smoothstep");
      expect(edge.focusable).toBe(false);
      expect(edge).toMatchObject({ pathOptions: { borderRadius: 12 } });
    }
  });

  it("returns only the tenant node for an empty member list", () => {
    const { nodes, edges } = build({ members: [] });
    expect(nodes.map((node) => node.id)).toEqual([TENANT_NODE_ID]);
    expect(edges).toEqual([]);
  });

  it("sorts cards by name then userId and is independent of input order", () => {
    const twinA = member({ userId: "aaaaaaaa-0000-4000-8000-000000000001", name: "Sam Same" });
    const twinB = member({ userId: "bbbbbbbb-0000-4000-8000-000000000002", name: "sam same" });
    const forward = build({ members: [alice, carol, twinB, bob, twinA] });
    const backward = build({ members: [twinA, bob, twinB, carol, alice] });
    expect(forward).toEqual(backward);
    expect(cards(forward.nodes).map((node) => node.data.member.name)).toEqual([
      "Alice Anderson",
      "Bob Brown",
      "Carol Clark",
      "Sam Same",
      "sam same",
    ]);
  });

  it("is deterministic", () => {
    expect(build({ members: [alice, bob, carol] })).toEqual(build({ members: [alice, bob, carol] }));
  });
});

describe("layout", () => {
  it.each([
    [0, 1],
    [1, 1],
    [2, 2],
    [4, 2],
    [5, 3],
    [9, 3],
    [10, 4],
    [64, 8],
    [65, 8],
    [100, 8],
  ])("uses %i → %i columns", (n, cols) => {
    expect(groupColumns(n)).toBe(cols);
  });

  it("places groups at y 144, 64px apart, with the tenant centred above", () => {
    const { nodes } = build();
    const admins = group(nodes, "ADMIN");
    const membersGroup = group(nodes, "MEMBER");
    expect(GROUP_Y).toBe(144);
    expect(COL_GAP).toBe(64);
    expect(admins.position).toEqual({ x: 0, y: 144 });
    expect(admins.width).toBe(288);
    expect(admins.height).toBe(164);
    expect(membersGroup.position).toEqual({ x: 288 + 64, y: 144 });
    const tenant = byId(nodes, TENANT_NODE_ID);
    const total = 288 + 64 + 288;
    expect(tenant.position).toEqual({ x: (total - ORG_W) / 2, y: 0 });
    expect(tenant.width).toBe(280);
    expect(tenant.height).toBe(80);
  });

  it("offsets cards by the design grid inside the group border", () => {
    const { nodes } = build({ members: people(5) });
    const grid = cards(nodes);
    expect(GROUP_BORDER).toBe(1);
    grid.forEach((node, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      expect(node.position).toEqual({
        x: GROUP_BORDER + 24 + col * 256,
        y: GROUP_BORDER + 68 + row * 88,
      });
      expect(node.width).toBe(CARD_W);
      expect(node.height).toBe(CARD_H);
      expect(node.parentId).toBe("group-member");
    });
    const membersGroup = group(nodes, "MEMBER");
    expect(membersGroup.width).toBe(2 * PAD + 3 * CARD_W + 2 * 16);
    expect(membersGroup.height).toBe(HEAD + 2 * PAD + 2 * CARD_H + 16);
  });

  it("collapses a group to its 44px header without children", () => {
    const { nodes } = build({ collapsed: { ADMIN: false, MEMBER: true } });
    const membersGroup = group(nodes, "MEMBER");
    expect(membersGroup.height).toBe(44);
    expect(membersGroup.data.collapsed).toBe(true);
    expect(nodes.some((node) => node.parentId === "group-member")).toBe(false);
    expect(nodes.some((node) => node.id === bob.userId)).toBe(false);
    expect(membersGroup.ariaLabel).toBe("Members, 1 person, collapsed");
  });

  it("gives an empty group a 112px body", () => {
    const { nodes } = build({ members: [alice] });
    expect(group(nodes, "MEMBER").height).toBe(112);
  });
});

describe("only you", () => {
  it("shows an empty Members group with no member children", () => {
    const { nodes } = build({ members: [alice] });
    const membersGroup = group(nodes, "MEMBER");
    expect(membersGroup.data.empty).toBe(true);
    expect(membersGroup.data.count).toBe(0);
    expect(nodes.filter((node) => node.parentId === "group-member")).toEqual([]);
    expect(EMPTY_GROUP).toBe("No one has this role.");
    expect(membersGroup.ariaLabel).toBe("Members, 0 people");
  });
});

describe("matching and dimming", () => {
  const everyone = [alice, bob, carol];

  it("does not dim anything without filters", () => {
    const { nodes } = build({ members: everyone });
    for (const node of cards(nodes)) {
      expect(node.data).toMatchObject({ filtering: false, match: true, dim: false });
    }
    expect(group(nodes, "ADMIN").data.dim).toBe(false);
    expect(group(nodes, "MEMBER").data.dim).toBe(false);
  });

  it("matches case-insensitively", () => {
    const { nodes } = build({ members: everyone, filters: { q: "BOB", role: "all" } });
    expect((byId(nodes, bob.userId) as MemberNode).data).toMatchObject({ match: true, dim: false });
    expect((byId(nodes, carol.userId) as MemberNode).data).toMatchObject({
      match: false,
      dim: true,
    });
    expect(group(nodes, "ADMIN").data.dim).toBe(true);
    expect(group(nodes, "MEMBER").data.dim).toBe(false);
  });

  it("treats regex metacharacters literally", () => {
    const { nodes } = build({ members: everyone, filters: { q: ".*", role: "all" } });
    expect(cards(nodes).every((node) => node.data.dim && !node.data.match)).toBe(true);
    const tricky = member({ name: "Dot.Star (a+b)*" });
    const hit = build({ members: [alice, tricky], filters: { q: "(a+b)*", role: "all" } });
    expect((byId(hit.nodes, tricky.userId) as MemberNode).data.match).toBe(true);
  });

  it.each([
    { q: "", role: "ADMIN" },
    { q: "", role: "MEMBER" },
    { q: "example", role: "MEMBER" },
    { q: "zed", role: "all" },
    { q: "a", role: "all" },
  ] as MemberFilters[])("dims by role and counts like the List for %p", (filters) => {
    const { nodes } = build({ members: everyone, filters });
    const shown = cards(nodes);
    expect(shown.filter((node) => node.data.match)).toHaveLength(
      everyone.filter((m) => matchesMember(m, filters)).length,
    );
    for (const node of shown) {
      expect(node.data.dim).toBe(!matchesMember(node.data.member, filters));
      expect(node.className).toBeUndefined();
      expect(node.style).toBeUndefined();
    }
  });

  it("dims the group that has no match", () => {
    const { nodes } = build({ members: everyone, filters: { q: "", role: "ADMIN" } });
    expect(group(nodes, "MEMBER").data.dim).toBe(true);
    expect(group(nodes, "ADMIN").data.dim).toBe(false);
  });
});

describe("selection and actions", () => {
  it("marks only the selected card", () => {
    const { nodes } = build({ members: [alice, bob, carol], selectedId: bob.userId });
    for (const node of cards(nodes)) {
      const selected = node.id === bob.userId;
      expect(node.data.selected).toBe(selected);
      expect(node.domAttributes?.["aria-current"]).toBe(selected ? "true" : undefined);
    }
  });

  it("never yields an action when canChangeRole is false", () => {
    const readOnly = [alice, bob, carol].map((m) => ({ ...m, canChangeRole: false }));
    const { nodes } = build({ members: readOnly });
    expect(cards(nodes).every((node) => node.data.canChangeRole === false)).toBe(true);
  });

  it("copies canChangeRole from the API and never recomputes it", () => {
    const { nodes } = build({ members: [alice, bob] });
    expect((byId(nodes, alice.userId) as MemberNode).data.canChangeRole).toBe(false);
    expect((byId(nodes, bob.userId) as MemberNode).data.canChangeRole).toBe(true);
  });

  it("removes the default node role description", () => {
    const { nodes } = build();
    for (const node of nodes) {
      expect(node.domAttributes).toHaveProperty("aria-roledescription", undefined);
    }
  });
});

describe("aria labels", () => {
  it("use the design copy", () => {
    const { nodes } = build({ filters: { q: "", role: "ADMIN" } });
    expect(byId(nodes, TENANT_NODE_ID).ariaLabel).toBe("Acme Corporation, 2 people");
    expect(group(nodes, "ADMIN").ariaLabel).toBe("Admins, 1 person");
    expect(group(nodes, "MEMBER").ariaLabel).toBe("Members, 1 person");
    expect(byId(nodes, alice.userId).ariaLabel).toBe(
      "Alice Anderson (you), alice@example.com, Admin, Active",
    );
    expect(byId(nodes, bob.userId).ariaLabel).toBe(
      "Bob Brown, bob@example.com, Member, Active, not matching",
    );
  });

  it("names invited and suspended statuses", () => {
    const invited = member({ ...bob, status: "INVITED" });
    const suspended = member({ ...carol, status: "SUSPENDED" });
    const { nodes } = build({ members: [alice, invited, suspended] });
    expect(byId(nodes, bob.userId).ariaLabel).toBe("Bob Brown, bob@example.com, Member, Invited");
    expect(byId(nodes, carol.userId).ariaLabel).toBe(
      "Carol Clark, carol@example.com, Member, Suspended",
    );
  });
});
