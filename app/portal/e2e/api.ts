import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { PASSWORD } from "./helpers";

loadEnvConfig(path.resolve(__dirname, "../../.."));

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type Me = { id: string; tenants: { id: string; slug: string }[] };

export async function apiSession(username: string) {
  const login = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: PASSWORD }),
  });
  if (!login.ok) {
    throw new Error(`login ${username} failed: ${login.status}`);
  }
  const { accessToken } = (await login.json()) as { accessToken: string };
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const me = (await (await fetch(`${API_URL}/auth/me`, { headers })).json()) as Me;

  return {
    userId: me.id,
    tenantId(slug: string) {
      const tenant = me.tenants.find((item) => item.slug === slug);
      if (!tenant) {
        throw new Error(`${username} is not in ${slug}`);
      }
      return tenant.id;
    },
    async setRole(tenantId: string, userId: string, role: "ADMIN" | "MEMBER") {
      const response = await fetch(`${API_URL}/tenants/${tenantId}/members/${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        throw new Error(`setRole failed: ${response.status}`);
      }
    },
  };
}
