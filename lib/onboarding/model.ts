/**
 * WHAT ONBOARDING ASKS, AND WHAT IT SELLS.
 *
 * Two shapes of invite, because Ben has two situations:
 *
 *   FULL     — a new client. Everything: who they are, what they are training
 *              for, what he must not make them do, when they can train, and a
 *              plan with a card attached.
 *   PAYMENT  — somebody he has already spoken to at length. Skip the
 *              questions, pick a plan, pay. Four taps.
 *
 * ORDER IS THE DESIGN. The plan and the card come LAST. Every step before it
 * is one they can answer without commitment, so by the time they see a price
 * they have already invested five minutes and told him about their calf. Ask
 * for the card first and the drop-off is the whole funnel.
 *
 * NOTHING IS ASKED TWICE. The invite carries their name, email and phone from
 * whatever Ben typed, so the first screen confirms rather than collects.
 */

export type PlanKey = "coaching-121" | "coaching-tier2" | "club";

export type Plan = {
  key: PlanKey;
  name: string;
  /** Pence per month, charged through Stripe. */
  pence: number;
  display: string;
  cadence: string;
  summary: string;
  includes: string[];
  /** Shown as the obvious choice. Exactly one. */
  featured?: boolean;
  /** Days free before the first charge, 0 for none. */
  trialDays: number;
};

/**
 * The three things Ben actually sells, from his own tracker.
 *
 * Prices are the ones in lib/control/tracker.ts (£220 a month for 1:1) and
 * lib/pricing.ts (£12.99 for the Club), not invented. Tier 2 sits between
 * them at the rate on his sheet.
 */
export const PLANS: Plan[] = [
  {
    key: "coaching-121",
    name: "1:1 Coaching",
    pence: 22000,
    display: "£220",
    cadence: "a month",
    summary: "Everything written for you, week by week, with Ben on the end of the phone.",
    includes: [
      "A dated week, every week, written for you",
      "Video form checks on any station",
      "Direct line to Ben",
      "Plan rewritten around your races and your life",
      "Cancel any time",
    ],
    featured: true,
    trialDays: 0,
  },
  {
    key: "coaching-tier2",
    name: "Programming",
    pence: 12000,
    display: "£120",
    cadence: "a month",
    summary: "The same programming, reviewed monthly rather than weekly.",
    includes: [
      "A dated week, every week",
      "Monthly review call",
      "Message Ben any time",
      "Cancel any time",
    ],
    trialDays: 0,
  },
  {
    key: "club",
    name: "Suth Club",
    pence: 1299,
    display: "£12.99",
    cadence: "a month",
    summary: "The programme without the one-to-one. Start free for a week.",
    includes: [
      "A structured 12-week block",
      "Weekly plan in your account",
      "The whole session library",
      "7 days free, no card needed to look",
    ],
    trialDays: 7,
  },
];

export function planByKey(key: string | undefined): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

/* ── The steps ─────────────────────────────────────────────────────────── */

export type StepKey =
  | "welcome"
  | "account"
  | "about"
  | "training"
  | "health"
  | "availability"
  | "photo"
  | "plan"
  | "pay";

export type Step = {
  key: StepKey;
  /** What the person sees at the top. */
  title: string;
  /** One line under it. Never a paragraph — this is a phone. */
  blurb: string;
  /** False when it can be skipped without blocking the next step. */
  required: boolean;
};

export const STEPS: Step[] = [
  { key: "welcome", title: "Let's get you set up", blurb: "Five minutes, and Ben writes your first week.", required: true },
  { key: "account", title: "Create your account", blurb: "So your plan is waiting for you every week.", required: true },
  { key: "about", title: "About you", blurb: "The basics Ben needs before he writes anything.", required: true },
  { key: "training", title: "Your training now", blurb: "Where you are, so he knows where to start.", required: true },
  { key: "health", title: "Anything he should know", blurb: "Injuries, conditions, anything that changes a session.", required: false },
  { key: "availability", title: "When you can train", blurb: "He builds the week around your week.", required: true },
  { key: "photo", title: "Add a photo", blurb: "Optional. It just makes the place feel like yours.", required: false },
  { key: "plan", title: "Choose your plan", blurb: "Change or cancel whenever you like.", required: true },
  { key: "pay", title: "Payment", blurb: "Secure checkout, handled by Stripe.", required: true },
];

