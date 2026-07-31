/**
 * THE RACE CONFLICT RESOLVER — docs/build-pack/spec/10 §2.
 *
 * The standout feature, and it came straight out of Ben's frustration:
 *
 *   "I've got an ultra marathon in three weeks, then two weeks after that
 *    the Great North Run, then the week after that a Hyrox Pro Doubles race.
 *    I'm sat there going, okay, if she does this, that doesn't work, and we
 *    put that there..."
 *
 * That is periodisation conflict resolution done by hand in Excel. It is the
 * highest-value thing in Ben's head and the hardest thing to hire for.
 *
 * **This module systematises the analysis and leaves the decision with him.**
 * It returns conflicts and options with their trade-offs. It never returns an
 * answer, never picks, and never silently reorders anything — spec/10 §1 is
 * explicit that the system builds the skeleton and Ben supplies the
 * judgement, because "willingness to say no" is one of the five things that
 * actually signal a human.
 *
 * Pure and date-injected: no `Date.now()`, so every case is reproducible.
 */

export type Discipline =
  | "ultra"
  | "marathon"
  | "half_marathon"
  | "ten_k"
  | "five_k"
  | "hyrox"
  | "other";

export type Priority = "A" | "B" | "C";

export type Race = {
  id: string;
  name: string;
  /** ISO date, midnight UTC. */
  date: Date;
  discipline: Discipline;
  priority: Priority;
  /** Set when the athlete is travelling across timezones for it. */
  travelDaysBefore?: number;
};

/**
 * Physiological profile per discipline. Recovery is the debt the race leaves;
 * taper is the runway it needs before it. Both in days, and both deliberately
 * conservative — under-recovering an athlete is the expensive mistake.
 *
 * The ultra and half-marathon numbers are the ones spec/10 §2 states
 * directly (10–14 days and 3–5 days); the rest follow the same shape.
 */
export const PROFILE: Record<
  Discipline,
  { recoveryDays: number; taperDays: number; demand: string }
> = {
  ultra: { recoveryDays: 14, taperDays: 21, demand: "Aerobic durability, huge volume" },
  marathon: { recoveryDays: 14, taperDays: 14, demand: "Aerobic threshold, high volume" },
  half_marathon: { recoveryDays: 5, taperDays: 7, demand: "Threshold" },
  ten_k: { recoveryDays: 3, taperDays: 5, demand: "VO2 and threshold" },
  five_k: { recoveryDays: 2, taperDays: 3, demand: "VO2" },
  hyrox: {
    recoveryDays: 7,
    taperDays: 10,
    demand: "Mixed anaerobic and strength endurance",
  },
  other: { recoveryDays: 5, taperDays: 7, demand: "Unclassified" },
};

/**
 * Disciplines whose training blocks actively degrade each other. A
 * high-volume endurance block erodes exactly the strength and anaerobic
 * power a Hyrox result depends on, which is the conflict Ben's example turns
 * on and the one a naive calendar check would miss entirely.
 */
const DEGRADES: Array<{ from: Discipline[]; to: Discipline[]; why: string }> = [
  {
    from: ["ultra", "marathon"],
    to: ["hyrox"],
    why: "A high-volume endurance block degrades the strength and anaerobic power a Hyrox result depends on",
  },
  {
    from: ["hyrox"],
    to: ["ultra", "marathon"],
    why: "A strength-endurance block leaves little room for the aerobic volume a long-distance race needs",
  },
];

export type ConflictSeverity = "blocking" | "significant" | "worth_knowing";

export type Conflict = {
  code:
    | "inside_recovery"
    | "taper_overlap"
    | "multiple_a_races"
    | "discipline_degradation"
    | "insufficient_build"
    | "travel_before_race";
  severity: ConflictSeverity;
  raceIds: string[];
  description: string;
};

export type ResolverOption = {
  /** The race this option treats as the A race, or null for "no true peak". */
  aRaceId: string | null;
  title: string;
  approach: string[];
  /** Named explicitly. spec/10 §1: naming what was sacrificed is the point. */
  tradeOff: string;
};

export type ConflictAnalysis = {
  conflicts: Conflict[];
  options: ResolverOption[];
  /** True when nothing needs Ben's attention. */
  clear: boolean;
};

const DAY_MS = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

function byDate(a: Race, b: Race): number {
  return a.date.getTime() - b.date.getTime();
}

function degradationBetween(a: Race, b: Race): string | null {
  for (const rule of DEGRADES) {
    if (rule.from.includes(a.discipline) && rule.to.includes(b.discipline)) {
      return rule.why;
    }
  }
  return null;
}

/**
 * Analyse a set of enrolled races.
 *
 * `blockStart` is when the training block begins, used only for the
 * insufficient-build check.
 */
