/**
 * Vyrek plan generator. Phase 2 / docs/vyrek-phase-d-e-brief.md.
 *
 * Pure, deterministic functions that build a 7-day Week-1 schedule given
 * the user's quiz answers. Week 1 is what /plan reveals before paywall;
 * Weeks 2-12 use the same building blocks but live server-side only.
 *
 * Calibration:
 *   - Sled push / wall ball / farmers carry, fixed by sex (Hyrox standards)
 *   - Sandbag lunge, % of body weight
 *
 * Adaptation:
 *   - Equipment list filters out exercises requiring missing kit
 *   - Injuries swap risky lifts for low-impact alternatives
 *   - Session length scales warm-up + main + cool-down proportionally
 */

import { addDays } from "date-fns";
import type {
  QuizAnswers,
  Programme,
  WeightUnit,
} from "@/lib/quiz-flow";
import { determineStartDate } from "@/lib/quiz-flow";

export type WorkoutType =
  | "run"
  | "hyrox"
  | "strength"
  | "recovery"
  | "rest";

export type IntensityZone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | null;

export type Block = {
  name: string;
  reps?: string;
  duration?: string;
  notes?: string;
  /** Calibrated load, kg for the underlying value, with display unit */
  load?: { weight: number; unit: WeightUnit };
};

export type WorkoutSection = {
  section: "warmup" | "main" | "cooldown";
  durationMin: number;
  blocks: Block[];
};

export type Workout = {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  date: string; // ISO yyyy-mm-dd
  type: WorkoutType;
  title: string;
  durationMin: number;
  intensityZone: IntensityZone;
  structure: WorkoutSection[];
};

export type Plan = {
  week: number;
  startDate: string;
  programme: Programme;
  workouts: Workout[];
};

const DAY_LABELS: Array<Workout["day"]> = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function labelForDate(d: Date): Workout["day"] {
  return DAY_LABELS[d.getDay()];
}

type Calibration = {
  sledKg: number;
  wallBallKg: number;
  farmersKg: number;
  sandbagKg: number;
  unit: WeightUnit;
};

export function deriveCalibration(answers: QuizAnswers): Calibration {
  const isMens = answers.sex === "men";
  const bodyKg = answers.weight ?? 75;
  return {
    sledKg: isMens ? 152: 102,
    wallBallKg: isMens ? 9: 6,
    farmersKg: isMens ? 24: 16,
    sandbagKg: Math.round(bodyKg * (isMens ? 0.3: 0.25)),
    unit: answers.weightUnit ?? "kg",
  };
}

export function displayWeight(weightKg: number, unit: WeightUnit): string {
  if (unit === "lb") {
    return `${Math.round(weightKg * 2.20462)} lb`;
  }
  return `${weightKg} kg`;
}

/**
 * Day patterns by training frequency. Index 0 is the START day of Week 1;
 * subsequent entries are the next six days in order. We rotate the calendar
 * relative to startDate, not to Monday, so a Tuesday start lands the user's
 * first hyrox session on Tuesday (not on Monday last week).
 */
const PATTERNS: Record<number, WorkoutType[]> = {
  2: ["hyrox", "rest", "rest", "rest", "rest", "run", "rest"],
  3: ["hyrox", "rest", "strength", "rest", "rest", "run", "rest"],
  4: ["hyrox", "rest", "strength", "rest", "hyrox", "run", "rest"],
  5: ["hyrox", "rest", "strength", "run", "hyrox", "recovery", "rest"],
  6: ["hyrox", "recovery", "strength", "run", "hyrox", "strength", "rest"],
};

function pickPattern(daysPerWeek: number): WorkoutType[] {
  return PATTERNS[daysPerWeek] ?? PATTERNS[4];
}

/**
 * Equipment availability check. Returns true if the user has the kit
 * required for a given exercise. Non-home users get full kit by default.
 */
function hasKit(answers: QuizAnswers, ...required: string[]): boolean {
  if (answers.location !== "home") return true;
  const have = new Set(answers.equipment ?? []);
  return required.every((r) => have.has(r) || have.has("bodyweight"));
}

/**
 * Injury substitution map. Returns true if a given exercise is contraindicated
 * for the user's injury.
 */
function contraindicated(
  exercise: string,
  injuries: QuizAnswers["injuries"],
): boolean {
  if (!injuries || injuries === "none" || injuries === "other") return false;
  const banned: Record<string, string[]> = {
    "lower-back": ["sled-push", "deadlift", "farmers-carry"],
    knee: ["box-jump", "burpee-broad-jump", "lunge"],
    shoulder: ["wall-ball", "ski-erg", "overhead-press"],
    "achilles-calf": ["run", "box-jump", "ski-erg"],
  };
  return banned[injuries]?.includes(exercise) ?? false;
}

