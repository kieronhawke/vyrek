import { describe, expect, it } from "vitest";
import { isSigningUp, pendingClients, waitingLabel } from "./pending-clients";
import { seedLeads } from "./lead-seed";
import { CLIENTS } from "./fixtures";
import type { LeadRecord } from "./lead-record";

const NOW = new Date("2026-08-04T12:00:00Z");
const DAY = 86_400_000;

function lead(over: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "l1",
    name: "Test Person",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    segment: "HYROX",
    source: "Quiz",
    stage: "onboarding_sent",
    createdISO: new Date(NOW.getTime() - 10 * DAY).toISOString(),
    stageSinceISO: new Date(NOW.getTime() - 2 * DAY).toISOString(),
    automation: true,
    timeline: [],
    ...over,
  };
}

describe("who counts as signing up", () => {
  it("is the two stages where the invite is out and the account is not made", () => {
    expect(isSigningUp(lead({ stage: "onboarding_sent" }))).toBe(true);
    expect(isSigningUp(lead({ stage: "onboarding_pending" }))).toBe(true);
  });

  /* Before the invite they are still being sold to; after it they are a
     client. Neither is the handover this list exists to show. */
  it("is nobody earlier in the pipeline", () => {
    for (const stage of ["new", "contacted", "call_booked", "deciding", "ready_to_onboard"] as const) {
      expect(isSigningUp(lead({ stage })), stage).toBe(false);
    }
  });

  it("is nobody who finished, either way", () => {
    expect(isSigningUp(lead({ stage: "client" }))).toBe(false);
    expect(isSigningUp(lead({ stage: "lost" }))).toBe(false);
  });
});

describe("the pending list", () => {
  it("puts the longest wait first, as the one most likely to fall out", () => {
    const out = pendingClients(
      [
        lead({ id: "recent", stageSinceISO: new Date(NOW.getTime() - 1 * DAY).toISOString() }),
        lead({ id: "old", stageSinceISO: new Date(NOW.getTime() - 9 * DAY).toISOString() }),
      ],
      NOW,
    );
    expect(out.map((p) => p.id)).toEqual(["old", "recent"]);
  });

  /**
   * Five days is where the automatic chasing stops, so it is also where this
   * stops being "in progress" and starts being "stuck" — a different thing
   * that needs a different colour.
   */
  it("marks somebody stuck once the automatic chasing has run out", () => {
    const at = (d: number) =>
      pendingClients([lead({ stageSinceISO: new Date(NOW.getTime() - d * DAY).toISOString() })], NOW)[0];
    expect(at(4).stuck).toBe(false);
    expect(at(5).stuck).toBe(true);
  });

  it("keeps the lead's id, because it is the same person", () => {
    expect(pendingClients([lead({ id: "l_06" })], NOW)[0].id).toBe("l_06");
  });

  /**
   * A pending client has no tier, no plan, no billing date and no payment
   * method, because none of those exist yet. Writing them into CLIENTS with
   * placeholders would put people who are not paying into every count on the
   * console that means money.
   */
  it("never appears in the paying client roster", () => {
    const pending = pendingClients(seedLeads(NOW), NOW);
    expect(pending.length).toBeGreaterThan(0);
    for (const p of pending) {
      expect(CLIENTS.some((c) => c.id === p.id), p.name).toBe(false);
    }
  });

  it("carries the consultation when there was one", () => {
    const withCall = pendingClients(
      [lead({ booking: { ref: "QK7RTB", startISO: "2026-07-30T17:30:00Z", minutes: 20 } })],
      NOW,
    )[0];
    expect(withCall.calledOn).toContain("July");
    expect(pendingClients([lead()], NOW)[0].calledOn).toBeUndefined();
  });
});

describe("how it reads", () => {
  /* Nobody counts the day they are on, and a zero on a card looks like a bug. */
  it("says today and yesterday rather than counting to zero", () => {
    const p = (d: number) =>
      waitingLabel(pendingClients([lead({ stageSinceISO: new Date(NOW.getTime() - d * DAY).toISOString() })], NOW)[0]);
    expect(p(0)).toBe("Invited today");
    expect(p(1)).toBe("Invited yesterday");
    expect(p(4)).toBe("Invited 4 days ago");
  });
});
