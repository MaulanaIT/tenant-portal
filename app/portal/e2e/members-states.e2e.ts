import { expect, test, type Page, type Route } from "@playwright/test";
import { login, membersTable, openMembers, row } from "./helpers";

const BFF_MEMBERS = "**/bff/tenants/*/members";

async function refetchInBackground(page: Page) {
  await page.clock.fastForward(31_000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("visibilitychange"));
  });
}

function loadError(page: Page) {
  return page.getByRole("alert").filter({ hasText: "Couldn't load members" });
}

test.describe("members load states", () => {
  test("the loading skeleton shows while the page streams, then the table replaces it", async ({
    page,
  }) => {
    await login(page, "alice");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: 8 * 1024,
      uploadThroughput: -1,
    });

    await page.goto("/dashboard/members", { waitUntil: "commit" });
    await expect(page.getByText("Loading members…")).toBeVisible();
    await expect(page.locator('[aria-busy="true"][aria-label="Loading members"]')).toHaveCount(1);
    await expect(page.locator('[role="search"]')).toHaveCount(0);

    await expect(membersTable(page)).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Loading members…")).toHaveCount(0);
    await expect(page.getByLabel("Loading members")).toHaveCount(0);

    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    await cdp.detach();
  });

  test("a failed refresh shows the error card and Try again recovers", async ({ page }) => {
    await page.clock.install();
    await login(page, "alice");
    await openMembers(page);
    await expect(row(page, "Bob Brown")).toBeVisible();

    let failures = 0;
    await page.route(BFF_MEMBERS, async (route) => {
      failures += 1;
      await route.fulfill({ status: 502, json: { code: "UPSTREAM_ERROR" } });
    });
    await refetchInBackground(page);

    const alert = loadError(page);
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText(
      "Something went wrong while loading members. Please try again.",
    );
    expect(failures).toBe(3);
    await expect(membersTable(page)).toHaveCount(0);
    await expect(page.getByRole("search")).toHaveCount(0);
    await expect(page.getByText(/^\d+ people ·/)).toHaveCount(0);

    await page.unroute(BFF_MEMBERS);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(BFF_MEMBERS, async (route: Route) => {
      await held;
      await route.continue();
    });

    const tryAgain = alert.getByRole("button", { name: "Try again" });
    await tryAgain.click();
    await expect(tryAgain).toHaveAttribute("aria-busy", "true");
    release();

    await expect(loadError(page)).toHaveCount(0);
    await expect(row(page, "Bob Brown")).toBeVisible();
    await expect(page.getByText("2 people · 1 admin · You are an Admin")).toBeVisible();
  });

  test("an unreachable server asks the viewer to check the connection", async ({ page }) => {
    await page.clock.install();
    await login(page, "alice");
    await openMembers(page);
    await expect(row(page, "Bob Brown")).toBeVisible();

    await page.route(BFF_MEMBERS, (route) => route.abort("internetdisconnected"));
    await refetchInBackground(page);

    const alert = loadError(page);
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).toContainText("Check your connection and try again.");

    await page.unroute(BFF_MEMBERS);
    await alert.getByRole("button", { name: "Try again" }).click();
    await expect(row(page, "Bob Brown")).toBeVisible();
    await expect(loadError(page)).toHaveCount(0);
  });
});
