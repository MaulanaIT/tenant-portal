import os from "node:os";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(path.resolve(__dirname, "../.."));

const portalUrl = process.env.PORTAL_URL ?? "http://localhost:3001";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: path.join(os.tmpdir(), "tenant-portal-e2e"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: portalUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: [
    {
      command: "pnpm --dir ../.. api:dev",
      url: `${apiUrl}/`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: "pnpm --dir ../.. portal:dev",
      url: `${portalUrl}/login`,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
