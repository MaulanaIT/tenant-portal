import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { apiSession } from "./api";
import { login, openChart, openMembers, roleTrigger, row } from "./helpers";
import { reseed } from "./seed";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page: Page, testInfo: TestInfo, label: string, disabledRules: string[] = []) {
  const results = await new AxeBuilder({ page })
    .withTags(TAGS)
    .exclude("nextjs-portal")
    .disableRules(disabledRules)
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  await testInfo.attach(`axe-${label}`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  expect(
    blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    })),
    label,
  ).toEqual([]);
  return results;
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`axe in ${colorScheme} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme });
    });

    test("list view", async ({ page }, testInfo) => {
      await login(page, "alice");
      await openMembers(page);
      await expect(row(page, "Bob Brown")).toBeVisible();
      expect(
        await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches),
      ).toBe(colorScheme === "dark");
      await scan(page, testInfo, `${colorScheme}-list`);
      await roleTrigger(page, "Bob Brown").click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await scan(page, testInfo, `${colorScheme}-list-select-open`, ["aria-hidden-focus"]);
    });

    test("chart view", async ({ page }, testInfo) => {
      await login(page, "alice");
      await openChart(page);
      await expect(page.locator(".react-flow__node-member")).toHaveCount(2);
      await scan(page, testInfo, `${colorScheme}-chart`);
      await page.getByRole("searchbox").fill("bob");
      await expect(page.locator('.react-flow__node-member[aria-label$="not matching"]')).toHaveCount(1);
      await scan(page, testInfo, `${colorScheme}-chart-dimmed`);
      await page.locator('button[aria-label="Change role for Bob Brown"]').click();
      await expect(page.getByRole("menu")).toBeVisible();
      await scan(page, testInfo, `${colorScheme}-chart-menu-open`);
    });

    test("no-access and only-you states", async ({ page }, testInfo) => {
      await login(page, "carol");
      await openMembers(page, "?tenant=acme");
      await expect(page.getByText("You're not a member of this organization")).toBeVisible();
      await scan(page, testInfo, `${colorScheme}-no-access`);
      await login(page, "frank");
      await openMembers(page);
      await expect(page.getByText("You're the only member of Wayne Logistics")).toBeVisible();
      await scan(page, testInfo, `${colorScheme}-only-you`);
    });

    test("mobile list and chart", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await login(page, "alice");
      await openMembers(page);
      await expect(row(page, "Bob Brown")).toBeVisible();
      await scan(page, testInfo, `${colorScheme}-mobile-list`);
      await openChart(page);
      await expect(page.locator(".react-flow__node-member")).toHaveCount(2);
      await scan(page, testInfo, `${colorScheme}-mobile-chart`);
    });

    test.describe("with Bob as an admin", () => {
      test.afterEach(() => {
        reseed();
      });

      test("demote dialog and toast", async ({ page }, testInfo) => {
        const alice = await apiSession("alice");
        const bob = await apiSession("bob");
        await alice.setRole(alice.tenantId("acme"), bob.userId, "ADMIN");
        await login(page, "alice");
        await openMembers(page);
        await roleTrigger(page, "Bob Brown").click();
        await page.getByRole("option", { name: /^Member/ }).click();
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await scan(page, testInfo, `${colorScheme}-dialog`);
        const remove = page.getByRole("alertdialog").getByRole("button", { name: "Remove admin access" });
        await expect(remove).toHaveCSS("color", "rgb(255, 255, 255)");
        await remove.click();
        const toast = page.locator("[data-sonner-toast]");
        await expect(toast).toContainText("Bob Brown is now a Member");
        await toast.evaluate((element) =>
          Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
        );
        await scan(page, testInfo, `${colorScheme}-toast`);
      });
    });
  });
}
