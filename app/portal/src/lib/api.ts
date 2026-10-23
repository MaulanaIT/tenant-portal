import "server-only";
import { redirect } from "next/navigation";
import type { CurrentUser } from "./members-types";
import { getSessionToken } from "./session";

export type { CurrentUser, Tenant, TenantRole } from "./members-types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export async function apiFetch(
  path: string,
  { token, ...init }: RequestInit & { token: string },
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${API_URL}${path}`, { ...init, headers });
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = await getSessionToken();
  if (!token) {
    redirect("/login");
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 401) {
    redirect("/login");
  }
  if (!response.ok) {
    throw new Error(`Failed to load the current user (${response.status})`);
  }
  return response.json();
}
