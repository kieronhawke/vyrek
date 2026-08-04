/**
 * Suth Performance Quiz V3, types, programme matching, and date helpers.
 *
 * The 15-screen Marchon-Runna hybrid. See /docs/suth-quiz-v3-brief.md and
 * /docs/suth-quiz-v3-addendum.md for the spec.
 *
 * V2 lives at lib/quiz-flow-v2.ts (kept as a /quiz/v2 fallback). Once V3 is
 * verified live and converting, V2 can be deleted in a cleanup pass.
 */

export type IntentValue =
  | "first-hyrox"
  | "go-faster"
  | "doubles"
  | "getting-into"
  | "building"
  /* The two doors that are not about racing. Added 3 August 2026: before
     this, every option on screen one named HYROX, so somebody who had come
     to get fit had no honest answer and the quiz put them on the racing
     rail by default. See railForIntent below. */
  | "get-fit"
  | "lose-weight";

export type ExperienceValue =
  | "never"
  | "signed-up"
  | "raced-few"
  | "raced-many";

export type BestTimeValue =
  | "under-60"
  | "60-75"
  | "75-90"
  | "90-105"
  | "over-105"
  | "unknown";

export type ActivityValue =
  | "athletic"
  | "regular"
  | "occasional"
  | "returning"
  | "beginner";

export type SexValue = "men" | "women";
export type WeightUnit = "kg" | "lb";

export type DaysValue = 2 | 3 | 4 | 5 | 6;
export type SessionLengthValue = "30" | "45" | "60" | "90";
export type LocationValue = "gym-full" | "gym-standard" | "home";
export type PartnerValue = "solo" | "doubles" | "solo-partner-later";
export type InjuryValue =
  | "none"
  | "lower-back"
  | "knee"
  | "shoulder"
  | "achilles-calf"
  | "other";

/** Follow-up detail for a specific injury (lower back, knee, shoulder, achilles/calf) */
export type InjuryRecencyValue = "current" | "recent" | "past";
export type InjuryCareValue = "physio" | "self-managed" | "not-assessed";

export type Programme = "first-race" | "sub-90" | "doubles" | "pro";

/* ─── Onboarding funnel (docs/onboarding-funnel-proposal.md) ─────────── */

/**
 * Which door the user came through. Set by the entry surface where we know
 * it (a /personal-trainer page implies "beginner", a /hyrox page implies
 * "athlete") and asked on screen 1 only when we don't.
 */
export type QuizRail = "beginner" | "athlete";

/** Beginner-rail goal. Deliberately outcome-led, never body-shaming. */
export type GoalValue =
  | "lose-weight"
  | "get-stronger"
  | "more-energy"
  | "confidence"
  | "family-health";

export type StartingPointValue =
  | "years-off"
  | "bit-active"
  | "no-structure"
  | "was-fit-once";

export type TriedBeforeValue = "several" | "once-twice" | "first-go";

export type BarrierValue =
  | "time"
  | "didnt-know-what"
  | "boredom"
  | "gyms-intimidate"
  | "injury"
  | "doing-it-alone";

/**
 * The sift. The single screen that decides which of the three funnel
 * outcomes someone gets. Asked late, after they have invested, and never
 * phrased as a budget question.
 */
export type SupportPreference = "coached" | "self" | "unsure";

/** Readiness signal, coached route only. Tells Ben how warm the lead is. */
export type ReadinessValue = "this-week" | "this-month" | "just-looking";

export type QuizAnswers = {
  intent: IntentValue[];
  rail?: QuizRail;
  /**
   * Set only when the rail came from the entry surface (a ?rail= link from
   * a personal-training page), never when it came from screen one.
   *
   * Screen one is what sets the rail now, so "has a rail" can no longer
   * mean "skip screen one" — that would make the screen delete itself the
   * instant somebody answered it, throwing them onto screen two mid-tap.
   * Same shape as supportLocked, for the same reason.
   */
  railLocked?: boolean;
  goal?: GoalValue;
  startingPoint?: StartingPointValue;
  triedBefore?: TriedBeforeValue;
  barriers?: BarrierValue[];
  supportPreference?: SupportPreference;
  /** Set when the sift came from the URL rather than the screen. */
  supportLocked?: boolean;
  readiness?: ReadinessValue;
  /** Captured mid-flow, never at the end, never behind a password. */
  email?: string;
  /** Asked once, on the email screen, and carried to the final step. */
  marketingOptIn?: boolean;
  experience?: ExperienceValue;
  bestTime?: BestTimeValue;
  raceDate?: Date;
  activity?: ActivityValue;
  /** Sex for Hyrox station calibration (sled / wall ball / farmers carry) */
  sex?: SexValue;
  /** Body weight in kg (always stored internally as kg) */
  weight?: number;
  /** User's preferred display unit */
  weightUnit?: WeightUnit;
  days?: DaysValue;
  sessionLength?: SessionLengthValue;
  location?: LocationValue;
  equipment?: string[];
  partner?: PartnerValue;
  injuries?: InjuryValue;
  /** Follow-ups asked only when a specific injury is selected */
  injuryRecency?: InjuryRecencyValue;
  injuryTriggers?: string[];
  injuryCare?: InjuryCareValue;
};

