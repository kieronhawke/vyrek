/**
 * A lead as a record, rather than a stage in a variable.
 *
 * `lead-workflow.ts` answers "what is the next step". That was enough when the
 * screen was a list of buttons, and it is not enough now Ben needs to see the
 * booked call, what has already been sent, what is about to be sent, and why a
 * lead was closed. All of that is state that has to live somewhere, so it lives
 * here and the state machine stays the pure thing it is.
 *
 * WHY IT IS SEPARATE FROM THE COMPONENT
 * Every rule below is a decision about the business — when a lead has gone
 * cold, how long after onboarding to chase, whether an automation should fire
 * at all. Those are the parts worth testing and the parts that will change, and
 * neither should require rendering a card to check.
 *
 * NOTHING HERE SENDS ANYTHING. Automations are *described*, and the caller
 * performs them, for the same reason the state machine describes effects: a
 * function that might text a real person is not one you want to call in a test.
 */

import {
  STAGE_GUIDE,
  type LeadStage,
} from "@/lib/control/lead-workflow";

/* ── Why a lead was closed ──────────────────────────────────────────────
   Ben was closing leads with no reason attached, which makes the pipeline
   impossible to learn anything from: forty closed leads and no way to tell
   whether the problem is the price, the follow-up, or the people arriving.
   The reason is mandatory when closing, and deliberately short — a free-text
   box nobody fills in is worse than six options one of which is "other". */

export type CloseReason =
  | "too_expensive"
  | "went_elsewhere"
  | "not_ready"
  | "no_response"
  | "not_a_fit"
  | "other";

export const CLOSE_REASON_LABEL: Record<CloseReason, string> = {
  too_expensive: "Price",
  went_elsewhere: "Went elsewhere",
  not_ready: "Not ready yet",
  no_response: "Never replied",
  not_a_fit: "Not a fit",
  other: "Something else",
};

/** The order they are offered in: most common first, "other" always last. */
export const CLOSE_REASONS: CloseReason[] = [
  "no_response",
  "not_ready",
  "too_expensive",
  "went_elsewhere",
  "not_a_fit",
  "other",
];

/* ── What has happened to this lead ─────────────────────────────────────
   Ben's complaint was that he could not see whether a lead had been texted,
   and if so what it said. An automation you cannot see is one you stop
   trusting, and then you send the message again by hand and the person gets
   it twice. */

export type CommsKind = "sms" | "email" | "call" | "note" | "system";

export type CommsEvent = {
  id: string;
  /** ISO instant. Sorted newest first for reading. */
  atISO: string;
  kind: CommsKind;
  /** Inbound means they contacted us. Absent for notes and system entries. */
  inbound?: boolean;
  /** What was actually sent or said, not a template name. */
  body: string;
  /** True when this went out on its own rather than because Ben pressed it. */
  automated?: boolean;
};

export type BookedCall = {
  /** The booking system's own ref, so the two can be reconciled. */
  ref: string;
  startISO: string;
  minutes: number;
};

export type LeadRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  segment: string;
  source: string;
  stage: LeadStage;
  /** ISO instant the lead arrived. Age is derived, never stored. */
  createdISO: string;
  /** ISO instant the stage last changed, which is what "overdue" measures. */
  stageSinceISO: string;
  /**
   * Set when they book through our own booking system. Most leads arrive with
   * one already, because the funnel books the call before it creates the lead.
   */
  booking?: BookedCall;
  /** Off means nothing sends itself for this person. Ben's override. */
  automation: boolean;
  closeReason?: CloseReason;
  timeline: CommsEvent[];
};

/* ── Time ───────────────────────────────────────────────────────────────
   Every function takes `now`. None of them reads the clock themselves, so a
   test can state what time it is and the answer cannot drift. */

const HOUR = 3_600_000;

export function hoursBetween(fromISO: string, now: Date): number {
  return (now.getTime() - new Date(fromISO).getTime()) / HOUR;
}

/** How long this lead has sat in its current stage. */
export function hoursInStage(lead: LeadRecord, now: Date): number {
  return hoursBetween(lead.stageSinceISO, now);
}

export function isTerminal(stage: LeadStage): boolean {
  return stage === "client" || stage === "lost";
}

/* ── Abandoned ──────────────────────────────────────────────────────────
   Not a stage. A lead nobody has closed and nobody is working is not in a
   different part of the process, it is in the same part and being ignored,
   and calling it a stage would let it be moved there deliberately, which is
   the opposite of the point.

   So it is derived: still open, well past what this step should take, and
   nothing has come back from them. Three times the stage target rather than
   one, because one target is "chase them" and this is "admit it". */

export const ABANDON_MULTIPLE = 3;

