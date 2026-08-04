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

/**
 * "custom" is not in `PLANS`. It is built per invite from a price Ben agreed
 * with one person, and it exists only inside their signed link.
 */
export type PlanKey = "coaching-121" | "coaching-tier2" | "club" | "custom";

export const CUSTOM_PLAN_KEY = "custom" as const;

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
 * lib/pricing.ts (£12.99 for the Club), not invented. Programming is £80,
 * confirmed directly by Kieron.
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
      // Reworded 3 Aug 2026. "Any station" and "your races" are true of the
      // racing half of the client base and meaningless to the other half —
      // and the plan screen is shown to both, at the moment they hand over
      // a card. Both lines say the same thing without naming a sport.
      "Video form checks on any movement",
      "Direct line to Ben",
      "Rewritten around your life, and whatever you're working towards",
      "Cancel any time",
    ],
    featured: true,
    trialDays: 0,
  },
  {
    key: "coaching-tier2",
    name: "Programming",
    // £80, corrected from £120 on Kieron's instruction 3 Aug 2026. The old
    // figure was wrong on the page somebody actually pays from.
    pence: 8000,
    display: "£80",
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

/* ── A price agreed with one person ───────────────────────────────────────
   Ben negotiates. Somebody comes off a consultation having agreed £150 a
   month for something between the two published tiers, and until now the
   only ways to honour that were to send them to a plan at the wrong price
   or to take the card details himself.

   So an invite can carry a price. It is built here, from the figure he
   typed, and it appears alongside the standard plans on that one person's
   onboarding.

   THE PRICE LIVES IN THE SIGNED LINK, AND THAT IS THE WHOLE SECURITY MODEL.
   The token is HMAC-signed, so an athlete cannot edit £150 down to £15 —
   any change breaks the signature and the link stops resolving. Checkout
   reads the amount from the verified invite and never from the request
   body, which is the difference between a negotiable price and a public
   one.

   IT IS NOT A PUBLISHED PRICE. It never appears on a marketing page, in
   metadata, or on any indexable route: it is on one person's private setup
   link, agreed with them directly. That is what keeps this the right side
   of the no-pricing rule, and it is why there is no route that lists custom
   plans. */

export type CustomPlan = {
  /** Pence per month. */
  pence: number;
  /** What Ben calls it on their screen. Optional; a sensible default is used. */
  name?: string;
  /** One line explaining what they agreed. Optional. */
  summary?: string;
  /** Days free before the first charge. */
  trialDays?: number;
};

/**
 * The lowest and highest a bespoke monthly price may be, in pence.
 *
 * £1 to £2,000 a month. Wide on purpose: this is a guard against a typo, not
 * a policy about what Ben may charge, and a ceiling set to what looks
 * reasonable today is a ceiling that silently blocks a legitimate deal in six
 * months. What it does catch is the extra digit — £1,500 typed as £15,000 —
 * which is the mistake that actually happens.
 */
export const CUSTOM_MIN_PENCE = 100;
export const CUSTOM_MAX_PENCE = 200000;

/**
 * Read a price Ben typed. "150", "£150", "150.00", "1,500" all work.
 *
 * Returns pence, or null. Null rather than zero, because zero is a real
 * amount that would sail through a truthiness check and set up a free
 * subscription nobody agreed to.
 */
export function parsePrice(input: string): number | null {
  const text = input.trim().replace(/[£\s,]/g, "");
  if (!text) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const pence = Math.round(Number(text) * 100);
  if (!Number.isFinite(pence)) return null;
  if (pence < CUSTOM_MIN_PENCE || pence > CUSTOM_MAX_PENCE) return null;
  return pence;
}

/** Pence to "£150" or "£149.50" — no trailing ".00" on a round number. */
export function displayPrice(pence: number): string {
  const pounds = pence / 100;
  return Number.isInteger(pounds) ? `£${pounds}` : `£${pounds.toFixed(2)}`;
}

/** Build the plan card for a price agreed with one person. */
export function customPlan(custom: CustomPlan): Plan {
  return {
    key: CUSTOM_PLAN_KEY,
    name: custom.name?.trim() || "Your agreed plan",
    pence: custom.pence,
    display: displayPrice(custom.pence),
    cadence: "a month",
    summary:
      custom.summary?.trim() ||
      "The plan you agreed with Ben on your call, at the price you agreed.",
    includes: [
      "Everything you and Ben talked through",
      "A dated week, every week, written for you",
      "Direct line to Ben",
      "Cancel any time",
    ],
    /* Featured, and the standard tiers lose their star for this person.
       Two highlighted options is no recommendation at all, and the one he
       agreed with them on the phone is the one they came here for. */
    featured: true,
    trialDays: custom.trialDays ?? 0,
  };
}

/**
 * The plans to show on one invite.
 *
 * The agreed price goes first. Somebody who spoke to Ben on Tuesday and was
 * told £150 should not have to hunt for it under two prices he did not
 * quote them.
 */
export function plansFor(custom?: CustomPlan | null): Plan[] {
  if (!custom) return PLANS;
  const bespoke = customPlan(custom);
  return [bespoke, ...PLANS.map((p) => ({ ...p, featured: false }))];
}

/** Resolve a plan key against one invite, custom included. */
export function planFor(
  key: string | undefined,
  custom?: CustomPlan | null,
): Plan | undefined {
  if (key === CUSTOM_PLAN_KEY) return custom ? customPlan(custom) : undefined;
  return planByKey(key);
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
export function summarise(
  a: Answers,
  /**
   * Reads the answers back the way they were asked.
   *
   * The experience row was hardcoded to "First HYROX" / "A few races in" /
   * "Experienced" whatever route the client came down, so somebody who had
   * been asked "starting from scratch / a bit active / I train regularly"
   * was shown "A few races in" on the screen where they hand over a card.
   * The stored value is the same; only the reading changes.
   */
  beginner = false,
): { label: string; value: string }[] {
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
      value: beginner
        ? a.experience === "first"
          ? "Starting from scratch"
          : a.experience === "some"
            ? "A bit active"
            : "Trains regularly"
        : a.experience === "first"
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
