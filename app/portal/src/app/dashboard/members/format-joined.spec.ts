import { formatJoined } from "./format-joined";

const ZONES = ["UTC", "America/Los_Angeles", "Pacific/Kiritimati", "Asia/Jakarta", "Pacific/Pago_Pago"];

describe("formatJoined", () => {
  const original = process.env.TZ;

  afterEach(() => {
    process.env.TZ = original;
  });

  it.each(ZONES)("formats the UTC calendar day when the module loads in %s", async (zone) => {
    process.env.TZ = zone;
    await jest.isolateModulesAsync(async () => {
      const { formatJoined: format } = await import("./format-joined");
      expect(format("2026-10-20T00:00:00.000Z")).toBe("Oct 20, 2026");
      expect(format("2026-10-20T08:15:00.000Z")).toBe("Oct 20, 2026");
      expect(format("2026-10-20T23:59:59.999Z")).toBe("Oct 20, 2026");
    });
  });

  it("returns the input when it is not a date", () => {
    expect(formatJoined("not-a-date")).toBe("not-a-date");
  });
});
