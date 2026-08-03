/**
 * Athlete-reported equipment intel.
 *
 * THE STRATEGIC POINT
 *
 * Every programmatic winner runs on a dataset competitors cannot replicate —
 * Zillow's valuations, TripAdvisor's reviews, Glassdoor's salaries. Ours were
 * OpenStreetMap gyms, a published race calendar and computed distances, all of
 * which a competitor could assemble in a weekend. hyroxvault already has 2,273
 * hand-verified affiliated gyms; on that data we are not ahead of them.
 *
 * This is the gap. OSM records that a site exists, not what is inside it — the
 * gym pages already say so out loud — and "does this gym have a sled" is
 * exactly what a HYROX athlete knows and nobody has published. One question
 * per listing, answered by the people who train there, builds over months into
 * the one dataset in this sport that cannot be copied.
 *
 * It is also the honest version of a location page: instead of asserting what
 * a gym holds, we report what athletes told us, with counts, and say how many
 * said it.
 */

/** The stations whose equipment actually varies between gyms. */
export const STATIONS = [
  { id: "sled", label: "Sled (push or pull)" },
  { id: "ski-erg", label: "Ski erg" },
  { id: "rower", label: "Rower" },
  { id: "wall-ball", label: "Wall for wall balls" },
  { id: "sandbag", label: "Sandbags" },
  { id: "kettlebell", label: "Heavy kettlebells" },
] as const;

export type StationId = (typeof STATIONS)[number]["id"];

export function isStationId(v: string): v is StationId {
  return STATIONS.some((s) => s.id === v);
}

/** Tallies for one gym: how many said yes, how many said no, per station. */
export type GymIntel = Record<StationId, { yes: number; no: number }>;

/** Everything reported for one place, keyed by a slug of the gym name. */
export type PlaceIntel = Record<string, Partial<GymIntel>>;

export type IntelSnapshot = {
  generatedAt: string;
  /** Keyed by location slug, e.g. "leeds". */
  places: Record<string, PlaceIntel>;
};

/** Stable key for a gym name within a place. */
export function gymKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * How many reports before a claim is shown as settled.
 *
 * Two agreeing is not proof, but it is the point where one person's mistake
 * stops being the whole record. Below it the page says what it has and how
 * thin it is, rather than either hiding the data or overstating it.
 */
export const CONFIDENT_AT = 3;

export type Verdict = {
  station: StationId;
  label: string;
  yes: number;
  no: number;
  /** True when enough agree to state it plainly. */
  confident: boolean;
  /** Majority answer, or null when reports are evenly split. */
  present: boolean | null;
};

export function verdicts(intel: Partial<GymIntel> | undefined): Verdict[] {
  if (!intel) return [];
  const out: Verdict[] = [];
  for (const s of STATIONS) {
    const t = intel[s.id];
    if (!t || t.yes + t.no === 0) continue;
    out.push({
      station: s.id,
      label: s.label,
      yes: t.yes,
      no: t.no,
      confident: t.yes + t.no >= CONFIDENT_AT && t.yes !== t.no,
      present: t.yes === t.no ? null : t.yes > t.no,
    });
  }
  return out;
}
