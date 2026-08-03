import { describe, expect, it } from "vitest";
import { createInvite, inviteUrl } from "./token";
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

function costOf(name: string, email: string, kind: "full" | "payment" = "full") {
  const token = createInvite({ name, email, phone: "+447398790378", kind });
  const link = inviteUrl(token, SITE);
  const body = onboardingInviteSms(name.split(" ")[0], link, kind);
  return { body, segments: segments(body), gsm: isGsm7(body) };
}

describe("the invite text", () => {
  it("fits in two segments for an ordinary name", () => {
    const { segments: n } = costOf("Kieron Hawke", "kieron.hawke@gmail.com");
    expect(n).toBeLessThanOrEqual(2);
  });

  it("still fits for a long name and a long address", () => {
    // The real failure mode: send.ts refuses over three segments, so this is
    // the difference between a text arriving and one silently never sending.
    const { segments: n } = costOf(
      "Christopher Worthington-Fairbairn",
      "christopher.worthington-fairbairn@averylongcompanyname.co.uk",
    );
    expect(n).toBeLessThanOrEqual(3);
  });

  it("is plain GSM, so a segment stays 160 characters", () => {
    // One curly apostrophe halves every segment and doubles the bill.
    const { gsm, body } = costOf("Kieron Hawke", "kieron.hawke@gmail.com");
    expect(gsm, `non-GSM characters in: ${body}`).toBe(true);
  });

  it("the payment-only invite is shorter still", () => {
    const full = costOf("Kieron Hawke", "kieron.hawke@gmail.com", "full");
    const pay = costOf("Kieron Hawke", "kieron.hawke@gmail.com", "payment");
    expect(pay.body.length).toBeLessThan(full.body.length);
  });

  it("uses the short path", () => {
    // /onboarding/ is eleven characters billed on every invite ever sent.
    expect(inviteUrl("abc.def", SITE)).toBe(`${SITE}/o/abc.def`);
  });
});
