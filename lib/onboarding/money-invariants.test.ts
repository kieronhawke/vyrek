import { describe, expect, it } from "vitest";
import { paymentSchedule, scheduleLines, scheduleAfterLines, scheduleRows, scheduleSms } from "./schedule";
import { createInvite, readInvite } from "./token";
import { defaultInviteSmsMessage, assembleSms, checkSmsMessage } from "./message-copy";
import { displayPrice, CUSTOM_MIN_PENCE, CUSTOM_MAX_PENCE } from "./model";
import { DUE_TODAY_MIN_PENCE, DUE_TODAY_MAX_PENCE } from "./schedule";
import { todayDay, MAX_START_DAYS_AHEAD } from "./start-date";
import { isGsm7, segments } from "@/lib/sms/messages";

/**
 * THE MONEY, SWEPT RATHER THAN SAMPLED.
 *
 * The other suites check the cases somebody thought of. This one runs every
 * combination the form can produce — the full rate band, the full balance
 * band, every start date Stripe will accept — and asserts the things that
 * must be true of all of them. It exists because the failures that matter
 * here are not "this case is wrong", they are "one case in four hundred is
 * wrong and nobody will notice until a client is charged".
 */

const TODAY = todayDay();

/** Rates across the whole permitted band, including the awkward pennies. */
const RATES = [
  CUSTOM_MIN_PENCE, 500, 1299, 2500, 6000, 8000, 12500, 13750, 22000,
  50000, 99999, 150000, CUSTOM_MAX_PENCE,
];
/** Balances across their own, wider band. Zero means none owed. */
const BALANCES = [
  0, DUE_TODAY_MIN_PENCE, 999, 5000, 10000, 10050, 33333, 100000,
  250000, 999999, DUE_TODAY_MAX_PENCE,
];
/** Today, tomorrow, the far edge Stripe accepts, and one already gone. */
const STARTS = [
  undefined, TODAY, TODAY + 1, TODAY + 15, TODAY + MAX_START_DAYS_AHEAD, TODAY - 3,
];

type Case = { rate: number; balance: number; start: number | undefined };
const CASES: Case[] = [];
for (const rate of RATES) {
  for (const balance of BALANCES) {
    for (const start of STARTS) CASES.push({ rate, balance, start });
  }
}

const build = (c: Case) =>
  paymentSchedule({
    amountPence: c.rate,
    dueTodayPence: c.balance || undefined,
    startDay: c.start,
  });

const label = (c: Case) =>
  `rate ${c.rate}, balance ${c.balance}, start ${c.start === undefined ? "none" : c.start - TODAY}`;

