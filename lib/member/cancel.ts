/**
 * LEAVING.
 *
 * Kieron asked for this to be "a little bit tricky but still allow them to
 * cancel". That is a reasonable thing to want and a very easy thing to get
 * wrong, so the line is drawn here in code rather than left to the UI:
 *
 *   **Every stage has a way forward to cancelling that is visible, is one
 *   tap, and is never disabled.** No stage may be a dead end. No stage may
 *   hide the exit behind a scroll, a countdown, or a second confirmation of
 *   the same thing. A test asserts it for every stage, so a later change that
 *   quietly removes an exit fails rather than ships.
 *
 * Why be that firm about it: a cancellation flow that traps people generates
 * chargebacks, one-star reviews and, in the UK, a case under the Consumer
 * Protection from Unfair Trading Regulations. The commercial value of a
 * retained member who could not find the exit is negative.
 *
 * What the flow is *for*, then, is finding out why — which Ben genuinely
 * cannot learn any other way — and making an offer where an offer would
 * actually help. Somebody leaving because they are injured does not want a
 * discount, they want a pause. Offering the wrong thing is what makes these
 * flows feel like a fight.
 */

export type ReasonId =
  | "too_expensive"
  | "no_time"
  | "injured"
  | "not_working"
  | "goal_reached"
  | "other";

export type Offer = {
  /** What is being offered, in a few words. */
  label: string;
  /** Why it is the right answer to this reason, in one line. */
  body: string;
  /** What the button says. Never "Stay" — say what actually happens. */
  action: string;
};

export type Reason = {
  id: ReasonId;
  label: string;
  /**
   * The offer that fits this reason, or null where there is not an honest
   * one. "Goal reached" gets no save offer: somebody who came for a race,
   * did the race, and is done should be thanked rather than haggled with.
   */
  offer: Offer | null;
};

export const REASONS: Reason[] = [
  {
    id: "too_expensive",
    label: "It costs too much right now",
    offer: {
      label: "Pause instead, free, for up to three months",
      body: "Your plan and your history stay exactly where they are, and nothing is charged while it is paused.",
      action: "Pause my membership",
    },
  },
  {
    id: "no_time",
    label: "I have not got the time",
    offer: {
      label: "Ben rewrites the week around the time you do have",
      body: "Most people who say this are trying to fit a five-day plan into three days. Three good sessions beats five missed ones and Ben would rather write the three.",
      action: "Ask Ben to rewrite my week",
    },
  },
  {
    id: "injured",
    label: "I am injured",
    offer: {
      label: "Pause until you are back",
      body: "Nothing is charged while you are out, and Ben can write around most injuries if you tell him what it is.",
      action: "Pause while I recover",
    },
  },
  {
    id: "not_working",
    label: "It is not working for me",
    offer: {
      label: "Tell Ben what is not landing",
      body: "This is the one he most wants to hear about. If the plan is wrong he will change it, and if he cannot he will say so.",
      action: "Message Ben about it",
    },
  },
  {
    id: "goal_reached",
    label: "I got what I came for",
    /* No offer. Somebody who came for a race, ran the race, and is done
       should be congratulated and let go, not haggled with. Trying to save
       this one is how a coach loses the referral. */
    offer: null,
  },
  {
    id: "other",
    label: "Something else",
    offer: null,
  },
];

export function reasonById(id: string): Reason | undefined {
  return REASONS.find((r) => r.id === id);
}

export type StageId = "why" | "offer" | "confirm" | "done";

export type Stage = {
  id: StageId;
  /** The heading. */
  title: string;
  /**
   * The label on the control that continues towards cancelling.
   *
   * Every stage has one and it is never disabled. This is the property the
   * whole file exists to guarantee.
   */
  exit: string;
};

export const STAGES: Stage[] = [
  { id: "why", title: "Before you go — what happened?", exit: "Continue to cancel" },
  { id: "offer", title: "One thing worth considering", exit: "No thanks, cancel my membership" },
  { id: "confirm", title: "Cancel your membership", exit: "Cancel my membership" },
  { id: "done", title: "Cancelled", exit: "Close" },
];

export function stageById(id: StageId): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

/**
 * Where the exit goes from here.
 *
 * `why` and `offer` both lead to `confirm` rather than straight out: the
 * confirmation is where the athlete is told what actually happens to their
 * access and their data, which they are entitled to know before they act,
 * not after. That is the one legitimate speed bump in the flow.
 */
export function nextStage(from: StageId): StageId {
  switch (from) {
    case "why":
      return "offer";
    case "offer":
      return "confirm";
    case "confirm":
      return "done";
    case "done":
      return "done";
  }
}

/**
 * Skipping the offer when there is not one to make.
 *
 * A stage headed "one thing worth considering" with nothing in it is the
 * flow wasting somebody's time to no purpose, which is exactly the sort of
 * obstruction this is meant not to be.
 */
export function stageAfterReason(reason: ReasonId): StageId {
  return reasonById(reason)?.offer ? "offer" : "confirm";
}

export type CancelSummary = {
  reason: ReasonId;
  /** Free text. Optional — demanding an essay is another way to obstruct. */
  detail: string;
  /** ISO instant. Set by the caller, so this stays pure. */
  atISO: string;
};

/**
 * What Ben is told, and it is not a form.
 *
 * A one-line summary he can read on a phone. The detail is included when
 * there is any, because the sentence somebody types on their way out is
 * usually more use than the option they picked.
 */
export function cancellationNote(s: CancelSummary, firstName: string): string {
  const reason = reasonById(s.reason)?.label ?? "Unknown";
  const detail = s.detail.trim();
  /*
   * The label keeps its own casing.
   *
   * This used to lowercase the whole thing to make it read as part of the
   * sentence, which turned "I am injured" into "i am injured" — the first
   * person pronoun, lowercased, in the line Ben reads about somebody
   * leaving. Quoting it instead keeps the athlete's words as their words.
   */
  return detail
    ? `${firstName} cancelled — "${reason}". "${detail}"`
    : `${firstName} cancelled — "${reason}".`;
}
