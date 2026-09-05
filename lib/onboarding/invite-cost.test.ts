import { describe, expect, it } from "vitest";
import { createInvite, inviteUrl, inviteUrlForSms } from "./token";
import { paymentSchedule, scheduleSms } from "./schedule";
import { todayDay } from "./start-date";
import { onboardingInviteSms } from "@/lib/email/templates/onboarding-invite";
import { isGsm7, segments } from "@/lib/sms/messages";

/**
 * WHAT AN INVITE COSTS TO SEND.
 *
 * The first live invite went out as three segments and 12.7p. Worse,
 * lib/sms/send.ts refuses anything over three — so a client with a longer name
 * would have received nothing at all, silently.
 *
 * This pins the length so nobody lengthens a token field, a URL path or a line
 * of copy without seeing the bill move. It is the cheapest test in the suite
 * and it guards a cost that recurs on every client Ben ever signs.
 */

const SITE = "https://www.suthperformance.com";

/** A day still ahead whenever this runs, so the "from" clause is present. */
const FAR_DAY = todayDay() + 25;

function costOf(
  name: string,
  email: string,
  kind: "full" | "payment" = "full",
  /** The schedule as the route builds it: rate, optional balance, optional date. */
  money?: { amountPence: number; dueTodayPence?: number; deferred?: boolean } | null,
) {
  const token = createInvite({
    name,
    email,
    phone: "+447398790378",
    kind,
    ...(money ? { amountPence: money.amountPence } : {}),
    ...(money?.dueTodayPence ? { dueTodayPence: money.dueTodayPence } : {}),
    ...(money?.deferred ? { startDay: FAR_DAY } : {}),
  });
  // The stripped link, because that is the one the route actually sends. The
  // full https://www. form is twelve characters the phone adds back for free,
  // and measuring it here would test a message nobody receives.
  const link = inviteUrlForSms(token, SITE);
  const schedule = money
    ? scheduleSms(
        paymentSchedule({
          amountPence: money.amountPence,
          dueTodayPence: money.dueTodayPence,
          startDay: money.deferred ? FAR_DAY : undefined,
        }),
      )
    : null;
  const body = onboardingInviteSms(name.split(" ")[0], link, kind, schedule);
  return { body, segments: segments(body), gsm: isGsm7(body) };
}

/* The longest schedule the form can produce: the top of both bands, a date. */
const WORST = { amountPence: 200000, dueTodayPence: 1_000_000, deferred: true };

