import { expect, test } from "@playwright/test";
import { card, counter, isMembersRequest, login, openChart, openMembers, row, toasts } from "./helpers";
import { reseed } from "./seed";

test.describe("chart view", () => {
  test("shows the tenant, one group per role and a card per member", async ({ page }) => {
    await login(page, "alice");
    await openChart(page);

    const canvas = page.getByRole("group", {
      name: "Org chart of Acme Corporation: 1 admin, 1 member. Drag to pan.",
    });
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAccessibleDescription(
      "Use Tab to move between people. For a sortable table, switch to List view.",
    );
    await expect(page.locator(".react-flow__node-tenant")).toHaveAttribute(
      "aria-label",
      "Acme Corporation, 2 people",
    );
    const groups = page.locator(".react-flow__node-roleGroup");
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0)).toHaveAttribute("aria-label", "Admins, 1 person");
    await expect(groups.nth(1)).toHaveAttribute("aria-label", "Members, 1 person");
    await expect(groups.nth(0)).toContainText("Admins (1)");
    await expect(groups.nth(1)).toContainText("Members (1)");
    await expect(page.locator(".react-flow__node-member")).toHaveCount(2);
    await expect(page.locator(".react-flow__edge")).toHaveCount(2);

    const alice = card(page, "Alice Anderson");
    await expect(alice).toHaveAttribute("aria-label", "Alice Anderson (you), alice@example.com, Admin, Active");
    const adminBox = (await groups.nth(0).boundingBox())!;
    const aliceBox = (await alice.boundingBox())!;
    expect(aliceBox.x).toBeGreaterThan(adminBox.x);
    expect(aliceBox.x + aliceBox.width).toBeLessThan(adminBox.x + adminBox.width);
    const memberBox = (await groups.nth(1).boundingBox())!;
    const bobBox = (await card(page, "Bob Brown").boundingBox())!;
    expect(bobBox.x).toBeGreaterThan(memberBox.x);
    expect(bobBox.y).toBeGreaterThan(memberBox.y);

    await expect(alice.getByRole("button", { name: /Change role/ })).toHaveCount(0);
    await expect(card(page, "Bob Brown").getByRole("button", { name: "Change role for Bob Brown" })).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Zoom" }).getByRole("button")).toHaveText(["", "", ""]);
    await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
    await expect(page.locator(".react-flow__attribution")).toBeVisible();
  });

  test("the role filter and search dim non-matching cards without fading text", async ({ page }) => {
    await login(page, "alice");
    await openChart(page);

    await page.getByRole("combobox", { name: /Role:/ }).click();
    await page.getByRole("option", { name: "Admin" }).click();
    await expect(page).toHaveURL(/role=ADMIN/);
    await expect(counter(page)).toHaveText("Showing 1 of 2");

    const bob = card(page, "Bob Brown");
    await expect(bob).toHaveAttribute("aria-label", "Bob Brown, bob@example.com, Member, Active, not matching");
    await expect(card(page, "Alice Anderson")).toHaveAttribute(
      "aria-label",
      "Alice Anderson (you), alice@example.com, Admin, Active",
    );
    const membersGroup = page.locator('.react-flow__node-roleGroup[data-id="group-member"] > div').first();
    await expect(membersGroup).toHaveAttribute("data-dim", "true");
    await expect(membersGroup).toHaveCSS("border-top-style", "dashed");

    const faded = await bob.evaluate((node) => {
      const result: string[] = [];
      for (const element of [node, ...node.querySelectorAll<HTMLElement>("*")]) {
        if (getComputedStyle(element).opacity !== "1") {
          result.push(element.className);
        }
      }
      return result;
    });
    expect(faded).toHaveLength(1);
    expect(faded[0]).toMatch(/bg-status-active/);
    expect(faded[0]).toMatch(/opacity-40/);
    await expect(bob.getByText("Bob Brown")).toHaveCSS("opacity", "1");

    await page.getByRole("searchbox").fill("ALICE");
    await expect(page).toHaveURL(/q=ALICE/);
    await expect(card(page, "Alice Anderson")).not.toHaveAttribute("aria-label", /not matching/);
    await page.getByRole("searchbox").fill("zed");
    await expect(counter(page)).toHaveText("Showing 0 of 2");
    await expect(page.locator('.react-flow__node-member[aria-label$="not matching"]')).toHaveCount(2);
  });

  test("selecting a row in the list focuses its card in the chart", async ({ page }) => {
    await login(page, "alice");
    await openMembers(page);
    await row(page, "Bob Brown").click();
    await expect(row(page, "Bob Brown")).toHaveAttribute("data-selected", "true");

    const requests: string[] = [];
    page.on("request", (request) => {
      if (isMembersRequest(request.url())) {
        requests.push(request.url());
      }
    });
    await page.getByRole("radio", { name: "Chart" }).click();
    const bob = card(page, "Bob Brown");
    await expect(bob).toBeFocused();
    await expect(bob).toHaveAttribute("aria-current", "true");
    await page.getByRole("radio", { name: "List" }).click();
    await expect(row(page, "Bob Brown")).toHaveAttribute("data-selected", "true");
    await page.getByRole("radio", { name: "Chart" }).click();
    await expect(card(page, "Bob Brown")).toBeVisible();
    expect(requests).toEqual([]);
  });

  test("collapse, expand and reset view", async ({ page }) => {
    await login(page, "alice");
    await openChart(page);
    const collapse = page.getByRole("button", { name: "Collapse Members" });
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await collapse.click();
    const expand = page.getByRole("button", { name: "Expand Members" });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expect(expand).toBeFocused();
    await expect(page.locator('.react-flow__node-roleGroup[data-id="group-member"]')).toHaveAttribute(
      "aria-label",
      "Members, 1 person, collapsed",
    );
    await expect(card(page, "Bob Brown")).toHaveCount(0);

    await card(page, "Alice Anderson").click();
    await expect(card(page, "Alice Anderson")).toHaveAttribute("aria-current", "true");
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(card(page, "Bob Brown")).toBeVisible();
    await expect(card(page, "Alice Anderson")).not.toHaveAttribute("aria-current", "true");
  });

  test("keyboard: Tab order and Enter selection on the canvas", async ({ page }) => {
    await login(page, "alice");
    await openChart(page);
    await page.getByRole("searchbox").focus();
    const expected = [
      "Role:",
      "Reset view",
      "Acme Corporation, 2 people",
      "Admins, 1 person",
      "Collapse Admins",
      "Alice Anderson (you), alice@example.com, Admin, Active",
      "Members, 1 person",
      "Collapse Members",
      "Bob Brown, bob@example.com, Member, Active",
      "Change role for Bob Brown",
      "Zoom in",
      "Zoom out",
      "Fit view",
    ];
    const seen: string[] = [];
    for (let i = 0; i < expected.length; i++) {
      await page.keyboard.press("Tab");
      seen.push(
        await page.evaluate(() => {
          const element = document.activeElement as HTMLElement;
          return (element.getAttribute("aria-label") ?? element.innerText).replace(/\s+/g, " ").trim();
        }),
      );
    }
    expect(seen.map((label, index) => label.startsWith(expected[index]))).toEqual(
      expected.map(() => true),
    );

    const bob = card(page, "Bob Brown");
    await bob.focus();
    await page.keyboard.press("Enter");
    await expect(bob).toHaveAttribute("aria-current", "true");
    await page.getByRole("radio", { name: "List" }).click();
    await expect(row(page, "Bob Brown")).toHaveAttribute("data-selected", "true");
  });

  test("the list view loads no React Flow chunk until Chart is chosen", async ({ page }) => {
    await login(page, "alice");
    const scripts: Promise<boolean>[] = [];
    page.on("response", (response) => {
      if (response.request().resourceType() === "script") {
        scripts.push(
          response
            .text()
            .then((body) => body.includes("react-flow__pane"))
            .catch(() => false),
        );
      }
    });
    await openMembers(page, "?view=list");
    await expect(row(page, "Bob Brown")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect((await Promise.all(scripts)).filter(Boolean)).toHaveLength(0);

    await page.getByRole("radio", { name: "Chart" }).click();
    await expect(page.locator(".react-flow__pane")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect((await Promise.all(scripts)).filter(Boolean).length).toBeGreaterThan(0);
  });
});

