import { describe, expect, it } from "vitest";
import { monthsFor } from "./booking-calendar";

/** The calendar is drawn from these, so the padding maths has to be right. */
describe("laying a diary out as months", () => {
  it("returns nothing when the diary is empty", () => {
    expect(monthsFor([])).toEqual([]);
  });

  /**
   * 1 August 2026 is a Saturday, so the month opens with five blank cells
   * before it. Getting this wrong shifts every date by a day, which looks
   * fine and books people onto the wrong afternoon.
   */
  it("pads to the right weekday, Monday first", () => {
    const [aug] = monthsFor(["2026-08-05"]);
    expect(aug!.cells.slice(0, 5).every((c) => c === null)).toBe(true);
    expect(aug!.cells[5]).toMatchObject({ iso: "2026-08-01", day: 1 });
  });

  it("draws the whole month, not just the open days", () => {
    const [aug] = monthsFor(["2026-08-05"]);
    const days = aug!.cells.filter(Boolean);
    expect(days).toHaveLength(31);
    expect(days.filter((c) => c!.free)).toHaveLength(1);
  });

  /* February is where an off-by-one in the day count shows up first. */
  it("gets February right, including a leap year", () => {
    expect(monthsFor(["2027-02-01"])[0]!.cells.filter(Boolean)).toHaveLength(28);
    expect(monthsFor(["2028-02-01"])[0]!.cells.filter(Boolean)).toHaveLength(29);
  });

  /* Every month between the first and last open day, so the arrows never
     walk into a month that is not there — and never skip one either. */
  it("spans from the first open day to the last, inclusive", () => {
    const months = monthsFor(["2026-11-30", "2027-01-04"]);
    expect(months.map((m) => m.key)).toEqual(["2026-11", "2026-12", "2027-1"]);
  });

  it("names the month in words", () => {
    expect(monthsFor(["2026-08-05"])[0]!.label).toBe("August 2026");
  });

  it("does not care what order the diary came in", () => {
    const a = monthsFor(["2026-09-02", "2026-08-05"]);
    const b = monthsFor(["2026-08-05", "2026-09-02"]);
    expect(a.map((m) => m.key)).toEqual(b.map((m) => m.key));
  });
});
