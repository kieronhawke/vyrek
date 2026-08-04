/**
 * EVERY WORD IN THE QUIZ, IN ONE PLACE BEN CAN EDIT.
 *
 * The quiz is the first conversation anybody has with Suth Performance, and
 * until now changing a single question meant a code change and a deploy.
 * That is the wrong shape for the thing most likely to need tuning: the
 * sentences that decide whether somebody answers or leaves.
 *
 * HOW IT WORKS. Every screen's text still lives in its own component as the
 * default — that is what ships, what tests assert on, and what appears if
 * the database is empty or unreachable. This registry names those defaults
 * so the admin editor can show them, and an override saved against the same
 * key wins at render time. Nothing here is required for the quiz to work;
 * delete every row in the table and the funnel reads exactly as written.
 *
 * WHY THE DEFAULTS ARE COPIED RATHER THAN IMPORTED. Reading them out of the
 * components would mean the components importing from here, and then a
 * database outage or a typo in a key could blank a question. Copies drift,
 * so `quiz-copy.test.ts` reads the screen sources and fails if any default
 * below stops matching the component it claims to describe.
 *
 * THREE FIELDS PER SCREEN, because those are the three things on it: the
 * question, the line under it, and the button. Options are not editable —
 * they are answers the rest of the system reasons about, and renaming
 * "Knee" to "Left knee" would quietly change what Ben's brief says without
 * changing what the plan builder does with it.
 */

export type CopyField = "question" | "helper" | "cta";

export type ScreenCopySpec = {
  /** The screen kind, which is also the storage key prefix. */
  kind: string;
  /** What Ben sees in the editor's list. */
  label: string;
  /** Which rail it appears on, so the editor can group it. */
  rail: "both" | "beginner" | "athlete";
  question?: string;
  helper?: string;
  cta?: string;
  /**
   * Set when the shipped text is computed rather than fixed — the helper
   * differs by rail, or the question names their injury. An override still
   * works and applies everywhere the screen appears; this is the warning
   * that the default shown is only one of the versions.
   */
  note?: string;
};

/** `{area}` and friends: what a saved override may interpolate. */
export const COPY_TOKENS: Record<string, string> = {
  area: "The injured area, e.g. knee",
  first: "Their first name",
};