/**
 * Determine the programme the user gets routed into.
 *
 * Doubles confirmed (either intent OR explicit partner) always wins.
 * "Solo for now, partner later" routes to a solo path and is flagged on the
 * customer record for a follow-up upgrade email (handled in /api/account/create).
 */
export function determineProgramme(answers: QuizAnswers): Programme {
  const intent = answers.intent ?? [];

  if (intent.includes("doubles") || answers.partner === "doubles") {
    return "doubles";
  }

  if (
    intent.includes("first-hyrox") ||
    intent.includes("getting-into") ||
    answers.experience === "never" ||
    answers.experience === "signed-up"
  ) {
    return "first-race";
  }

  if (
    intent.includes("go-faster") &&
    (answers.bestTime === "under-60" || answers.bestTime === "60-75")
  ) {
    return "pro";
  }

  if (intent.includes("go-faster")) {
    return "sub-90";
  }

  if (intent.includes("building")) {
    return "first-race";
  }

  return "first-race";
}

export const PROGRAMME_DISPLAY: Record<Programme, string> = {
  "first-race": "First Race",
  "sub-90": "Sub-90",
  doubles: "Doubles",
  pro: "Pro",
};

export const PROGRAMME_TAG: Record<Programme, string> = {
  "first-race": "FIRST RACE PROGRAMME",
  "sub-90": "SUB-90 PROGRAMME",
  doubles: "DOUBLES PROGRAMME",
  pro: "PRO PROGRAMME",
};

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Default training start = next Tuesday from `today`. If `today` is itself
 * Tuesday, returns the Tuesday a week from today (never starts the user the
 * same day they finish the quiz).
 */
export function determineStartDate(today: Date = new Date()): Date {
  const day = today.getDay(); // 0 Sun ... 2 Tue ... 6 Sat
  const daysUntilTuesday = (2 - day + 7) % 7 || 7;
  const tuesday = new Date(today);
  tuesday.setHours(0, 0, 0, 0);
  tuesday.setDate(today.getDate() + daysUntilTuesday);
  return tuesday;
}

/**
 * Calculate the race date. Honours the user's race date if they gave us one;
 * otherwise projects `weeks` weeks (default 12) from `startDate`.
 */
export function determineRaceDate(
  startDate: Date,
  userRaceDate?: Date,
  weeks = 12,
): Date {
  if (userRaceDate) return userRaceDate;
  const race = new Date(startDate);
  race.setDate(startDate.getDate() + weeks * 7);
  return race;
}

export function calculateWeeksUntilRace(
  raceDate: Date,
  today: Date = new Date(),
): number {
  const ms = raceDate.getTime() - today.getTime();
  return Math.max(1, Math.round(ms / (ONE_DAY_MS * 7)));
}

export type ProgrammeFromUrl = "first-race" | "sub-90" | "doubles" | "pro";

/**
 * `/quiz?intent=first-hyrox`, pre-selects Screen 2 option, doesn't skip
 * the screen (user still confirms). Maps URL intents into our internal set.
 */
export function applyIntentPreSelect(
  current: QuizAnswers,
  intent: string | null,
): QuizAnswers {
  if (!intent) return current;
  const allowed: IntentValue[] = [
    "first-hyrox",
    "go-faster",
    "doubles",
    "getting-into",
    "building",
  ];
  if (!allowed.includes(intent as IntentValue)) return current;

  const existing = current.intent ?? [];
  if (existing.includes(intent as IntentValue)) return current;

  return {
    ...current,
    intent: [...existing, intent as IntentValue],
  };
}

