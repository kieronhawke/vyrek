/**
 * Layered UK location database — Phase D of the growth plan.
 *
 * Model follows docs/strategy/04-location-page-system.md: identity in
 * data/locations/registry.json, optional per-location layers in
 * data/locations/enrichment/<slug>.json. Pages generated from this
 * database publish only if they pass the uniqueness gate
 * (docs/strategy/rules/uniqueness-validator.md), enforced by
 * scripts/validate-locations.mjs at build time.
 *
 * The legacy lib/uk-locations.ts catalogue still powers the live
 * /hyrox, /hyrox-training and /personal-trainer routes. New page types
 * read from here instead; legacy migrates once the gate passes.
 */

export type LocationKind = "city" | "town" | "london-area" | "county";

export type KeywordEvidence = {
  keyword: string;
  volume: number;
  kdPercent: number;
  cpcUsd: number;
  /** Set when the keyword carries an intent modifier (e.g. price, female)
   * that belongs to a different page than the plain location page. */
  modifier?: string;
};

export type LocationIdentity = {
  slug: string;
  name: string;
  kind: LocationKind;
  country: "England" | "Scotland" | "Wales" | "Northern Ireland";
  /** Display region, aligned with legacy uk-locations.ts groupings. */
  region: string;
  county?: string;
  /** Approximate, in thousands. Never quote as a precise figure on a page. */
  populationK?: number;
  lat?: number;
  lng?: number;
  /** Slug also exists in legacy lib/uk-locations.ts (live pages today). */
  legacy?: boolean;
  /** Semrush-evidenced keywords targeting this location. */
  keywordEvidence?: KeywordEvidence[];
};

/* ── Enrichment layers. Every field optional: absence means "no verified
      data yet", never "empty is fine". No field may be populated with
      invented data — each record carries its source. ─────────────────── */

export type SourcedRecord = {
  /** Where this fact came from (URL or named dataset). Required. */
  source: string;
  /** ISO date the fact was last verified. */
  verifiedOn: string;
};

export type GymRecord = SourcedRecord & {
  name: string;
  /** e.g. "hyrox-affiliate" | "crossfit" | "chain" | "independent" */
  type: string;
  chain?: string;
  area?: string;
};

/** The eight race stations, resolved to whether they can be trained locally. */
export type EquipmentMatrix = Partial<
  Record<
    | "skiErg"
    | "sledPush"
    | "sledPull"
    | "burpeeBroadJump"
    | "rowing"
    | "farmersCarry"
    | "sandbagLunges"
    | "wallBalls",
    { available: boolean; where?: string } & SourcedRecord
  >
>;

export type RaceRef = SourcedRecord & {
  eventSlug?: string;
  venue: string;
  city: string;
  date?: string;
  distanceKm?: number;
  /** Only from a verifiable journey source; never estimated. */
  travelNote?: string;
};

export type ResultsLayer = {
  /** BLOCKED on growth-plan open question 1 (results data source).
   * Leave empty until that resolves; the gate requiring it is deliberate. */
  localAthleteCount?: SourcedRecord & { count: number };
  localMedianTime?: string;
  localFastestTime?: string;
  notableLocalAthletes?: (SourcedRecord & { name: string; note: string })[];
  sourceDataset?: string;
};

export type RunningRoute = SourcedRecord & {
  name: string;
  distanceKm?: number;
  note?: string;
};

export type LocationEnrichment = {
  slug: string;
  gyms?: {
    affiliatedGyms?: GymRecord[];
    equippedGyms?: GymRecord[];
    crossfitBoxes?: GymRecord[];
    chainLocations?: GymRecord[];
    equipmentMatrix?: EquipmentMatrix;
    equipmentGaps?: (SourcedRecord & { station: string; workaround: string })[];
  };
  races?: {
    hostsRace?: boolean;
    nearestRace?: RaceRef;
    raceHistory?: RaceRef[];
    next3Races?: RaceRef[];
  };
  results?: ResultsLayer;
  terrain?: {
    runningRoutes?: RunningRoute[];
    trackFacilities?: (SourcedRecord & { name: string })[];
    /** Adult 5k parkruns only, seeded by scripts/seed-parkruns.mjs from
     *  parkrun's own events feed. distanceKm is straight-line from the
     *  registry centroid, so treat it as "roughly", never as a journey. */
    parkrunLocations?: (SourcedRecord & {
      name: string;
      area?: string;
      distanceKm?: number;
    })[];
  };
  community?: {
    runClubs?: (SourcedRecord & { name: string })[];
    stravaClubs?: (SourcedRecord & { name: string })[];
    localEvents?: (SourcedRecord & { name: string })[];
  };
  /** One original paragraph, written by Ben (or from his notes), per page.
   * Minimum 40 words. Cannot be generated — the gate checks for templating. */
  bensTake?: string;
};

/** Written by scripts/validate-locations.mjs. Do not edit by hand. */
export type PublishStatus = {
  generatedAt: string;
  gate: {
    minPopulatedFields: number;
    mandatoryCategories: string[];
  };
  locations: Record<
    string,
    {
      publishable: boolean;
      populatedFields: string[];
      missingMandatory: string[];
    }
  >;
};
