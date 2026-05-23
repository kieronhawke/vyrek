/**
 * Vyrek Quiz V3, types, programme matching, and date helpers.
 *
 * The 15-screen Marchon-Runna hybrid. See /docs/vyrek-quiz-v3-brief.md and
 * /docs/vyrek-quiz-v3-addendum.md for the spec.
 *
 * V2 lives at lib/quiz-flow-v2.ts (kept as a /quiz/v2 fallback). Once V3 is
 * verified live and converting, V2 can be deleted in a cleanup pass.
 */

export type IntentValue =
  | "first-hyrox"
  | "go-faster"
  | "doubles"
  | "getting-into"
  | "building";

export type ExperienceValue =
  | "never"
  | "signed-up"
  | "raced-few"
  | "raced-many";

export type BestTimeValue =
  | "under-75"
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

export type Programme = "first-race" | "sub-90" | "doubles" | "pro";

export type QuizAnswers = {
  intent: IntentValue[];
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

  if (intent.includes("go-faster") && answers.bestTime === "under-75") {
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
      next.bestTime ??= "under-75";
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

/**
 * Number of question screens (excluding the cinematic). Conditional screens
 * are accounted for at runtime via the visibleScreens() helper in
 * components/quiz-v3/quiz-flow.tsx. The total is variable: 13 in the shortest
 * common path, 15 in the longest.
 */
export const QUIZ_V3_TOTAL_SCREENS_MAX = 15;