/**
 * `/quiz?rail=beginner` (or `athlete`). The entry surface pre-answers
 * screen one: someone arriving from /personal-trainer/leeds has already
 * told us what they want, and spending the highest-attention screen in the
 * funnel asking them again is waste.
 *
 * An unrecognised or absent value leaves `rail` undefined, which keeps the
 * original HYROX flow exactly as it was.
 */
export function applyRailPreSelect(
  current: QuizAnswers,
  rail: string | null,
): QuizAnswers {
  if (rail !== "beginner" && rail !== "athlete") return current;
  if (current.rail === rail && current.railLocked) return current;
  return { ...current, rail, railLocked: true };
}

/** True only for an explicit beginner rail, never for the undefined default. */
export function isBeginnerRail(a: QuizAnswers): boolean {
  return a.rail === "beginner";
}

/**
 * Which rail a screen-one answer puts somebody on.
 *
 * THIS IS THE ROUTING DECISION, and until 3 August 2026 nothing made it.
 * The rail could only be set from the URL, so anybody who arrived at /quiz
 * directly — the overwhelming majority — was handed the racing questions
 * whatever they said they wanted. Somebody who came to lose weight got
 * asked their best HYROX time.
 *
 * Screen one is single-select for the same reason. It used to allow two
 * answers, which on a screen that now decides the route could mean picking
 * "my first race" and "just get fit" together and leaving the quiz to
 * guess which person it was talking to.
 */
export function railForIntent(intent: IntentValue): QuizRail {
  return intent === "get-fit" || intent === "lose-weight"
    ? "beginner"
    : "athlete";
}

/**
 * The beginner doors that already answer the goal question, so it is not
 * asked twice. "Get fit" stays open because it spans several goals, and
 * the goal screen is where that gets pinned down.
 */
const INTENT_GOAL: Partial<Record<IntentValue, GoalValue>> = {
  "lose-weight": "lose-weight",
};

/**
 * Apply a screen-one answer: sets the intent, the rail it implies, and any
 * goal that answer already gave us.
 *
 * Switching rails clears the answers belonging to the rail being left.
 * Without that, somebody who picked "my first race", answered two racing
 * questions, went back and switched to "get fit" would carry a race date
 * into a plan that must never mention racing — and `summarise` would print
 * it back to them.
 */
export function applyIntent(
  current: QuizAnswers,
  intent: IntentValue,
): QuizAnswers {
  const rail = railForIntent(intent);
  const next: QuizAnswers = { ...current, intent: [intent], rail };

  const goal = INTENT_GOAL[intent];
  if (goal) next.goal = goal;

  if (rail === "beginner") {
    delete next.experience;
    delete next.bestTime;
    delete next.raceDate;
    delete next.sex;
    delete next.weight;
    delete next.partner;
  } else {
    delete next.goal;
    delete next.startingPoint;
    delete next.triedBefore;
    delete next.barriers;
  }

  return next;
}

/**
 * `/quiz?support=self`, used by the Suth Club page's CTA.
 *
 * Someone who has just clicked "Start 7 days free" has answered the sift
 * already. Asking them again mid-quiz would be the funnel arguing with
 * them. `supportLocked` records that it came from the URL rather than the
 * screen, so the sift can be hidden without its visibility flickering as
 * the user answers (which would shift every screen index under them).
 */
export function applySupportPreSelect(
  current: QuizAnswers,
  support: string | null,
): QuizAnswers {
  if (support !== "self" && support !== "coached") return current;
  if (current.supportLocked) return current;
  return { ...current, supportPreference: support, supportLocked: true };
}

/**
 * Programme names on the beginner rail, named after what the person said
 * they want rather than after a race they have never heard of. The internal
 * programme is still the same one; this is only what we call it to them.
 */
const BEGINNER_PROGRAMME_LABEL: Record<GoalValue, string> = {
  "lose-weight": "Weight loss",
  "get-stronger": "Strength",
  "more-energy": "Energy and fitness",
  confidence: "Back to yourself",
  "family-health": "Health and fitness",
};

/**
 * What we call the plan in front of the user. Returns null when we don't
 * yet know enough to name it, so the live panel can show a placeholder
 * instead of guessing.
 */