function scaleSection(targetMin: number, base: number, durationMin: number) {
  return Math.max(5, Math.round((targetMin / base) * durationMin));
}

/**
 * Build a Hyrox-style hybrid workout (run + sled + station combo). Used as
 * the centrepiece on hyrox days.
 */
function buildHyroxWorkout(
  answers: QuizAnswers,
  cal: Calibration,
  date: string,
  day: Workout["day"],
): Workout {
  const total = parseInt(answers.sessionLength ?? "60", 10);
  const warmup = scaleSection(10, 60, total);
  const cooldown = scaleSection(10, 60, total);
  const main = total - warmup - cooldown;

  const sledBack = !contraindicated("sled-push", answers.injuries);
  const wallBack = !contraindicated("wall-ball", answers.injuries);

  const mainBlocks: Block[] = [
    {
      name: "Run intervals",
      reps: "4 × 800m at race pace",
      notes: "Recover 90s between reps.",
    },
  ];
  if (sledBack && hasKit(answers, "sled")) {
    mainBlocks.push({
      name: "Sled push",
      reps: "4 × 20m",
      load: { weight: cal.sledKg, unit: cal.unit },
      notes: "Race-weight sled. Walk back between reps.",
    });
  } else {
    mainBlocks.push({
      name: "Heavy carry",
      reps: "4 × 40m",
      load: { weight: cal.farmersKg, unit: cal.unit },
      notes: "Farmers carry, substituted in for sled.",
    });
  }
  if (wallBack && hasKit(answers, "wall-ball")) {
    mainBlocks.push({
      name: "Wall balls",
      reps: "3 × 20",
      load: { weight: cal.wallBallKg, unit: cal.unit },
      notes: "10ft target. Squat depth honest.",
    });
  } else {
    mainBlocks.push({
      name: "Goblet squats",
      reps: "3 × 15",
      load: { weight: cal.farmersKg, unit: cal.unit },
      notes: "Wall ball substitute, controlled tempo.",
    });
  }

  return {
    day,
    date,
    type: "hyrox",
    title: "Hyrox Hybrid: Run + Sled + Wall Balls",
    durationMin: total,
    intensityZone: "Z3",
    structure: [
      {
        section: "warmup",
        durationMin: warmup,
        blocks: [
          { name: "Easy jog", duration: `${Math.floor(warmup * 0.5)} min` },
          { name: "Dynamic stretches", reps: "5 min" },
          ...(sledBack && hasKit(answers, "sled")
            ? [
                {
                  name: "Sled push, light",
                  reps: "2 × 10m",
                  notes: "Half race weight.",
                },
              ]: []),
        ],
      },
      { section: "main", durationMin: main, blocks: mainBlocks },
      {
        section: "cooldown",
        durationMin: cooldown,
        blocks: [
          { name: "Walk", duration: "5 min" },
          { name: "Static stretches", reps: "5 min" },
        ],
      },
    ],
  };
}

function buildRunWorkout(
  answers: QuizAnswers,
  date: string,
  day: Workout["day"],
): Workout {
  const total = parseInt(answers.sessionLength ?? "60", 10);
  if (contraindicated("run", answers.injuries)) {
    return buildRecoveryWorkout(answers, date, day);
  }
  return {
    day,
    date,
    type: "run",
    title: "Easy aerobic run",
    durationMin: total,
    intensityZone: "Z2",
    structure: [
      {
        section: "warmup",
        durationMin: 5,
        blocks: [
          { name: "Walk", duration: "2 min" },
          { name: "Dynamic stretches", reps: "5 movements" },
        ],
      },
      {
        section: "main",
        durationMin: Math.max(20, total - 10),
        blocks: [
          {
            name: "Steady aerobic run",
            duration: `${Math.max(20, total - 10)} min`,
            notes: "Conversational pace. Nose breathing if you can.",
          },
        ],
      },
      {
        section: "cooldown",
        durationMin: 5,
        blocks: [{ name: "Walk + stretch", duration: "5 min" }],
      },
    ],
  };
}

