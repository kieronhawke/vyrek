/**
 * The lead pipeline, as a state machine.
 *
 * Ben's problem is not that he cannot see leads. It is that seeing a lead
 * does not tell him what to do about it, so a list of names sorted by age is
 * a list of decisions he has to make again every time he opens the page.
 *
 * So every stage answers one question: what is the single next thing to do,
 * and what happens when it is done. The screen renders that answer as a
 * button. Nothing here is a status the operator has to interpret.
 *
 * Pure on purpose. No React, no storage, no side effects: the transitions
 * are the part that has to be right, and they are the part worth testing.
 * Anything that actually sends a text or an email is described here as an
 * `effect` and performed by the caller.
 */

export type LeadStage =
  | "new"
  | "contacted"
  | "call_booked"
  | "call_made"
  | "deciding"
  | "ready_to_onboard"
  | "onboarding_sent"
  | "onboarding_pending"
  | "client"
  | "lost";

export type CallOutcome = "deciding" | "ready" | "not_interested";

/** Something the caller performs. The machine never does it itself. */
export type LeadEffect =
  | { kind: "sms"; template: "first-contact" | "follow-up" }
  | { kind: "email"; template: "onboarding-invite" }
  | { kind: "reminder"; inDays: number }
  | { kind: "celebrate"; level: "lead" | "client" };

export type LeadAction = {
  /** Stable id, so a click can be routed without matching on label. */
  id: string;
  /** What the button says. An instruction, not a status. */
  label: string;
  /** One line under it, when the button alone is not enough. */
  hint?: string;
  to: LeadStage;
  effects?: LeadEffect[];
  /** Renders quieter. For the outcome nobody wants but everybody needs. */
  muted?: boolean;
};

export const STAGE_LABEL: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  call_booked: "Call booked",
  call_made: "Call made",
  deciding: "Deciding",
  ready_to_onboard: "Ready to onboard",
  onboarding_sent: "Onboarding sent",
  onboarding_pending: "Waiting for account",
  client: "Client",
  lost: "Not proceeding",
};

/** Ordered, for the progress rail. `lost` is deliberately not on it. */
export const STAGE_ORDER: LeadStage[] = [
  "new",
  "contacted",
  "call_booked",
  "call_made",
  "deciding",
  "ready_to_onboard",
  "onboarding_sent",
  "onboarding_pending",
  "client",
];

export function stageIndex(stage: LeadStage): number {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
}

/** How far along, 0 to 1, for the rail. `lost` reads as 0 progress. */
export function stageProgress(stage: LeadStage): number {
  if (stage === "lost") return 0;
  return stageIndex(stage) / (STAGE_ORDER.length - 1);
}

/**
 * What to do next.
 *
 * The first action is the one the screen makes prominent; the rest are
 * alternatives. Every stage has at least one, except the two that are
 * genuinely finished.
 */