/** A payment-only invite skips straight to the plan. */
export const PAYMENT_STEPS: StepKey[] = ["welcome", "plan", "pay"];

export function stepsFor(kind: "full" | "payment"): Step[] {
  return kind === "payment"
    ? STEPS.filter((s) => PAYMENT_STEPS.includes(s.key))
    : STEPS;
}

/* ── The answers ───────────────────────────────────────────────────────── */

export type Answers = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  /** Free text — "sub-1:20 at Manchester". Never a dropdown. */
  goal: string;
  nextRace: string;
  raceDate: string;
  experience: "first" | "some" | "experienced" | "";
  trainingDays: number | null;
  currentTraining: string;
  injuries: string;
  /** Article 9 data. The screen says who can see it. */
  conditions: string;
  /** Weekday keys they can train. */
  availableDays: string[];
  preferredTime: "morning" | "lunch" | "evening" | "varies" | "";
  photoDataUrl: string;
  plan: PlanKey | "";
};

export const DAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export function emptyAnswers(name = "", email = "", phone = ""): Answers {
  return {
    name,
    email,
    phone,
    dateOfBirth: "",
    goal: "",
    nextRace: "",
    raceDate: "",
    experience: "",
    trainingDays: null,
    currentTraining: "",
    injuries: "",
    conditions: "",
    availableDays: [],
    preferredTime: "",
    photoDataUrl: "",
    plan: "",
  };
}

/**
 * What is stopping this step being finished, or nothing.
 *
 * Returned as a message rather than a boolean so the screen can say why the
 * button is not lit. A disabled button with no explanation is the single most
 * common reason somebody abandons a form.
 */
export function blocker(step: StepKey, a: Answers): string | null {
  switch (step) {
    case "account":
      if (!a.email.trim()) return "We need an email address to send your plan to.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email.trim())) {
        return "That email address does not look right.";
      }
      return null;
    case "about":
      if (!a.name.trim()) return "What should Ben call you?";
      return null;
    case "training":
      if (!a.experience) return "Pick the one that sounds most like you.";
      if (!a.trainingDays) return "How many days a week can you train?";
      return null;
    case "availability":
      if (a.availableDays.length === 0) return "Pick at least one day you can train.";
      return null;
    case "plan":
      if (!a.plan) return "Choose a plan to carry on.";
      return null;
    default:
      return null;
  }
}

/** How far through they are, 0–1, for the progress bar. */
export function progress(steps: Step[], current: number): number {
  if (steps.length <= 1) return 1;
  return Math.min(1, Math.max(0, current / (steps.length - 1)));
}

/**
 * A short, human summary of what they told Ben, shown before they pay.
 *
 * Somebody about to enter a card should be able to see what they have just
 * spent five minutes on, without scrolling back through nine screens.
 */
export function summarise(a: Answers): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  if (a.goal.trim()) out.push({ label: "Goal", value: a.goal.trim() });
  if (a.nextRace.trim()) {
    out.push({
      label: "Next race",
      value: a.raceDate ? `${a.nextRace} — ${a.raceDate}` : a.nextRace,
    });
  }
  if (a.experience) {
    out.push({
      label: "Experience",
      value:
        a.experience === "first"
          ? "First HYROX"
          : a.experience === "some"
            ? "A few races in"
            : "Experienced",
    });
  }
  if (a.trainingDays) out.push({ label: "Days a week", value: String(a.trainingDays) });
  if (a.availableDays.length) {
    out.push({
      label: "Training days",
      value: DAYS.filter((d) => a.availableDays.includes(d.key))
        .map((d) => d.label)
        .join(", "),
    });
  }
  if (a.injuries.trim() || a.conditions.trim()) {
    out.push({ label: "Health notes", value: "Given to Ben" });
  }
  return out;
}