function buildStrengthWorkout(
  answers: QuizAnswers,
  cal: Calibration,
  date: string,
  day: Workout["day"],
): Workout {
  const total = parseInt(answers.sessionLength ?? "60", 10);
  const main = total - 15;
  const blocks: Block[] = [];

  if (
    hasKit(answers, "dumbbells", "kettlebell") &&
    !contraindicated("deadlift", answers.injuries)
  ) {
    blocks.push({
      name: "Romanian deadlifts",
      reps: "4 × 8",
      notes: "Heavy. Hinge from the hips, neutral spine.",
    });
  }
  if (!contraindicated("lunge", answers.injuries)) {
    blocks.push({
      name: "Reverse lunges",
      reps: "3 × 10/leg",
      load: { weight: cal.sandbagKg, unit: cal.unit },
      notes: "Sandbag or dumbbells. Slow tempo.",
    });
  } else {
    blocks.push({
      name: "Goblet squats",
      reps: "3 × 12",
      notes: "Knee-friendly squat variant.",
    });
  }
  if (!contraindicated("overhead-press", answers.injuries)) {
    blocks.push({
      name: "Overhead press",
      reps: "4 × 6",
      notes: "Strict press, no leg drive.",
    });
  } else {
    blocks.push({
      name: "Landmine press",
      reps: "4 × 8/arm",
      notes: "Shoulder-friendly press alternative.",
    });
  }
  blocks.push({
    name: "Hanging knee raises",
    reps: "3 × 10",
    notes: "Slow up, slower down.",
  });

  return {
    day,
    date,
    type: "strength",
    title: "Strength: lower + push + core",
    durationMin: total,
    intensityZone: "Z3",
    structure: [
      {
        section: "warmup",
        durationMin: 10,
        blocks: [
          { name: "Bike or row", duration: "5 min" },
          { name: "Mobility flow", reps: "5 min" },
        ],
      },
      { section: "main", durationMin: main, blocks },
      {
        section: "cooldown",
        durationMin: 5,
        blocks: [{ name: "Stretches", reps: "5 min" }],
      },
    ],
  };
}

function buildRecoveryWorkout(
  _answers: QuizAnswers,
  date: string,
  day: Workout["day"],
): Workout {
  return {
    day,
    date,
    type: "recovery",
    title: "Recovery: zone 2 + mobility",
    durationMin: 30,
    intensityZone: "Z1",
    structure: [
      {
        section: "warmup",
        durationMin: 5,
        blocks: [{ name: "Easy walk", duration: "5 min" }],
      },
      {
        section: "main",
        durationMin: 20,
        blocks: [
          {
            name: "Easy aerobic",
            duration: "15 min",
            notes: "Bike, row, or walk. Z1 only.",
          },
          {
            name: "Foam roll",
            duration: "5 min",
            notes: "Quads, glutes, lats.",
          },
        ],
      },
      {
        section: "cooldown",
        durationMin: 5,
        blocks: [{ name: "Long holds", reps: "60s × 5 positions" }],
      },
    ],
  };
}

function buildRestDay(
  date: string,
  day: Workout["day"],
): Workout {
  return {
    day,
    date,
    type: "rest",
    title: "Rest day",
    durationMin: 0,
    intensityZone: null,
    structure: [
      {
        section: "main",
        durationMin: 0,
        blocks: [
          {
            name: "Walk 20-30 min",
            notes: "Optional. Light movement is fine. No structured training.",
          },
        ],
      },
    ],
  };
}

export function generateWeek1(
  answers: QuizAnswers,
  programme: Programme,
  startDate: Date = determineStartDate(),
): Plan {
  const cal = deriveCalibration(answers);
  const pattern = pickPattern(answers.days ?? 4);

  const workouts: Workout[] = pattern.map((type, i) => {
    const d = addDays(startDate, i);
    const date = d.toISOString().slice(0, 10);
    const day = labelForDate(d);
    switch (type) {
      case "hyrox":
        return buildHyroxWorkout(answers, cal, date, day);
      case "run":
        return buildRunWorkout(answers, date, day);
      case "strength":
        return buildStrengthWorkout(answers, cal, date, day);
      case "recovery":
        return buildRecoveryWorkout(answers, date, day);
      case "rest":
      default:
        return buildRestDay(date, day);
    }
  });

  return {
    week: 1,
    startDate: startDate.toISOString().slice(0, 10),
    programme,
    workouts,
  };
}

/**
 * Generate weeks 2-12, placeholder that scales Week 1 by adding intensity
 * each week. Real periodisation library lands in Phase F. Critical: this
 * function is only ever called server-side (from /api/plan/[week]).
 */
