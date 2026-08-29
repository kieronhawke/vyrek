import { describe, expect, it } from "vitest";
import {
  MAX_START_DAYS_AHEAD,
  billingAnchorUnix,
  firstPaymentLine,
  formatStartDate,
  formatStartDateShort,
  parseStartDate,
  startDateBlocker,
  startDateISO,
  todayDay,
} from "@/lib/onboarding/start-date";

/**
 * These are money-on-a-date tests. The repo has been bitten before by a date
 * computed in UTC reading a day early once British Summer Time started, so the
 * clock changes are pinned explicitly rather than trusted.
 *
 * UK clocks in 2026: forward 29 March, back 25 October.
 */

const at = (iso: string) => new Date(iso).getTime();

describe("parseStartDate", () => {
  it("reads an ISO date", () => {
    expect(parseStartDate("2026-09-01")).toBe(startDateISOToDay("2026-09-01"));
    expect(startDateISO(parseStartDate("2026-09-01")!)).toBe("2026-09-01");
  });

  it("round-trips every date across a year", () => {
    for (let i = 0; i < 365; i++) {
      const iso = startDateISO(todayDay(at("2026-01-01T12:00:00Z")) + i);
      expect(startDateISO(parseStartDate(iso)!), iso).toBe(iso);
    }
  });

  it("refuses what is not a date", () => {
    for (const bad of [
      "",
      "  ",
      "01/09/2026",
      "2026-9-1",
      "2026-13-01",
      "2026-00-10",
      "2026-02-31", // rolls forward silently in Date.UTC — must not
      "2026-04-31",
      "yesterday",
      "2026-09-01T09:00:00Z",
    ]) {
      expect(parseStartDate(bad), bad).toBeNull();
    }
  });

  it("accepts a real leap day and refuses a fake one", () => {
    expect(parseStartDate("2028-02-29")).not.toBeNull();
    expect(parseStartDate("2026-02-29")).toBeNull();
  });
});

describe("billingAnchorUnix — the instant Stripe is given", () => {
  it("is 09:00 London during BST, which is 08:00 UTC", () => {
    const now = at("2026-08-29T10:00:00Z");
    const day = parseStartDate("2026-09-01")!;
    const unix = billingAnchorUnix(day, now)!;
    expect(new Date(unix * 1000).toISOString()).toBe("2026-09-01T08:00:00.000Z");
  });

  it("is 09:00 London during GMT, which is 09:00 UTC", () => {
    const now = at("2026-12-01T10:00:00Z");
    const day = parseStartDate("2026-12-20")!;
    const unix = billingAnchorUnix(day, now)!;
    expect(new Date(unix * 1000).toISOString()).toBe("2026-12-20T09:00:00.000Z");
  });

  it("lands on the right day the morning the clocks go back", () => {
    // 25 October 2026: 02:00 BST becomes 01:00 GMT. 09:00 local is 09:00 UTC.
    const now = at("2026-10-20T10:00:00Z");
    const unix = billingAnchorUnix(parseStartDate("2026-10-25")!, now)!;
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(unix * 1000));
    expect(shown).toContain("25/10/2026");
    expect(shown).toContain("09:00");
  });

  it("lands on the right day the morning the clocks go forward", () => {
    // 29 March 2026: 01:00 GMT becomes 02:00 BST. 09:00 local is 08:00 UTC.
    const now = at("2026-03-20T10:00:00Z");
    const unix = billingAnchorUnix(parseStartDate("2026-03-29")!, now)!;
    const shown = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(unix * 1000));
    expect(shown).toContain("29/03/2026");
    expect(shown).toContain("09:00");
  });

  it("never reads a day early, on any date in a year, in either clock", () => {
    const now = at("2026-01-01T00:30:00Z");
    const start = todayDay(now);
    for (let i = 1; i <= 365; i++) {
      const day = start + i;
      const unix = billingAnchorUnix(day, now);
      if (unix === null) continue;
      const londonDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/London",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(unix * 1000));
      expect(londonDate, `day ${startDateISO(day)}`).toBe(startDateISO(day));
    }
  });

  it("charges now for today, and for a date that has already gone", () => {
    const now = at("2026-08-29T07:00:00Z"); // 08:00 London, before CHARGE_HOUR
    expect(billingAnchorUnix(todayDay(now), now)).toBeNull();
    expect(billingAnchorUnix(todayDay(now) - 1, now)).toBeNull();
    expect(billingAnchorUnix(todayDay(now) - 40, now)).toBeNull();
  });

  it("charges now when no date was set at all", () => {
    expect(billingAnchorUnix(undefined)).toBeNull();
    expect(billingAnchorUnix(null)).toBeNull();
  });

  it("is always in the future when it returns a value", () => {
    const now = at("2026-08-29T10:00:00Z");
    for (let i = 0; i <= MAX_START_DAYS_AHEAD; i++) {
      const unix = billingAnchorUnix(todayDay(now) + i, now);
      if (unix !== null) expect(unix * 1000).toBeGreaterThan(now);
    }
  });
});

describe("startDateBlocker — what Ben is allowed to pick", () => {
  const now = at("2026-08-29T10:00:00Z");

  it("allows today and the next month", () => {
    expect(startDateBlocker(todayDay(now), now)).toBeNull();
    expect(startDateBlocker(todayDay(now) + 1, now)).toBeNull();
    expect(startDateBlocker(todayDay(now) + MAX_START_DAYS_AHEAD, now)).toBeNull();
  });

  it("refuses the past", () => {
    expect(startDateBlocker(todayDay(now) - 1, now)).toMatch(/passed/i);
  });

  it("refuses beyond Stripe's own ceiling, and says why", () => {
    const msg = startDateBlocker(todayDay(now) + MAX_START_DAYS_AHEAD + 1, now);
    expect(msg).toMatch(/Stripe/);
    expect(msg).toMatch(/31 days/);
  });

  /* The ceiling is Stripe's, measured against the live test API: an anchor at
     +32 days is refused with "cannot be later than next natural billing date".
     If this number ever grows, the checkout call starts failing at the moment
     a client is trying to pay — the worst place in the flow to find out. */
  it("matches the limit Stripe actually enforces", () => {
    expect(MAX_START_DAYS_AHEAD).toBe(31);
  });
});

describe("what the client is told", () => {
  const now = at("2026-08-29T10:00:00Z");

  it("names the date when there is one", () => {
    const line = firstPaymentLine(parseStartDate("2026-09-01")!, now);
    expect(line).toBe("Nothing today. Your first payment is on Tuesday 1 September.");
  });

  it("says today when the date has passed, rather than promising a date that has gone", () => {
    expect(firstPaymentLine(parseStartDate("2026-08-01")!, now)).toBe(
      "Your first payment is taken today.",
    );
  });

  it("says today when no date was set", () => {
    expect(firstPaymentLine(undefined, now)).toBe("Your first payment is taken today.");
  });

  it("formats a date the way a person says it", () => {
    expect(formatStartDate(parseStartDate("2026-09-01")!)).toBe("Tuesday 1 September");
    // en-GB abbreviates September to "Sept", not "Sep". Pinned because the
    // short form is what goes in a text message, where its length is billed.
    expect(formatStartDateShort(parseStartDate("2026-09-01")!)).toBe("1 Sept");
    expect(formatStartDateShort(parseStartDate("2026-11-03")!)).toBe("3 Nov");
  });
});

/** Local helper so the first test does not depend on the thing it is testing. */
function startDateISOToDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}
