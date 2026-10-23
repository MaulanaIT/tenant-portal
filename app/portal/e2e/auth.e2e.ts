import { expect, test } from "@playwright/test";
import { PASSWORD, login, openMembers, roleTrigger, row, toasts } from "./helpers";
import { reseed } from "./seed";

test.describe("authentication", () => {
  test("rejects a wrong password and signs in with the right one", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("alice");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText("Invalid username or password.");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Password").fill(PASSWORD);
    await Promise.all([
      page.waitForURL(/\/dashboard/),
      page.getByRole("button", { name: "Sign in" }).click(),
    ]);
    await expect(page.locator("header")).toContainText("Alice Anderson");
  });

  test("redirects to login without a session", async ({ page }) => {
    await page.goto("/dashboard/members");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("sign out does a full document load and Back shows no data", async ({ page }) => {
    await login(page, "alice");
    await openMembers(page);
    await expect(row(page, "Bob Brown")).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { __sameDocument?: boolean }).__sameDocument = true;
    });

    const documentLoads: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "document") {
        documentLoads.push(new URL(request.url()).pathname);
      }
    });

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    expect(documentLoads).toContain("/login");
    expect(
      await page.evaluate(() => (window as unknown as { __sameDocument?: boolean }).__sameDocument),
    ).toBeUndefined();
    expect((await page.context().cookies()).some((cookie) => cookie.name === "session")).toBe(false);

    await page.goBack();
    await page.waitForLoadState("load");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("bob@example.com")).toHaveCount(0);
    await expect(page.getByText("Acme Corporation")).toHaveCount(0);
    await expect(page.getByText("Alice Anderson")).toHaveCount(0);
  });
});

test.describe("expired session", () => {
  test.afterEach(() => {
    reseed();
  });

  test("a role change with an expired session goes to login without a failure toast or write", async ({
    page,
    context,
  }) => {
    await login(page, "alice");
    await openMembers(page);
    await expect(roleTrigger(page, "Bob Brown")).toHaveText("Member");

    const session = (await context.cookies()).find((cookie) => cookie.name === "session");
    expect(session).toBeDefined();
    await context.addCookies([{ ...session!, value: "expired.invalid.token" }]);

    await roleTrigger(page, "Bob Brown").click();
    await page.getByRole("option", { name: /^Admin/ }).click();
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(toasts(page)).toHaveCount(0);
    expect((await context.cookies()).some((cookie) => cookie.name === "session")).toBe(false);

    await login(page, "alice");
    await openMembers(page);
    await expect(roleTrigger(page, "Bob Brown")).toHaveText("Member");
  });

  test("a refetch with an expired session goes to login", async ({ page, context }) => {
    await page.clock.install();
    await login(page, "alice");
    await openMembers(page);
    await expect(row(page, "Bob Brown")).toBeVisible();
    const session = (await context.cookies()).find((cookie) => cookie.name === "session");
    await context.addCookies([{ ...session!, value: "expired.invalid.token" }]);

    const bff = page.waitForResponse((response) => /\/bff\/tenants\/[^/]+\/members/.test(response.url()));
    await page.clock.fastForward(31_000);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });
    expect((await bff).status()).toBe(401);
    await page.waitForURL(/\/login$/);
    await expect(page.getByText("bob@example.com")).toHaveCount(0);
  });
});
