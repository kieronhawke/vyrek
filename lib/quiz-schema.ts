/**
 * Quiz schema — questions, options, branching, and entry-point shortcuts.
 *
 * Branching is expressed as a `showIf` predicate. The state hook computes
 * the visible question list against the current answers, so deep links and
 * `?program=` entry-points stay coherent.
 *
 * Mirrors brief §9.
 */

export type QuizQuestionType =
  | "single-select"
  | "multi-select"
  | "slider"
  | "date"
  | "text-input";

export type QuizAnswers = Record<string, string | string[] | number | null>;

export type Option = { value: string; label: string };

export type ProgramSlug = "first-race" | "sub-90" | "doubles" | "pro";

interface BaseQuestion {
  id: string;
  question: string;
  helper?: string;
  optional?: boolean;
  showIf?: (state: QuizAnswers) => boolean;
}

interface SingleSelect extends BaseQuestion {
  type: "single-select";
  options: Option[];
}

interface MultiSelect extends BaseQuestion {
  type: "multi-select";
  options: Option[];
}

interface Slider extends BaseQuestion {
  type: "slider";
  min: number;
  max: number;
  default: number;
  labels: string[];
}

interface DateQuestion extends BaseQuestion {
  type: "date";
}

export type QuizQuestion = SingleSelect | MultiSelect | Slider | DateQuestion;

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "experience",
    question: "Have you raced a Hyrox?",
    helper: "Pick one",
    type: "single-select",
    options: [
      { value: "never", label: "Never raced" },
      { value: "signed-up", label: "Signed up, not raced" },
      { value: "raced", label: "Raced one or more" },
    ],
  },
  {
    id: "finish-time",
    question: "What's your best Hyrox time?",
    helper: "Pick one",
    type: "single-select",
    showIf: (s) => s.experience === "raced",
    options: [
      { value: "under-75", label: "Under 75 min" },
      { value: "75-90", label: "75 to 90 min" },
      { value: "90-105", label: "90 to 105 min" },
      { value: "over-105", label: "Over 105 min" },
    ],
  },
  {
    id: "partner",
    question: "Solo or doubles?",
    helper: "Pick one",
    type: "single-select",
    options: [
      { value: "solo", label: "Solo" },
      { value: "doubles", label: "Doubles" },
    ],
  },
  {
    id: "days-per-week",
    question: "How many days a week can you train?",
    helper: "Slide to choose",
    type: "slider",
    min: 3,
    max: 6,
    default: 4,
    labels: ["3", "4", "5", "6"],
  },
  {
    id: "location",
    question: "Where will you train?",
    helper: "Pick one",
    type: "single-select",
    options: [
      { value: "gym-full", label: "Full gym (sled, ski erg, rower)" },
      { value: "gym-standard", label: "Standard commercial gym" },
      { value: "home", label: "Home setup" },
    ],
  },
  {
    id: "equipment",
    question: "What kit do you have at home?",
    helper: "Tick all that apply",
    type: "multi-select",
    showIf: (s) => s.location === "home",
    options: [
      { value: "dumbbells", label: "Dumbbells" },
      { value: "kettlebell", label: "Kettlebell" },
      { value: "rower", label: "Rower" },
      { value: "ski-erg", label: "Ski erg" },
      { value: "sled", label: "Sled" },
      { value: "nothing", label: "Bodyweight only" },
    ],
  },
  {
    id: "session-length",
    question: "How long can your sessions be?",
    helper: "Pick one",
    type: "single-select",
    options: [
      { value: "30", label: "30 min" },
      { value: "45", label: "45 min" },
      { value: "60", label: "60 min" },
      { value: "90", label: "90 min or more" },
    ],
  },
  {
    id: "race-date",
    question: "Got a race booked?",
    helper: "Optional — pick a date or skip",
    type: "date",
    optional: true,
  },
];

/**
 * Programme matching — runs after every answer change to give the user a
 * "decided so far" preview on each question (brief §9, preview chip).
 */
export function matchProgramme(state: QuizAnswers): ProgramSlug {
  if (state.partner === "doubles") return "doubles";
  if (state.experience === "never" || state.experience === "signed-up") {
    return "first-race";
  }
  if (state["finish-time"] === "under-75") return "pro";
  return "sub-90";
}

