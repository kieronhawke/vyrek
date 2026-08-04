import { describe, expect, it } from "vitest";
import {
  DEFAULT_AVAILABILITY,
  bookableDates,
  dateRange,
  formatMinutes,
  localDateISO,
  parseMinutes,
  slotsForDate,
  weekdayOf,
  wallClockToInstant,
  windowsFor,
  zoneOffsetMinutes,
  type Availability,
} from "./availability";

/**
 * The booking arithmetic, which is where a diary goes wrong quietly.
 *
 * Two things are worth the paranoia. The first is British Summer Time: a
 * consultation diary that stores instants rather than wall clock silently
 * moves every appointment by an hour twice a year, and nobody notices
 * until somebody misses a call. The second is double-booking, because the
 * only visible symptom is two people on the same slot.
 */

const A: Availability = {
  ...DEFAULT_AVAILABILITY,
  minNoticeHours: 0,
  horizonDays: 3650,
};

describe("British Summer Time", () => {
  it("is an hour ahead of UTC in summer and level with it in winter", () => {
    expect(zoneOffsetMinutes(new Date("2026-07-01T12:00:00Z"))).toBe(60);
    expect(zoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(0);
  });

  it("puts 5pm at 5pm on both sides of the clock change", () => {
    // The whole reason times are stored as wall clock. In BST 17:00 local
    // is 16:00Z; in GMT it is 17:00Z. Ben works five o'clock either way.
    expect(wallClockToInstant("2026-07-15", 17 * 60).toISOString()).toBe(
      "2026-07-15T16:00:00.000Z",
    );
    expect(wallClockToInstant("2026-01-15", 17 * 60).toISOString()).toBe(
      "2026-01-15T17:00:00.000Z",
    );
  });

  it("survives the spring-forward morning", () => {
    // 2026-03-29, clocks go forward at 01:00. 09:00 local is 08:00Z.
    expect(wallClockToInstant("2026-03-29", 9 * 60).toISOString()).toBe(
      "2026-03-29T08:00:00.000Z",
    );
  });

  it("round-trips a date through the local calendar", () => {
    // 00:30 BST on 2 August is 23:30Z on 1 August. The local date is the
    // 2nd, and a slot list keyed on the UTC date would file it wrongly.
    expect(localDateISO(new Date("2026-08-01T23:30:00Z"))).toBe("2026-08-02");
  });

  it("reads the weekday in local time", () => {
    expect(weekdayOf("2026-08-03")).toBe(1); // a Monday
    expect(weekdayOf("2026-08-08")).toBe(6); // a Saturday
  });
});

describe("which windows apply on a day", () => {
  it("uses the weekly pattern when there is no override", () => {
    expect(windowsFor("2026-08-03", A)).toEqual([{ start: 1020, end: 1200 }]);
  });

  it("treats an override with no windows as a day off", () => {
    // Presence is the test, not length. An empty override that fell
    // through to the weekly pattern would be a holiday that still took
    // bookings — the exact failure Ben would never think to check.
    const off: Availability = {
      ...A,
      overrides: [{ date: "2026-08-03", windows: [] }],
    };
    expect(windowsFor("2026-08-03", off)).toEqual([]);
    expect(slotsForDate("2026-08-03", off, [], new Date("2026-08-03T06:00:00Z"))).toEqual([]);
  });

  it("lets an override open a day the week has closed", () => {
    const sunday: Availability = {
      ...A,
      overrides: [{ date: "2026-08-09", windows: [{ start: 600, end: 660 }] }],
    };
    const at = new Date("2026-08-09T06:00:00Z");
    expect(slotsForDate("2026-08-09", A, [], at)).toEqual([]);
    expect(slotsForDate("2026-08-09", sunday, [], at).map((s) => s.label)).toEqual([
      "10:00",
      "10:30",
    ]);
  });
});

describe("the slots offered", () => {
  // A fixed clock. Without one these read the real time, and every slot
  // earlier in the day than the moment the suite runs disappears — a test
  // that passes in the morning and fails after lunch.
  const NOW = wallClockToInstant("2026-08-03", 9 * 60);

  it("divides each window into whole consultations", () => {
    // 17:00–20:00 at thirty minutes is six, and never a seventh that would
    // run past the end of the window.
    const slots = slotsForDate("2026-08-03", A, [], NOW);
    expect(slots.map((s) => s.label)).toEqual([
      "17:00", "17:30", "18:00", "18:30", "19:00", "19:30",
    ]);
  });

  it("handles a day with two separate windows", () => {
    const slots = slotsForDate("2026-08-05", A, [], NOW).map((s) => s.label);
    expect(slots).toContain("12:00");
    expect(slots).toContain("17:00");
    expect(slots).not.toContain("15:00");
  });

  it("never offers a slot already taken", () => {
    const taken = [wallClockToInstant("2026-08-03", 18 * 60)];
    const labels = slotsForDate("2026-08-03", A, taken, NOW).map((s) => s.label);
    expect(labels).not.toContain("18:00");
  });

  it("keeps the buffer clear either side of a booking", () => {
    // A 30-minute call at 18:00 with a 10-minute buffer runs to 18:40, so
    // 18:30 is gone too. Without this Ben gets a call landing while he is
    // still on the previous one.
    const taken = [wallClockToInstant("2026-08-03", 18 * 60)];
    const labels = slotsForDate("2026-08-03", A, taken, NOW).map((s) => s.label);
    expect(labels).not.toContain("17:30");
    expect(labels).not.toContain("18:30");
    expect(labels).toContain("17:00");
    expect(labels).toContain("19:00");
  });

  it("refuses anything inside the notice period", () => {
    // Booked at 16:00 with twelve hours' notice: nothing tonight.
    const now = wallClockToInstant("2026-08-03", 16 * 60);
    const withNotice = { ...A, minNoticeHours: 12 };
    expect(slotsForDate("2026-08-03", withNotice, [], now)).toEqual([]);
    expect(
      slotsForDate("2026-08-04", withNotice, [], now).length,
    ).toBeGreaterThan(0);
  });

  it("refuses anything past the horizon", () => {
    const now = wallClockToInstant("2026-08-03", 9 * 60);
    const short = { ...A, horizonDays: 7 };
    // The 8th is five days out and its slots are in the morning, so they
    // land inside a seven-day horizon measured from 09:00 on the 3rd.
    expect(slotsForDate("2026-08-08", short, [], now).length).toBeGreaterThan(0);
    expect(slotsForDate("2026-09-14", short, [], now)).toEqual([]);
  });
});

describe("the month grid", () => {
  it("only lights up days that really have a time on them", () => {
    // A calendar that offers a date and then shows no times is the
    // commonest bug in a booking UI, so the grid and the time list are
    // computed by the same function.
    const now = wallClockToInstant("2026-08-03", 9 * 60);
    const dates = dateRange(now, 14);
    const open = bookableDates(dates, A, [], now);

    for (const d of dates) {
      const hasSlots = slotsForDate(d, A, [], now).length > 0;
      expect(open.has(d), d).toBe(hasSlots);
    }
    // Sundays are closed in the default diary.
    expect(open.has("2026-08-09")).toBe(false);
  });

  it("closes a date once its last slot is taken", () => {
    const now = wallClockToInstant("2026-08-03", 9 * 60);
    const saturday = "2026-08-08";
    const all = slotsForDate(saturday, A, [], now).map((s) => s.start);
    expect(all.length).toBeGreaterThan(0);
    expect(bookableDates([saturday], A, all, now).has(saturday)).toBe(false);
  });
});

describe("reading and writing times", () => {
  it("round-trips", () => {
    expect(formatMinutes(1050)).toBe("17:30");
    expect(parseMinutes("17:30")).toBe(1050);
    expect(parseMinutes("09:00")).toBe(540);
  });

  it("rejects nonsense rather than accepting it as midnight", () => {
    for (const bad of ["", "9", "25:00", "12:60", "abc", "1230"]) {
      expect(parseMinutes(bad), bad).toBeNull();
    }
  });
});
