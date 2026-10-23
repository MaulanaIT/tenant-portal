import { expect, test } from "@playwright/test";
import { apiSession } from "./api";
import {
  expectNoRoleAction,
  isRoleAction,
  login,
  openMembers,
  roleTrigger,
  row,
  searchBox,
  toasts,
  trackRoleActions,
} from "./helpers";
import { reseed } from "./seed";

test.afterEach(() => {
  reseed();
});

test("promote then demote Bob with the confirm dialog and toasts", async ({ page }) => {
  await login(page, "alice");
  await openMembers(page);
  const actions = trackRoleActions(page);
  const trigger = roleTrigger(page, "Bob Brown");
  await expect(trigger).toHaveText("Member");

  await trigger.click();
  await expect(page.getByRole("option", { name: /^Admin/ })).toContainText(
    "Can change other members' roles",
  );
  await expect(page.getByRole("option", { name: /^Member/ })).toContainText(
    "Can view members, read-only",
  );
  await page.getByRole("option", { name: /^Member/ }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expectNoRoleAction(page, actions);
  await expect(toasts(page)).toHaveCount(0);

  await trigger.click();
  await page.getByRole("option", { name: /^Admin/ }).click();
  const toast = toasts(page);
  await expect(toast).toHaveCount(1);
  await expect(toast).toHaveAttribute("data-type", "success");
  await expect(toast).toContainText("Bob Brown is now an Admin");
  await expect(toast).toContainText("bob@example.com · Acme Corporation");
  await expect(trigger).toHaveText("Admin");
  await expect(trigger).toHaveAttribute("aria-busy", "false");
  await expect(row(page, "Bob Brown")).toHaveAttribute("data-selected", "true");
  await expect(page.getByText("2 people · 2 admins · You are an Admin")).toBeVisible();
  expect(actions).toHaveLength(1);

  await trigger.click();
  await page.getByRole("option", { name: /^Member/ }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveText("Remove admin access for Bob Brown?");
  await expect(dialog).toContainText("bob@example.com");
  await expect(dialog).toContainText("Loses:");
  await expect(dialog).toContainText("changing members' roles");
  await expect(dialog).toContainText("access to Acme Corporation and the member list");
  await expect(dialog.getByRole("button", { name: "Keep as Admin" })).toBeFocused();
  await expect(page.locator('button[aria-label="Change role for Bob Brown"]')).toHaveText("Admin");
  expect(actions).toHaveLength(1);

  await dialog.getByRole("button", { name: "Remove admin access" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toHaveText("Member");
  await expect(toast).toHaveCount(1);
  await expect(toast).toContainText("Bob Brown is now a Member");
  await expect(toast).toContainText("bob@example.com · Acme Corporation");
  await expect(toast).not.toHaveAttribute("data-type", "success");
  await expect(trigger).toBeFocused();
  await expect(page.getByText("2 people · 1 admin · You are an Admin")).toBeVisible();
  expect(actions).toHaveLength(2);

  await page.reload();
  await expect(roleTrigger(page, "Bob Brown")).toHaveText("Member");
});

test("a promotion persists across reloads", async ({ page }) => {
  await login(page, "alice");
  await openMembers(page);
  await roleTrigger(page, "Bob Brown").click();
  await page.getByRole("option", { name: /^Admin/ }).click();
  await expect(toasts(page)).toContainText("Bob Brown is now an Admin");
  await page.reload();
  await expect(roleTrigger(page, "Bob Brown")).toHaveText("Admin");
  await openMembers(page, "?view=chart");
  await expect(
    page.locator('.react-flow__node-member[aria-label="Bob Brown, bob@example.com, Admin, Active"]'),
  ).toBeVisible();
});

test("cancelling the demote dialog with Escape, the backdrop or Keep as Admin changes nothing", async ({
  page,
}) => {
  const alice = await apiSession("alice");
  const bob = await apiSession("bob");
  await alice.setRole(alice.tenantId("acme"), bob.userId, "ADMIN");

  await login(page, "alice");
  await openMembers(page);
  const actions = trackRoleActions(page);
  const trigger = roleTrigger(page, "Bob Brown");
  await expect(trigger).toHaveText("Admin");

  await trigger.click();
  await page.getByRole("option", { name: /^Member/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole("option", { name: /^Member/ }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /^Admin/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: /^Member/ })).toBeFocused();
  await page.keyboard.press(" ");
  const dialog = page.getByRole("alertdialog");
  const keep = dialog.getByRole("button", { name: "Keep as Admin" });
  await expect(keep).toBeFocused();
  await expect(dialog).toBeVisible();
  await keep.evaluate((element: HTMLElement) => element.click());
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await expect(trigger).toHaveText("Admin");
  await expectNoRoleAction(page, actions);
  await expect(toasts(page)).toHaveCount(0);
  await page.reload();
  await expect(roleTrigger(page, "Bob Brown")).toHaveText("Admin");
  expect(actions).toHaveLength(0);
});

test("promoting a member hidden by the role filter moves focus to the search box", async ({ page }) => {
  await login(page, "alice");
  await openMembers(page, "?role=MEMBER");
  const trigger = roleTrigger(page, "Bob Brown");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /^Member/ })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("option", { name: /^Admin/ })).toBeFocused();
  await page.keyboard.press("Enter");

  await expect(toasts(page)).toContainText("Bob Brown is now an Admin");
  await expect(row(page, "Bob Brown")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "No members match" })).toBeVisible();
  await expect(searchBox(page)).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).toBe("INPUT");
});

