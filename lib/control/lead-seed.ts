/**
 * A pipeline with something in it.
 *
 * ONE LEAD ROSTER
 * ---------------
 * Derived from `LEADS`, the same list the sidebar badge, the dashboard tile
 * and the command palette read. An earlier version of this file carried its
 * own eight people, which put a third lead roster in the codebase and made the
 * sidebar say six while the pipeline worked eight — the exact fault the
 * comment above `NEW_LEADS` in admin-shell.tsx was written to stop happening
 * again.
 *
 * So `LEADS` is who exists, and the table below is only the *detail* the
 * fixture has no room for: the booked slot, what has already been said, and
 * whether Ben has switched the automation off. A lead with no entry still
 * appears, mapped from its status, because a roster where only the interesting
 * people show up is not a roster.
 *
 * EVERYTHING IS RELATIVE TO NOW
 * -----------------------------
 * The fixture stores "waiting 31h" as a literal, which is right for about an
 * hour and quietly wrong forever after. These resolve against the moment the
 * screen renders, so the overdue markers always mean something.
 *
 * THE SPREAD IS DELIBERATE
 * ------------------------
 * One of each state Ben has to handle: a lead nobody has answered, a call that
 * has been and gone with no outcome written down, one starting within the
 * hour, an invite ignored for six days, and two that went quiet. A seed where
 * everything is fine demonstrates nothing.
 *
 * Everyone here is invented (lib/control/fictional-people.ts) and every record
 * carries Kieron's own inbox and handset, so a send wired to this data by
 * accident reaches him and nobody else.
 */

import { LEADS, type Lead } from "@/lib/control/fixtures";
import type { CommsEvent, LeadRecord } from "@/lib/control/lead-record";
import type { LeadStage } from "@/lib/control/lead-workflow";

const HOUR = 3_600_000;

/**
 * The fixture's five statuses onto the pipeline's stages.
 *
 * "Qualified" and "trial" have no equal here on purpose: the old vocabulary
 * described how promising a lead was, and this one describes what has actually
 * happened to them, which is the thing Ben can act on. Qualified means the call
 * happened and they are thinking; trial means they said yes and the invite has
 * gone.
 */
const STAGE_FROM_STATUS: Record<Lead["status"], LeadStage> = {
  new: "new",
  contacted: "contacted",
  call_booked: "call_booked",
  qualified: "deciding",
  trial: "onboarding_sent",
};

/** The segment as a word rather than a key. */
const SEGMENT_LABEL: Record<Lead["segment"], string> = {
  beginner: "Beginner",
  hyrox: "HYROX",
  faster: "Faster",
  unsure: "Unsure",
};

/** Booking refs, in the booking system's own alphabet: no vowels, no 0/1/I/O. */
const REFS = ["QK7RTB", "MW3PDC", "ZJ9FHS", "BN4VXT", "GD6KMR", "TC2WQY"];

type Detail = {
  /** Overrides the stage the status would have implied. */
  stage?: LeadStage;
  /** Hours ago it entered its current stage. Defaults to the lead's age. */
  stageHours?: number;
  /** Hours from now the call starts. Negative means it has already run. */
  callInHours?: number;
  automation?: boolean;
  timeline?: {
    hoursAgo: number;
    kind: CommsEvent["kind"];
    inbound?: boolean;
    body: string;
    automated?: boolean;
  }[];
};

