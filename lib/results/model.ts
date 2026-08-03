import type { ResultStatus } from "./status";

/**
 * Race model for the Results section.
 *
 * Extends `lib/results/types.ts` (the Sprint 1 layer) rather than replacing it —
 * that file's `DivisionCode`, `Venue`, `Split` and `formatSeconds` are already
 * right and are consumed by live pages. What is new here is the full race
 * structure, age groups and the per-division time profiles the demo generator
 * needs.
 */

import type { DivisionCode } from "./types";

export type StationId =
  | "ski-erg"
  | "sled-push"
  | "sled-pull"
  | "burpee-broad-jump"
  | "row"
  | "farmers-carry"
  | "sandbag-lunges"
  | "wall-balls";

export const STATION_IDS: readonly StationId[] = [
  "ski-erg", "sled-push", "sled-pull", "burpee-broad-jump",
  "row", "farmers-carry", "sandbag-lunges", "wall-balls",
];

export const STATION_LABEL: Record<StationId, string> = {
  "ski-erg": "SkiErg",
  "sled-push": "Sled Push",
  "sled-pull": "Sled Pull",
  "burpee-broad-jump": "Burpee Broad Jump",
  "row": "Row",
  "farmers-carry": "Farmers Carry",
  "sandbag-lunges": "Sandbag Lunges",
  "wall-balls": "Wall Balls",
};

/**
 * The race in order: run, station, run, station … eight of each, wall balls last.
 * `RaceStrip` renders straight off this, so the order lives in exactly one place.
 */
export type SegmentRef =
  | { kind: "run"; index: number }
  | { kind: "station"; station: StationId };

export const RACE_SEGMENTS: readonly SegmentRef[] = STATION_IDS.flatMap((station, i) => [
  { kind: "run" as const, index: i + 1 },
  { kind: "station" as const, station },
]);

