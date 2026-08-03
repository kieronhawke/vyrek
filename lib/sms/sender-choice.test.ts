import { describe, expect, it } from "vitest";
import { SEED_TEMPLATES } from "@/lib/control/messaging";

/**
 * WHICH SENDER EACH MESSAGE SHOULD COME FROM.
 *
 * "SUTH" is free and looks like a company, and nobody can reply to it. So the
 * only question that matters per message is whether it expects an answer.
 *
 * This is a review of the shipped copy rather than of the code: a template
 * that ends in a question mark and goes out from a name nobody can reply to
 * asks something and then hangs up. It is the sort of thing that reads fine
 * in a diff and is obviously wrong on a phone.
 */

/** Messages that must come from the number, because they invite a reply. */
const EXPECTS_A_REPLY = ["checkin.quiet"];

describe("sender choice", () => {
  it("every template that asks a question is on the reply list", () => {
    for (const t of SEED_TEMPLATES.filter((x) => x.channel === "sms")) {
      const asks = /\?/.test(t.body);
      if (asks) {
        expect(
          EXPECTS_A_REPLY,
          `${t.key} asks a question but is not marked as needing a repliable sender`,
        ).toContain(t.key);
      }
    }
  });

  it("the ones on the reply list really do invite one", () => {
    // Guards the other direction: a template that stops asking should come
    // off the list, or it stays on the number for no reason.
    for (const key of EXPECTS_A_REPLY) {
      const t = SEED_TEMPLATES.find((x) => x.key === key);
      expect(t, `${key} is not a template any more`).toBeTruthy();
      expect(/\?/.test(t!.body), `${key} no longer asks anything`).toBe(true);
    }
  });

  it("no marketing SMS may use the branded sender", () => {
    // STOP has to reach something. Enforced in lib/sms/send.ts too; this
    // asserts the shipped set does not rely on that catch.
    const marketingSms = SEED_TEMPLATES.filter(
      (t) => t.channel === "sms" && t.classification === "marketing",
    );
    for (const t of marketingSms) {
      expect(EXPECTS_A_REPLY, `${t.key} is marketing and must stay repliable`).toContain(t.key);
    }
  });
});
