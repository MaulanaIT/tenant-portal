import type { NextRequest } from "next/server";
import { apiFetch } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { TENANT_A, alice, bob } from "@/test-utils/members";
import { GET } from "./route";

jest.mock("@/lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("@/lib/session", () => ({ getSessionToken: jest.fn() }));

const fetchApi = jest.mocked(apiFetch);
const sessionToken = jest.mocked(getSessionToken);

const viewer = { userId: alice.userId, role: "ADMIN", canManageRoles: true };

function upstream(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function get(
  { tenantId = TENANT_A, fetchSite }: { tenantId?: string; fetchSite?: string | null } = {},
) {
  const headers = new Headers();
  if (fetchSite !== null) {
    headers.set("sec-fetch-site", fetchSite ?? "same-origin");
  }
  const request = new Request(`http://localhost/bff/tenants/${tenantId}/members`, { headers });
  const response = await GET(request as unknown as NextRequest, {
    params: Promise.resolve({ tenantId }),
  });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("Vary")).toBe("Cookie");
  return { status: response.status, body: (await response.json()) as unknown };
}

beforeEach(() => {
  sessionToken.mockResolvedValue("token");
});

describe("GET /bff/tenants/[tenantId]/members", () => {
  it("returns the reduced members response for a same-origin request", async () => {
    fetchApi.mockResolvedValue(
      upstream(200, {
        viewer: { ...viewer, token: "secret" },
        members: [{ ...alice, passwordHash: "x" }, bob],
        total: 2,
      }),
    );

    await expect(get()).resolves.toEqual({
      status: 200,
      body: { viewer, members: [alice, bob] },
    });
    expect(fetchApi).toHaveBeenCalledWith(`/tenants/${TENANT_A}/members`, {
      token: "token",
      cache: "no-store",
    });
  });

  it.each(["cross-site", "same-site", "none"])(
    "refuses sec-fetch-site %s with 403 FORBIDDEN before reading the session",
    async (fetchSite) => {
      await expect(get({ fetchSite })).resolves.toEqual({
        status: 403,
        body: { code: "FORBIDDEN" },
      });
      expect(sessionToken).not.toHaveBeenCalled();
      expect(fetchApi).not.toHaveBeenCalled();
    },
  );

  it("allows a request without sec-fetch-site", async () => {
    fetchApi.mockResolvedValue(upstream(200, { viewer, members: [alice] }));

    await expect(get({ fetchSite: null })).resolves.toMatchObject({ status: 200 });
  });

  it("answers 401 without a session and never calls the API", async () => {
    sessionToken.mockResolvedValue(undefined);

    await expect(get()).resolves.toEqual({ status: 401, body: { code: "UNAUTHENTICATED" } });
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it("answers 404 TENANT_NOT_FOUND for a malformed tenant id without calling the API", async () => {
    await expect(get({ tenantId: "acme" })).resolves.toEqual({
      status: 404,
      body: { code: "TENANT_NOT_FOUND" },
    });
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it("passes an upstream 401 on as UNAUTHENTICATED", async () => {
    fetchApi.mockResolvedValue(upstream(401, { code: "UNAUTHENTICATED", message: "x" }));

    await expect(get()).resolves.toEqual({ status: 401, body: { code: "UNAUTHENTICATED" } });
  });

  it.each([
    [404, "TENANT_NOT_FOUND", "TENANT_NOT_FOUND"],
    [403, "NOT_TENANT_ADMIN", "NOT_TENANT_ADMIN"],
    [404, "MEMBER_NOT_FOUND", "UPSTREAM_ERROR"],
    [403, undefined, "UPSTREAM_ERROR"],
  ])("maps an upstream %i with code %s to %s", async (status, code, expected) => {
    fetchApi.mockResolvedValue(upstream(status, { code, message: "Prisma internals" }));

    await expect(get()).resolves.toEqual({ status, body: { code: expected } });
  });

  it.each([400, 500, 503])("maps an upstream %i to 502 UPSTREAM_ERROR", async (status) => {
    fetchApi.mockResolvedValue(upstream(status, { code: "INTERNAL", message: "stack" }));

    await expect(get()).resolves.toEqual({ status: 502, body: { code: "UPSTREAM_ERROR" } });
  });

  it("answers 503 API_UNAVAILABLE when the API can't be reached", async () => {
    fetchApi.mockRejectedValue(new TypeError("fetch failed"));

    await expect(get()).resolves.toEqual({ status: 503, body: { code: "API_UNAVAILABLE" } });
  });

  it("answers 502 UPSTREAM_SHAPE for a body that is not a members response", async () => {
    fetchApi.mockResolvedValue(upstream(200, { viewer, members: [{ ...bob, role: "OWNER" }] }));

    await expect(get()).resolves.toEqual({ status: 502, body: { code: "UPSTREAM_SHAPE" } });
  });
});