export const AGE_GROUPS = [
  "16-24", "25-29", "30-34", "35-39", "40-44",
  "45-49", "50-54", "55-59", "60-64", "65-69",
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/** A finished race, fully split. `null` splits mean DNF partway. */
export type RaceResult = {
  id: string;
  eventSlug: string;
  division: DivisionCode;
  athleteSlug: string;
  athleteName: string;
  countryIso: string;
  ageGroup: AgeGroup;
  rank: number;
  ageGroupRank: number;
  finishSeconds: number;
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  status: ResultStatus;
  /**
   * Time added by the officials, in seconds.
   *
   * HYROX penalties are real and common — a no-repped wall ball, a missed
   * lunge, a sled short of the line — and they are applied as time. Organisers
   * publish the *penalised* finish, so `finishSeconds` already includes this;
   * it is carried separately so the report can say why a station looks slower
   * than the athlete's own splits imply.
   *
   * Absent means "no penalty published", which is not the same as "no penalty
   * given" on feeds that do not report them. Nothing infers one from a
   * mismatch between the splits and the finish: split timing has its own
   * rounding, and a guessed penalty on somebody's race is worse than none.
   */
  penaltySeconds?: number;
  partnerSlugs?: string[];
};

export type DivisionProfile = {
  code: DivisionCode;
  label: string;
  /** Shown first on event pages. */
  headline: boolean;
  gender: "men" | "women" | "mixed";
  /** Typical entrant count at a mid-size event; scaled per event. */
  baseEntrants: number;
  /** Mean finish time in seconds, and spread. */
  meanSeconds: number;
  sdSeconds: number;
  /** Right-tail stretch — bigger for open divisions with wider ability ranges. */
  skew: number;
  /**
   * Plausible world-class floor in seconds. With a 3,000-strong field the
   * ability draw reaches ~3.5 sd, which without a clamp produces winners
   * faster than any time ever recorded — obvious nonsense on a records board.
   */
  floorSeconds: number;
  /** Share of the finish that is running, roughly. Doubles split the stations. */
  runShare: number;
  dnfRate: number;
};

/**
 * Time profiles. Open Men centred just over 90 minutes, Pro faster, Doubles
 * faster still because the work is shared — per the brief's §7 guidance.
 * These are invented figures for synthetic data, not measured ones.
 */
export const DIVISION_PROFILES: readonly DivisionProfile[] = [
  // The ladder, slowest to fastest: Open → Pro (heavier loads, singles) →
  // Doubles (work shared) → Pro Doubles → Elite → Relay (four athletes).
  { code: "hyrox-men", label: "HYROX Men", headline: true, gender: "men", baseEntrants: 780, meanSeconds: 5520, sdSeconds: 780, skew: 0.35, floorSeconds: 3270, runShare: 0.52, dnfRate: 0.012 },
  { code: "hyrox-women", label: "HYROX Women", headline: true, gender: "women", baseEntrants: 520, meanSeconds: 6060, sdSeconds: 810, skew: 0.35, floorSeconds: 3690, runShare: 0.53, dnfRate: 0.012 },
  { code: "hyrox-pro-men", label: "HYROX Pro Men", headline: true, gender: "men", baseEntrants: 190, meanSeconds: 4680, sdSeconds: 450, skew: 0.20, floorSeconds: 3330, runShare: 0.50, dnfRate: 0.015 },
  { code: "hyrox-pro-women", label: "HYROX Pro Women", headline: true, gender: "women", baseEntrants: 110, meanSeconds: 5220, sdSeconds: 480, skew: 0.20, floorSeconds: 3810, runShare: 0.51, dnfRate: 0.015 },
  { code: "hyrox-doubles-men", label: "HYROX Doubles Men", headline: true, gender: "men", baseEntrants: 460, meanSeconds: 4200, sdSeconds: 540, skew: 0.28, floorSeconds: 2850, runShare: 0.55, dnfRate: 0.008 },
  { code: "hyrox-doubles-women", label: "HYROX Doubles Women", headline: false, gender: "women", baseEntrants: 300, meanSeconds: 4620, sdSeconds: 570, skew: 0.28, floorSeconds: 3270, runShare: 0.56, dnfRate: 0.008 },
  { code: "hyrox-doubles-mixed", label: "HYROX Doubles Mixed", headline: true, gender: "mixed", baseEntrants: 420, meanSeconds: 4440, sdSeconds: 560, skew: 0.28, floorSeconds: 3030, runShare: 0.55, dnfRate: 0.008 },
  { code: "hyrox-pro-doubles-men", label: "HYROX Pro Doubles Men", headline: false, gender: "men", baseEntrants: 150, meanSeconds: 3780, sdSeconds: 330, skew: 0.18, floorSeconds: 2790, runShare: 0.53, dnfRate: 0.010 },
  { code: "hyrox-pro-doubles-women", label: "HYROX Pro Doubles Women", headline: false, gender: "women", baseEntrants: 90, meanSeconds: 4200, sdSeconds: 360, skew: 0.18, floorSeconds: 3210, runShare: 0.54, dnfRate: 0.010 },
  { code: "hyrox-team-relay-men", label: "HYROX Team Relay Men", headline: false, gender: "men", baseEntrants: 120, meanSeconds: 3180, sdSeconds: 400, skew: 0.25, floorSeconds: 2520, runShare: 0.56, dnfRate: 0.006 },
  { code: "hyrox-team-relay-women", label: "HYROX Team Relay Women", headline: false, gender: "women", baseEntrants: 90, meanSeconds: 3540, sdSeconds: 430, skew: 0.25, floorSeconds: 2820, runShare: 0.57, dnfRate: 0.006 },
  { code: "hyrox-team-relay-mixed", label: "HYROX Team Relay Mixed", headline: false, gender: "mixed", baseEntrants: 140, meanSeconds: 3360, sdSeconds: 410, skew: 0.25, floorSeconds: 2670, runShare: 0.56, dnfRate: 0.006 },
  { code: "hyrox-adaptive-men", label: "HYROX Adaptive Men", headline: false, gender: "men", baseEntrants: 34, meanSeconds: 6300, sdSeconds: 900, skew: 0.40, floorSeconds: 3960, runShare: 0.50, dnfRate: 0.020 },
  { code: "hyrox-adaptive-women", label: "HYROX Adaptive Women", headline: false, gender: "women", baseEntrants: 22, meanSeconds: 6840, sdSeconds: 960, skew: 0.40, floorSeconds: 4320, runShare: 0.50, dnfRate: 0.020 },
  { code: "hyrox-elite-men", label: "HYROX Elite Men", headline: true, gender: "men", baseEntrants: 30, meanSeconds: 3480, sdSeconds: 180, skew: 0.10, floorSeconds: 3240, runShare: 0.50, dnfRate: 0.010 },
  { code: "hyrox-elite-women", label: "HYROX Elite Women", headline: true, gender: "women", baseEntrants: 24, meanSeconds: 3900, sdSeconds: 200, skew: 0.10, floorSeconds: 3660, runShare: 0.51, dnfRate: 0.010 },
];

export const PROFILE_BY_CODE: Record<string, DivisionProfile> = Object.fromEntries(
  DIVISION_PROFILES.map((p) => [p.code, p]),
);

/** Divisions that carry two athletes on one result row. */
export function isDoubles(code: DivisionCode): boolean {
  return code.includes("doubles");
}

export function isRelay(code: DivisionCode): boolean {
  return code.includes("relay");
}

/**
 * Share of the station block each station typically takes. Used to split a
 * generated station total into eight believable pieces. Wall balls and burpees
 * are the long ones; farmers carry is short.
 */
export const STATION_WEIGHTS: Record<StationId, number> = {
  "ski-erg": 0.125,
  "sled-push": 0.095,
  "sled-pull": 0.130,
  "burpee-broad-jump": 0.160,
  "row": 0.125,
  "farmers-carry": 0.070,
  "sandbag-lunges": 0.135,
  "wall-balls": 0.160,
};

/**
 * Short codes for the race strip.
 *
 * Explicit, not derived from initials: Sled Push and Sled Pull both reduce to
 * "SP", and Row reduces to "R" which reads as a run. An ambiguous label on a
 * chart is worse than none.
 */
export const STATION_SHORT: Record<StationId, string> = {
  "ski-erg": "SKI",
  "sled-push": "PUSH",
  "sled-pull": "PULL",
  "burpee-broad-jump": "BBJ",
  "row": "ROW",
  "farmers-carry": "CARRY",
  "sandbag-lunges": "LUNGE",
  "wall-balls": "WALL",
};

/**
 * Station id → the slug of its existing guide page.
 *
 * These are NOT the same strings: the guides predate this section and use
 * `burpee-broad-jumps` (plural) and `rowing`. Linking with the data key
 * produced two 404s on every result page and the simulator, which only showed
 * up as failed prefetches in a production build.
 */
export const STATION_GUIDE_SLUG: Record<StationId, string> = {
  "ski-erg": "ski-erg",
  "sled-push": "sled-push",
  "sled-pull": "sled-pull",
  "burpee-broad-jump": "burpee-broad-jumps",
  "row": "rowing",
  "farmers-carry": "farmers-carry",
  "sandbag-lunges": "sandbag-lunges",
  "wall-balls": "wall-balls",
};

export function stationGuideHref(station: StationId): string {
  return `/hyrox/stations/${STATION_GUIDE_SLUG[station]}`;
}

/** Race-spec loads, for the weights-by-division table on station guides. */
export const STATION_SPEC: Record<StationId, { detail: string; open: string; pro: string; doubles: string }> = {
  "ski-erg": { detail: "1,000 m", open: "—", pro: "—", doubles: "1,000 m shared" },
  "sled-push": { detail: "50 m", open: "152 kg M / 102 kg W", pro: "202 kg M / 152 kg W", doubles: "As open, shared" },
  "sled-pull": { detail: "50 m", open: "103 kg M / 78 kg W", pro: "153 kg M / 103 kg W", doubles: "As open, shared" },
  "burpee-broad-jump": { detail: "80 m", open: "Bodyweight", pro: "Bodyweight", doubles: "80 m shared" },
  "row": { detail: "1,000 m", open: "—", pro: "—", doubles: "1,000 m shared" },
  "farmers-carry": { detail: "200 m", open: "2×24 kg M / 2×16 kg W", pro: "2×32 kg M / 2×24 kg W", doubles: "As open, shared" },
  "sandbag-lunges": { detail: "100 m", open: "20 kg M / 10 kg W", pro: "30 kg M / 20 kg W", doubles: "As open, shared" },
  "wall-balls": { detail: "100 reps", open: "6 kg M / 4 kg W", pro: "9 kg M / 6 kg W", doubles: "100 reps shared" },
};
