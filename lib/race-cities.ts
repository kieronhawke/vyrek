import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import raceCitiesJson from "@/data/locations/race-cities.json";
import type { UkLocation } from "@/lib/uk-locations";
import type { GeoSeo } from "@/lib/locations/seo";
import { nextOccurrence } from "@/lib/locations/seo";
import { haversineKm } from "@/lib/hyrox/race-geo";
import { INTL_CITIES } from "@/lib/intl-cities";
import { venueLabel } from "@/lib/hyrox/races";

/**
 * The international race cities: every city that has hosted a HYROX outside
 * the UK.
 *
 * Kieron's directive of 2 August 2026 — wherever there has been a HYROX, there
 * should be a personal trainer page and a HYROX training page. The UK half of
 * that is the 1,882-town registry; this is the other 91 cities, across 36
 * countries, built by scripts/build-race-cities.mjs from HYROX's own calendar.
 *
 * Why these pages are not thin
 * ----------------------------
 * A UK town page earns its place on gym data and terrain. These earn it on
 * something stronger: every one of them *hosts a race*. The page can name the
 * venue, give the date, and say how far it is from the middle of the city,
 * all from sourced data. That is the question a searcher in Cologne or Osaka
 * is actually asking, and no amount of templated copy substitutes for it.
 *
 * Adapting rather than forking
 * ----------------------------
 * These render through the same `GeoLanding` template as the UK towns, via the
 * two adapters below. A fork would have meant maintaining two copies of a
 * 700-line component and letting them drift, which is how the duplicate-title
 * problem started. The template is already data-driven: sections whose data is
 * missing render nothing, so the parkrun and county blocks simply do not
 * appear here, and nothing needs a UK-shaped stand-in invented for it.
 */

const DATA_DIR = path.join(process.cwd(), "data", "locations");

export type RaceCityRace = {
  slug: string;
  name: string;
  venue: string;
  venueName?: string;
  /** False when HYROX has not yet published a venue for this race. */
  venueAnnounced: boolean;
  lat: number | null;
  lng: number | null;
  startDate: string;
  endDate?: string;
  isWorldChampionship?: boolean;
  isYoungstars?: boolean;
  sourceUrl?: string;
};

export type RaceCity = {
  slug: string;
  /** Set when the bare slug belongs to a UK town, e.g. `boston` for Boston MA. */
  bareSlug?: string;
  name: string;
  country: string;
  countrySlug: string;
  continent?: string;
  lat: number;
  lng: number;
  source?: string;
  verifiedOn?: string;
  races: RaceCityRace[];
};

export const RACE_CITIES: RaceCity[] = (
  raceCitiesJson.cities as RaceCity[]
).slice();

export function getRaceCityBySlug(slug: string): RaceCity | undefined {
  return RACE_CITIES.find((c) => c.slug === slug);
}

export function listRaceCitySlugs(): string[] {
  return RACE_CITIES.map((c) => c.slug);
}

export function isRaceCitySlug(slug: string): boolean {
  return RACE_CITIES.some((c) => c.slug === slug);
}

type IntlEnrichment = {
  gyms?: {
    equippedGyms?: {
      name: string;
      type: string;
      chain?: string;
      website?: string;
      distanceKm?: number;
    }[];
  };
};

