import { describe, expect, it } from "vitest";
import {
  ABANDON_MULTIPLE,
  CLOSE_REASON_LABEL,
  awaitingOutcome,
  callState,
  closeLead,
  hasRepliedInStage,
  isAbandoned,
  leadCounts,
  logEvent,
  moveTo,
  needsPersonalMessage,
  pendingAutomations,
  sendQueue,
  sortLeads,
  sortTimeline,
  type LeadRecord,
} from "./lead-record";
import { STAGE_LABEL, STAGE_ORDER, isFork, otherActions, primaryAction } from "./lead-workflow";
import { seedLeads } from "./lead-seed";
import { LEADS } from "./fixtures";

/** A fixed now, so nothing here drifts with the clock. */
const NOW = new Date("2026-08-04T12:00:00Z");
const HOUR = 3_600_000;

function at(hoursAgo: number): string {
  return new Date(NOW.getTime() - hoursAgo * HOUR).toISOString();
}

function lead(over: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: "l1",
    name: "Test Person",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    segment: "HYROX",
    source: "Quiz",
    stage: "new",
    createdISO: at(1),
    stageSinceISO: at(1),
    automation: true,
    timeline: [],
    ...over,
  };
}

describe("abandoned", () => {
  /**
   * Abandoned is derived, not a stage. A lead nobody has closed and nobody is
   * working is in the same part of the process as the others and being
   * ignored — making it a stage would let it be *moved* there deliberately,
   * which is exactly the shrug this is meant to surface.
   */
  it("is not somewhere a lead can be put", () => {
    expect(STAGE_ORDER).not.toContain("abandoned");
    expect(Object.keys(STAGE_LABEL)).not.toContain("abandoned");
  });

  it("fires only well past the stage target, not at it", () => {
    // "contacted" targets 48 hours. One target is "chase them"; three is
    // "admit it".
    const c = (h: number) => lead({ stage: "contacted", stageSinceISO: at(h) });
    expect(isAbandoned(c(60), NOW)).toBe(false);
    expect(isAbandoned(c(48 * ABANDON_MULTIPLE + 1), NOW)).toBe(true);
  });

  /**
   * A lead at "new" has not been contacted by anybody. Sitting there for a
   * week is not them going quiet, it is us never replying, and telling Ben a
   * lead he has never spoken to is "worth closing" would be exactly the wrong
   * conclusion to draw from his own backlog.
   */
  it("never blames a lead nobody has contacted", () => {
    expect(isAbandoned(lead({ stage: "new", stageSinceISO: at(30 * 24) }), NOW)).toBe(false);
  });

  /* If they have replied since the stage changed, somebody is still talking
     and calling it abandoned would be wrong in the most annoying way. */
  it("never counts a lead who has replied", () => {
    const replied = lead({
      stage: "contacted",
      stageSinceISO: at(400),
      timeline: [
        { id: "e1", atISO: at(2), kind: "sms", inbound: true, body: "sorry, been away" },
      ],
    });
    expect(hasRepliedInStage(replied, NOW)).toBe(true);
    expect(isAbandoned(replied, NOW)).toBe(false);
  });

  it("ignores a reply that came in before this stage started", () => {
    const stale = lead({
      stage: "contacted",
      stageSinceISO: at(400),
      timeline: [
        { id: "e1", atISO: at(500), kind: "sms", inbound: true, body: "older reply" },
      ],
    });
    expect(isAbandoned(stale, NOW)).toBe(true);
  });

  it("leaves closed and won leads alone", () => {
    expect(isAbandoned(lead({ stage: "lost", stageSinceISO: at(999) }), NOW)).toBe(false);
    expect(isAbandoned(lead({ stage: "client", stageSinceISO: at(999) }), NOW)).toBe(false);
  });
});

