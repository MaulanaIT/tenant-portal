import type { MemberStatus } from "@/lib/members-types";

export const STATUS_DOT: Record<MemberStatus, string> = {
  ACTIVE: "bg-status-active",
  INVITED: "bg-status-invited",
  SUSPENDED: "bg-status-suspended",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
