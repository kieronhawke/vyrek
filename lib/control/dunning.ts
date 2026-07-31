/**
 * THE DUNNING LADDER — docs/build-pack/spec/09 §5.
 *
 * Escalating, but friendly throughout. Ben's brand is warmth, so the payment
 * chasing has to sound like him rather than like a debt collector.
 *
 * HARD-RULES §6 is the rule this module exists to make impossible to break:
 * **never auto-cancel a client for non-payment.** At day 10 it stops being an
 * automated ladder and becomes a human decision. At day 14 the suggestion is
 * *pause*, not cancel. Someone struggling financially who gets treated well
 * comes back; someone auto-cancelled never does.
 *
 * A pure state machine, so spec/16 §6's "every transition, every edge" is
 * testable without a database, a clock or a payment provider.
 */

export type DunningChannel = "email" | "sms" | "sms+email" | "none";

export type DunningStep = {
  /** Stable id, written to `dunning_events.step`. */
  step: number;
  /** Days relative to the due date. Negative is before it. */
  dayOffset: number;
  channel: DunningChannel;
  /** Template key in the editable library. Copy never lives in code. */
  template: string;
  /** True when this rung notifies a human instead of messaging the client. */
  humanDecision: boolean;
  /** What the admin is being asked to do, if anything. */
  adminAction?: "review" | "suggest_pause";
  tone: string;
};

/**
 * The ladder exactly as specced. Ordered by dayOffset; nothing else in the
 * module assumes an order beyond that.
 */
export const DUNNING_LADDER: readonly DunningStep[] = [
  {
    step: 1,
    dayOffset: -3,
    channel: "email",
    template: "payment.due_soon",
    humanDecision: false,
    tone: "Heads-up, no action needed",
  },
  {
    step: 2,
    dayOffset: 0,
    channel: "sms+email",
    template: "payment.due_today",
    humanDecision: false,
    tone: "Light, assumes it is an oversight",
  },
  {
    step: 3,
    dayOffset: 3,
    channel: "sms",
    template: "payment.overdue_3",
    humanDecision: false,
    tone: "Friendly nudge with a payment link",
  },
  {
    step: 4,
    dayOffset: 7,
    channel: "email",
    template: "payment.overdue_7_from_ben",
    humanDecision: false,
    tone: "Personal, offers to talk if money is tight",
  },
  {
    step: 5,
    dayOffset: 10,
    channel: "none",
    template: "internal.overdue_10_admin_alert",
    humanDecision: true,
    adminAction: "review",
    tone: "Human decision required, no automated message",
  },
  {
    step: 6,
    dayOffset: 14,
    channel: "none",
    template: "internal.overdue_14_suggest_pause",
    humanDecision: true,
    adminAction: "suggest_pause",
    tone: "Suggest pause, never cancel",
  },
] as const;

export type DunningState = {
  /** The rung that should have fired most recently, or null before day -3. */
  currentStep: DunningStep | null;
  /** Rungs that should have fired by now and have not yet been sent. */
  due: DunningStep[];
  /** True once the ladder has handed over to a person. */
  awaitingHuman: boolean;
  /** Always false. Present so callers cannot invent an auto-cancel path. */
  shouldCancel: false;
};

export type DunningInput = {
  /** Whole days since the due date. Negative is before it. */
  daysOverdue: number;
  /** Steps already sent, by `step` id. Makes evaluation idempotent. */
  sentSteps?: number[];
  /** A paid invoice stops the ladder dead, whatever the day count. */
  paid?: boolean;
  /** A paused subscription stops chasing; that is the point of pausing. */
  paused?: boolean;
};

/**
 * Evaluate the ladder for one overdue payment.
 *
 * Idempotent by design: pass the steps already sent and it returns only what
 * is genuinely outstanding, so re-running the job after a crash cannot
 * double-message anyone.
 */
export function evaluateDunning({
  daysOverdue,
  sentSteps = [],
  paid = false,
  paused = false,
}: DunningInput): DunningState {
  if (paid || paused) {
    return {
      currentStep: null,
      due: [],
      awaitingHuman: false,
      shouldCancel: false,
    };
  }

  const sent = new Set(sentSteps);
  const reached = DUNNING_LADDER.filter((s) => daysOverdue >= s.dayOffset);
  const due = reached.filter((s) => !sent.has(s.step));

  return {
    currentStep: reached.length ? reached[reached.length - 1] : null,
    due,
    // Once day 10 is reached the ladder is a human's problem, whether or not
    // the alert has been actioned.
    awaitingHuman: reached.some((s) => s.humanDecision),
    shouldCancel: false,
  };
}

/**
 * The guard that enforces HARD-RULES §6 at the point of action.
 *
 * Any code path that wants to cancel a subscription for non-payment has to
 * come through here, and it always refuses. Cancelling remains possible, but
 * only as an explicit human action recorded against a user id — which is
 * exactly the distinction the rule is protecting.
 */
export function mayAutoCancelForNonPayment(): false {
  return false;
}

/** How many days past due before a human must be involved. */
export const HUMAN_DECISION_DAY = 10;

/** The day the system suggests pausing. It never suggests cancelling. */
export const SUGGEST_PAUSE_DAY = 14;
