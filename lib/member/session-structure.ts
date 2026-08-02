/**
 * Session structure — blocks, intervals, RPE.
 *
 * WHY THIS EXISTS
 * ---------------
 * `TodayWorkout.blocks` is `{ label, detail, duration }`, where `detail` is a
 * sentence: "6 rounds: 1 km run at threshold pace + 30 m sled push at 60% race
 * weight + 90s easy". That is a paragraph describing a session, not a session.
 * You cannot tick it off, time it, or read it one-handed between rounds.
 *
 * The reference teardown (docs/design/app-references.md §1.5) found RoxFit —
 * the closest of the four apps to our actual sport — structuring the same
 * thing as numbered intervals:
 *
 *     ①  INTERVAL 1/4          ⏱ 1m
 *        Ski Erg
 *        12 calories
 *        [ Rest remaining time ]
 *
 * and writing prescriptions as `600 m · Race Pace · 8/10 RPE`.
 *
 * RPE IS THE POINT
 * ----------------
 * Rate of perceived exertion is how a HYROX session is actually communicated,
 * because the same prescription is a different session for two athletes. A
 * percentage of 1RM does not exist for a sled push; "8/10" does. It is also
 * the number Ben needs back to know whether the week landed, which is why
 * SessionFeedback already asks the same question in words.
 */

export type Effort = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type Interval = {
  /** "Ski Erg", "Run", "Sled push". */
  movement: string;
  /** The scannable quantity: "600 m", "12 calories", "3 rounds". */
  quantity: string;
  /** Qualifier: "Race pace", "Threshold", "60% race weight". */
  qualifier?: string;
  /** Perceived exertion out of 10. Omitted for warm-ups and rest. */
  rpe?: Effort;
  /** What happens after this interval, if anything. */
  rest?: string;
};

export type Block = {
  /** "W" for the warm-up, then A, B, C… Derived, never typed. */
  letter: string;
  label: string;
  /** "Straight set · 2 sets", "Repeat 6x". */
  shape?: string;
  duration?: string;
  intervals: Interval[];
};

/** Low / moderate / high, as a glyph rather than a word. Teardown §1.6. */
export function effortBand(rpe: Effort | undefined): {
  bars: 1 | 2 | 3;
  label: string;
  tone: string;
} | null {
  if (!rpe) return null;
  if (rpe <= 4) return { bars: 1, label: "Easy", tone: "var(--ok)" };
  if (rpe <= 7) return { bars: 2, label: "Moderate", tone: "var(--warn)" };
  return { bars: 3, label: "Hard", tone: "var(--danger)" };
}

/**
 * The demo session, restructured.
 *
 * Same session as DEMO_TODAY — 6 rounds of 1km threshold plus a 30m sled push
 * — expressed as something the athlete can work through rather than read.
 */
export const DEMO_BLOCKS: Block[] = [
  {
    letter: "W",
    label: "Warm-up",
    duration: "12 min",
    intervals: [
      { movement: "Easy run", quantity: "8 min", qualifier: "Conversational", rpe: 3 },
      {
        movement: "Leg swings, lunges, openers",
        quantity: "4 min",
        qualifier: "Dynamic mobility",
      },
    ],
  },
  {
    letter: "A",
    label: "Main block",
    shape: "Repeat 6x",
    duration: "40 min",
    intervals: [
      {
        movement: "Run",
        quantity: "1 km",
        qualifier: "Threshold pace",
        rpe: 8,
      },
      {
        movement: "Sled push",
        quantity: "30 m",
        qualifier: "60% race weight",
        rpe: 8,
        rest: "90s easy before the next round",
      },
    ],
  },
  {
    letter: "B",
    label: "Cool-down",
    duration: "8 min",
    intervals: [
      { movement: "Walk", quantity: "5 min", rpe: 2 },
      { movement: "Breathing reset and lower-body stretch", quantity: "3 min" },
    ],
  },
];

/** Total prescribed intervals, for the "1 / N" step chips. */
export function countIntervals(blocks: Block[]): number {
  return blocks.reduce((a, b) => a + b.intervals.length, 0);
}

/** The hardest RPE in the session, which is what sets its badge. */
export function peakEffort(blocks: Block[]): Effort | undefined {
  const all = blocks.flatMap((b) => b.intervals.map((i) => i.rpe)).filter(Boolean);
  return all.length ? (Math.max(...(all as number[])) as Effort) : undefined;
}
