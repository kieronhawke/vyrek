import { isFictionalPerson } from "./fictional-people";
import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  hourRange,
  fromMinutes,
  monthGrid,
  monthLabel,
  placeDay,
  seedAppointments,
  sortForDay,
  startOfWeek,
  toMinutes,
  weekDays,
  weekLabel,
  weekdayIndex,
  type Appointment,
} from "./diary";

/**
 * The layout maths, on its own.
 *
 * A calendar's bugs are almost never in its markup — they are in the day
 * arithmetic and the overlap placement, both of which are invisible until a
 * specific date or a specific pair of times, and neither of which a screenshot
 * test will ever catch.
 */

function appt(start: string, end: string, over: Partial<Appointment> = {}): Appointment {
  return {
    id: `${start}-${end}`,
    date: "2026-08-10",
    start,
    end,
    allDay: false,
    title: "x",
    client: "",
    category: "session",
    notes: "",
    remindMin: null,
    ...over,
  };
}

describe("dates", () => {
  it("weeks start on Monday", () => {
    // 2026-08-10 is a Monday.
    expect(weekdayIndex("2026-08-10")).toBe(0);
    expect(weekdayIndex("2026-08-16")).toBe(6); // Sunday
    expect(startOfWeek("2026-08-16")).toBe("2026-08-10");
    expect(startOfWeek("2026-08-10")).toBe("2026-08-10");
  });

  it("gives seven days from any day in the week", () => {
    expect(weekDays("2026-08-13")).toEqual([
      "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
      "2026-08-14", "2026-08-15", "2026-08-16",
    ]);
  });

  it("crosses a month end without losing a day", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29"); // leap year
  });

  it("clamps a month step rather than overflowing into the next", () => {
    // The bug this exists for: 31 Jan + 1 month is 3 March in naive code, so
    // pressing next twice from January shows March and skips February.
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("always renders six rows of seven", () => {
    for (const iso of ["2026-02-01", "2026-08-01", "2027-01-01", "2026-11-11"]) {
      const grid = monthGrid(iso);
      expect(grid).toHaveLength(42);
      // Starts on a Monday, and the first of the month is inside the grid.
      expect(weekdayIndex(grid[0])).toBe(0);
      expect(grid).toContain(`${iso.slice(0, 7)}-01`);
    }
  });

  it("labels a month, a week and a week that spans two months", () => {
    expect(monthLabel("2026-08-13")).toBe("August 2026");
    expect(weekLabel("2026-08-13")).toBe("10–16 Aug 2026");
    expect(weekLabel("2026-09-01")).toBe("31 Aug – 6 Sep 2026");
  });
});

describe("times", () => {
  it("round-trips", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(fromMinutes(570)).toBe("09:30");
    expect(fromMinutes(0)).toBe("00:00");
  });

  it("cannot produce a time outside the day", () => {
    expect(fromMinutes(-60)).toBe("00:00");
    expect(fromMinutes(99999)).toBe("23:59");
  });

  it("widens the visible hours for an entry outside them", () => {
    expect(hourRange([])).toEqual([6, 21]);
    expect(hourRange([appt("05:30", "06:30")])).toEqual([5, 21]);
    expect(hourRange([appt("21:00", "23:30")])).toEqual([6, 24]);
    // An all-day entry has no times and must not drag the range to midnight.
    expect(hourRange([appt("00:00", "00:00", { allDay: true })])).toEqual([6, 21]);
  });
});

describe("placement", () => {
  it("gives a lone entry the full width", () => {
    const [a] = placeDay([appt("09:00", "10:00")]);
    expect(a.column).toBe(0);
    expect(a.columns).toBe(1);
  });

  it("splits two that overlap", () => {
    const placed = placeDay([appt("09:00", "10:00"), appt("09:30", "10:30")]);
    expect(placed.map((p) => p.column)).toEqual([0, 1]);
    expect(placed.every((p) => p.columns === 2)).toBe(true);
  });

  it("leaves two that merely touch at full width", () => {
    // 09:00–10:00 and 10:00–11:00 do not overlap; drawing them half-width
    // wastes half the day for no reason.
    const placed = placeDay([appt("09:00", "10:00"), appt("10:00", "11:00")]);
    expect(placed.every((p) => p.columns === 1)).toBe(true);
  });

  it("reuses a column once its entry has finished", () => {
    const placed = placeDay([
      appt("09:00", "12:00"), // spans both
      appt("09:30", "10:00"),
      appt("10:30", "11:00"),
    ]);
    expect(placed[0].column).toBe(0);
    expect(placed[1].column).toBe(1);
    // The third starts after the second ends, so column 1 is free again.
    expect(placed[2].column).toBe(1);
    expect(placed.every((p) => p.columns === 2)).toBe(true);
  });

  it("gives a zero-length entry a box rather than a hairline", () => {
    const placed = placeDay([appt("09:00", "09:00"), appt("09:05", "09:30")]);
    expect(placed).toHaveLength(2);
    expect(placed[1].column).toBe(1);
  });

  it("ignores all-day entries, which are not on the grid", () => {
    const placed = placeDay([appt("09:00", "10:00"), appt("00:00", "00:00", { allDay: true })]);
    expect(placed).toHaveLength(1);
  });
});

describe("ordering", () => {
  it("puts all-day first, then by start", () => {
    const sorted = sortForDay([
      appt("14:00", "15:00", { id: "afternoon" }),
      appt("00:00", "00:00", { id: "allday", allDay: true }),
      appt("07:00", "08:00", { id: "morning" }),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(["allday", "morning", "afternoon"]);
  });
});

describe("seed", () => {
  it("lands on the week of whatever day it is given", () => {
    const items = seedAppointments("2026-08-13");
    const days = weekDays("2026-08-13");
    expect(items.every((a) => days.includes(a.date))).toBe(true);
  });

  it("carries no real client names", () => {
    // This repository is public. A real client's name against a real session
    // time is precisely what must never be committed. The seed uses realistic
    // names now, so the check is that each one is on the fictional roster
    // rather than that it carries a placeholder prefix.
    const names = seedAppointments("2026-08-13")
      .map((a) => a.client)
      .filter(Boolean) as string[];
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) {
      expect(isFictionalPerson(n), `${n} is not on the fictional roster`).toBe(true);
    }
  });

  it("has a pair that overlap, so the week view proves it can show them", () => {
    const items = seedAppointments("2026-08-13");
    const placed = placeDay(items.filter((a) => a.date === addDays(startOfWeek("2026-08-13"), 1)));
    expect(placed.some((p) => p.columns > 1)).toBe(true);
  });
});
