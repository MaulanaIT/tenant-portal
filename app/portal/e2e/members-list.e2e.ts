import { expect, test } from "@playwright/test";
import {
  counter,
  isMembersRequest,
  login,
  membersTable,
  openMembers,
  roleTrigger,
  row,
} from "./helpers";

test.describe("members list", () => {
  test("alice sees Acme's members with every column and the summary", async ({ page }) => {
    await login(page, "alice");
    await openMembers(page);

    await expect(page).toHaveTitle("Members · Tenant Portal");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acme Corporation · Members");
    await expect(page.getByText("2 people · 1 admin · You are an Admin")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Members" })).toHaveAttribute("aria-current", "page");

    const table = membersTable(page);
    await expect(table.locator("caption")).toHaveText("Members of Acme Corporation");
    await expect(table.getByRole("columnheader")).toHaveText(["Name", "Email", "Role", "Status", "Joined"]);
    await expect(table.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
    await expect(table.getByRole("columnheader", { name: "Email" })).toHaveAttribute("aria-sort", "none");
    await expect(table.locator("tbody tr")).toHaveCount(2);

    const alice = row(page, "Alice Anderson");
    await expect(alice).toContainText("(you)");
    await expect(alice).toContainText("alice@example.com");
    await expect(alice).toContainText("Admin");
    await expect(alice).toContainText("Active");
    await expect(alice.locator("time")).toHaveText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);

    const bob = row(page, "Bob Brown");
    await expect(bob).toContainText("bob@example.com");
    await expect(roleTrigger(page, "Bob Brown")).toHaveText("Member");
    await expect(bob).toContainText("Active");

    await expect(counter(page)).toHaveText("Showing 2 of 2");

    await table.getByRole("button", { name: "Name" }).click();
    await expect(page).toHaveURL(/sort=name\.desc/);
    await expect(table.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "descending");
    await expect(table.locator("tbody tr").first()).toContainText("Bob Brown");
  });

  test("dave sees an invited member in Umbrella", async ({ page }) => {
    await login(page, "dave");
    await openMembers(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Umbrella Holdings · Members");
    await expect(page.getByText("2 people · 1 admin · 1 invited · You are an Admin")).toBeVisible();
    const heidi = row(page, "Heidi Hughes");
    await expect(heidi).toContainText("Invited");
    await expect(row(page, "Dave Davis")).toContainText("Active");
  });

  test("erin sees a suspended member in Stark", async ({ page }) => {
    await login(page, "erin");
    await openMembers(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stark Enterprises · Members");
    await expect(page.getByText("2 people · 1 admin · 1 suspended · You are an Admin")).toBeVisible();
    await expect(row(page, "Ivan Iverson")).toContainText("Suspended");
    await expect(roleTrigger(page, "Ivan Iverson")).toBeVisible();
  });

  test("bob is read-only in Acme", async ({ page }) => {
    await login(page, "bob");
    await openMembers(page, "?tenant=acme");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Acme Corporation · Members");
    await expect(
      page.getByText("2 people · 1 admin · You are a Member · Only admins can change roles"),
    ).toBeVisible();
    await expect(page.getByRole("combobox", { name: /^Change role for/ })).toHaveCount(0);
    await expect(row(page, "Alice Anderson")).toContainText("Admin");
    await expect(row(page, "Bob Brown")).toContainText("(you)");
  });

  test("frank is the only member of Wayne", async ({ page }) => {
    await login(page, "frank");
    await openMembers(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wayne Logistics · Members");
    await expect(page.getByRole("heading", { name: "You're the only member of Wayne Logistics" })).toBeVisible();
    await expect(page.getByText("People who join this organization will appear here.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toHaveCount(0);
    await expect(membersTable(page).locator("tbody tr")).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Search members by name or email" }).fill("zed");
    await expect(counter(page)).toHaveText("Showing 0 of 1");
    await expect(page.getByRole("heading", { name: "You're the only member of Wayne Logistics" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "No members match" })).toHaveCount(0);
  });

  test("carol has no access to Acme and no members request is sent", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (isMembersRequest(request.url())) {
        requests.push(request.url());
      }
    });
    await login(page, "carol");
    await openMembers(page, "?tenant=acme");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Members");
    await expect(page.getByRole("heading", { name: "You're not a member of this organization" })).toBeVisible();
    await expect(
      page.getByText("Choose one of your organizations from the menu at the top of the page."),
    ).toBeVisible();
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.getByRole("radiogroup", { name: "View" })).toBeVisible();
    await expect(page.getByLabel("Organization")).toHaveValue("");
    await expect(page.getByText("bob@example.com")).toHaveCount(0);
    await page.waitForLoadState("networkidle");
    expect(requests).toEqual([]);
  });

  test("no results offers Clear filters, which keeps sort and focuses search", async ({ page }) => {
    await login(page, "alice");
    await openMembers(page, "?q=zed&sort=email.desc");
    await expect(page.getByRole("heading", { name: "No members match" })).toBeVisible();
    await expect(page.getByText("Nothing matches “zed”.")).toBeVisible();
    await expect(membersTable(page).getByRole("columnheader")).toHaveCount(5);
    await expect(membersTable(page).locator("tbody tr")).toHaveCount(0);
    await expect(counter(page)).toHaveText("Showing 0 of 2");

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(membersTable(page).locator("tbody tr")).toHaveCount(2);
    await expect(page.getByRole("searchbox")).toBeFocused();
    await expect(page.getByRole("searchbox")).toHaveValue("");
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(page).toHaveURL(/sort=email\.desc/);

    await openMembers(page, "?role=ADMIN&q=bob");
    await expect(page.getByText("Nothing matches “bob” with role Admin.")).toBeVisible();
  });

  test("the own row is locked with an explanation", async ({ page }) => {
    await login(page, "alice");
    await openMembers(page);
    const alice = row(page, "Alice Anderson");
    await expect(roleTrigger(page, "Alice Anderson")).toHaveCount(0);
    const lock = alice.getByRole("button", { name: "Admin" });
    await expect(lock).toHaveAccessibleDescription("You can't change your own role");
    const tooltip = page.locator('[data-slot="tooltip-content"]');
    await lock.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("You can't change your own role");
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);
    await lock.focus();
    await expect(tooltip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tooltip).toHaveCount(0);
  });

  test("mobile 390px keeps the page inside the viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "alice");
    await openMembers(page);
    await expect(row(page, "Bob Brown")).toBeVisible();

    const pageScroll = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(pageScroll.scroll).toBeLessThanOrEqual(pageScroll.client);

    const header = page.locator("header");
    await expect(header.getByText("@alice")).toBeHidden();
    const navs = header.locator('nav[aria-label="Main"]');
    await expect(navs.nth(0)).toBeHidden();
    await expect(navs.nth(1)).toBeVisible();
    const signOut = header.getByRole("button", { name: "Sign out" });
    const navBox = await navs.nth(1).boundingBox();
    const signOutBox = await signOut.boundingBox();
    expect(navBox!.y).toBeGreaterThan(signOutBox!.y + signOutBox!.height - 1);

    const search = page.getByRole("searchbox");
    const searchBox = await search.boundingBox();
    expect(searchBox!.height).toBe(40);
    expect(searchBox!.width).toBeGreaterThan(390 - 2 * 16 - 2);
    expect((await signOut.boundingBox())!.height).toBe(40);
    expect((await roleTrigger(page, "Bob Brown").boundingBox())!.height).toBe(40);
    for (const item of await page.getByRole("radiogroup", { name: "View" }).getByRole("radio").all()) {
      expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    }

    const scroller = page.locator("#panel-list > div").first();
    const tableScroll = await scroller.evaluate((element) => ({
      scroll: element.scrollWidth,
      client: element.clientWidth,
    }));
    expect(tableScroll.scroll).toBeGreaterThan(tableScroll.client);
  });
});