export function programmeLabel(a: QuizAnswers): string | null {
  if (isBeginnerRail(a)) {
    return a.goal ? BEGINNER_PROGRAMME_LABEL[a.goal] : null;
  }
  const hasDirection = (a.intent ?? []).length > 0 || Boolean(a.experience);
  return hasDirection ? PROGRAMME_DISPLAY[determineProgramme(a)] : null;
}

export function applyProgrammeShortcutV3(
  current: QuizAnswers,
  program: ProgrammeFromUrl,
): QuizAnswers {
  const next = { ...current };
  const intent = next.intent ?? [];

  switch (program) {
    case "first-race":
      if (!intent.includes("first-hyrox")) {
        next.intent = [...intent, "first-hyrox"];
      }
      break;
    case "sub-90":
      if (!intent.includes("go-faster")) {
        next.intent = [...intent, "go-faster"];
      }
      next.bestTime ??= "90-105";
      break;
    case "pro":
      if (!intent.includes("go-faster")) {
        next.intent = [...intent, "go-faster"];
      }
      next.bestTime ??= "60-75";
      break;
    case "doubles":
      if (!intent.includes("doubles")) {
        next.intent = [...intent, "doubles"];
      }
      break;
  }
  return next;
}

/* ─── Display helpers ───────────────────────────────────────────────── */

export const LOCATION_LABEL: Record<LocationValue, string> = {
  "gym-full": "Full Hyrox gym",
  "gym-standard": "Standard commercial gym",
  home: "Home setup",
};

export const PARTNER_LABEL: Record<PartnerValue, string> = {
  solo: "Solo",
  doubles: "Doubles",
  "solo-partner-later": "Solo for now, partner later",
};

export const INJURY_LABEL: Record<InjuryValue, string> = {
  none: "No injuries",
  "lower-back": "Lower back",
  knee: "Knee",
  shoulder: "Shoulder",
  "achilles-calf": "Achilles or calf",
  other: "Other, noted in app",
};

export const INJURY_RECENCY_LABEL: Record<InjuryRecencyValue, string> = {
  current: "Bothering me now",
  recent: "Recent, still cautious",
  past: "In the past, mostly fine now",
};

export const INJURY_CARE_LABEL: Record<InjuryCareValue, string> = {
  physio: "Working with a physio or professional",
  "self-managed": "Managing it myself",
  "not-assessed": "Not had it looked at yet",
};

/**
 * Aggravator options per specific injury. Shown as a multi-select on the
 * injury-detail screen; values are stored verbatim in answers.injuryTriggers.
 */
export const INJURY_TRIGGER_OPTIONS: Partial<
  Record<InjuryValue, Array<{ value: string; label: string }>>
> = {
  "lower-back": [
    { value: "hinging", label: "Deadlifts or hinging" },
    { value: "running-impact", label: "Running" },
    { value: "twisting", label: "Twisting movements" },
    { value: "loaded-carries", label: "Heavy carries" },
    { value: "sitting", label: "Long periods sitting" },
  ],
  knee: [
    { value: "running-impact", label: "Running" },
    { value: "lunges", label: "Lunges or deep bends" },
    { value: "jumping", label: "Jumping and landing" },
    { value: "stairs-hills", label: "Stairs or hills" },
  ],
  shoulder: [
    { value: "overhead", label: "Overhead pressing" },
    { value: "throwing", label: "Wall balls or throwing" },
    { value: "pulling", label: "Pulling or rowing" },
    { value: "carries", label: "Carrying" },
  ],
  "achilles-calf": [
    { value: "running-impact", label: "Running" },
    { value: "jumping", label: "Jumping or bounding" },
    { value: "hills", label: "Hill running" },
    { value: "long-runs", label: "Longer runs" },
  ],
};

/** Injuries that get the follow-up detail screen. */
export function injuryNeedsDetail(v: InjuryValue | undefined): boolean {
  return (
    v === "lower-back" || v === "knee" || v === "shoulder" || v === "achilles-calf"
  );
}

/**
 * Number of question screens (excluding the cinematic). Conditional screens
 * are accounted for at runtime via the visibleScreens() helper in
 * components/quiz-v3/quiz-flow.tsx. The total is variable: 13 in the shortest
 * common path, 16 in the longest (injury follow-up adds one).
 */
export const QUIZ_V3_TOTAL_SCREENS_MAX = 16;
