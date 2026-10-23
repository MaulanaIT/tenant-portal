import type { MemberStatus, Role } from "@/lib/members-types";
import type { MemberFilters } from "./member-filters";
import { counted } from "./summary";

export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", MEMBER: "Member" };

export const STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
};

const PAGE_TITLE = "Members";

export const LOADING_SUMMARY = "Loading members…";

export const NO_ACCESS_COPY = {
  title: "You're not a member of this organization",
  body: "Choose one of your organizations from the menu at the top of the page.",
} as const;

export const NO_TENANTS_COPY = {
  title: "You're not a member of any organization yet.",
} as const;

export const EMPTY_COPY = { title: "No members yet" } as const;

export const LOAD_ERROR_TITLE = "Couldn't load members";

export const PAGE_ERROR_COPY = {
  title: "Couldn't load members",
  body: "Something went wrong while loading this page. Please try again.",
} as const;

export const TRY_AGAIN = "Try again";

export const CLEAR_FILTERS = "Clear filters";

export const NO_RESULTS_TITLE = "No members match";

export function pageTitle(tenantName: string | null): string {
  return tenantName ? `${tenantName} · ${PAGE_TITLE}` : PAGE_TITLE;
}

export function tableCaption(tenantName: string): string {
  return `Members of ${tenantName}`;
}

export function onlyYouCopy(tenantName: string) {
  return {
    title: `You're the only member of ${tenantName}`,
    body: "People who join this organization will appear here.",
  };
}

export function noResultsBody({ q, role }: MemberFilters): string {
  const needle = q.trim();
  if (needle) {
    const withRole = role === "all" ? "" : ` with role ${ROLE_LABEL[role]}`;
    return `Nothing matches “${needle}”${withRole}.`;
  }
  return role === "all" ? "" : `No one has the ${ROLE_LABEL[role]} role.`;
}

export function loadErrorBody(code: string): string {
  return code === "API_UNAVAILABLE" || code === "NETWORK"
    ? "Check your connection and try again."
    : "Something went wrong while loading members. Please try again.";
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  ADMIN: "Can change other members' roles",
  MEMBER: "Can view members, read-only",
};

export const SELF_ROLE_REASON = "You can't change your own role";

export const SAVING_ROLE = "Saving role…";

export function changeRoleLabel(name: string): string {
  return `Change role for ${name}`;
}

export function demoteDialogCopy(name: string, tenantName: string) {
  return {
    title: `Remove admin access for ${name}?`,
    losesTerm: "Loses:",
    loses: "changing members' roles",
    keepsTerm: "Keeps:",
    keeps: `access to ${tenantName} and the member list`,
    cancel: "Keep as Admin",
    confirm: "Remove admin access",
  };
}

export const GROUP_TITLE: Record<Role, string> = { ADMIN: "Admins", MEMBER: "Members" };

export const EMPTY_GROUP = "No one has this role.";

export const RESET_VIEW = "Reset view";

export const CHART_HELP =
  "Use Tab to move between people. For a sortable table, switch to List view.";

export const LOADING_CHART = "Loading chart…";

export const ROLE_MENU_LABEL = "Role";

export const ZOOM_LABELS = {
  toolbar: "Zoom",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  fitView: "Fit view",
} as const;

export function peopleCount(n: number): string {
  return counted(n, "person", "people");
}

export function groupTitle(role: Role, n: number): string {
  return `${GROUP_TITLE[role]} (${n})`;
}

export function groupToggleLabel(role: Role, collapsed: boolean): string {
  return `${collapsed ? "Expand" : "Collapse"} ${GROUP_TITLE[role]}`;
}

export function chartLabel(tenantName: string, admins: number, members: number): string {
  return `Org chart of ${tenantName}: ${counted(admins, "admin", "admins")}, ${counted(members, "member", "members")}. Drag to pan.`;
}
