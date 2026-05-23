/**
 * Quiz V2 screen definitions, preserved as a fallback at /quiz/v2.
 *
 * V3 is the primary `/quiz` route. V2 stays around as a rollback target
 * until V3 has been verified live; it can be deleted in a follow-up cleanup.
 *
 * Voice: Trainer's Notebook (direct, no hype, no exclamation marks).
 */

import type { RunnaQuizAnswers, ProgramSlug } from "@/lib/quiz-schema";

export type OptionWithDetail = {
  value: string;
  label: string;
  detail?: string;
};

type Answers = Partial<RunnaQuizAnswers>;

export type WelcomeSlide = {
  image: string;
  headline: string;
};

export type Screen =
  | {
      kind: "welcome";
      slides: WelcomeSlide[];
      skipLabel: string;
    }
  | {
      kind: "single-select";
      id: keyof RunnaQuizAnswers;
      question: string;
      helper?: string;
      options: OptionWithDetail[];
      showIf?: (a: Answers) => boolean;
    }
  | {
      kind: "multi-select";
      id: keyof RunnaQuizAnswers;
      question: string;
      helper?: string;
      options: OptionWithDetail[];
      showIf?: (a: Answers) => boolean;
    }
  | {
      kind: "calendar";
      id: "raceDate";
      question: string;
      helper?: string;
      skipLabel: string;
    }
  | {
      kind: "interstitial";
      image: string;
      headline: string;
      caption: string;
    }
  | { kind: "summary" }
  | { kind: "email-gate" };