const DETAIL: Record<string, Detail> = {
  // Nobody has replied to her yet, and she has a call booked for tomorrow.
  l_01: { callInHours: 26 },

  // The one that matters most: a call happened and nobody wrote down how it
  // went. Sorts to the top of the list for exactly that reason.
  l_02: {
    stage: "call_booked",
    stageHours: 70,
    callInHours: -3,
    timeline: [
      { hoursAgo: 70, kind: "sms", body: "Hi Alex, Ben here. Grabbed your slot for Tuesday 5:30pm — anything you want me to cover?", automated: true },
      { hoursAgo: 68, kind: "sms", inbound: true, body: "Perfect. Mainly the sled, I fall apart on it" },
      { hoursAgo: 4, kind: "sms", body: "Reminder: our call is in an hour.", automated: true },
    ],
  },

  // Invite sent, ignored for six days. Past both chases, so it is Ben's turn.
  l_03: {
    stage: "onboarding_sent",
    stageHours: 6 * 24,
    callInHours: -9 * 24,
    timeline: [
      { hoursAgo: 6 * 24, kind: "email", body: "Your account is ready — here is the link to set it up.", automated: true },
      { hoursAgo: 4 * 24, kind: "sms", body: "Follow-up: the link may have gone to spam.", automated: true },
      { hoursAgo: 24, kind: "sms", body: "Second follow-up.", automated: true },
    ],
  },

  // Starting within the hour. The reminder has already gone.
  l_04: {
    stageHours: 28,
    callInHours: 0.6,
    timeline: [
      { hoursAgo: 28, kind: "sms", body: "Hi Katie, Ben here — got you down for today. Speak shortly.", automated: true },
      { hoursAgo: 1, kind: "sms", body: "Reminder: our call is in an hour.", automated: true },
    ],
  },

  // Gone quiet, three times past what this step should take.
  l_07: {
    stage: "contacted",
    stageHours: 11 * 24,
    timeline: [
      { hoursAgo: 11 * 24, kind: "sms", body: "Hi Dean, Ben here. Two slots free this week — Wednesday 6pm or Thursday 7am?", automated: true },
    ],
  },

  // Also quiet, and switched off: Ben is handling this one himself.
  l_08: {
    stageHours: 18 * 24,
    automation: false,
    timeline: [
      { hoursAgo: 18 * 24, kind: "sms", body: "Hi Yasmin, Ben here — happy to have a chat whenever suits.", automated: true },
      { hoursAgo: 17 * 24, kind: "note", body: "Friend of Priya's. Do not automate this one, I will call her." },
    ],
  },

  // Invite went out this morning, so both chases are still queued. The one
  // lead on the board that shows the automation before it has fired.
  l_06: {
    stage: "onboarding_sent",
    stageHours: 8,
    callInHours: -30,
    timeline: [
      { hoursAgo: 30, kind: "call", body: "Straightforward yes. Wants to start Monday." },
      { hoursAgo: 8, kind: "email", body: "Your account is ready — here is the link to set it up.", automated: true },
    ],
  },

  // Thinking about it. One follow-up gone, one reply back.
  l_09: {
    stageHours: 4 * 24,
    callInHours: -5 * 24,
    timeline: [
      { hoursAgo: 4 * 24, kind: "call", body: "Keen but wants to talk to his partner about the time commitment." },
      { hoursAgo: 3 * 24, kind: "sms", body: "No rush at all — shout when you have had a think.", automated: true },
      { hoursAgo: 2 * 24, kind: "sms", inbound: true, body: "Thanks Ben, still thinking. Back to you this week" },
    ],
  },

  // Said yes on the call. Nothing sent yet, and the yes is cooling.
  l_10: {
    stage: "ready_to_onboard",
    stageHours: 5,
    callInHours: -6,
    timeline: [
      { hoursAgo: 5 * 24, kind: "sms", body: "Hi Erin, Ben here. Slot confirmed for Friday.", automated: true },
      { hoursAgo: 6, kind: "call", body: "Spoke for 25 minutes. Wants to start on the 12-week build before Birmingham." },
    ],
  },

  // Signed up. The one won lead on the board, so the celebration has
  // something to have been fired by.
  l_11: {
    stage: "client",
    stageHours: 12,
    callInHours: -5 * 24,
    timeline: [
      { hoursAgo: 3 * 24, kind: "email", body: "Your account is ready — here is the link to set it up.", automated: true },
      { hoursAgo: 12, kind: "system", body: "Account created. Now a paying client." },
    ],
  },
};

/**
 * Resolve the roster against a real moment.
 *
 * Takes `now` rather than reading the clock, so the caller decides. That is
 * what lets the server and the browser render identical markup, and what lets
 * a test state what time it is.
 */
export function seedLeads(now: Date): LeadRecord[] {
  const iso = (hoursFromNow: number) =>
    new Date(now.getTime() + hoursFromNow * HOUR).toISOString();

  return LEADS.map((l, i) => {
    const d = DETAIL[l.id] ?? {};
    const stageHours = d.stageHours ?? l.ageHours;
    const oldestEvent = Math.max(0, ...(d.timeline ?? []).map((e) => e.hoursAgo));
    /*
     * How long ago they arrived.
     *
     * The fixture's `ageHours` is its own number and the detail below carries
     * its own history, and the two disagreed: Yasmin read "in touch 28 hours
     * ago" directly above a text sent to her eighteen days earlier. A lead
     * cannot enter a stage, or be sent a message, before it exists — so the
     * arrival is the oldest of the three, not whichever the fixture happened
     * to say.
     */
    const ageHours = Math.max(l.ageHours, stageHours, oldestEvent);
    return {
      id: l.id,
      name: l.name,
      email: l.email ?? "kieronhawke@gmail.com",
      phone: l.phone ?? "07398790378",
      segment: SEGMENT_LABEL[l.segment],
      // The fixture has no source column, and inventing one per lead would be
      // a detail nobody can act on. The two that matter are whether they came
      // through the quiz or straight to the form.
      source: i % 3 === 0 ? "Quiz" : i % 3 === 1 ? "Contact form" : "Referral",
      stage: d.stage ?? STAGE_FROM_STATUS[l.status],
      createdISO: iso(-ageHours),
      stageSinceISO: iso(-stageHours),
      booking:
        d.callInHours === undefined
          ? undefined
          : { ref: REFS[i % REFS.length], startISO: iso(d.callInHours), minutes: 20 },
      automation: d.automation ?? true,
      timeline: (d.timeline ?? []).map((e, j) => ({
        id: `${l.id}:e${j}`,
        atISO: iso(-e.hoursAgo),
        kind: e.kind,
        inbound: e.inbound,
        body: e.body,
        automated: e.automated,
      })),
    };
  });
}
