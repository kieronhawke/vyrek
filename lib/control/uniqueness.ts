/**
 * THE UNIQUENESS VALIDATOR — docs/build-pack/rules/uniqueness-validator.md.
 *
 * The guardrail that makes programmatic scale safe. It blocks any page that
 * does not carry enough unique data to justify existing, which removes the
 * need for human judgement on every page and is what makes hundreds of
 * location pages a reasonable thing to publish.
 *
 * HARD-RULES §7: this is a **pre-publish gate**, not a runtime check, and
 * **there is no bypass**. There is deliberately no `force`, `skipValidation`
 * or override argument anywhere in this module. If one is ever added, the
 * gate is decorative and the whole programmatic strategy becomes a liability.
 *
 * The spec says to build this before the location template, so it exists
 * before there is anything to validate.
 */

/** The shape a location page presents for validation. */
export type LocationData = {
  affiliated_gyms?: unknown[];
  equipped_gyms?: unknown[];
  chain_locations?: unknown[];
  /** Station name → resolved detail. Counts once at least 3 are resolved. */
  equipment_matrix?: Record<string, unknown>;
  equipment_gaps?: unknown[];
  /** Counts only when it has both a distance and a travel time. */
  nearest_race?: { distance_km?: number; travel_minutes?: number } | null;
  race_history?: unknown[];
  next_3_races?: unknown[];
  local_athlete_count?: number | null;
  local_median_time?: number | null;
  local_fastest_time?: number | null;
  notable_local_athletes?: unknown[];
  /** Counts at two or more named routes. */
  running_routes?: unknown[];
  parkrun_locations?: unknown[];
  run_clubs?: unknown[];
  /** Human-written, minimum 40 words, never templated. */
  bens_take?: string | null;
};

export type FieldName = keyof LocationData;

/** The two categories that are mandatory regardless of total count. */
export type MandatoryCategory = "gym" | "results";

export type UniquenessResult = {
  publishable: boolean;
  /** How many countable fields are populated. */
  score: number;
  populated: FieldName[];
  empty: FieldName[];
  /** Mandatory categories with nothing in them. */
  missingMandatory: MandatoryCategory[];
  /** Plain-English reasons, for the build report and the SEO dashboard. */
  reasons: string[];
};

export const MINIMUM_SCORE = 5;
export const BENS_TAKE_MIN_WORDS = 40;

/** Fields that satisfy the mandatory "at least one gym or facility" rule. */
const GYM_FIELDS: FieldName[] = [
  "affiliated_gyms",
  "equipped_gyms",
  "chain_locations",
];

/** Fields that satisfy the mandatory "at least one results data point" rule. */
const RESULTS_FIELDS: FieldName[] = [
  "race_history",
  "local_athlete_count",
  "local_median_time",
  "local_fastest_time",
  "notable_local_athletes",
];

function nonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Whether a single field counts as populated. Each rule is the spec's, not a
 * generic truthiness check — `equipment_matrix` needs three resolved
 * stations, `running_routes` needs two, `nearest_race` needs both a distance
 * and a travel time.
 */
export function isPopulated(field: FieldName, data: LocationData): boolean {
  const v = data[field];
  switch (field) {
    case "equipment_matrix":
      return (
        typeof v === "object" &&
        v !== null &&
        Object.values(v as Record<string, unknown>).filter(
          (x) => x !== null && x !== undefined && x !== "",
        ).length >= 3
      );
    case "nearest_race": {
      const r = v as LocationData["nearest_race"];
      return Boolean(
        r &&
          typeof r.distance_km === "number" &&
          Number.isFinite(r.distance_km) &&
          typeof r.travel_minutes === "number" &&
          Number.isFinite(r.travel_minutes),
      );
    }
    case "running_routes":
      return Array.isArray(v) && v.length >= 2;
    case "local_athlete_count":
      return typeof v === "number" && v > 0;
    case "local_median_time":
    case "local_fastest_time":
      return typeof v === "number" && Number.isFinite(v);
    case "bens_take":
      // Cannot be generated. It is what makes the page his rather than a
      // database dump, and the clearest signal to Google a human was here.
      return typeof v === "string" && wordCount(v) >= BENS_TAKE_MIN_WORDS;
    default:
      return nonEmptyArray(v);
  }
}

/** Every countable field, in the spec's order. */
export const COUNTABLE_FIELDS: FieldName[] = [
  "affiliated_gyms",
  "equipped_gyms",
  "chain_locations",
  "equipment_matrix",
  "equipment_gaps",
  "nearest_race",
  "race_history",
  "next_3_races",
  "local_athlete_count",
  "local_median_time",
  "local_fastest_time",
  "notable_local_athletes",
  "running_routes",
  "parkrun_locations",
  "run_clubs",
  "bens_take",
];

/**
 * Run the gate.
 *
 * Note the signature: one argument, no options object, nowhere to pass an
 * override. That is deliberate (HARD-RULES §7).
 */
export function validateUniqueness(data: LocationData): UniquenessResult {
  const populated = COUNTABLE_FIELDS.filter((f) => isPopulated(f, data));
  const empty = COUNTABLE_FIELDS.filter((f) => !populated.includes(f));
  const score = populated.length;

  const missingMandatory: MandatoryCategory[] = [];
  if (!GYM_FIELDS.some((f) => populated.includes(f))) missingMandatory.push("gym");
  if (!RESULTS_FIELDS.some((f) => populated.includes(f)))
    missingMandatory.push("results");

  const reasons: string[] = [];
  if (score < MINIMUM_SCORE) {
    reasons.push(
      `Only ${score} unique field${score === 1 ? "" : "s"} populated; ${MINIMUM_SCORE} are needed.`,
    );
  }
  if (missingMandatory.includes("gym")) {
    reasons.push("No gym or facility record. At least one is mandatory.");
  }
  if (missingMandatory.includes("results")) {
    reasons.push("No results or performance data point. At least one is mandatory.");
  }
  if (!isPopulated("bens_take", data)) {
    // Not mandatory for the count, but a page without it sits in draft:
    // the spec is explicit that pages awaiting a bens_take do not publish.
    reasons.push(
      `Ben's take is missing or under ${BENS_TAKE_MIN_WORDS} words, so the page stays in draft.`,
    );
  }

  const publishable =
    score >= MINIMUM_SCORE &&
    missingMandatory.length === 0 &&
    isPopulated("bens_take", data);

  return { publishable, score, populated, empty, missingMandatory, reasons };
}

/**
 * Build-time report. spec says to fail loudly, log the slug and which fields
 * were empty, and emit a report of blocked pages so gaps get filled
 * deliberately rather than silently.
 */
export function uniquenessReport(
  pages: Array<{ slug: string; data: LocationData }>,
): {
  publishable: string[];
  blocked: Array<{ slug: string; score: number; reasons: string[]; empty: FieldName[] }>;
} {
  const publishable: string[] = [];
  const blocked: Array<{
    slug: string;
    score: number;
    reasons: string[];
    empty: FieldName[];
  }> = [];

  for (const page of pages) {
    const result = validateUniqueness(page.data);
    if (result.publishable) publishable.push(page.slug);
    else
      blocked.push({
        slug: page.slug,
        score: result.score,
        reasons: result.reasons,
        empty: result.empty,
      });
  }

  return { publishable, blocked };
}
