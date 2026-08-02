import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import statesJson from "@/data/locations/us-states.json";

/**
 * The US state catalogue.
 *
 * Kieron's directive of 3 August 2026: the USA is a priority market and wants
 * state-level pages that are genuinely useful rather than fifty variations of
 * one sentence.
 *
 * Only 13 states have ever hosted a HYROX, so the other 38 need a reason to
 * exist that is not "we made a page for every state". Each one carries:
 *
 *   - its largest cities with real populations, from GeoNames
 *   - named gyms in its three biggest metros, from OpenStreetMap
 *   - the races held there, or the nearest one and how far it actually is
 *
 * That last line is the one doing the work. "The nearest HYROX to Montana is
 * Salt Lake City, 730 km from Billings" is a specific, checkable, useful
 * sentence that appears on exactly one page in the world, and it is a more
 * honest answer to a Montanan than pretending there is a local scene.
 */

const DATA_DIR = path.join(process.cwd(), "data", "locations");

export type UsCity = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  populationK: number;
};

export type UsStateRace = {
  slug: string;
  name: string;
  city: string;
  citySlug: string;
  venue: string | null;
  venueName?: string | null;
  venueAnnounced: boolean;
  lat: number | null;
  lng: number | null;
  startDate: string;
  endDate?: string;
  sourceUrl?: string;
};

export type UsState = {
  code: string;
  slug: string;
  name: string;
  /** How many cities in the state clear the population floor. */
  citiesTracked: number;
  cities: UsCity[];
  /** City slugs with a gym layer. */
  metros: string[];
  races: UsStateRace[];
  nearestRace?:
    | (UsStateRace & { straightLineKm: number; fromCity: string })
    | null;
};

export const US_STATES: UsState[] = (statesJson.states as UsState[]).slice();

export function getUsState(slug: string): UsState | undefined {
  return US_STATES.find((s) => s.slug === slug);
}

export function listUsStateSlugs(): string[] {
  return US_STATES.map((s) => s.slug);
}

export type MetroGyms = {
  city: string;
  citySlug: string;
  gyms: { name: string; type: string; chain?: string; distanceKm?: number }[];
};

/**
 * Gyms for a state's metros, from data/locations/enrichment-us/.
 *
 * Keyed `<state>__<city>` because two states can both have a Springfield, and
 * a shared key would have silently served one state's gyms on the other's
 * page — the same class of collision the UK and race-city catalogues hit over
 * Boston and Perth.
 */
export function metroGyms(state: UsState): MetroGyms[] {
  const out: MetroGyms[] = [];
  for (const citySlug of state.metros) {
    const file = path.join(
      DATA_DIR,
      "enrichment-us",
      `${state.slug}__${citySlug}.json`,
    );
    if (!existsSync(file)) continue;
    const data = JSON.parse(readFileSync(file, "utf8")) as {
      gyms?: { equippedGyms?: MetroGyms["gyms"] };
    };
    const gyms = data.gyms?.equippedGyms ?? [];
    if (!gyms.length) continue;
    const city = state.cities.find((c) => c.slug === citySlug);
    out.push({ city: city?.name ?? citySlug, citySlug, gyms });
  }
  return out;
}

/** Total named gyms across a state's seeded metros. */
export function gymCount(state: UsState): number {
  return metroGyms(state).reduce((n, m) => n + m.gyms.length, 0);
}

/** Chains that recur across a state's metros — does an existing membership travel. */
export function stateChains(state: UsState, limit = 4): string[] {
  const seen = new Map<string, number>();
  for (const m of metroGyms(state)) {
    for (const g of m.gyms) {
      if (g.chain) seen.set(g.chain, (seen.get(g.chain) ?? 0) + 1);
    }
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

/** The next race in this state, soonest first. Undefined if it hosts none. */
export function nextRaceInState(
  state: UsState,
  now = new Date(),
): UsStateRace | undefined {
  const today = now.toISOString().slice(0, 10);
  const ahead = state.races
    .filter((r) => (r.endDate ?? r.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return ahead[0] ?? state.races[0];
}

/**
 * Neighbouring states by straight-line distance between their largest cities.
 *
 * Without these, 51 pages hang off one directory and nothing links sideways.
 * Largest-city distance rather than centroid distance because the centroid of
 * a state is not where anybody lives or trains.
 */
export function nearbyStates(
  slug: string,
  count = 6,
): { slug: string; name: string; km: number }[] {
  const here = getUsState(slug);
  const anchor = here?.cities[0];
  if (!anchor) return [];
  return US_STATES.filter((s) => s.slug !== slug && s.cities.length)
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      km: Math.round(haversineKm(anchor, s.cities[0])),
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** States that host a race, for the country page and internal linking. */
export function raceStates(): UsState[] {
  return US_STATES.filter((s) => s.races.length);
}
