import { expect, type Page } from "@playwright/test";

export const PASSWORD = "123456";

export async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/dashboard/),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
}

export async function openMembers(page: Page, query = "") {
  await page.goto(`/dashboard/members${query}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export function membersTable(page: Page) {
  return page.getByRole("table");
}

export function row(page: Page, name: string) {
  return membersTable(page).getByRole("row").filter({ hasText: name });
}

export function roleTrigger(page: Page, name: string) {
  return page.getByRole("combobox", { name: `Change role for ${name}` });
}

export function toasts(page: Page) {
  return page.locator("[data-sonner-toast]");
}

export function counter(page: Page) {
  return page.getByRole("search").locator("p[aria-live]");
}

export function card(page: Page, name: string) {
  return page.locator(`.react-flow__node-member[aria-label^="${name}"]`);
}

export async function openChart(page: Page, query = "") {
  await openMembers(page, `?view=chart${query ? `&${query}` : ""}`);
  await expect(page.locator(".react-flow__node-tenant")).toBeVisible();
}

export function isMembersRequest(url: string) {
  return /\/bff\/tenants\/[^/]+\/members/.test(url);
}

export function isRoleAction(method: string, url: string, headers: Record<string, string>) {
  return method === "POST" && url.includes("/dashboard/members") && "next-action" in headers;
}

export function trackRoleActions(page: Page) {
  const actions: string[] = [];
  page.on("request", (request) => {
    if (isRoleAction(request.method(), request.url(), request.headers())) {
      actions.push(request.url());
    }
  });
  return actions;
}

export async function expectNoRoleAction(page: Page, actions: readonly string[]) {
  await page.waitForTimeout(300);
  expect(actions).toHaveLength(0);
}

export function searchBox(page: Page) {
  return page.getByRole("searchbox", { name: "Search members by name or email" });
}