export function generateWeekN(
  answers: QuizAnswers,
  programme: Programme,
  week: number,
  startDate: Date = determineStartDate(),
): Plan {
  if (week === 1) return generateWeek1(answers, programme, startDate);
  // For now, return Week 1 shifted by (week-1) weeks with a +5% intensity bump
  // hint in the title. Full periodisation in Phase F.
  const offset = addDays(startDate, (week - 1) * 7);
  const base = generateWeek1(answers, programme, offset);
  return {
    ...base,
    week,
    workouts: base.workouts.map((w) => ({
      ...w,
      title:
        w.type === "rest"
          ? w.title: `${w.title} · Week ${week} (+${(week - 1) * 5}% volume)`,
    })),
  };
}

// ─── Benefit copy per programme (brief 3.6) ─────────────────────────────
//
// Sales-pitch language for Screen 14 (plan summary). Each programme gets
// the same 5-row structure with copy tuned to the audience.

export type Benefit = { number: string; title: string; body: string };

const BENEFITS: Record<Programme, Benefit[]> = {
  "first-race": [
    {
      number: "01",
      title: "Your personal Elite 15 coach",
      body: "James Wright, Top 50 World Championships finisher. Reviews your weekly progress. Answers your questions in the app.",
    },
    {
      number: "02",
      title: "12 weeks of dated training",
      body: "Sessions calibrated to your sled load, wall ball, and farmers carry weights. Every workout has a calendar slot.",
    },
    {
      number: "03",
      title: "Adaptive Sunday rebuilds",
      body: "Every Sunday we recalibrate based on what you logged. Your plan gets sharper each week.",
    },
    {
      number: "04",
      title: "Hyrox station mastery",
      body: "Race-specific blocks for all 8 stations. You'll feel ready at the start line.",
    },
    {
      number: "05",
      title: "Community of racers",
      body: "Train alongside other Vyrek members. Share splits, swap tips, find race partners.",
    },
  ],
  "sub-90": [
    {
      number: "01",
      title: "Your personal Elite 15 coach",
      body: "Reviews your splits weekly, identifies pacing issues, points at the limiter holding you above 90.",
    },
    {
      number: "02",
      title: "12 weeks calibrated to sub-90",
      body: "Race-pace intervals, station efficiency drills, transition rehearsals. Every block tuned for the time barrier.",
    },
    {
      number: "03",
      title: "Adaptive Sunday rebuilds",
      body: "Plan recalibrates on logged sessions. If a station is your bottleneck, next week targets it.",
    },
    {
      number: "04",
      title: "Hyrox station mastery",
      body: "Focused on time-saving at your slowest stations. Pacing strategy baked into every Hyrox-pattern session.",
    },
    {
      number: "05",
      title: "Community of competitive racers",
      body: "Swap pacing strategies with members chasing the same time.",
    },
  ],
  doubles: [
    {
      number: "01",
      title: "Your personal Elite 15 coach",
      body: "Reviews both athletes' progress weekly. Spots handoff inefficiencies. Adjusts the partner split.",
    },
    {
      number: "02",
      title: "12 weeks of synchronised programming",
      body: "Sessions designed for two athletes. Paired intervals, partner-aware recovery.",
    },
    {
      number: "03",
      title: "Joint progress tracking",
      body: "Both partners' logs in one view. Surface where the team needs work.",
    },
    {
      number: "04",
      title: "Station handoff strategy",
      body: "Partner timing drills, station-split rehearsal, race-day choreography.",
    },
    {
      number: "05",
      title: "Doubles community",
      body: "Find new partners or race teams in the Vyrek community.",
    },
  ],
  pro: [
    {
      number: "01",
      title: "Coached by an Elite 15 podium contender",
      body: "Specific to Pro-division standards. Programming written for sub-75 / Pro-qualifying targets.",
    },
    {
      number: "02",
      title: "12 weeks of high-volume race prep",
      body: "Higher weekly mileage, race-pace density, station-specific overload. Designed for athletes used to the load.",
    },
    {
      number: "03",
      title: "Weekly video form review",
      body: "Upload your sled push, wall ball, and lift form. Coach reviews and replies in the app.",
    },
    {
      number: "04",
      title: "Sub-75 pacing strategy",
      body: "Per-kilometre split targets and station-time benchmarks. Optimised for podium contention.",
    },
    {
      number: "05",
      title: "Elite training community",
      body: "Train alongside other Pro-division members. Exclusive race meetups.",
    },
  ],
};

export function getBenefits(programme: Programme): Benefit[] {
  return BENEFITS[programme];
}
