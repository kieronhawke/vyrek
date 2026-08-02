import { describe, expect, it } from "vitest";
import { daySlug, findDay, shortDate, startOfWeek, todayFor, weekFor } from "./week";

/** A Wednesday, so the week has days either side of "today". */
const WED = new Date(2026, 7, 5); // 5 August 2026

describe("member week", () => {
  it("starts the week on Monday, whatever day it is asked about", () => {
    for (let offset = 0; offset < 7; offset++) {
      const d = new Date(2026, 7, 3 + offset); // Mon 3 Aug -> Sun 9 Aug
      expect(daySlug(startOfWeek(d))).toBe("2026-08-03");
    }
  });

  it("handles a Sunday without rolling into the next week", () => {
    // getDay() is 0 on Sunday; the naive shift sends it forward six days.
    const sunday = new Date(2026, 7, 9);
    expect(daySlug(startOfWeek(sunday))).toBe("2026-08-03");
  });

  it("crosses a month boundary", () => {
    const tue = new Date(2026, 8, 1); // Tue 1 September
    expect(daySlug(startOfWeek(tue))).toBe("2026-08-31");
  });

  it("returns seven consecutive days, Monday first", () => {
    const week = weekFor(WED);
    expect(week).toHaveLength(7);
    expect(week.map((d) => d.day)).toEqual([
      "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
    ]);
    expect(week.map((d) => d.slug)).toEqual([
      "2026-08-03", "2026-08-04", "2026-08-05",
      "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09",
    ]);
  });

  it("marks exactly one day as today", () => {
    const today = weekFor(WED).filter((d) => d.isToday);
    expect(today).toHaveLength(1);
    expect(today[0].slug).toBe("2026-08-05");
  });

  it("counts past sessions as done and future ones as not", () => {
    const week = weekFor(WED);
    const past = week.filter((d) => d.isPast);
    const future = week.filter((d) => !d.isPast && !d.isToday);
    expect(past.every((d) => d.done)).toBe(true);
    // Future training sessions are not pre-ticked, which would be a lie.
    expect(future.filter((d) => d.type !== "rest").every((d) => !d.done)).toBe(true);
  });

  it("does not mark today's training session as already done", () => {
    const today = todayFor(WED);
    if (today.type !== "rest") expect(today.done).toBe(false);
  });

  it("formats dates the way the week strip expects", () => {
    expect(shortDate(new Date(2026, 7, 5))).toBe("5 Aug");
  });

  it("finds a day by slug, and returns undefined for one outside the week", () => {
    expect(findDay("2026-08-06", WED)?.day).toBe("Thu");
    expect(findDay("2026-09-30", WED)).toBeUndefined();
    expect(findDay("nonsense", WED)).toBeUndefined();
  });

  it("keeps the session pattern from the fixtures", () => {
    // The dates move; what Ben programmed does not.
    const types = weekFor(WED).map((d) => d.type);
    expect(types).toEqual([
      "rest", "intervals", "strength", "run", "rest", "simulation", "run",
    ]);
  });
});