export function isAbandoned(lead: LeadRecord, now: Date): boolean {
  if (isTerminal(lead.stage)) return false;
  /*
   * A lead at "new" has not been contacted by anyone. If they have sat there
   * for days that is not them going quiet, it is us never replying, and
   * telling Ben a lead he has never spoken to is "worth closing" would be
   * exactly the wrong conclusion. That one stays in the needs-you column
   * however old it gets.
   */
  if (lead.stage === "new") return false;
  const target = STAGE_GUIDE[lead.stage].targetHours;
  if (target === undefined) return false;
  if (hoursInStage(lead, now) <= target * ABANDON_MULTIPLE) return false;
  // If they have replied since the stage changed, somebody is still talking.
  return !hasRepliedInStage(lead, now);
}

/** Whether anything inbound arrived after the lead entered its stage. */
export function hasRepliedInStage(lead: LeadRecord, _now: Date): boolean {
  const since = new Date(lead.stageSinceISO).getTime();
  return lead.timeline.some(
    (e) => e.inbound && new Date(e.atISO).getTime() >= since,
  );
}

/* ── What is about to happen on its own ─────────────────────────────────
   Described, never performed. The screen renders these so Ben can see what
   the system is going to do before it does it, and switch it off per lead if
   he wants to handle somebody himself. */

export type Automation = {
  id: string;
  /** What it will do, in the words Ben would use. */
  label: string;
  /** ISO instant it fires. */
  dueISO: string;
  kind: "sms" | "email";
  /**
   * The template whose wording actually goes out, in lib/comms/templates.ts.
   *
   * Not decoration. The one-hour call reminder shipped as an automation with
   * no editable template behind it, which is the worst combination there is:
   * it sends itself and Ben cannot change a word of it. Naming the template
   * here means a test can assert every automation has one.
   */
  templateId: string;
};

/**
 * The reminder before a booked call, and the onboarding chase.
 *
 * CALL REMINDER — one hour before. Far enough ahead to still travel or find a
 * quiet room, close enough that it is not forgotten again by the time it
 * matters. Only for a call that has not happened yet.
 *
 * ONBOARDING CHASE — two days, then five, then Ben himself. The first two are
 * automatic because the link genuinely does go to spam; the third is not,
 * because at that point an automated message is the wrong thing and a person
 * writing one sentence is the right one. It is offered as a task, not sent.
 */
export function pendingAutomations(lead: LeadRecord, now: Date): Automation[] {
  if (!lead.automation || isTerminal(lead.stage)) return [];
  const out: Automation[] = [];

  if (lead.booking && lead.stage === "call_booked") {
    const start = new Date(lead.booking.startISO).getTime();
    const remindAt = start - HOUR;
    if (remindAt > now.getTime()) {
      out.push({
        id: `${lead.id}:call-reminder`,
        label: "Reminder text an hour before the call",
        dueISO: new Date(remindAt).toISOString(),
        kind: "sms",
        templateId: "sms.reminder-1h",
      });
    }
  }

  if (lead.stage === "onboarding_sent" || lead.stage === "onboarding_pending") {
    const since = new Date(lead.stageSinceISO).getTime();
    const chases: [number, string][] = [
      [2, "Follow-up: the link may have gone to spam"],
      [5, "Second follow-up"],
    ];
    for (const [days, label] of chases) {
      const at = since + days * 24 * HOUR;
      if (at > now.getTime()) {
        out.push({
          id: `${lead.id}:chase-${days}`,
          label,
          dueISO: new Date(at).toISOString(),
          kind: "sms",
          templateId: "sms.follow-up",
        });
      }
    }
  }

  return out.sort((a, b) => (a.dueISO < b.dueISO ? -1 : 1));
}

/** An automation with the person it is about attached. */
export type QueuedSend = Automation & { leadId: string; leadName: string };

/**
 * Everything the system will send, across every lead, soonest first.
 *
 * The per-lead queue answers "what happens to this person". This answers the
 * question Ben actually asks before he goes to bed, which is "what is going
 * out overnight, and do I want any of it to". An automation nobody can see
 * the whole of is one you switch off entirely the first time it surprises you.
 */
export function sendQueue(leads: LeadRecord[], now: Date): QueuedSend[] {
  return leads
    .flatMap((l) =>
      pendingAutomations(l, now).map((a) => ({
        ...a,
        leadId: l.id,
        leadName: l.name,
      })),
    )
    .sort((a, b) => (a.dueISO < b.dueISO ? -1 : 1));
}

/**
 * When the automation has run out and it is Ben's turn.
 *
 * After the second chase, nothing else sends itself. Somebody who has ignored
 * an invite and two reminders does not need a third reminder, and pretending
 * otherwise is how a sequence becomes spam.
 */