export const QUIZ_COPY: ScreenCopySpec[] = [
  {
    kind: "primary-intent",
    label: "1. What brings you here",
    rail: "both",
    question: "What brings you to Suth Performance?",
    helper: "Pick one. It decides what we ask you next.",
  },
  {
    kind: "goal",
    label: "What matters most",
    rail: "beginner",
    question: "What matters most right now?",
    helper: "Pick the one that would mean the most to you.",
  },
  {
    kind: "starting-point",
    label: "Where they're starting",
    rail: "beginner",
    question: "Where are you starting from?",
    helper: "Be honest. It only changes where week one begins.",
  },
  {
    kind: "tried-before",
    label: "Tried before",
    rail: "beginner",
    question: "Have you tried to get fit before?",
    helper:
      "No judgement here. Most people have, and it matters for how we build this.",
  },
  {
    kind: "barriers",
    label: "What got in the way",
    rail: "beginner",
    question: "What's got in the way before?",
    helper:
      "Pick as many as apply. We plan around these rather than hoping they go away.",
  },
  {
    kind: "readiness",
    label: "When they could start",
    rail: "beginner",
    question: "When could you realistically start?",
    helper: "So Ben knows whether to ring you this week or leave you be.",
  },
  {
    kind: "experience",
    label: "Raced before",
    rail: "athlete",
    question: "Have you raced a Hyrox before?",
    helper: "Pick one",
  },
  {
    kind: "best-time",
    label: "Best time",
    rail: "athlete",
    question: "What's your best Hyrox time?",
    helper: "We'll calibrate your plan to match.",
  },
  {
    kind: "race-date",
    label: "Race booked",
    rail: "athlete",
    question: "Got a race booked?",
    helper: "We'll build your plan around the date. Or skip and we'll suggest one.",
  },
  {
    kind: "calibration",
    label: "Standards",
    rail: "athlete",
    question: "Which Hyrox standards should we calibrate to?",
    helper:
      "These set the sled, wall ball and farmers carry loads on race day. Pick the open division you'd race in.",
  },
  {
    kind: "activity-baseline",
    label: "How active",
    rail: "athlete",
    question: "How active are you right now?",
    helper: "Be honest. We'll start where you are.",
  },
  {
    kind: "email-capture",
    label: "Name, email and mobile",
    rail: "both",
    question: "Where can Ben reach you?",
    helper: "He'll call you for the assessment. Nothing is shared with anybody else.",
  },
  {
    kind: "frequency",
    label: "Days a week",
    rail: "both",
    question: "How many days a week can you train?",
    helper: "Be honest about what you can stick to.",
  },
  {
    kind: "session-length",
    label: "Session length",
    rail: "both",
    question: "How long can your sessions be?",
    helper: "We'll build workouts that fit your time.",
  },
  {
    kind: "location",
    label: "Where they train",
    rail: "both",
    question: "Where will you train?",
    helper: "We'll adapt your plan to your space and kit.",
    note: "Beginners see a gentler version of the helper unless you set one here.",
  },
  {
    kind: "equipment",
    label: "Kit at home",
    rail: "both",
    question: "What kit do you have at home?",
    helper: "Pick everything you've got. We'll use what we can.",
    note: "Beginners see a gentler version of the helper unless you set one here.",
  },
  {
    kind: "partner",
    label: "Solo or doubles",
    rail: "athlete",
    question: "Training solo or with a partner?",
  },
  {
    kind: "injuries",
    label: "Injuries",
    rail: "both",
    question: "Any injuries we should plan around?",
    helper: "We'll adjust the plan to protect what needs protecting.",
  },
  {
    kind: "injury-detail",
    label: "Injury detail",
    rail: "both",
    question: "Tell us about your {area}.",
    helper:
      "A clearer picture means safer swaps and smarter loading, not a watered-down plan.",
    note: "{area} is replaced with the injury they picked. Keep it in the question.",
  },
  {
    kind: "support-preference",
    label: "How they want to work",
    rail: "both",
    question: "How do you want to work?",
    helper: "There's no wrong answer. It only changes what happens next.",
    note: "Beginners are asked 'How do you want to train?' unless you set one here.",
  },
  {
    kind: "meet-ben",
    label: "Meet Ben",
    rail: "both",
    cta: "Pick a time →",
    note: "Ben's bio and records are edited in the page itself, not here.",
  },
  {
    kind: "book-slot",
    label: "Choose a time",
    rail: "both",
    question: "When shall Ben call {first}?",
    helper:
      "Half an hour on the phone, free, no obligation. He'll have read everything you just told him before he rings.",
    note: "{first} is their first name.",
  },
];

/** The storage key for one field of one screen. */
export function copyKey(kind: string, field: CopyField): string {
  return `${kind}.${field}`;
}

/** Every key the editor may write, for validating what comes back. */
export function allCopyKeys(): string[] {
  const keys: string[] = [];
  for (const s of QUIZ_COPY) {
    for (const f of ["question", "helper", "cta"] as CopyField[]) {
      // The CTA is offered on every screen even where the default is the
      // standard "Continue →", because that is exactly the sort of thing
      // worth changing on one screen without touching the other twenty.
      if (f === "cta" || s[f] !== undefined) keys.push(copyKey(s.kind, f));
    }
  }
  return keys;
}

/**
 * Fill `{token}` placeholders. Unknown tokens are left alone rather than
 * blanked: a typo should look like a typo, not silently eat the word.
 */
export function interpolate(
  text: string,
  tokens: Record<string, string | undefined>,
): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    tokens[name] !== undefined ? String(tokens[name]) : whole,
  );
}