test("a failed change rolls back with an error toast", async ({ page }) => {
  await login(page, "alice");
  await openMembers(page);

  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/dashboard/members**", async (route) => {
    const request = route.request();
    if (isRoleAction(request.method(), request.url(), await request.allHeaders())) {
      await held;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  const trigger = roleTrigger(page, "Bob Brown");
  await trigger.click();
  await page.getByRole("option", { name: /^Admin/ }).click();
  await expect(trigger).toHaveText("Admin");
  await expect(trigger).toHaveAttribute("aria-busy", "true");
  await expect(trigger).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("main [aria-live]").filter({ hasText: "Saving role…" })).toHaveCount(1);
  await trigger.click({ force: true });
  await expect(page.getByRole("listbox")).toHaveCount(0);

  release();
  const toast = toasts(page);
  await expect(toast).toHaveCount(1);
  await expect(toast).toHaveAttribute("data-type", "error");
  await expect(toast).toContainText("Can't reach the server. Please try again.");
  await expect(toast).toContainText("Bob Brown is still a Member.");
  await expect(trigger).toHaveText("Member");
  await expect(trigger).toHaveAttribute("aria-busy", "false");

  await page.unroute("**/dashboard/members**");
  await page.reload();
  await expect(roleTrigger(page, "Bob Brown")).toHaveText("Member");
});

test("a stale admin gets NOT_TENANT_ADMIN and loses the controls", async ({ page }) => {
  const alice = await apiSession("alice");
  const bob = await apiSession("bob");
  const acme = alice.tenantId("acme");
  await alice.setRole(acme, bob.userId, "ADMIN");

  await login(page, "bob");
  await openMembers(page, "?tenant=acme");
  const trigger = roleTrigger(page, "Alice Anderson");
  await expect(trigger).toHaveText("Admin");

  await alice.setRole(acme, bob.userId, "MEMBER");

  await trigger.click();
  await page.getByRole("option", { name: /^Member/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove admin access" }).click();

  const toast = toasts(page);
  await expect(toast).toHaveAttribute("data-type", "error");
  await expect(toast).toContainText("You no longer have permission to change roles.");
  await expect(toast).not.toContainText("is still");
  await expect(page.getByRole("combobox", { name: /^Change role for/ })).toHaveCount(0);
  await expect(
    page.getByText("2 people · 1 admin · You are a Member · Only admins can change roles"),
  ).toBeVisible();
  await expect(row(page, "Alice Anderson")).toContainText("Admin");
});

test("keyboard: change and confirm roles without a mouse", async ({ page }) => {
  await login(page, "alice");
  await openMembers(page);

  const search = page.getByRole("searchbox", { name: "Search members by name or email" });
  for (let i = 0; i < 20 && !(await search.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(search).toBeFocused();
  await page.keyboard.type("bob");
  await expect(page.getByRole("search").locator("p[aria-live]")).toHaveText("Showing 1 of 2");

  await page.keyboard.press("Tab");
  const roleFilter = page.getByRole("combobox", { name: /Role:/ });
  await expect(roleFilter).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(roleFilter).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  const list = page.getByRole("radio", { name: "List" });
  await expect(list).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/view=chart/);
  await expect(page.getByRole("radio", { name: "Chart" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page).not.toHaveURL(/view=chart/);
  await expect(list).toBeFocused();

  await search.focus();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("search").locator("p[aria-live]")).toHaveText("Showing 2 of 2");

  const bobRow = row(page, "Bob Brown");
  await bobRow.focus();
  await page.keyboard.press("Enter");
  await expect(bobRow).toHaveAttribute("data-selected", "true");
  await expect(bobRow).toContainText(", selected");

  const trigger = roleTrigger(page, "Bob Brown");
  await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /^Member/ })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("option", { name: /^Admin/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(toasts(page)).toContainText("Bob Brown is now an Admin");
  await expect(trigger).toHaveText("Admin");
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /^Admin/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: /^Member/ })).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog");
  const keep = dialog.getByRole("button", { name: "Keep as Admin" });
  const remove = dialog.getByRole("button", { name: "Remove admin access" });
  await expect(keep).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(remove).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keep).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(remove).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText("Admin");

  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: /^Admin/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: /^Member/ })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(keep).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(toasts(page)).toContainText("Bob Brown is now a Member");
  await expect(trigger).toHaveText("Member");
  await expect(trigger).toBeFocused();
});