export function needsPersonalMessage(lead: LeadRecord, now: Date): boolean {
  if (isTerminal(lead.stage)) return false;
  if (lead.stage !== "onboarding_sent" && lead.stage !== "onboarding_pending") {
    return false;
  }
  if (hasRepliedInStage(lead, now)) return false;
  return hoursInStage(lead, now) > 5 * 24;
}

/* ── The booked call ────────────────────────────────────────────────────
   Leads arrive having already picked a slot, so the card's job is to show
   which one and whether it has been and gone. */

export type CallState = "none" | "upcoming" | "imminent" | "passed";

/** Imminent is inside the hour, which is when the reminder has gone out. */
export function callState(lead: LeadRecord, now: Date): CallState {
  if (!lead.booking) return "none";
  const diff = new Date(lead.booking.startISO).getTime() - now.getTime();
  if (diff < 0) return "passed";
  if (diff <= HOUR) return "imminent";
  return "upcoming";
}

/**
 * A call that has finished and has no outcome recorded.
 *
 * The single most valuable prompt on the screen: the pipeline is worthless
 * the moment it contains calls nobody wrote down the result of.
 */
export function awaitingOutcome(lead: LeadRecord, now: Date): boolean {
  return lead.stage === "call_booked" && callState(lead, now) === "passed";
}

/* ── Sorting ────────────────────────────────────────────────────────────
   One order, so the top of the list is always the next thing to do. */

function rank(lead: LeadRecord, now: Date): number {
  if (awaitingOutcome(lead, now)) return 0; // a call happened; record it
  if (lead.stage === "new") return 1; // nobody has replied to them
  if (callState(lead, now) === "imminent") return 2; // starting within the hour
  if (isAbandoned(lead, now)) return 6; // still open, but gone quiet
  if (isTerminal(lead.stage)) return 7;
  return 4;
}

export function sortLeads(leads: LeadRecord[], now: Date): LeadRecord[] {
  return [...leads].sort((a, b) => {
    const r = rank(a, now) - rank(b, now);
    if (r !== 0) return r;
    // Within a band, whoever has been waiting longest.
    return hoursInStage(b, now) - hoursInStage(a, now);
  });
}

/* ── Counts for the top of the screen ───────────────────────────────────
   Deliberately three. A strip of eight numbers is a dashboard nobody reads. */

export type LeadCounts = {
  needsYou: number;
  waitingOnThem: number;
  abandoned: number;
};

export function leadCounts(leads: LeadRecord[], now: Date): LeadCounts {
  let needsYou = 0;
  let waitingOnThem = 0;
  let abandoned = 0;
  for (const l of leads) {
    if (isTerminal(l.stage)) continue;
    if (isAbandoned(l, now)) abandoned++;
    else if (awaitingOutcome(l, now) || l.stage === "new") needsYou++;
    else waitingOnThem++;
  }
  return { needsYou, waitingOnThem, abandoned };
}

/* ── Timeline helpers ───────────────────────────────────────────────────*/

export function sortTimeline(events: CommsEvent[]): CommsEvent[] {
  return [...events].sort((a, b) => (a.atISO < b.atISO ? 1 : -1));
}

/**
 * Add an entry.
 *
 * Ids are derived from the content and time rather than a counter, so
 * replaying the same action twice cannot produce two rows claiming to be
 * different events.
 */
export function logEvent(
  lead: LeadRecord,
  event: Omit<CommsEvent, "id">,
): LeadRecord {
  const id = `${lead.id}:${event.atISO}:${event.kind}:${event.body.length}`;
  if (lead.timeline.some((e) => e.id === id)) return lead;
  return { ...lead, timeline: [{ ...event, id }, ...lead.timeline] };
}

/** Close a lead. The reason is required, which is the whole point. */
export function closeLead(
  lead: LeadRecord,
  reason: CloseReason,
  now: Date,
): LeadRecord {
  return logEvent(
    {
      ...lead,
      stage: "lost",
      closeReason: reason,
      stageSinceISO: now.toISOString(),
    },
    {
      atISO: now.toISOString(),
      kind: "system",
      body: `Closed — ${CLOSE_REASON_LABEL[reason]}`,
    },
  );
}

/** Move a lead to a stage, stamping when it happened so "overdue" resets. */
export function moveTo(
  lead: LeadRecord,
  stage: LeadStage,
  now: Date,
): LeadRecord {
  if (stage === lead.stage) return lead;
  return {
    ...lead,
    stage,
    stageSinceISO: now.toISOString(),
    // Reopening clears the reason; a lead marked "price" that is now a client
    // would otherwise carry that forever.
    closeReason: stage === "lost" ? lead.closeReason : undefined,
  };
}