export const SCREENS: Screen[] = [
  {
    kind: "welcome",
    skipLabel: "Get started →",
    slides: [
      {
        image: "/media/images/v2/programme-first-race.jpg",
        headline: "Hyrox training, personalised.",
      },
      {
        image: "/media/images/v2/bento-plan.jpg",
        headline: "Every workout, dated and ready.",
      },
      {
        image: "/media/images/v2/bento-progress.jpg",
        headline: "Built to get you to the line.",
      },
    ],
  },
  {
    kind: "single-select",
    id: "intent",
    question: "What brings you to Vyrek?",
    helper: "We'll build your plan around this.",
    options: [
      { value: "first-hyrox", label: "Training for my first Hyrox" },
      { value: "go-faster", label: "I've done a Hyrox, want to go faster" },
      { value: "doubles", label: "Training with a partner for Doubles" },
      {
        value: "getting-into",
        label: "Just getting into Hyrox-style training",
      },
    ],
  },
  {
    kind: "interstitial",
    image: "/media/images/v2/quiz-interstitial-1.jpg",
    headline:
      "92% of first-time Vyrek members finish their Hyrox stronger than they expected.",
    caption: "Vyrek member data, 2026",
  },
  {
    kind: "single-select",
    id: "bestTime",
    question: "What's your best Hyrox time?",
    helper: "We'll calibrate your plan to match.",
    showIf: (a) => a.intent === "go-faster",
    options: [
      { value: "under-75", label: "Under 75 min" },
      { value: "75-90", label: "75 to 90 min" },
      { value: "90-105", label: "90 to 105 min" },
      { value: "over-105", label: "Over 105 min" },
      { value: "unknown", label: "I don't remember" },
    ],
  },
  {
    kind: "calendar",
    id: "raceDate",
    question: "Got a race booked?",
    helper: "We'll build your plan around the date. Or skip, we'll suggest one.",
    skipLabel: "No race booked →",
  },
  {
    kind: "single-select",
    id: "raceSuggestion",
    question: "Want us to suggest a race?",
    helper: "We'll point you to upcoming UK Hyrox events.",
    showIf: (a) => !a.raceDate,
    options: [
      { value: "yes", label: "Yes, show me UK races" },
      { value: "no", label: "I'll find my own later" },
    ],
  },
  {
    kind: "single-select",
    id: "days",
    question: "How many days a week can you train?",
    helper:
      "Most members train 4 days. Pick what you can realistically commit to.",
    options: [
      {
        value: "3",
        label: "3 days",
        detail: "Minimum effective dose. Race-ready in 16 weeks instead of 12.",
      },
      {
        value: "4",
        label: "4 days",
        detail: "Recommended. Best balance of progress and recovery.",
      },
      {
        value: "5",
        label: "5 days",
        detail: "Faster progress. Higher recovery demand.",
      },
      {
        value: "6",
        label: "6 days",
        detail: "Advanced volume. For athletes used to high training load.",
      },
    ],
  },
  {
    kind: "single-select",
    id: "sessionLength",
    question: "How long can your sessions be?",
    helper: "We'll build workouts that fit your time.",
    options: [
      { value: "30", label: "30 min", detail: "Tight schedule" },
      { value: "45", label: "45 min", detail: "Standard" },
      {
        value: "60",
        label: "60 min",
        detail: "Recommended, covers warm-up, main and cool-down",
      },
      { value: "90", label: "90 min or more", detail: "Big block training" },
    ],
  },
  {
    kind: "single-select",
    id: "location",
    question: "Where will you train?",
    helper: "We'll adapt your plan to your space and kit.",
    options: [
      {
        value: "gym-full",
        label: "Full Hyrox gym",
        detail: "Sled, ski erg, rower, wall balls",
      },
      { value: "gym-standard", label: "Standard commercial gym" },
      { value: "home", label: "Home setup" },
    ],
  },
  {
    kind: "multi-select",
    id: "equipment",
    question: "What kit do you have at home?",
    helper: "Pick everything you've got. We'll use what we can.",
    showIf: (a) => a.location === "home",
    options: [
      { value: "dumbbells", label: "Dumbbells" },
      { value: "kettlebell", label: "Kettlebell" },
      { value: "rower", label: "Rower" },
      { value: "ski-erg", label: "Ski erg" },
      { value: "sled", label: "Sled" },
      { value: "sandbag", label: "Sandbag" },
      { value: "wall-ball", label: "Wall ball" },
      { value: "pull-up-bar", label: "Pull-up bar" },
      { value: "bodyweight", label: "Bodyweight only" },
    ],
  },
  {
    kind: "interstitial",
    image: "/media/images/v2/bento-plan.jpg",
    headline:
      "Give us 4 sessions a week. We'll give you Hyrox-ready fitness in 12 weeks.",
    caption: "12-week First Race programme",
  },
  {
    kind: "single-select",
    id: "partner",
    question: "Training solo or with a partner?",
    showIf: (a) => a.intent !== "doubles",
    options: [
      { value: "solo", label: "Solo" },
      {
        value: "doubles",
        label: "Doubles",
        detail: "Training with a partner",
      },
    ],
  },
  {
    kind: "single-select",
    id: "injuries",
    question: "Any injuries we should plan around?",
    helper: "We'll adjust your plan to protect what needs protecting.",
    options: [
      { value: "none", label: "No injuries, all clear" },
      { value: "lower-back", label: "Lower back" },
      { value: "knee", label: "Knee" },
      { value: "shoulder", label: "Shoulder" },
      { value: "achilles-calf", label: "Achilles or calf" },
      { value: "other", label: "Other. I'll note in the app later" },
    ],
  },
  { kind: "summary" },
  { kind: "email-gate" },
];

export function visibleScreens(answers: Answers): Screen[] {
  return SCREENS.filter((s) => {
    if ("showIf" in s && s.showIf) return s.showIf(answers);
    return true;
  });
}

export function applyProgrammeShortcut(
  current: Answers,
  program: ProgramSlug,
): Answers {
  const next = { ...current };
  switch (program) {
    case "first-race":
      next.intent ??= "first-hyrox";
      break;
    case "sub-90":
      next.intent ??= "go-faster";
      next.bestTime ??= "90-105";
      break;
    case "pro":
      next.intent ??= "go-faster";
      next.bestTime ??= "under-75";
      break;
    case "doubles":
      next.intent ??= "doubles";
      break;
  }
  return next;
}

export const TOTAL_SCREENS = SCREENS.length;
