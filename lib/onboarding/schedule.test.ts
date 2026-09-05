import { describe, expect, it } from "vitest";
import {
  DUE_TODAY_MAX_PENCE,
  DUE_TODAY_MIN_PENCE,
  parseDueToday,
  paymentSchedule,
  scheduleAfterLines,
  scheduleLines,
  scheduleRows,
  scheduleSms,
  validDueTodayPence,
} from "./schedule";
import { startDateISO, todayDay } from "./start-date";
import { isGsm7 } from "@/lib/sms/messages";

/**
 * THE SCHEDULE, PINNED.
 *
 * Every screen, email and text describes the same arrangement from these
 * functions, so what they say for each of the four combinations of "balance
 * or not" × "today or later" is the contract. The checkout shape hangs off
 * the same decision.
 */

/** A fixed "now" mid-morning London, so "today" is unambiguous. */
const NOW = Date.UTC(2026, 8, 5, 10, 0, 0); // 5 Sept 2026 11:00 BST
const TODAY = todayDay(NOW);
const IN_TEN_DAYS = TODAY + 10;

describe("reading the balance Ben typed", () => {
  it("blank and zero mean nothing is owed", () => {
    // A bare "£" is somebody who started typing and stopped: nothing owed.
    for (const v of ["", "  ", "0", "£0", "0.00", "£0.00", "£"]) {
      expect(parseDueToday(v), JSON.stringify(v)).toBe(0);
    }
  });

  it("reads the ways a coach types money", () => {
    expect(parseDueToday("100")).toBe(10000);
    expect(parseDueToday("£100")).toBe(10000);
    expect(parseDueToday("100.50")).toBe(10050);
    expect(parseDueToday("1,250")).toBe(125000);
    expect(parseDueToday(" £ 75 ")).toBe(7500);
  });

  it("refuses what it cannot read rather than dropping it", () => {
    for (const v of ["abc", "10.001", "-5", "1e3", "£x"]) {
      expect(parseDueToday(v), v).toBeNull();
    }
  });

  it("has its own band, wider than the monthly rate's", () => {
    expect(parseDueToday("0.99")).toBeNull();
    expect(parseDueToday("1")).toBe(DUE_TODAY_MIN_PENCE);
    expect(parseDueToday("10000")).toBe(DUE_TODAY_MAX_PENCE);
    expect(parseDueToday("10000.01")).toBeNull();
    // £2,500 is over the monthly ceiling and a perfectly plausible balance.
    expect(parseDueToday("2500")).toBe(250000);
  });

  it("validates a decoded value the same way, and zero is not valid", () => {
    expect(validDueTodayPence(10000)).toBe(true);
    expect(validDueTodayPence(0)).toBe(false);
    expect(validDueTodayPence(99)).toBe(false);
    expect(validDueTodayPence(DUE_TODAY_MAX_PENCE + 1)).toBe(false);
    expect(validDueTodayPence(100.5)).toBe(false);
    expect(validDueTodayPence("10000")).toBe(true);
    expect(validDueTodayPence(undefined)).toBe(false);
  });
});

describe("the four arrangements", () => {
  it("nothing owed, starting today: the plain subscription", () => {
    const s = paymentSchedule({ amountPence: 6000 }, NOW);
    expect(s).toMatchObject({
      monthlyPence: 6000,
      dueTodayPence: 0,
      deferred: false,
      startDay: null,
      todayPence: 6000,
      shape: "subscription",
    });
    expect(scheduleLines(s)).toEqual({
      today: "£60 today.",
      monthly: "Then £60 a month, on the same day each month.",
    });
    expect(scheduleSms(s)).toBe("£60/mo");
  });

  it("nothing owed, starting later: the anchored subscription", () => {
    const s = paymentSchedule({ amountPence: 6000, startDay: IN_TEN_DAYS }, NOW);
    expect(s).toMatchObject({
      deferred: true,
      startDay: IN_TEN_DAYS,
      todayPence: 0,
      shape: "subscription",
    });
    const lines = scheduleLines(s);
    expect(lines.today).toBe("Nothing today.");
    expect(lines.monthly).toMatch(/^Your first payment of £60 is on \w+ 15 September, then the same day each month\.$/);
    expect(scheduleSms(s)).toBe("£60/mo from 15 Sept");
  });

  it("owed today, starting today: one checkout, balance plus first month", () => {
    const s = paymentSchedule({ amountPence: 6000, dueTodayPence: 10000 }, NOW);
    expect(s).toMatchObject({
      dueTodayPence: 10000,
      deferred: false,
      todayPence: 16000,
      shape: "subscription-with-balance",
    });
    expect(scheduleLines(s)).toEqual({
      today: "£160 today: £100 outstanding balance plus £60 for your first month.",
      monthly: "Then £60 a month, on the same day each month.",
    });
    expect(scheduleSms(s)).toBe("£160 today (incl £100 owed), then £60/mo");
    expect(scheduleRows(s)).toEqual([
      { label: "Today", value: "£160 (£100 outstanding balance + first month)" },
      { label: "Then", value: "£60 a month" },
    ]);
  });

  it("owed today, starting later: the balance now, the subscription on the date", () => {
    const s = paymentSchedule(
      { amountPence: 6000, dueTodayPence: 10000, startDay: IN_TEN_DAYS },
      NOW,
    );
    expect(s).toMatchObject({
      dueTodayPence: 10000,
      deferred: true,
      todayPence: 10000,
      shape: "balance-then-subscription",
    });
    const lines = scheduleLines(s);
    expect(lines.today).toBe("£100 today, for your outstanding balance.");
    expect(lines.monthly).toMatch(/^Then £60 a month from \w+ 15 September, on the same day each month\.$/);
    expect(scheduleSms(s)).toBe("£100 today, then £60/mo from 15 Sept");
    const rows = scheduleRows(s);
    expect(rows[0]).toEqual({ label: "Today", value: "£100 (outstanding balance)" });
    expect(rows[1].label).toMatch(/^From \w+ 15 September$/);
    expect(rows[1].value).toBe("£60 a month");
  });
});