describe("the booked call", () => {
  const booked = (startISO: string) =>
    lead({
      stage: "call_booked",
      booking: { ref: "BCDFGH", startISO, minutes: 20 },
    });

  it("knows whether it is coming, imminent or gone", () => {
    expect(callState(booked(new Date(NOW.getTime() + 48 * HOUR).toISOString()), NOW)).toBe("upcoming");
    expect(callState(booked(new Date(NOW.getTime() + 20 * 60_000).toISOString()), NOW)).toBe("imminent");
    expect(callState(booked(at(2)), NOW)).toBe("passed");
    expect(callState(lead(), NOW)).toBe("none");
  });

  /**
   * The most valuable prompt on the screen. A pipeline containing calls
   * nobody wrote down the result of is a pipeline nobody can trust, and it is
   * the failure the old table made easiest to commit.
   */
  it("flags a call that has been and gone with no outcome", () => {
    expect(awaitingOutcome(booked(at(2)), NOW)).toBe(true);
    expect(awaitingOutcome(booked(new Date(NOW.getTime() + HOUR).toISOString()), NOW)).toBe(false);
    // Already recorded, so nothing to prompt.
    expect(awaitingOutcome(lead({ stage: "call_made", stageSinceISO: at(2) }), NOW)).toBe(false);
  });
});

describe("automations", () => {
  it("reminds an hour before a booked call, and not after it starts", () => {
    const soon = new Date(NOW.getTime() + 3 * HOUR).toISOString();
    const auto = pendingAutomations(
      lead({ stage: "call_booked", booking: { ref: "R", startISO: soon, minutes: 20 } }),
      NOW,
    );
    expect(auto).toHaveLength(1);
    expect(auto[0].kind).toBe("sms");
    expect(new Date(auto[0].dueISO).getTime()).toBe(new Date(soon).getTime() - HOUR);

    // Inside the hour the reminder has already gone; nothing is still pending.
    const imminent = new Date(NOW.getTime() + 20 * 60_000).toISOString();
    expect(
      pendingAutomations(
        lead({ stage: "call_booked", booking: { ref: "R", startISO: imminent, minutes: 20 } }),
        NOW,
      ),
    ).toHaveLength(0);
  });

  it("chases onboarding at two days then five, in that order", () => {
    const auto = pendingAutomations(lead({ stage: "onboarding_sent", stageSinceISO: at(1) }), NOW);
    expect(auto.map((a) => a.id)).toEqual(["l1:chase-2", "l1:chase-5"]);
    expect(auto[0].dueISO < auto[1].dueISO).toBe(true);
  });

  it("drops a chase whose moment has already passed", () => {
    const auto = pendingAutomations(lead({ stage: "onboarding_sent", stageSinceISO: at(3 * 24) }), NOW);
    expect(auto.map((a) => a.id)).toEqual(["l1:chase-5"]);
  });

  /* Ben's override. Off means nothing sends itself for this person, which is
     the whole reason the switch exists. */
  it("sends nothing at all when automation is off for that lead", () => {
    const off = lead({ stage: "onboarding_sent", stageSinceISO: at(1), automation: false });
    expect(pendingAutomations(off, NOW)).toHaveLength(0);
  });

  it("sends nothing for a lead that is already won or closed", () => {
    expect(pendingAutomations(lead({ stage: "client", automation: true }), NOW)).toHaveLength(0);
    expect(pendingAutomations(lead({ stage: "lost", automation: true }), NOW)).toHaveLength(0);
  });

  /**
   * After two chases the sequence stops and it becomes Ben's job. Somebody
   * who has ignored an invite and two reminders does not need a third
   * reminder; that is how a follow-up sequence turns into spam.
   */
  it("hands over to Ben after the second chase rather than sending a third", () => {
    const cold = lead({ stage: "onboarding_pending", stageSinceISO: at(6 * 24) });
    expect(needsPersonalMessage(cold, NOW)).toBe(true);
    expect(pendingAutomations(cold, NOW)).toHaveLength(0);

    expect(needsPersonalMessage(lead({ stage: "onboarding_pending", stageSinceISO: at(24) }), NOW)).toBe(false);
  });

  it("does not ask Ben to chase somebody who has replied", () => {
    const replied = lead({
      stage: "onboarding_pending",
      stageSinceISO: at(6 * 24),
      timeline: [{ id: "e", atISO: at(1), kind: "sms", inbound: true, body: "on it" }],
    });
    expect(needsPersonalMessage(replied, NOW)).toBe(false);
  });
});

