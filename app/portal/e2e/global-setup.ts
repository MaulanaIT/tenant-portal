import type { FullConfig } from "@playwright/test";
import { PASSWORD } from "./helpers";
import { reseed } from "./seed";

async function warmUp(portalUrl: string, apiUrl: string) {
  const login = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "alice", password: PASSWORD }),
  });
  const { accessToken } = (await login.json()) as { accessToken: string };
  const cookie = `session=${accessToken}`;
  for (const path of ["/login", "/dashboard", "/dashboard/members", "/dashboard/members?view=chart"]) {
    await fetch(`${portalUrl}${path}`, { headers: { cookie } });
  }
}

export default async function globalSetup(config: FullConfig) {
  reseed();
  const portalUrl = String(config.projects[0].use.baseURL);
  await warmUp(portalUrl, process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000");
}
