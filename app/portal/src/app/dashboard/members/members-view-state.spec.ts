import { HttpError } from "@/lib/http-error";
import { alice, bob, response } from "@/test-utils/members";
import {
  deriveMembersViewState,
  loadErrorCode,
  showsToolbar,
  type MembersViewStateInput,
} from "./members-view-state";

function input(overrides: Partial<MembersViewStateInput> = {}): MembersViewStateInput {
  return {
    status: "success",
    error: null,
    data: response([alice, bob]),
    filteredCount: 2,
    filtersActive: false,
    ...overrides,
  };
}

describe("loadErrorCode", () => {
  it("returns the API code of an HttpError", () => {
    expect(loadErrorCode(new HttpError(404, "TENANT_NOT_FOUND"))).toBe("TENANT_NOT_FOUND");
  });

  it("falls back to HTTP_{status} when the error has no code", () => {
    expect(loadErrorCode(new HttpError(500))).toBe("HTTP_500");
  });

  it("treats anything else as a network failure", () => {
    expect(loadErrorCode(new TypeError("Failed to fetch"))).toBe("NETWORK");
    expect(loadErrorCode(undefined)).toBe("NETWORK");
  });
});

describe("deriveMembersViewState", () => {
  it("is loading while the query is pending", () => {
    expect(deriveMembersViewState(input({ status: "pending", data: undefined }))).toBe("loading");
  });

  it("is no-access for TENANT_NOT_FOUND", () => {
    expect(
      deriveMembersViewState(
        input({ status: "error", data: undefined, error: new HttpError(404, "TENANT_NOT_FOUND") }),
      ),
    ).toBe("no-access");
  });

  it("is error for any other failure", () => {
    expect(
      deriveMembersViewState(
        input({ status: "error", data: undefined, error: new HttpError(503, "API_UNAVAILABLE") }),
      ),
    ).toBe("error");
    expect(
      deriveMembersViewState(input({ status: "error", data: undefined, error: new TypeError("x") })),
    ).toBe("error");
  });

  it("lets an error win over stale data", () => {
    expect(
      deriveMembersViewState(input({ status: "error", error: new HttpError(500, "UPSTREAM_ERROR") })),
    ).toBe("error");
    expect(
      deriveMembersViewState(input({ status: "error", error: new HttpError(404, "TENANT_NOT_FOUND") })),
    ).toBe("no-access");
  });

  it("is error when a success carries no data", () => {
    expect(deriveMembersViewState(input({ data: undefined }))).toBe("error");
  });

  it("is empty when the tenant has no members", () => {
    expect(deriveMembersViewState(input({ data: response([]), filteredCount: 0 }))).toBe("empty");
  });

  it("is only-you when the viewer is the only member", () => {
    expect(deriveMembersViewState(input({ data: response([alice]), filteredCount: 1 }))).toBe(
      "only-you",
    );
  });

  it("prefers only-you over no-results when a filter hides the own row", () => {
    expect(
      deriveMembersViewState(
        input({ data: response([alice]), filteredCount: 0, filtersActive: true }),
      ),
    ).toBe("only-you");
  });

  it("is no-results when active filters match nobody", () => {
    expect(deriveMembersViewState(input({ filteredCount: 0, filtersActive: true }))).toBe(
      "no-results",
    );
  });

  it("does not report no-results without active filters", () => {
    expect(deriveMembersViewState(input({ filteredCount: 0, filtersActive: false }))).toBe("ready");
  });

  it("is ready otherwise", () => {
    expect(deriveMembersViewState(input())).toBe("ready");
    expect(deriveMembersViewState(input({ filteredCount: 1, filtersActive: true }))).toBe("ready");
  });
});

describe("showsToolbar", () => {
  it.each([
    ["loading", false],
    ["no-access", false],
    ["error", false],
    ["empty", true],
    ["only-you", true],
    ["no-results", true],
    ["ready", true],
  ] as const)("%s → %s", (state, expected) => {
    expect(showsToolbar(state)).toBe(expected);
  });
});