test.describe("chart role changes", () => {
  test.afterEach(() => {
    reseed();
  });

  test("the card menu promotes and demotes, moving the card between groups", async ({ page }) => {
    await login(page, "alice");
    await openChart(page);

    const menuButton = () => page.locator('.react-flow__node-member button[aria-label="Change role for Bob Brown"]');
    await menuButton().click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(menu).toContainText("Role");
    await expect(menu.getByRole("menuitemradio", { name: "Member" })).toHaveAttribute("aria-checked", "true");
    await expect(menu.getByRole("menuitemradio", { name: "Member" })).toBeFocused();
    await menu.getByRole("menuitemradio", { name: "Admin" }).click();

    await expect(toasts(page)).toContainText("Bob Brown is now an Admin");
    await expect(card(page, "Bob Brown")).toHaveAttribute("aria-label", "Bob Brown, bob@example.com, Admin, Active");
    await expect(page.locator('.react-flow__node-roleGroup[data-id="group-admin"]')).toHaveAttribute(
      "aria-label",
      "Admins, 2 people",
    );
    await expect(page.locator('.react-flow__node-roleGroup[data-id="group-member"]')).toHaveAttribute(
      "aria-label",
      "Members, 0 people",
    );
    await expect(page.getByText("No one has this role.")).toBeVisible();
    await expect(card(page, "Bob Brown")).toHaveAttribute("aria-current", "true");

    await menuButton().click();
    await page.getByRole("menuitemradio", { name: "Member" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByRole("heading")).toHaveText("Remove admin access for Bob Brown?");
    await dialog.getByRole("button", { name: "Remove admin access" }).click();
    await expect(toasts(page)).toContainText("Bob Brown is now a Member");
    await expect(card(page, "Bob Brown")).toHaveAttribute("aria-label", "Bob Brown, bob@example.com, Member, Active");
    await expect(menuButton()).toBeFocused();

    await page.reload();
    await expect(card(page, "Bob Brown")).toHaveAttribute("aria-label", "Bob Brown, bob@example.com, Member, Active");
  });

  test("a read-only member sees no card menus", async ({ page }) => {
    await login(page, "bob");
    await openChart(page, "tenant=acme");
    await expect(page.locator(".react-flow__node-member")).toHaveCount(2);
    await expect(page.locator(".react-flow button[aria-haspopup=menu]")).toHaveCount(0);
  });

  test("frank's chart shows an empty Members group", async ({ page }) => {
    await login(page, "frank");
    await openChart(page);
    await expect(page.locator('.react-flow__node-roleGroup[data-id="group-member"]')).toContainText(
      "No one has this role.",
    );
    await expect(page.locator(".react-flow__node-member")).toHaveCount(1);
  });
});