describe("closing", () => {
  it("records why, and writes it to the timeline", () => {
    const closed = closeLead(lead(), "too_expensive", NOW);
    expect(closed.stage).toBe("lost");
    expect(closed.closeReason).toBe("too_expensive");
    expect(closed.timeline[0].body).toContain(CLOSE_REASON_LABEL.too_expensive);
  });

  /* A lead closed on price who later signs up would otherwise carry "price"
     forever, and the closed-reason counts would be quietly wrong. */
  it("clears the reason when a closed lead is reopened", () => {
    const closed = closeLead(lead(), "not_ready", NOW);
    const reopened = moveTo(closed, "contacted", NOW);
    expect(reopened.closeReason).toBeUndefined();
  });

  it("stamps when the stage changed, so overdue restarts from the move", () => {
    const moved = moveTo(lead({ stageSinceISO: at(100) }), "contacted", NOW);
    expect(moved.stageSinceISO).toBe(NOW.toISOString());
  });

  it("is a no-op when the stage has not changed", () => {
    const l = lead({ stage: "contacted", stageSinceISO: at(50) });
    expect(moveTo(l, "contacted", NOW)).toBe(l);
  });
});

describe("timeline", () => {
  it("reads newest first", () => {
    const events = [
      { id: "a", atISO: at(10), kind: "sms" as const, body: "older" },
      { id: "b", atISO: at(1), kind: "sms" as const, body: "newer" },
    ];
    expect(sortTimeline(events).map((e) => e.body)).toEqual(["newer", "older"]);
  });

  /* Ids derive from content and time, so pressing a button twice or replaying
     an action cannot produce two rows claiming to be different events. */
  it("will not log the same event twice", () => {
    const once = logEvent(lead(), { atISO: at(1), kind: "sms", body: "hello" });
    const twice = logEvent(once, { atISO: at(1), kind: "sms", body: "hello" });
    expect(twice.timeline).toHaveLength(1);
  });
});

describe("order and counts", () => {
  /**
   * The top of the list is always the next thing to do: a call whose outcome
   * is unrecorded, then a lead nobody has answered, then one starting within
   * the hour. Abandoned and closed sink.
   */
  it("puts the next thing to do at the top", () => {
    const leads = [
      lead({ id: "closed", stage: "lost" }),
      lead({ id: "cold", stage: "contacted", stageSinceISO: at(500) }),
      lead({ id: "new", stage: "new", stageSinceISO: at(1) }),
      lead({
        id: "unrecorded",
        stage: "call_booked",
        stageSinceISO: at(30),
        booking: { ref: "R", startISO: at(2), minutes: 20 },
      }),
    ];
    expect(sortLeads(leads, NOW).map((l) => l.id)).toEqual([
      "unrecorded",
      "new",
      "cold",
      "closed",
    ]);
  });

  it("counts who needs Ben, who he is waiting on, and who went quiet", () => {
    const counts = leadCounts(
      [
        lead({ id: "a", stage: "new", stageSinceISO: at(1) }),
        lead({ id: "b", stage: "onboarding_pending", stageSinceISO: at(1) }),
        lead({ id: "c", stage: "contacted", stageSinceISO: at(500) }),
        lead({ id: "d", stage: "client" }),
      ],
      NOW,
    );
    expect(counts).toEqual({ needsYou: 1, waitingOnThem: 1, abandoned: 1 });
  });
});

describe("one button, not six", () => {
  it("leads with a single action everywhere except the call outcome", () => {
    expect(primaryAction("new")?.id).toBe("contact");
    expect(otherActions("new")).toHaveLength(1); // "already spoken to them"
    expect(isFork("new")).toBe(false);
  });

  /**
   * "How did the call go" is a real fork with three answers and no default.
   * Hiding two of them behind Edit would make the most important moment in
   * the pipeline the fiddliest one to record.
   */
  it("keeps all three call outcomes on the card", () => {
    expect(isFork("call_made")).toBe(true);
    expect(otherActions("call_made")).toHaveLength(0);
  });

  it("offers nothing once a lead is won or closed", () => {
    expect(primaryAction("client")).toBeNull();
    expect(primaryAction("lost")).toBeNull();
  });
});

