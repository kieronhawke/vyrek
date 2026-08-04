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
