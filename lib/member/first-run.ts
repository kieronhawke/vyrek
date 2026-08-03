/**
 * What a member should see before there is anything to show them.
 *
 * Written 3 August 2026. The member screens all render DEMO_* constants, so
 * a real customer who paid this morning would open the app and read somebody
 * else's training week: a Tuesday threshold session they never did, a
 * community feed of people who do not exist. That is worse than an empty
 * screen, and it is the first thing they see after paying.
 *
 * There is no plans table yet. Ben writes the first week by hand, so a new
 * member genuinely is waiting, and this is not a placeholder standing in for
 * a feature: it is the honest state of the product on day one. When the
 * delivery pipeline lands, `publishedWeeks` starts coming back non-zero and
 * these screens step aside on their own.
 *
 * Everything here is derived from data we really hold: the customers row,
 * their latest quiz response, and their subscription state.
 */

export type MemberFacts = {
  firstName: string | null;
  /** Programme picked in the quiz, e.g. "First Race". */
  programme: string | null;
  /** Their race, if they gave us one. */
  raceDate: Date | null;
  /** Sessions a week they said they could train. */
  daysPerWeek: number | null;
  /** When they joined, which is what "Ben is writing it" is measured from. */
  joinedAt: Date | null;
  /** Weeks of training actually published to them. Zero until Ben sends one. */
  publishedWeeks: number;
  /** Sessions they have logged. */
  loggedSessions: number;
};

export type FirstRunStage =
  | "writing" // joined, waiting on week one
  | "overdue" // waiting longer than we promised
  | "ready"; // there is a plan, show the real thing

/** How long we tell people to expect. Keep this and the copy in step. */
export const FIRST_WEEK_HOURS = 24;

export type FirstRunState = {
  stage: FirstRunStage;
  /** 0 to 1, for the progress indicator. Never reaches 1 while waiting. */
  progress: number;
  /** Hours since they joined, floored. */
  hoursWaiting: number;
  facts: MemberFacts;
};

export function resolveFirstRun(
  facts: MemberFacts,
  now: Date = new Date(),
): FirstRunState {
  if (facts.publishedWeeks > 0) {
    return { stage: "ready", progress: 1, hoursWaiting: 0, facts };
  }

  const joined = facts.joinedAt ?? now;
  const hoursWaiting = Math.max(
    0,
    Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60)),
  );

  // Creeps towards 0.92 across the promised window and stops there. A bar
  // that sits at 100% while nothing has arrived reads as broken.
  const progress = Math.min(0.92, hoursWaiting / FIRST_WEEK_HOURS);

  return {
    stage: hoursWaiting >= FIRST_WEEK_HOURS ? "overdue" : "writing",
    progress,
    hoursWaiting,
    facts,
  };
}

/**
 * "in the next few hours" / "by this evening" / "first thing tomorrow".
 *
 * Vague on purpose. A precise countdown to a human writing something by hand
 * is a promise we cannot keep, and a missed countdown is worse than no
 * countdown.
 */
export function expectedWindow(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 11) return "later today";
  if (hour < 17) return "by this evening";
  return "first thing tomorrow";
}

/** Days until the race, or null. Negative means it has been and gone. */
export function daysUntilRace(
  raceDate: Date | null,
  now: Date = new Date(),
): number | null {
  if (!raceDate) return null;
  const a = new Date(raceDate);
  a.setHours(0, 0, 0, 0);
  const b = new Date(now);
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * MemberContext -> MemberFacts.
 *
 * Kept pure and taking the context as an argument so this module stays
 * importable from client components; the auth module is server-only.
 *
 * `publishedWeeks` is hardcoded to 0 because there is no plans table yet.
 * That is deliberate and it is the honest answer: Ben writes week one by
 * hand, so until a delivery pipeline exists every member really is waiting.
 * When it lands, this reads a count and the first-run screens step aside on
 * their own without touching any of the presentation.
 */
export function factsFromContext(ctx: {
  user: { email: string };
  customer: { created_at: string | null } | null;
  programme: string | null;
  quizAnswers: Record<string, unknown> | null;
}): MemberFacts {
  const a = ctx.quizAnswers ?? {};

  const rawRace = a.raceDate;
  let raceDate: Date | null = null;
  if (typeof rawRace === "string" || rawRace instanceof Date) {
    const d = new Date(rawRace as string);
    if (!Number.isNaN(d.getTime())) raceDate = d;
  }

  const rawDays = a.days;
  const daysPerWeek =
    typeof rawDays === "number"
      ? rawDays
      : typeof rawDays === "string" && /^\d+$/.test(rawDays)
        ? Number(rawDays)
        : null;

  const firstName =
    ctx.user.email
      .replace(/@.*/, "")
      .split(/[\W_]+/)[0]
      ?.replace(/^./, (c) => c.toUpperCase()) || null;

  return {
    firstName,
    programme: PROGRAMME_LABEL[ctx.programme ?? ""] ?? null,
    raceDate,
    daysPerWeek,
    joinedAt: ctx.customer?.created_at
      ? new Date(ctx.customer.created_at)
      : null,
    publishedWeeks: 0,
    loggedSessions: 0,
  };
}

const PROGRAMME_LABEL: Record<string, string> = {
  "first-race": "First Race",
  "sub-90": "Sub-90",
  doubles: "Doubles",
  pro: "Pro",
};