describe("the seeded pipeline", () => {
  const seeded = seedLeads(NOW);

  /**
   * One lead roster.
   *
   * The sidebar badge, the dashboard tile and the command palette all read
   * `LEADS`. An earlier version of the seed carried its own eight people,
   * which made the sidebar say six while the pipeline worked eight — the
   * exact drift the comment above NEW_LEADS in admin-shell.tsx exists to stop.
   */
  it("is the same people as the fixture every other screen reads", () => {
    expect(seeded.map((l) => l.id)).toEqual(LEADS.map((l) => l.id));
    expect(seeded.map((l) => l.name)).toEqual(LEADS.map((l) => l.name));
  });

  /* A seed where everything is fine demonstrates nothing. Each of these is a
     state Ben has to handle, and each is the reason a piece of this screen
     exists at all. */
  it("contains every state the screen was built for", () => {
    expect(seeded.some((l) => l.stage === "new")).toBe(true);
    expect(seeded.some((l) => awaitingOutcome(l, NOW))).toBe(true);
    expect(seeded.some((l) => callState(l, NOW) === "imminent")).toBe(true);
    expect(seeded.some((l) => isAbandoned(l, NOW))).toBe(true);
    expect(seeded.some((l) => needsPersonalMessage(l, NOW))).toBe(true);
    expect(seeded.some((l) => !l.automation)).toBe(true);
    expect(seeded.some((l) => pendingAutomations(l, NOW).length > 0)).toBe(true);
  });

  /**
   * A lead cannot enter a stage, or be sent a message, before it exists.
   *
   * The fixture's age and the seed's history are written separately and drifted
   * apart: one lead read "came in 28 hours ago" directly above a text sent
   * eighteen days earlier.
   */
  it("never has a lead younger than its own history", () => {
    for (const l of seeded) {
      const created = new Date(l.createdISO).getTime();
      expect(new Date(l.stageSinceISO).getTime(), l.name).toBeGreaterThanOrEqual(created);
      for (const e of l.timeline) {
        expect(new Date(e.atISO).getTime(), `${l.name}: ${e.body}`).toBeGreaterThanOrEqual(created);
      }
    }
  });

  /* Nothing is stored as "31 hours ago". Every time on this screen is an
     offset from the moment it renders, so the demo cannot go stale. */
  it("is measured from the moment it is asked for", () => {
    const later = seedLeads(new Date(NOW.getTime() + 72 * HOUR));
    expect(later[0].createdISO).not.toBe(seeded[0].createdISO);
    for (const l of later) {
      expect(new Date(l.createdISO).getTime()).toBeLessThanOrEqual(
        NOW.getTime() + 72 * HOUR,
      );
    }
  });
});

describe("the send queue", () => {
  /**
   * Soonest first, across every lead. The order is the whole value: Ben reads
   * the top of this list to know what happens next, not to browse it.
   */
  it("gathers every lead's automations in the order they fire", () => {
    const soon = new Date(NOW.getTime() + 3 * HOUR).toISOString();
    const q = sendQueue(
      [
        lead({ id: "b", stage: "onboarding_sent", stageSinceISO: at(1) }),
        lead({ id: "a", stage: "call_booked", booking: { ref: "R", startISO: soon, minutes: 20 } }),
      ],
      NOW,
    );
    expect(q.map((x) => x.leadId)).toEqual(["a", "b", "b"]);
    for (let i = 1; i < q.length; i++) {
      expect(q[i - 1].dueISO <= q[i].dueISO).toBe(true);
    }
  });

  /* Carries who it is about. A queue of "follow-up text" with no name on it
     is a list nobody can act on. */
  it("says who each message is for", () => {
    const q = sendQueue([lead({ name: "Dean Fitzgerald", stage: "onboarding_sent", stageSinceISO: at(1) })], NOW);
    expect(q[0].leadName).toBe("Dean Fitzgerald");
  });

  it("leaves out anyone Ben has switched off", () => {
    const off = lead({ stage: "onboarding_sent", stageSinceISO: at(1), automation: false });
    expect(sendQueue([off], NOW)).toHaveLength(0);
  });
});