export function analyseRaces(
  races: Race[],
  opts: { blockStart?: Date; minBuildDays?: number } = {},
): ConflictAnalysis {
  const sorted = [...races].sort(byDate);
  const conflicts: Conflict[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const earlier = sorted[i];

    // Travel before a race, flagged regardless of what else is going on.
    if (earlier.travelDaysBefore && earlier.travelDaysBefore > 0) {
      conflicts.push({
        code: "travel_before_race",
        severity: "worth_knowing",
        raceIds: [earlier.id],
        description: `${earlier.name} has ${earlier.travelDaysBefore} days of travel before it. Expect disrupted sleep and reduced quality in the final week.`,
      });
    }

    for (let j = i + 1; j < sorted.length; j++) {
      const later = sorted[j];
      const gap = daysBetween(earlier.date, later.date);
      const recovery = PROFILE[earlier.discipline].recoveryDays;
      const taper = PROFILE[later.discipline].taperDays;

      // The headline case: the later race falls inside the earlier one's
      // recovery window, so it cannot be a target race.
      if (gap < recovery) {
        conflicts.push({
          code: "inside_recovery",
          severity: "blocking",
          raceIds: [earlier.id, later.id],
          description: `${later.name} falls ${gap} days after ${earlier.name}, inside its ${recovery}-day recovery window. It cannot be a target race.`,
        });
      } else if (gap < recovery + taper) {
        // Far enough out to race, but the taper it needs overlaps the
        // recovery it is still paying off.
        conflicts.push({
          code: "taper_overlap",
          severity: "significant",
          raceIds: [earlier.id, later.id],
          description: `${later.name} needs a ${taper}-day taper, which overlaps the ${recovery} days of recovery ${earlier.name} leaves. You cannot peak for both.`,
        });
      }

      const why = degradationBetween(earlier, later);
      if (why && gap <= PROFILE[earlier.discipline].recoveryDays + 28) {
        conflicts.push({
          code: "discipline_degradation",
          severity: "significant",
          raceIds: [earlier.id, later.id],
          description: `${earlier.name} then ${later.name}, ${gap} days apart. ${why}.`,
        });
      }
    }
  }

  // More than one A race inside a window where both cannot be peaked.
  const aRaces = sorted.filter((r) => r.priority === "A");
  if (aRaces.length > 1) {
    conflicts.push({
      code: "multiple_a_races",
      severity: "blocking",
      raceIds: aRaces.map((r) => r.id),
      description: `${aRaces.length} races are marked priority A. Only one can be a true peak.`,
    });
  }

  // Not enough runway to build for the first race.
  if (opts.blockStart && sorted.length > 0) {
    const minBuild = opts.minBuildDays ?? 28;
    const runway = daysBetween(opts.blockStart, sorted[0].date);
    if (runway < minBuild) {
      conflicts.push({
        code: "insufficient_build",
        severity: "significant",
        raceIds: [sorted[0].id],
        description: `Only ${runway} days from the block starting to ${sorted[0].name}. That is under the ${minBuild} days a meaningful build needs.`,
      });
    }
  }

  return {
    conflicts,
    options: conflicts.length ? buildOptions(sorted) : [],
    clear: conflicts.length === 0,
  };
}

/**
 * Present the choices, with what each one costs.
 *
 * One option per race treated as the A race, plus the honest "split the
 * difference" that spec/10 §2 includes and is candid about. Ben picks.
 */
export function buildOptions(races: Race[]): ResolverOption[] {
  const sorted = [...races].sort(byDate);
  if (sorted.length < 2) return [];

  const options: ResolverOption[] = sorted.map((target) => {
    const others = sorted.filter((r) => r.id !== target.id);
    const approach = others.map((o) => {
      const gap = daysBetween(o.date, target.date);
      if (gap > 0) {
        // This race comes before the target.
        return `${o.name} becomes a controlled effort rather than a race, to protect the ${Math.abs(gap)} days into ${target.name}.`;
      }
      return `${o.name} is participation only, ${Math.abs(gap)} days after ${target.name}.`;
    });

    approach.unshift(
      `Full taper into ${target.name}: ${PROFILE[target.discipline].taperDays} days.`,
    );

    const sacrificed = others.map((o) => o.name).join(" and ");
    return {
      aRaceId: target.id,
      title: `${target.name} is the A race`,
      approach,
      tradeOff: `${sacrificed} will be well below capability.`,
    };
  });

  options.push({
    aRaceId: null,
    title: "Split the difference",
    approach: [
      "No true peak for any of them.",
      "Maintain across disciplines rather than sharpening for one.",
    ],
    // spec/10 §2 is candid about this option, and so is this copy. An
    // optimistic framing here would be exactly the frictionless
    // accommodation the spec warns against.
    tradeOff:
      "Solid across all of them, exceptional at none. Honestly the worst of the options unless she just wants to enjoy them.",
  });

  return options;
}

/**
 * Whether a plan may be sent while conflicts are outstanding.
 *
 * Blocking conflicts warn before send (spec/11 §2 point 7) but do not hard
 * block: the coach may knowingly accept one, and a tool that refuses to let
 * an expert override it is a tool an expert stops using. The requirement is
 * that he cannot send *without seeing it*.
 */
export function requiresAcknowledgement(analysis: ConflictAnalysis): boolean {
  return analysis.conflicts.some((c) => c.severity === "blocking");
}