describe("the invite text", () => {
  it("fits in ONE segment", () => {
    const { segments: n } = costOf("Kieron Hawke", "kieron.hawke@gmail.com");
    expect(n).toBe(1);
  });

  it("still fits in one for a long first name", () => {
    // The name is billed twice — once in the greeting, once inside the link —
    // so "Sam" fitting proves nothing. These are the realistic worst cases.
    for (const name of [
      "Konstantinos Papadopoulos",
      "Christopher Worthington-Fairbairn",
      "Bartholomew Fitzgerald",
      "Alexandrina Vasilyeva",
    ]) {
      const { segments: n, body } = costOf(name, "someone@example.com");
      expect(n, `${name}: ${body.length} chars`).toBe(1);
    }
  });

  it("the email address never affects the length", () => {
    // It came out of the token; a long address must not cost anything.
    const short = costOf("Sam Reeves", "s@e.co");
    const long = costOf("Sam Reeves", "s".repeat(60) + "@averylongdomainname.co.uk");
    expect(long.body.length).toBe(short.body.length);
  });

  it("is plain GSM, so a segment stays 160 characters", () => {
    // One curly apostrophe halves every segment and doubles the bill.
    const { gsm, body } = costOf("Kieron Hawke", "kieron.hawke@gmail.com");
    expect(gsm, `non-GSM characters in: ${body}`).toBe(true);
  });

  it("the payment-only invite also fits in one", () => {
    // Different wording, same budget. It is not required to be shorter than
    // the full one — only to fit.
    expect(costOf("Konstantinos Papadopoulos", "s@e.co", "payment").segments).toBe(1);
  });

  /*
   * THE RATE AND THE DATE IN THE TEXT, AND WHAT THEY COST.
   *
   * They were added on purpose: a text carrying a link that asks for card
   * details is exactly the shape of a scam, and the agreed figure is the one
   * thing only Ben could know. It is what makes the message obviously real.
   *
   * ⚠️ THE TWO PATHS HAVE DIFFERENT BUDGETS, AND ONLY ONE OF THEM IS THE ONE
   * CLIENTS GET. With the invite store up — the normal case — the link is a
   * ten-character id and the whole message is about 104 characters. The signed
   * token is the store-down fallback and is 135 characters on its own, so with
   * the figure and the date it runs to two segments. That is a real cost and
   * it is measured rather than assumed, but it applies to a path taken when
   * something is already wrong, and two segments beats the alternative of
   * dropping the information that proves the text is genuine.
   */
  const SHORT_LINK = "suthperformance.com/o/k7m2xq9raf";

  it("fits in ONE segment on the short-link path, with the rate and the date", () => {
    for (const name of [
      "Konstantinos",
      "Christopher",
      "Bartholomew",
      "Alexandrina",
    ]) {
      const body = onboardingInviteSms(name, SHORT_LINK, "payment", "£2,000/mo from 30 Sept");
      expect(segments(body), `${body.length} chars: ${body}`).toBe(1);
      expect(isGsm7(body), `non-GSM in: ${body}`).toBe(true);
    }
  });

  /*
   * THE BALANCE OWED TODAY, IN THE TEXT.
   *
   * "£100 today, then £60/mo from 1 Oct" is about twenty characters more than
   * the rate alone. The short-link path — the one clients actually get — must
   * still fit in one segment at the TOP of both bands with a long first name,
   * because the day it does not, the longest arrangement Ben can type is the
   * one that costs him double, silently.
   */
  it("still fits in ONE segment on the short-link path with a balance, at the top of both bands", () => {
    const worst = scheduleSms(
      paymentSchedule({ amountPence: 200000, dueTodayPence: 1_000_000, startDay: FAR_DAY }),
    );
    expect(worst).toMatch(/^£10000 today, then £2000\/mo from \d{1,2} \w+$/);
    for (const name of ["Konstantinos", "Christopher", "Bartholomew", "Alexandrina"]) {
      const body = onboardingInviteSms(name, SHORT_LINK, "payment", worst);
      expect(segments(body), `${body.length} chars: ${body}`).toBe(1);
      expect(isGsm7(body), `non-GSM in: ${body}`).toBe(true);
    }
    // And the other balance wording, which is longer still.
    const both = scheduleSms(paymentSchedule({ amountPence: 200000, dueTodayPence: 1_000_000 }));
    expect(both).toBe("£12000 today (incl £10000 owed), then £2000/mo");
    for (const name of ["Konstantinos", "Alexandrina"]) {
      const body = onboardingInviteSms(name, SHORT_LINK, "payment", both);
      expect(segments(body), `${body.length} chars: ${body}`).toBe(1);
    }
  });

  it("stays inside the send limit even on the signed-token fallback", () => {
    // lib/sms/send.ts refuses anything over three segments — that is the line
    // that must never be crossed, because crossing it sends nothing at all.
    for (const name of ["Konstantinos Papadopoulos", "Christopher Worthington-Fairbairn"]) {
      const { segments: n, body } = costOf(name, "someone@example.com", "payment", WORST);
      expect(n, `${body.length} chars: ${body}`).toBeLessThanOrEqual(2);
      expect(isGsm7(body), `non-GSM in: ${body}`).toBe(true);
    }
  });

  it("uses the short path", () => {
    // /onboarding/ is eleven characters billed on every invite ever sent.
    expect(inviteUrl("abc.def", SITE)).toBe(`${SITE}/o/abc.def`);
  });
});