describe("a date that has passed while the link sat unopened", () => {
  it("collapses to charging today, and says so", () => {
    const later = NOW + 20 * 86_400_000;
    const s = paymentSchedule(
      { amountPence: 6000, dueTodayPence: 10000, startDay: IN_TEN_DAYS },
      later,
    );
    expect(s.deferred).toBe(false);
    expect(s.shape).toBe("subscription-with-balance");
    expect(s.todayPence).toBe(16000);
    expect(scheduleLines(s).today).toMatch(/^£160 today/);
  });

  it("today's own date is not a deferral", () => {
    const s = paymentSchedule({ amountPence: 6000, startDay: TODAY }, NOW);
    expect(s.deferred).toBe(false);
    expect(s.shape).toBe("subscription");
  });
});

describe("a nonsense balance is dropped, never charged", () => {
  it("out of band reads as nothing owed", () => {
    for (const bad of [0, 1, 99, DUE_TODAY_MAX_PENCE + 1, -500, 100.5, NaN]) {
      const s = paymentSchedule({ amountPence: 6000, dueTodayPence: bad }, NOW);
      expect(s.dueTodayPence, String(bad)).toBe(0);
      expect(s.shape).toBe("subscription");
    }
  });
});

describe("after the card has gone through", () => {
  it("speaks in the past tense about what was taken", () => {
    const paid = scheduleAfterLines(
      paymentSchedule({ amountPence: 6000, dueTodayPence: 10000, startDay: IN_TEN_DAYS }, NOW),
    );
    expect(paid.today).toBe(
      "£100 has been taken today for your outstanding balance, and your card is saved.",
    );
    expect(paid.monthly).toMatch(/^£60 a month comes out from \w+ 15 September/);

    const both = scheduleAfterLines(
      paymentSchedule({ amountPence: 6000, dueTodayPence: 10000 }, NOW),
    );
    expect(both.today).toBe(
      "£160 has been taken today: £100 outstanding balance plus £60 for your first month.",
    );

    const nothing = scheduleAfterLines(
      paymentSchedule({ amountPence: 6000, startDay: IN_TEN_DAYS }, NOW),
    );
    expect(nothing.today).toBe("Your card is saved and nothing has been taken yet.");

    const plain = scheduleAfterLines(paymentSchedule({ amountPence: 6000 }, NOW));
    expect(plain.today).toBe("£60 has been taken today.");
  });

  it("never says nothing was taken when something was", () => {
    for (const due of [10000, 250000]) {
      for (const startDay of [IN_TEN_DAYS, undefined]) {
        const after = scheduleAfterLines(
          paymentSchedule({ amountPence: 6000, dueTodayPence: due, startDay }, NOW),
        );
        expect(after.today).not.toMatch(/nothing has been taken/i);
        expect(after.today).toMatch(/has been taken today/);
      }
    }
  });
});

describe("text-message safety", () => {
  it("every schedule string is plain GSM-7", () => {
    for (const due of [0, 10000, 999999]) {
      for (const startDay of [IN_TEN_DAYS, undefined]) {
        const s = paymentSchedule({ amountPence: 199999, dueTodayPence: due, startDay }, NOW);
        const text = scheduleSms(s);
        expect(isGsm7(text), text).toBe(true);
      }
    }
  });

  it("penny amounts keep their pennies", () => {
    const s = paymentSchedule({ amountPence: 13750, dueTodayPence: 10050 }, NOW);
    expect(scheduleSms(s)).toBe("£238 today (incl £100.50 owed), then £137.50/mo");
  });
});

describe("the ISO date helpers agree with the day numbers used above", () => {
  it("IN_TEN_DAYS is the 15th", () => {
    expect(startDateISO(IN_TEN_DAYS)).toBe("2026-09-15");
  });
});
