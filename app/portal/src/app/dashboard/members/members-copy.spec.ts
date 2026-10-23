import {
  CHART_HELP,
  EMPTY_GROUP,
  LOAD_ERROR_TITLE,
  NO_ACCESS_COPY,
  NO_RESULTS_TITLE,
  changeRoleLabel,
  chartLabel,
  demoteDialogCopy,
  groupTitle,
  groupToggleLabel,
  loadErrorBody,
  noResultsBody,
  onlyYouCopy,
  pageTitle,
  peopleCount,
  tableCaption,
} from "./members-copy";

describe("no-results copy", () => {
  it("uses the design title", () => {
    expect(NO_RESULTS_TITLE).toBe("No members match");
  });

  it("describes a query only", () => {
    expect(noResultsBody({ q: "zed", role: "all" })).toBe("Nothing matches “zed”.");
  });

  it("describes a query with a role", () => {
    expect(noResultsBody({ q: "bob", role: "ADMIN" })).toBe("Nothing matches “bob” with role Admin.");
  });

  it("describes a role only", () => {
    expect(noResultsBody({ q: "", role: "ADMIN" })).toBe("No one has the Admin role.");
    expect(noResultsBody({ q: "  ", role: "MEMBER" })).toBe("No one has the Member role.");
  });

  it("trims the query", () => {
    expect(noResultsBody({ q: "  zed ", role: "all" })).toBe("Nothing matches “zed”.");
  });
});

describe("state copy", () => {
  it("matches the design's no-access card", () => {
    expect(NO_ACCESS_COPY).toEqual({
      title: "You're not a member of this organization",
      body: "Choose one of your organizations from the menu at the top of the page.",
    });
  });

  it("matches the design's only-you block", () => {
    expect(onlyYouCopy("Wayne Logistics")).toEqual({
      title: "You're the only member of Wayne Logistics",
      body: "People who join this organization will appear here.",
    });
  });

  it("uses the connection copy for API_UNAVAILABLE and network failures", () => {
    expect(LOAD_ERROR_TITLE).toBe("Couldn't load members");
    expect(loadErrorBody("API_UNAVAILABLE")).toBe("Check your connection and try again.");
    expect(loadErrorBody("NETWORK")).toBe("Check your connection and try again.");
  });

  it("uses the generic copy for other codes", () => {
    for (const code of ["UPSTREAM_ERROR", "UPSTREAM_SHAPE", "HTTP_500", "FORBIDDEN"]) {
      expect(loadErrorBody(code)).toBe(
        "Something went wrong while loading members. Please try again.",
      );
    }
  });

  it("titles the page with the tenant name", () => {
    expect(pageTitle("Acme Corporation")).toBe("Acme Corporation · Members");
    expect(pageTitle(null)).toBe("Members");
    expect(tableCaption("Acme Corporation")).toBe("Members of Acme Corporation");
  });
});

describe("role change copy", () => {
  it("labels the control", () => {
    expect(changeRoleLabel("Bob Brown")).toBe("Change role for Bob Brown");
  });

  it("matches the design's demote dialog", () => {
    expect(demoteDialogCopy("Bob Brown", "Acme Corporation")).toEqual({
      title: "Remove admin access for Bob Brown?",
      losesTerm: "Loses:",
      loses: "changing members' roles",
      keepsTerm: "Keeps:",
      keeps: "access to Acme Corporation and the member list",
      cancel: "Keep as Admin",
      confirm: "Remove admin access",
    });
  });
});

describe("chart copy", () => {
  it("counts people", () => {
    expect(peopleCount(1)).toBe("1 person");
    expect(peopleCount(2)).toBe("2 people");
    expect(peopleCount(0)).toBe("0 people");
  });

  it("titles and labels groups", () => {
    expect(groupTitle("ADMIN", 1)).toBe("Admins (1)");
    expect(groupTitle("MEMBER", 0)).toBe("Members (0)");
    expect(groupToggleLabel("ADMIN", false)).toBe("Collapse Admins");
    expect(groupToggleLabel("MEMBER", true)).toBe("Expand Members");
    expect(EMPTY_GROUP).toBe("No one has this role.");
  });

  it("labels the canvas", () => {
    expect(chartLabel("Acme Corporation", 1, 1)).toBe(
      "Org chart of Acme Corporation: 1 admin, 1 member. Drag to pan.",
    );
    expect(chartLabel("Acme Corporation", 2, 0)).toBe(
      "Org chart of Acme Corporation: 2 admins, 0 members. Drag to pan.",
    );
    expect(CHART_HELP).toBe(
      "Use Tab to move between people. For a sortable table, switch to List view.",
    );
  });
});
