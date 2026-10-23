"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export type LoginState = { error?: string; username?: string };

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Enter your username and password.", username };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return { error: "Can't reach the API. Is it running?", username };
  }

  if (response.status === 401) {
    return { error: "Invalid username or password.", username };
  }
  if (!response.ok) {
    return { error: "Something went wrong. Please try again.", username };
  }

  const { accessToken } = (await response.json()) as { accessToken: string };
  (await cookies()).set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  redirect("/dashboard");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
}
