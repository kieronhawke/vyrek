import { describe, expect, it } from "vitest";
import { createInvite, inviteUrl, inviteUrlForSms } from "./token";
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

function costOf(
  name: string,
  email: string,
  kind: "full" | "payment" = "full",
  amount?: string | null,
  startsOn?: string | null,
) {
  const token = createInvite({
    name,
    email,
    phone: "+447398790378",
    kind,
    ...(amount ? { amountPence: 200000 } : {}),
    ...(startsOn ? { startDay: 20700 } : {}),
  });
  // The stripped link, because that is the one the route actually sends. The
  // full https://www. form is twelve characters the phone adds back for free,
  // and measuring it here would test a message nobody receives.
  const link = inviteUrlForSms(token, SITE);
  const body = onboardingInviteSms(name.split(" ")[0], link, kind, amount, startsOn);
  return { body, segments: segments(body), gsm: isGsm7(body) };
}

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
      const body = onboardingInviteSms(name, SHORT_LINK, "payment", "£2,000", "30 Sept");
      expect(segments(body), `${body.length} chars: ${body}`).toBe(1);
      expect(isGsm7(body), `non-GSM in: ${body}`).toBe(true);
    }
  });

  it("stays inside the send limit even on the signed-token fallback", () => {
    // lib/sms/send.ts refuses anything over three segments — that is the line
    // that must never be crossed, because crossing it sends nothing at all.
    for (const name of ["Konstantinos Papadopoulos", "Christopher Worthington-Fairbairn"]) {
      const { segments: n, body } = costOf(
        name,
        "someone@example.com",
        "payment",
        "£2,000",
        "30 Sept",
      );
      expect(n, `${body.length} chars: ${body}`).toBeLessThanOrEqual(2);
      expect(isGsm7(body), `non-GSM in: ${body}`).toBe(true);
    }
  });

  it("uses the short path", () => {
    // /onboarding/ is eleven characters billed on every invite ever sent.
    expect(inviteUrl("abc.def", SITE)).toBe(`${SITE}/o/abc.def`);
  });
});
