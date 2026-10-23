import { cookies } from "next/headers";
import { apiFetch } from "@/lib/api";
import { BOB_ID, TENANT_A, bob } from "@/test-utils/members";
import { updateMemberRole } from "./actions";

jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/api", () => ({ apiFetch: jest.fn() }));
jest.mock("@/lib/session", () => ({ SESSION_COOKIE: "session" }));

const cookieStore = { get: jest.fn(), delete: jest.fn() };
const fetchApi = jest.mocked(apiFetch);

function upstream(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const promote = { tenantId: TENANT_A, userId: BOB_ID, role: "ADMIN" as const };

beforeEach(() => {
  cookieStore.get.mockReturnValue({ name: "session", value: "token" });
  jest.mocked(cookies).mockResolvedValue(cookieStore as never);
});

describe("updateMemberRole", () => {
  it.each([
    ["a malformed tenant id", { ...promote, tenantId: "acme" }],
    ["a malformed user id", { ...promote, userId: "bob" }],
    ["an unsupported role", { ...promote, role: "OWNER" }],
    ["a lowercase role", { ...promote, role: "admin" }],
    ["a missing role", { tenantId: TENANT_A, userId: BOB_ID }],
    ["no input", null],
  ])("refuses %s with 400 VALIDATION_FAILED and never calls the API", async (_label, input) => {
    await expect(updateMemberRole(input as never)).resolves.toEqual({
      ok: false,
      status: 400,
      code: "VALIDATION_FAILED",
    });
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it("answers 401 and clears the cookie when there is no session", async () => {
    cookieStore.get.mockReturnValue(undefined);

    await expect(updateMemberRole(promote)).resolves.toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expect(cookieStore.delete).toHaveBeenCalledWith("session");
    expect(fetchApi).not.toHaveBeenCalled();
  });

  it("sends the PATCH with the session token and returns only the contract fields", async () => {
    fetchApi.mockResolvedValue(upstream(200, { ...bob, role: "ADMIN", passwordHash: "x" }));

    await expect(updateMemberRole(promote)).resolves.toEqual({
      ok: true,
      member: { ...bob, role: "ADMIN" },
    });
    expect(fetchApi).toHaveBeenCalledWith(`/tenants/${TENANT_A}/members/${BOB_ID}`, {
      token: "token",
      method: "PATCH",
      body: JSON.stringify({ role: "ADMIN" }),
      cache: "no-store",
    });
  });

  it("clears the cookie when the API rejects the token", async () => {
    fetchApi.mockResolvedValue(upstream(401, { code: "UNAUTHENTICATED" }));

    await expect(updateMemberRole(promote)).resolves.toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHENTICATED",
    });
    expect(cookieStore.delete).toHaveBeenCalledWith("session");
  });

  it("answers 503 API_UNAVAILABLE when the API can't be reached", async () => {
    fetchApi.mockRejectedValue(new TypeError("fetch failed"));

    await expect(updateMemberRole(promote)).resolves.toEqual({
      ok: false,
      status: 503,
      code: "API_UNAVAILABLE",
    });
  });

  it("answers 502 UPSTREAM_SHAPE when a 200 body is not a member", async () => {
    fetchApi.mockResolvedValue(upstream(200, { ...bob, role: "OWNER" }));

    await expect(updateMemberRole(promote)).resolves.toEqual({
      ok: false,
      status: 502,
      code: "UPSTREAM_SHAPE",
    });
  });

  it.each([
    [400, "VALIDATION_FAILED"],
    [403, "NOT_TENANT_ADMIN"],
    [404, "TENANT_NOT_FOUND"],
    [404, "MEMBER_NOT_FOUND"],
    [409, "SELF_DEMOTION_FORBIDDEN"],
    [409, "LAST_ADMIN_REQUIRED"],
    [409, "ROLE_CHANGE_CONFLICT"],
  ])("forwards %i %s", async (status, code) => {
    fetchApi.mockResolvedValue(upstream(status, { statusCode: status, code, message: "internal" }));

    await expect(updateMemberRole(promote)).resolves.toEqual({ ok: false, status, code });
  });

  it.each([
    [418, { code: "SOMETHING_ELSE" }, 418],
    [422, { message: "no code" }, 422],
    [500, { code: "INTERNAL", message: "Prisma P1001" }, 502],
    [503, undefined, 502],
  ])("maps an unknown %i to UPSTREAM_ERROR", async (status, body, expected) => {
    fetchApi.mockResolvedValue(upstream(status, body));

    await expect(updateMemberRole(promote)).resolves.toEqual({
      ok: false,
      status: expected,
      code: "UPSTREAM_ERROR",
    });
  });
});
