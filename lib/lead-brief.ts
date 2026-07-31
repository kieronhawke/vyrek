/**
 * Turns a finished quiz into the brief Ben reads before he picks up the
 * phone, and maps the answers onto the goal values `/api/consultation`
 * already accepts.
 *
 * Before this existed the reveal linked to /free-consultation as a plain
 * link, so the lead re-typed their name, email and goal and every answer
 * they had just given was dropped. Ben would ring someone knowing nothing
 * about them, which is the opposite of the point of asking fourteen
 * questions.
 *
 * The brief travels in the existing `message` field, so it reaches both the
 * email and the consultation_requests row without a migration.
 */

import type { QuizAnswers } from "@/lib/quiz-flow";
import {
  INJURY_LABEL,
  INJURY_RECENCY_LABEL,
  LOCATION_LABEL,
  isBeginnerRail,
  programmeLabel,
} from "@/lib/quiz-flow";
import { sift, type SiftResult } from "@/lib/quiz-sift";

/** The fixed set `/api/consultation` validates against. */
export type ConsultationGoal =
  | "get-fit"
  | "lose-weight"
  | "first-hyrox"
  | "improve-hyrox-time"
  | "elite-ambitions"
  | "not-sure";

const GOAL_LABEL: Record<string, string> = {
  "lose-weight": "Lose weight",
  "get-stronger": "Feel stronger",
  "more-energy": "More energy",
  confidence: "Feel like themselves again",
  "family-health": "Healthy for their family",
};

const STARTING_POINT_LABEL: Record<string, string> = {
  "years-off": "Hasn't trained in years",
  "bit-active": "A bit active",
  "no-structure": "Trains with no structure",
  "was-fit-once": "Was fit once, wants it back",
};

const TRIED_BEFORE_LABEL: Record<string, string> = {
  several: "Started and stopped several times",
  "once-twice": "Tried once or twice",
  "first-go": "First real attempt",
};

const BARRIER_LABEL: Record<string, string> = {
  time: "time",
  "didnt-know-what": "not knowing what to do",
  boredom: "boredom",
  "gyms-intimidate": "gyms feel intimidating",
  injury: "injury",
  "doing-it-alone": "doing it alone",
};

const READINESS_LABEL: Record<string, string> = {
  "this-week": "Could start THIS WEEK",
  "this-month": "Could start this month",
  "just-looking": "Just looking for now",
};

const EXPERIENCE_LABEL: Record<string, string> = {
  never: "Never raced",
  "signed-up": "Signed up, not raced yet",
  "raced-few": "Raced once or twice",
  "raced-many": "Raced multiple times",
};

/**
 * Pick the closest consultation goal. Beginner answers map to the fitness
 * goals; athlete answers map to the HYROX ones.
 */
export function consultationGoal(a: QuizAnswers): ConsultationGoal {
  if (isBeginnerRail(a)) {
    if (a.goal === "lose-weight") return "lose-weight";
    if (a.goal) return "get-fit";
    return "not-sure";
  }
  const intent = a.intent ?? [];
  if (intent.includes("go-faster") || a.experience === "raced-many") {
    return "improve-hyrox-time";
  }
  if (intent.includes("first-hyrox") || a.experience === "never") {
    return "first-hyrox";
  }
  if (a.bestTime === "under-60") return "elite-ambitions";
  if (intent.length > 0) return "first-hyrox";
  return "not-sure";
}

function line(label: string, value: string | undefined | null): string | null {
  return value ? `${label}: ${value}` : null;
}

/**
 * The brief itself. Kept under the endpoint's 2000-character limit by
 * only emitting lines we actually have answers for.
 */
export function leadBrief(a: QuizAnswers, result: SiftResult = sift(a)): string {
  const beginner = isBeginnerRail(a);
  const barriers = (a.barriers ?? []).map((b) => BARRIER_LABEL[b] ?? b);

  const rows: Array<string | null> = [
    `--- FROM THE QUIZ (${beginner ? "beginner" : "HYROX"} path) ---`,
    line("Wants", result.route === "coached" ? "COACHING WITH BEN" : "self-serve"),
    result.explicit ? null : `(recommended by us, score ${result.score})`,
    line("Readiness", a.readiness ? READINESS_LABEL[a.readiness] : undefined),
    line("Plan", programmeLabel(a)),
    "",
    beginner ? line("Goal", a.goal ? GOAL_LABEL[a.goal] : undefined) : null,
    beginner
      ? line(
          "Starting from",
          a.startingPoint ? STARTING_POINT_LABEL[a.startingPoint] : undefined,
        )
      : null,
    beginner
      ? line(
          "History",
          a.triedBefore ? TRIED_BEFORE_LABEL[a.triedBefore] : undefined,
        )
      : null,
    beginner && barriers.length
      ? `Gets in the way: ${barriers.join(", ")}`
      : null,
    !beginner
      ? line(
          "Experience",
          a.experience ? EXPERIENCE_LABEL[a.experience] : undefined,
        )
      : null,
    !beginner && a.raceDate
      ? `Race booked: ${a.raceDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`
      : null,
    !beginner ? line("Best time", a.bestTime) : null,
    "",
    line("Days a week", a.days ? String(a.days) : undefined),
    line("Session length", a.sessionLength ? `${a.sessionLength} min` : undefined),
    line("Trains at", a.location ? LOCATION_LABEL[a.location] : undefined),
    a.injuries && a.injuries !== "none"
      ? `INJURY: ${INJURY_LABEL[a.injuries]}${
          a.injuryRecency
            ? ` (${INJURY_RECENCY_LABEL[a.injuryRecency].toLowerCase()})`
            : ""
        }`
      : line("Injuries", a.injuries ? INJURY_LABEL[a.injuries] : undefined),
  ];

  if (!result.explicit && result.reasons.length) {
    rows.push("", `Why we suggested that: ${result.reasons.join("; ")}.`);
  }

  return rows
    .filter((r) => r !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 1990);
}