export function nextActions(stage: LeadStage): LeadAction[] {
  switch (stage) {
    case "new":
      return [
        {
          id: "contact",
          label: "Text them now",
          hint: "Sends the first-contact message and marks them contacted.",
          to: "contacted",
          effects: [{ kind: "sms", template: "first-contact" }],
        },
        {
          id: "contact-manual",
          label: "I have already spoken to them",
          to: "contacted",
          muted: true,
        },
      ];

    case "contacted":
      return [
        { id: "book", label: "Book a call", to: "call_booked" },
        {
          id: "called",
          label: "We spoke without booking",
          to: "call_made",
          muted: true,
        },
      ];

    case "call_booked":
      return [
        { id: "call-done", label: "Confirm the call happened", to: "call_made" },
        {
          id: "no-show",
          label: "They did not show",
          to: "deciding",
          effects: [{ kind: "sms", template: "follow-up" }],
          muted: true,
        },
      ];

    // The outcome step. Three ways a call ends, and each has its own path.
    case "call_made":
      return [
        {
          id: "outcome-ready",
          label: "They are in",
          hint: "Moves straight to sending the onboarding email.",
          to: "ready_to_onboard",
        },
        {
          id: "outcome-deciding",
          label: "They are deciding",
          hint: "Sends a follow-up text and puts them on a three-day reminder.",
          to: "deciding",
          effects: [
            { kind: "sms", template: "follow-up" },
            { kind: "reminder", inDays: 3 },
          ],
        },
        {
          id: "outcome-no",
          label: "Not for them",
          to: "lost",
          muted: true,
        },
      ];

    case "deciding":
      return [
        { id: "decided-yes", label: "They said yes", to: "ready_to_onboard" },
        {
          id: "nudge",
          label: "Send another follow-up",
          to: "deciding",
          effects: [
            { kind: "sms", template: "follow-up" },
            { kind: "reminder", inDays: 3 },
          ],
        },
        { id: "decided-no", label: "Not for them", to: "lost", muted: true },
      ];

    case "ready_to_onboard":
      return [
        {
          id: "send-onboarding",
          label: "Send the onboarding email",
          hint: "They get the invite link. You wait for them to create the account.",
          to: "onboarding_sent",
          effects: [{ kind: "email", template: "onboarding-invite" }],
        },
      ];

    case "onboarding_sent":
      return [
        {
          id: "await",
          label: "Waiting for them to sign up",
          hint: "Nothing to do. This moves itself when the account appears.",
          to: "onboarding_pending",
        },
        {
          id: "resend",
          label: "Resend the invite",
          to: "onboarding_sent",
          effects: [{ kind: "email", template: "onboarding-invite" }],
          muted: true,
        },
      ];

    case "onboarding_pending":
      return [
        {
          id: "activated",
          label: "Account created",
          hint: "Marks them a paying client.",
          to: "client",
          effects: [{ kind: "celebrate", level: "client" }],
        },
        {
          id: "chase",
          label: "Chase them",
          to: "onboarding_pending",
          effects: [
            { kind: "sms", template: "follow-up" },
            { kind: "reminder", inDays: 2 },
          ],
          muted: true,
        },
      ];

    case "client":
    case "lost":
      return [];
  }
}

/* ── One button, not six ────────────────────────────────────────────────
   The first version rendered every action a stage offered, plus a "move to
   any stage" row, plus the playbook. Six or seven controls per card, on a
   list of a dozen leads, which is a wall of buttons rather than a decision.

   So the screen asks one question per lead and offers one answer. Everything
   else — the alternatives, the overrides, closing — moves behind Edit, where
   it is still one click away and no longer competing for attention.

   THE ONE EXCEPTION is the call outcome. "How did it go" is a genuine fork
   with three answers and no default, and hiding two of them behind Edit would
   make the most important moment in the pipeline the fiddliest. A stage can
   say so, and only that one does. */

/** True when the stage is a question with several equal answers. */
export function isFork(stage: LeadStage): boolean {
  return stage === "call_made";
}

/** The single action the card leads with. Null at the end of the pipeline. */
export function primaryAction(stage: LeadStage): LeadAction | null {
  return nextActions(stage)[0] ?? null;
}

/**
 * Everything else this stage can do, for the Edit panel.
 * Empty at a fork, because the fork's answers are all on the card already.
 */
export function otherActions(stage: LeadStage): LeadAction[] {
  return isFork(stage) ? [] : nextActions(stage).slice(1);
}

/** Whether a stage still needs Ben. Drives the "needs you" count. */
export function needsAction(stage: LeadStage): boolean {
  return stage !== "client" && stage !== "lost" && stage !== "onboarding_pending";
}

/**
 * Apply an action. Returns the new stage and the effects to perform.
 * Unknown ids return the stage unchanged rather than throwing, because a
 * stale button in a stale tab should be inert, not an error.
 */
export function applyAction(
  stage: LeadStage,
  actionId: string,
): { stage: LeadStage; effects: LeadEffect[] } {
  const action = nextActions(stage).find((a) => a.id === actionId);
  if (!action) return { stage, effects: [] };
  return { stage: action.to, effects: action.effects ?? [] };
}