/**
 * Visible question list given the current answer state.
 * Conditional questions (with `showIf` returning false) are skipped.
 */
export function visibleQuestions(state: QuizAnswers): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => !q.showIf || q.showIf(state));
}

/* ------------------------------------------------------------------------- *
 * Phase B2 §3.4 — Runna-modelled quiz helpers.
 *
 * These types and functions describe the *new* 15-screen quiz envisaged in
 * Phase B2. The existing v1 quiz above stays in place and continues to drive
 * /quiz today; the helpers here are consumed by the summary screen (§3.2
 * Screen 14) and any future Screen-N renderer.
 * ------------------------------------------------------------------------- */

export type QuizIntent =
  | "first-hyrox"
  | "go-faster"
  | "doubles"
  | "getting-into";

export type BestTime =
  | "under-75"
  | "75-90"
  | "90-105"
  | "over-105"
  | "unknown";

export type Location = "gym-full" | "gym-standard" | "home";
export type SessionLength = "30" | "45" | "60" | "90";
export type Partner = "solo" | "doubles";
export type Days = 3 | 4 | 5 | 6;

export type RunnaQuizAnswers = {
  intent: QuizIntent;
  bestTime?: BestTime;
  raceDate?: Date;
  raceSuggestion?: "yes" | "no";
  days: Days;
  sessionLength: SessionLength;
  location: Location;
  equipment?: string[];
  partner: Partner;
  injuries: string;
};

/**
 * Pick the most appropriate programme given a full set of Runna-style
 * answers. Doubles takes priority — explicit partner intent or partner
 * setup always wins. First-time and getting-into both route to First Race.
 * Go-faster routes to Pro for sub-75 athletes, Sub-90 otherwise. Fallback
 * is the conservative First Race.
 */
export function determineProgramme(answers: RunnaQuizAnswers): ProgramSlug {
  if (answers.intent === "doubles" || answers.partner === "doubles") {
    return "doubles";
  }
  if (answers.intent === "first-hyrox" || answers.intent === "getting-into") {
    return "first-race";
  }
  if (answers.intent === "go-faster") {
    if (answers.bestTime === "under-75") return "pro";
    return "sub-90";
  }
  return "first-race";
}

/**
 * Default training start date — next Tuesday from today. If today is a
 * Tuesday, returns the Tuesday a week from today (never starts the user the
 * same day they take the quiz). UTC-safe; date-only.
 */
export function determineStartDate(today: Date = new Date()): Date {
  // 0 = Sunday … 2 = Tuesday … 6 = Saturday
  const day = today.getDay();
  const daysUntilTuesday = (2 - day + 7) % 7 || 7;
  const tuesday = new Date(today);
  tuesday.setHours(0, 0, 0, 0);
  tuesday.setDate(today.getDate() + daysUntilTuesday);
  return tuesday;
}

/**
 * Calculate the race date for a 12-week plan. If the user gave us a fixed
 * race date in the quiz, honour it; otherwise project `weeks` weeks out from
 * the start date.
 */
export function determineRaceDate(
  startDate: Date,
  weeks: number,
  userRaceDate?: Date,
): Date {
  if (userRaceDate) return userRaceDate;
  const raceDate = new Date(startDate);
  raceDate.setDate(startDate.getDate() + weeks * 7);
  return raceDate;
}

/**
 * Entry-point shortcuts. `/quiz?program=sub-90` pre-fills the experience
 * answer and skips Q1; `?program=doubles` also pre-fills the partner answer.
 */
export function applyEntryPoint(
  program: ProgramSlug,
  current: QuizAnswers,
): QuizAnswers {
  const next = { ...current };
  switch (program) {
    case "first-race":
      next.experience = next.experience ?? "never";
      break;
    case "sub-90":
      next.experience = next.experience ?? "raced";
      next["finish-time"] = next["finish-time"] ?? "90-105";
      break;
    case "doubles":
      next.partner = next.partner ?? "doubles";
      break;
    case "pro":
      next.experience = next.experience ?? "raced";
      next["finish-time"] = next["finish-time"] ?? "under-75";
      break;
  }
  return next;
}
