import type { BuiltInEdge, Node } from "@xyflow/react";
import { ROLES, type MemberDto, type Role } from "@/lib/members-types";
import {
  compareMembers,
  isFiltering,
  matchesMember,
  type MemberFilters,
} from "../member-filters";
import {
  GROUP_TITLE,
  ROLE_LABEL,
  STATUS_LABEL,
  peopleCount,
} from "../members-copy";

export const CARD_W = 240;
export const CARD_H = 72;
const GAP = 16;
export const PAD = 24;
export const HEAD = 44;
export const ORG_W = 280;
const ORG_H = 80;
export const GROUP_Y = 144;
export const COL_GAP = 64;
const MAX_COLS = 8;
const EMPTY_BODY = 68;
const EDGE_RADIUS = 12;
export const GROUP_BORDER = 1;

export const TENANT_NODE_ID = "tenant";

type TenantNodeData = { name: string; count: number };

type RoleGroupNodeData = {
  role: Role;
  count: number;
  collapsed: boolean;
  dim: boolean;
  empty: boolean;
};

type MemberNodeData = {
  member: MemberDto;
  filtering: boolean;
  match: boolean;
  dim: boolean;
  selected: boolean;
  canChangeRole: boolean;
};

export type TenantNode = Node<TenantNodeData, "tenant">;
export type RoleGroupNode = Node<RoleGroupNodeData, "roleGroup">;
export type MemberNode = Node<MemberNodeData, "member">;
export type OrgNode = TenantNode | RoleGroupNode | MemberNode;

export type OrgGraphInput = {
  tenant: { name: string };
  members: readonly MemberDto[];
  collapsed: Record<Role, boolean>;
  filters: MemberFilters;
  selectedId: string | null;
};

type OrgGraph = { nodes: OrgNode[]; edges: BuiltInEdge[] };

const byName = compareMembers("name.asc");

const NODE_DOM = { "aria-roledescription": undefined } as const;

export function groupNodeId(role: Role): string {
  return `group-${role.toLowerCase()}`;
}

export function groupColumns(n: number): number {
  return Math.min(MAX_COLS, Math.max(1, Math.ceil(Math.sqrt(Math.max(n, 1)))));
}

function groupSize(n: number, collapsed: boolean): { width: number; height: number } {
  const cols = groupColumns(n);
  const rows = Math.ceil(n / cols);
  const width = 2 * PAD + cols * CARD_W + (cols - 1) * GAP;
  if (collapsed) {
    return { width, height: HEAD };
  }
  if (n === 0) {
    return { width, height: HEAD + EMPTY_BODY };
  }
  return { width, height: HEAD + 2 * PAD + rows * CARD_H + (rows - 1) * GAP };
}

function cardPosition(index: number, cols: number): { x: number; y: number } {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return {
    x: GROUP_BORDER + PAD + col * (CARD_W + GAP),
    y: GROUP_BORDER + HEAD + PAD + row * (CARD_H + GAP),
  };
}

function tenantAriaLabel(name: string, count: number): string {
  return `${name}, ${peopleCount(count)}`;
}

function groupAriaLabel(role: Role, count: number, collapsed: boolean): string {
  return `${GROUP_TITLE[role]}, ${peopleCount(count)}${collapsed ? ", collapsed" : ""}`;
}

function memberAriaLabel(member: MemberDto, dim: boolean): string {
  const name = member.isSelf ? `${member.name} (you)` : member.name;
  return `${name}, ${member.email}, ${ROLE_LABEL[member.role]}, ${STATUS_LABEL[member.status]}${dim ? ", not matching" : ""}`;
}

export function buildOrgGraph({
  tenant,
  members,
  collapsed,
  filters,
  selectedId,
}: OrgGraphInput): OrgGraph {
  const tenantNode = (x: number): TenantNode => ({
    id: TENANT_NODE_ID,
    type: "tenant",
    position: { x, y: 0 },
    width: ORG_W,
    height: ORG_H,
    data: { name: tenant.name, count: members.length },
    ariaLabel: tenantAriaLabel(tenant.name, members.length),
    domAttributes: NODE_DOM,
  });

  if (members.length === 0) {
    return { nodes: [tenantNode(0)], edges: [] };
  }

  const filtering = isFiltering(filters);
  const nodes: OrgNode[] = [];
  const edges: BuiltInEdge[] = [];
  let x = 0;
  let totalWidth = 0;

  for (const role of ROLES) {
    const group = members.filter((member) => member.role === role).sort(byName);
    const isCollapsed = collapsed[role];
    const cols = groupColumns(group.length);
    const size = groupSize(group.length, isCollapsed);
    const matches = group.map((member) => matchesMember(member, filters));
    const id = groupNodeId(role);

    nodes.push({
      id,
      type: "roleGroup",
      position: { x, y: GROUP_Y },
      width: size.width,
      height: size.height,
      data: {
        role,
        count: group.length,
        collapsed: isCollapsed,
        dim: filtering && !matches.includes(true),
        empty: group.length === 0,
      },
      ariaLabel: groupAriaLabel(role, group.length, isCollapsed),
      domAttributes: NODE_DOM,
    });

    if (!isCollapsed) {
      group.forEach((member, index) => {
        const match = matches[index];
        const dim = filtering && !match;
        const selected = member.userId === selectedId;
        nodes.push({
          id: member.userId,
          type: "member",
          parentId: id,
          extent: "parent",
          position: cardPosition(index, cols),
          width: CARD_W,
          height: CARD_H,
          data: {
            member,
            filtering,
            match,
            dim,
            selected,
            canChangeRole: member.canChangeRole,
          },
          ariaLabel: memberAriaLabel(member, dim),
          domAttributes: {
            ...NODE_DOM,
            "aria-current": selected ? "true" : undefined,
          },
        });
      });
    }

    edges.push({
      id: `edge-${id}`,
      source: TENANT_NODE_ID,
      target: id,
      type: "smoothstep",
      pathOptions: { borderRadius: EDGE_RADIUS, offset: 0 },
      focusable: false,
      selectable: false,
      deletable: false,
    });

    totalWidth = x + size.width;
    x += size.width + COL_GAP;
  }

  totalWidth = Math.max(totalWidth, ORG_W);
  nodes.unshift(tenantNode((totalWidth - ORG_W) / 2));

  return { nodes, edges };
}