/* ── How to handle an enquiry ───────────────────────────────────────────
   The screen should not assume the operator remembers the playbook. Every
   stage carries the reasoning: why this step exists, what good looks like,
   and what the usual mistake is. Written as prose because it is read by a
   person, not parsed. */

export type StageGuide = {
  /** What is true right now, in one line. */
  what: string;
  /** The thing to do, and why it is that thing. */
  why: string;
  /** The common error at this step. */
  watch?: string;
  /** How long this stage should take before it is a problem. */
  targetHours?: number;
};

export const STAGE_GUIDE: Record<LeadStage, StageGuide> = {
  new: {
    what: "They have filled something in and nobody has replied yet.",
    why: "Speed to first contact is the single biggest lever on whether somebody answers at all. A text inside the hour is worth more than a perfect message tomorrow.",
    watch: "Do not wait until you have time for a proper conversation. The first message only has to prove a person read theirs.",
    targetHours: 4,
  },
  contacted: {
    what: "They know you exist and have not been booked in.",
    why: "The aim is a time in the diary, not a conversation over text. A call is where the plan gets explained and objections come out.",
    watch: "Long text threads feel like progress and rarely convert. Offer two specific times rather than asking when suits.",
    targetHours: 48,
  },
  call_booked: {
    what: "There is a call in the diary.",
    why: "Nothing to do but turn up. The reminder goes out automatically the day before.",
    watch: "If they go quiet before the call, send the reminder early rather than waiting for the no-show.",
    targetHours: 168,
  },
  call_made: {
    what: "You have spoken. This is the moment the outcome gets recorded.",
    why: "Record it now, honestly. A pipeline full of calls with no outcome is a pipeline nobody trusts, and the follow-up automation cannot fire without knowing which way it went.",
    watch: "Deciding is not a polite word for no. If it was a no, mark it a no; you will both be happier.",
    targetHours: 4,
  },
  deciding: {
    what: "They are thinking about it. A follow-up text has gone and a reminder is set.",
    why: "Most people who buy do not buy on the call. The job now is to stay present without becoming a nuisance.",
    watch: "Two follow-ups is attentive. Five is a reason to block the number. If the second gets nothing, let it rest.",
    targetHours: 336,
  },
  ready_to_onboard: {
    what: "They said yes. Nothing has been sent yet.",
    why: "Send the onboarding email while the yes is warm. Every hour between the decision and the link is an hour for it to cool.",
    watch: "Do not batch these up for the end of the day.",
    targetHours: 2,
  },
  onboarding_sent: {
    what: "The invite is with them.",
    why: "Their move. Mark it as waiting so it leaves your list and stops looking like something you have forgotten.",
    targetHours: 24,
  },
  onboarding_pending: {
    what: "Waiting for them to create the account.",
    why: "Nothing for you to do. This moves itself when the account appears.",
    watch: "If it has been more than two days, one chase is reasonable. The link may have gone to spam.",
    targetHours: 72,
  },
  client: {
    what: "Paying client. This is the end of the pipeline.",
    why: "They move to the client list and the coaching side takes over.",
  },
  lost: {
    what: "Not proceeding.",
    why: "Closed deliberately rather than left to rot. Reopen it if they come back.",
  },
};

/**
 * Whether a lead has sat in its stage longer than that stage should take.
 * Returns null where there is no target, so a client is never "overdue".
 */
export function isOverdue(stage: LeadStage, hoursInStage: number): boolean | null {
  const target = STAGE_GUIDE[stage].targetHours;
  if (target === undefined) return null;
  return hoursInStage > target;
}

/** The stage after this one on the happy path, for "what is next". */
export function nextStageOnHappyPath(stage: LeadStage): LeadStage | null {
  const actions = nextActions(stage);
  const primary = actions.find((a) => !a.muted);
  return primary && primary.to !== stage ? primary.to : null;
}
