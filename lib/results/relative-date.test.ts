/**
 * The line under every event card.
 *
 * This function shipped a bug onto every tile on the results landing page —
 * "in NaN years", because most events carry no date and `new Date("")` is
 * Invalid Date. These lock that down, and the countdown behaviour with it.
 */

import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "./format";

const NOW = new Date("2026-08-04T12:00:00Z");
const at = (iso: string) => formatRelativeDate(iso, NOW);
const inMs = (ms: number) => at(new Date(NOW.getTime() + ms).toISOString());

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("an event with no date", () => {
  it("returns the fallback rather than arithmetic on Invalid Date", () => {
    // The whole archive reaches here with an empty string: HYROX publishes a
    // calendar of upcoming races only, so past events have no date to show.
    expect(formatRelativeDate("", NOW, "2024")).toBe("2024");
  });

  it("returns the fallback for an unparseable date", () => {
    expect(formatRelativeDate("not a date", NOW, "2024")).toBe("2024");
  });

  it("returns an empty string when no fallback is offered", () => {
    expect(formatRelativeDate("", NOW)).toBe("");
  });

  it("never renders NaN", () => {
    for (const bad of ["", "  ", "not a date", "0000-13-45"]) {
      expect(formatRelativeDate(bad, NOW, "2024")).not.toContain("NaN");
    }
  });
});

describe("a race that is about to happen", () => {
  it("counts down in minutes within the hour", () => {
    expect(inMs(40 * MINUTE)).toBe("in 40 minutes");
    expect(inMs(MINUTE)).toBe("in 1 minute");
  });

  it("counts down in hours within the day", () => {
    // The line the reference site leads with on race week.
    expect(inMs(20 * HOUR)).toBe("in 20 hours");
    expect(inMs(HOUR)).toBe("in 1 hour");
  });

  it("counts down in days within the week", () => {
    expect(inMs(3 * DAY)).toBe("in 3 days");
    expect(inMs(DAY)).toBe("in 1 day");
  });

  it("says something sensible at the gun", () => {
    expect(inMs(10_000)).toBe("any moment");
  });
});

describe("a race that has been run", () => {
  it("reads back in the same units", () => {
    expect(inMs(-40 * MINUTE)).toBe("40 minutes ago");
    expect(inMs(-20 * HOUR)).toBe("20 hours ago");
    expect(inMs(-2 * DAY)).toBe("2 days ago");
    expect(inMs(-9 * DAY)).toBe("1 week ago");
    expect(inMs(-60 * DAY)).toBe("2 months ago");
    expect(inMs(-400 * DAY)).toBe("1 year ago");
  });

  it("says 'just now' for a race that has only started", () => {
    expect(inMs(-10_000)).toBe("just now");
  });
});

describe("the unit shrinks as the race approaches", () => {
  it("moves from months to weeks to days to hours", () => {
    // Not a formatting nicety: the whole point of the line is that it gets more
    // urgent, so each of these has to be a different sentence.
    const said = [60 * DAY, 14 * DAY, 3 * DAY, 20 * HOUR, 40 * MINUTE].map(inMs);
    expect(new Set(said).size).toBe(said.length);
    expect(said).toEqual([
      "in 2 months",
      "in 2 weeks",
      "in 3 days",
      "in 20 hours",
      "in 40 minutes",
    ]);
  });
});
