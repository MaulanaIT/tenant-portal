import type { MembersResponse } from "@/lib/members-types";

const plural = new Intl.PluralRules("en-US");
const count = new Intl.NumberFormat("en-US");

export function counted(n: number, one: string, other: string): string {
  return `${count.format(n)} ${plural.select(n) === "one" ? one : other}`;
}

export function buildSummary({ viewer, members }: MembersResponse): string {
  const admins = members.filter((m) => m.role === "ADMIN").length;
  const invited = members.filter((m) => m.status === "INVITED").length;
  const suspended = members.filter((m) => m.status === "SUSPENDED").length;

  return [
    counted(members.length, "person", "people"),
    admins > 0 ? counted(admins, "admin", "admins") : null,
    invited > 0 ? `${count.format(invited)} invited` : null,
    suspended > 0 ? `${count.format(suspended)} suspended` : null,
    viewer.role === "ADMIN" ? "You are an Admin" : "You are a Member",
    viewer.canManageRoles ? null : "Only admins can change roles",
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}
