import type { MemberDto, Role } from "@/lib/members-types";

export type RoleFilter = "all" | Role;

export type SortKey = "name" | "email" | "role" | "joined";

type SortDirection = "asc" | "desc";

export type MemberSort = `${SortKey}.${SortDirection}`;

export type MemberFilters = { q: string; role: RoleFilter };

export const ROLE_FILTERS = ["all", "ADMIN", "MEMBER"] as const satisfies readonly RoleFilter[];

export const SORT_KEYS = ["name", "email", "role", "joined"] as const satisfies readonly SortKey[];

export const MEMBER_SORTS = SORT_KEYS.flatMap((key) => [
  `${key}.asc` as const,
  `${key}.desc` as const,
]) satisfies MemberSort[];

export const DEFAULT_SORT: MemberSort = "name.asc";

export const CLEAR_FILTERS_PATCH = { q: null, role: null } as const;

const collator = new Intl.Collator("en-US", { sensitivity: "base" });

const ROLE_ORDER: Record<Role, number> = { ADMIN: 0, MEMBER: 1 };

export function isFiltering({ q, role }: MemberFilters): boolean {
  return q.trim() !== "" || role !== "all";
}

export function matchesMember(member: MemberDto, { q, role }: MemberFilters): boolean {
  if (role !== "all" && member.role !== role) {
    return false;
  }
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return (
    member.name.toLowerCase().includes(needle) ||
    member.email.toLowerCase().includes(needle)
  );
}

export function parseSort(sort: MemberSort): { key: SortKey; direction: SortDirection } {
  const [key, direction] = sort.split(".") as [SortKey, SortDirection];
  return { key, direction };
}

export function nextSort(current: MemberSort, key: SortKey): MemberSort {
  const active = parseSort(current);
  if (active.key === key) {
    return `${key}.${active.direction === "asc" ? "desc" : "asc"}`;
  }
  return `${key}.asc`;
}

function comparePrimary(key: SortKey, a: MemberDto, b: MemberDto): number {
  switch (key) {
    case "email":
      return collator.compare(a.email, b.email);
    case "role":
      return ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
    case "joined":
      return a.joinedAt < b.joinedAt ? -1 : a.joinedAt > b.joinedAt ? 1 : 0;
    default:
      return collator.compare(a.name, b.name);
  }
}

export function compareMembers(sort: MemberSort) {
  const { key, direction } = parseSort(sort);
  const sign = direction === "asc" ? 1 : -1;
  return (a: MemberDto, b: MemberDto): number => {
    const primary = comparePrimary(key, a, b) * sign;
    if (primary !== 0) {
      return primary;
    }
    const byName = key === "name" ? 0 : collator.compare(a.name, b.name);
    if (byName !== 0) {
      return byName;
    }
    return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0;
  };
}
