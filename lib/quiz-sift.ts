/**
 * The sift: which of the three funnel outcomes a finished quiz routes to.
 *
 * Two coached outcomes (beginner door, HYROX door) both end at a free call
 * with Ben and a £100-150/mo package agreed on that call. The third routes
 * to Suth Club, the self-serve tier.
 *
 * Users tell us directly on the sift screen. When they pick "show me both"
 * we recommend rather than dither, using the score below. We never ask a
 * consumer their budget: it depresses completion and support preference is
 * a better proxy anyway.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 5.4.
 */

import type { QuizAnswers } from "@/lib/quiz-flow";

export type FunnelRoute = "coached" | "club";

export type SiftResult = {
  route: FunnelRoute;
  /** True when the user chose outright, false when we recommended. */
  explicit: boolean;
  /** Positive scores lean coached. Only meaningful when `explicit` is false. */
  score: number;
  /**
   * Plain-English reasons behind a recommendation, strongest first. Used for
   * the "based on what you've told us" line on the reveal, and passed to Ben
   * on the lead so he opens the call already knowing why.
   */
  reasons: string[];
};

type Signal = {
  points: number;
  reason: string;
  applies: (a: QuizAnswers) => boolean;
};

/**
 * Ordered strongest-first so `reasons` reads sensibly when truncated.
 * Negative signals are the ones that should pull someone towards the club:
 * a person who is "just looking" does not want a phone call today.
 */
const SIGNALS: Signal[] = [
  {
    points: -3,
    reason: "you told us you're just looking for now",
    applies: (a) => a.readiness === "just-looking",
  },
  {
    points: 2,
    reason: "you've a date to work back from",
    applies: (a) => Boolean(a.raceDate),
  },
  {
    points: 2,
    reason: "you've started before and it didn't stick",
    applies: (a) => a.triedBefore === "several",
  },
  {
    points: 2,
    reason: "doing it on your own is the bit that gets in the way",
    applies: (a) =>
      (a.barriers ?? []).some(
        (b) => b === "doing-it-alone" || b === "gyms-intimidate",
      ),
  },
  {
    points: 2,
    reason: "there's an injury worth a human eye on it",
    applies: (a) => Boolean(a.injuries) && a.injuries !== "none",
  },
  {
    points: 2,
    reason: "you're chasing a specific time",
    applies: (a) =>
      (a.intent ?? []).includes("go-faster") || a.experience === "raced-many",
  },
  {
    points: 1,
    reason: "you can train four or more days a week",
    applies: (a) => (a.days ?? 0) >= 4,
  },
  {
    points: -1,
    reason: "two days a week suits a plan you run yourself",
    applies: (a) => a.days === 2,
  },
  {
    points: -2,
    reason: "you're keeping things open for now",
    applies: (a) =>
      !a.raceDate && !a.goal && (a.barriers ?? []).length === 0,
  },
];

/**
 * Score a set of answers. Exported separately from `sift` so the admin lead
 * view can show Ben the working, not just the verdict.
 */
export function scoreAnswers(answers: QuizAnswers): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];
  for (const signal of SIGNALS) {
    if (!signal.applies(answers)) continue;
    score += signal.points;
    reasons.push(signal.reason);
  }
  return { score, reasons };
}

/**
 * Decide the route. An explicit choice on the sift screen always wins over
 * the score: someone who says they want to train on their own gets the club,
 * however coachable their answers look.
 */
export function sift(answers: QuizAnswers): SiftResult {
  const { score, reasons } = scoreAnswers(answers);

  if (answers.supportPreference === "coached") {
    return { route: "coached", explicit: true, score, reasons };
  }
  if (answers.supportPreference === "self") {
    return { route: "club", explicit: true, score, reasons };
  }

  return {
    route: score > 0 ? "coached" : "club",
    explicit: false,
    score,
    // Only the reasons pointing the same way as the verdict make sense to
    // show back to the user.
    reasons: reasons.filter((r) =>
      score > 0
        ? SIGNALS.find((s) => s.reason === r)!.points > 0
        : SIGNALS.find((s) => s.reason === r)!.points < 0,
    ),
  };
}

/**
 * The one-line justification shown above the recommended button on the
 * reveal screen. Returns null for an explicit choice: telling someone why we
 * picked what they just picked is patronising.
 */
export function recommendationLine(result: SiftResult): string | null {
  if (result.explicit) return null;
  const [first, second] = result.reasons;
  if (!first) {
    return result.route === "coached"
      ? "Based on your answers, we'd start you with Ben."
      : "Based on your answers, we'd start you in Suth Club.";
  }
  const because = second ? `${first}, and ${second}` : first;
  return result.route === "coached"
    ? `Because ${because}, we'd start you with Ben.`
    : `Because ${because}, we'd start you in Suth Club.`;
}