describe(`every arrangement the form can produce (${CASES.length} of them)`, () => {
  it("charges today exactly what it says it charges today", () => {
    for (const c of CASES) {
      const s = build(c);
      /* The whole contract in one line: what leaves the card today is the
         balance owed, plus the first month only when the monthly cycle
         starts today. Nothing else, ever. */
      const expected = s.dueTodayPence + (s.deferred ? 0 : s.monthlyPence);
      expect(s.todayPence, label(c)).toBe(expected);
    }
  });

  it("never defers a date that is today or past, and always defers a future one", () => {
    for (const c of CASES) {
      const s = build(c);
      const shouldDefer = c.start !== undefined && c.start > TODAY;
      expect(s.deferred, label(c)).toBe(shouldDefer);
      expect(s.startDay === null, label(c)).toBe(!shouldDefer);
    }
  });

  it("picks the one checkout shape Stripe will actually accept", () => {
    for (const c of CASES) {
      const s = build(c);
      const expected =
        s.dueTodayPence === 0
          ? "subscription"
          : s.deferred
            ? "balance-then-subscription"
            : "subscription-with-balance";
      expect(s.shape, label(c)).toBe(expected);
      /* The one Stripe refuses: a one-off line beside a future anchor with
         no proration. If this ever pairs up, checkout 500s at the moment a
         client is paying. */
      const forbidden = s.shape === "subscription-with-balance" && s.deferred;
      expect(forbidden, label(c)).toBe(false);
    }
  });

  it("carries the monthly rate through untouched", () => {
    for (const c of CASES) {
      expect(build(c).monthlyPence, label(c)).toBe(c.rate);
    }
  });

  it("never invents money and never loses a penny", () => {
    for (const c of CASES) {
      const s = build(c);
      expect(s.dueTodayPence, label(c)).toBe(c.balance);
      expect(Number.isInteger(s.todayPence), label(c)).toBe(true);
      expect(s.todayPence, label(c)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("what every arrangement says out loud", () => {
  it("states a figure whenever money moves today, and says nothing when it does not", () => {
    for (const c of CASES) {
      const s = build(c);
      const lines = scheduleLines(s);
      if (s.todayPence > 0) {
        expect(lines.today, label(c)).toContain(displayPrice(s.todayPence));
        expect(lines.today.toLowerCase(), label(c)).not.toContain("nothing today");
      } else {
        expect(lines.today, label(c)).toBe("Nothing today.");
      }
      // The monthly rate is named in every single one.
      expect(lines.monthly, label(c)).toContain(displayPrice(s.monthlyPence));
    }
  });

  it("never claims nothing was taken when something was", () => {
    for (const c of CASES) {
      const s = build(c);
      const after = scheduleAfterLines(s);
      if (s.todayPence > 0) {
        expect(after.today.toLowerCase(), label(c)).not.toMatch(/nothing has been taken/);
        expect(after.today, label(c)).toContain(displayPrice(s.todayPence));
      }
    }
  });

  it("names the start date in the words whenever one is deferred", () => {
    for (const c of CASES) {
      const s = build(c);
      if (!s.deferred) continue;
      const lines = scheduleLines(s);
      const rows = scheduleRows(s);
      // Some month name, in both the sentence and the table.
      expect(`${lines.today} ${lines.monthly}`, label(c)).toMatch(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/);
      expect(rows.map((r) => r.label).join(" "), label(c)).toMatch(/^Today From /);
    }
  });

  it("puts today first and the recurring second, in every table", () => {
    for (const c of CASES) {
      const rows = scheduleRows(build(c));
      expect(rows, label(c)).toHaveLength(2);
      expect(rows[0].label, label(c)).toBe("Today");
    }
  });
});

describe("every arrangement fits a single text message", () => {
  /* The tightest budget in the system: the longest first name a client
     plausibly has, the biggest numbers the form accepts, and the link. */
  const LINK = "suthperformance.com/o/k7m2xq9raf";
  const NAMES = ["Sam", "Christopher", "Konstantinos", "Alexandrina"];

  it("one segment, plain GSM-7, for every case and every name", () => {
    const failures: string[] = [];
    for (const c of CASES) {
      const s = build(c);
      for (const name of NAMES) {
        const body = assembleSms(defaultInviteSmsMessage(name, "payment", s), LINK);
        if (segments(body) !== 1 || !isGsm7(body)) {
          failures.push(`${name} / ${label(c)}: ${body.length} chars — ${body}`);
        }
      }
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });

  it("the schedule fragment is always plain GSM-7 on its own", () => {
    for (const c of CASES) {
      const text = scheduleSms(build(c));
      expect(isGsm7(text), `${label(c)}: ${text}`).toBe(true);
    }
  });
});

describe("the signed link carries every arrangement back intact", () => {
  it("round-trips rate, balance and date to the penny and the day", () => {
    for (const c of CASES) {
      // Only in-band values are ever written to a link.
      if (c.balance !== 0 && (c.balance < DUE_TODAY_MIN_PENCE || c.balance > DUE_TODAY_MAX_PENCE)) continue;
      const startDay = c.start !== undefined && c.start > TODAY ? c.start : undefined;
      const token = createInvite({
        name: "Sam Reeves",
        email: "",
        phone: "",
        kind: "payment",
        amountPence: c.rate,
        ...(c.balance ? { dueTodayPence: c.balance } : {}),
        ...(startDay ? { startDay } : {}),
      });
      const read = readInvite(token);
      expect(read.ok, label(c)).toBe(true);
      if (!read.ok) continue;
      expect(read.invite.amountPence, label(c)).toBe(c.rate);
      expect(read.invite.dueTodayPence ?? 0, label(c)).toBe(c.balance);
      expect(read.invite.startDay, label(c)).toBe(startDay);

      // And the schedule rebuilt from the link is the same one Ben saw.
      const fromLink = paymentSchedule({
        amountPence: read.invite.amountPence!,
        dueTodayPence: read.invite.dueTodayPence,
        startDay: read.invite.startDay,
      });
      expect(fromLink.todayPence, label(c)).toBe(build(c).todayPence);
      expect(fromLink.shape, label(c)).toBe(build(c).shape);
    }
  });
});

describe("an edited message is held to the same standard as the default", () => {
  const LINK = "suthperformance.com/o/k7m2xq9raf";
  /* The signed-token fallback, which is what goes out when the invite store
     is unreachable. It is nearly a hundred characters longer than the short
     link, and it is the length that decides whether anything sends at all. */
  const FALLBACK = `suthperformance.com/o/${"a".repeat(100)}.${"b".repeat(22)}`;

  it("always ends with the link, whatever was typed", () => {
    for (const typed of ["Morning!", "  spaces  ", "line one\nline two", "£100 today"]) {
      const check = checkSmsMessage(typed, LINK);
      expect(check.body.endsWith(LINK), typed).toBe(true);
    }
  });

  it("measures the real link, so the fallback cannot silently fail to send", () => {
    const short = checkSmsMessage(defaultInviteSmsMessage("Sam", "payment", build({ rate: 6000, balance: 10000, start: TODAY + 10 })), LINK);
    const long = checkSmsMessage(short.message, FALLBACK);
    expect(short.segments).toBe(1);
    expect(long.segments).toBeGreaterThan(1);
    // Still sendable, and honest about the cost.
    expect(long.ok).toBe(true);
    expect(long.warning).toMatch(/texts/i);
  });

  it("refuses anything the transport would drop on the floor", () => {
    // lib/sms/send.ts refuses over three segments; nothing may reach it.
    const huge = checkSmsMessage("x".repeat(700), LINK);
    expect(huge.ok).toBe(false);
  });
});