function getIntlEnrichment(slug: string): IntlEnrichment | undefined {
  const file = path.join(DATA_DIR, "enrichment-intl", `${slug}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as IntlEnrichment;
}

/**
 * The next race in this city.
 *
 * A city with several races returns the soonest one still ahead of us. Where
 * every stored date has passed, `nextOccurrence` rolls it forward a year to
 * keep the annual cadence the calendar implies, and flags it so the copy says
 * "expected" rather than stating it as fixed.
 */
export function nextRaceIn(
  city: RaceCity,
  now = new Date(),
): (RaceCityRace & { rolledForward: boolean; nextDate: string }) | undefined {
  if (!city.races.length) return undefined;
  const rolled = city.races.map((r) => {
    const n = nextOccurrence(r.startDate, now);
    return { ...r, nextDate: n.date, rolledForward: n.rolledForward };
  });
  rolled.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  return rolled[0];
}

/**
 * Adapts a race city to the shape the shared geo template consumes.
 *
 * `region` carries the country, which is what the template renders in the
 * eyebrow and what a reader in Osaka would expect to see there. `populationK`
 * is zero because we hold no sourced population for these cities and the
 * template does not render it — an invented figure would breach hard rule 1
 * for no gain.
 */
export function raceCityAsLocation(city: RaceCity): UkLocation {
  return {
    slug: city.slug,
    name: city.name,
    region: city.country,
    populationK: 0,
    lat: city.lat,
    lng: city.lng,
  };
}

/**
 * Builds the same `GeoSeo` the UK pages run on, from the international layers.
 *
 * `hostsRace` is always true here, which is the whole point of the set: the
 * nearest race is in this city, and `straightLineKm` measures the city centre
 * to the venue rather than to another city. Where the venue would not geocode
 * (16 of 113, mostly non-Latin-script addresses) the distance is omitted
 * rather than guessed, and the copy falls back to naming the venue alone.
 */
export function getRaceCityGeo(slug: string): GeoSeo {
  const city = getRaceCityBySlug(slug);
  if (!city) {
    return {
      evidence: [],
      evidencedVolume: 0,
      indexable: false,
      parkruns: [],
      gyms: [],
      chains: [],
      hostsRace: false,
    };
  }

  const gyms = getIntlEnrichment(slug)?.gyms?.equippedGyms ?? [];
  const chains = [...new Set(gyms.map((g) => g.chain).filter(Boolean))] as string[];
  const next = nextRaceIn(city);

  return {
    evidence: [],
    evidencedVolume: 0,
    // Every city in this set hosts a race, which is local substance no other
    // page carries. Gym data is the second layer; 90 of the 91 have it.
    indexable: true,
    parkruns: [],
    gyms,
    chains,
    nearestRace: next
      ? {
          eventSlug: next.slug,
          eventName: next.name,
          venue: next.venueAnnounced
            ? venueLabel({ ...next, city: city.name })
            : "a venue still to be announced",
          city: city.name,
          startDate: next.nextDate,
          rolledForward: next.rolledForward,
          straightLineKm:
            next.lat != null && next.lng != null
              ? Math.round(
                  haversineKm(
                    { lat: city.lat, lng: city.lng },
                    { lat: next.lat, lng: next.lng },
                  ),
                )
              : 0,
        }
      : undefined,
    hostsRace: true,
  };
}

/**
 * Other race cities near this one, for cross-linking.
 *
 * The UK equivalent uses a 60 km radius, which is a sensible "next town over"
 * for a country with 1,882 of them. Race cities are sparse — the nearest one
 * to Auckland is 2,000 km away — so this ranks by distance and takes the
 * closest few regardless, preferring cities in the same country first. Without
 * it every one of these 91 pages is an orphan.
 */
export function nearbyRaceCities(
  slug: string,
  count = 6,
): { slug: string; name: string; km: number }[] {
  const here = getRaceCityBySlug(slug);
  if (!here) return [];
  const origin = { lat: here.lat, lng: here.lng };
  const scored = RACE_CITIES.filter((c) => c.slug !== slug).map((c) => ({
    slug: c.slug,
    name: c.name,
    country: c.country,
    km: Math.round(haversineKm(origin, { lat: c.lat, lng: c.lng })),
  }));
  const sameCountry = scored
    .filter((c) => c.country === here.country)
    .sort((a, b) => a.km - b.km);
  const rest = scored
    .filter((c) => c.country !== here.country)
    .sort((a, b) => a.km - b.km);
  return [...sameCountry, ...rest]
    .slice(0, count)
    .map(({ slug, name, km }) => ({ slug, name, km }));
}

/* ── Countries as directory pages ────────────────────────────────────
   The middle layer between the two hubs and 91 scattered cities, mirroring
   what regions and counties do for the UK set. Without it the international
   cities hang off nothing and a crawler has no route into them. */

export function listCountrySlugs(): string[] {
  return [...new Set(RACE_CITIES.map((c) => c.countrySlug))].sort();
}

export function getCountryBySlug(
  slug: string,
): { country: string; cities: RaceCity[] } | undefined {
  const cities = RACE_CITIES.filter((c) => c.countrySlug === slug);
  if (!cities.length) return undefined;
  return {
    country: cities[0].country,
    cities: [...cities].sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * The countries, grouped by continent, for the hub pages.
 *
 * The two hubs listed 12 UK regions and nothing else, so every country
 * directory and all 91 race cities were reachable only from the sitemap —
 * exactly the orphan problem `nearbyTowns` was written to fix for the UK
 * towns, reintroduced for the international set. Two hops from the hub
 * (continent → country → city) keeps the hub small while making the whole
 * set reachable by a crawler and by a reader.
 *
 * Continents are ordered by how much of the calendar sits in them, so Europe
 * and North America come first rather than alphabetically.
 */
export function countriesByContinent(): {
  continent: string;
  countries: { slug: string; name: string; cities: number; races: number }[];
}[] {
  const byContinent = new Map<string, Map<string, RaceCity[]>>();
  for (const c of RACE_CITIES) {
    const cont = c.continent ?? "Elsewhere";
    if (!byContinent.has(cont)) byContinent.set(cont, new Map());
    const countries = byContinent.get(cont)!;
    if (!countries.has(c.countrySlug)) countries.set(c.countrySlug, []);
    countries.get(c.countrySlug)!.push(c);
  }

  return [...byContinent.entries()]
    .map(([continent, countries]) => ({
      continent,
      countries: [...countries.entries()]
        .map(([slug, cities]) => ({
          slug,
          name: cities[0].country,
          /* Race cities plus the expanded catalogue. Counting race cities
             alone ranked Ireland — one race city, and every town in the
             country — below markets with a fraction of the pages, and the
             footer picks its ten by this number. */
          cities: cities.length + intlCountForCountry(cities[0].country),
          races: cities.reduce((n, c) => n + c.races.length, 0),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort(
      (a, b) =>
        b.countries.reduce((n, c) => n + c.cities, 0) -
        a.countries.reduce((n, c) => n + c.cities, 0),
    );
}

/** How many expanded-market cities sit in a country, for the footer ranking. */
function intlCountForCountry(country: string): number {
  return INTL_CITIES.filter((c) => c.country === country).length;
}

/** Total races on the calendar for a country, for the directory copy. */
export function countryRaceCount(slug: string): number {
  return RACE_CITIES.filter((c) => c.countrySlug === slug).reduce(
    (n, c) => n + c.races.length,
    0,
  );
}
