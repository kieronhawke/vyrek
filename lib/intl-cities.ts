import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import intlJson from "@/data/locations/intl-cities.json";
import type { UkLocation } from "@/lib/uk-locations";
import type { GeoSeo } from "@/lib/locations/seo";
import { homeRacesFor } from "@/lib/hyrox/races";
import { raceCoords, haversineKm } from "@/lib/hyrox/race-geo";

/**
 * The expanded markets: whole countries taken to town depth, the way the UK
 * registry was.
 *
 * Kieron, 3 August 2026: target the HYROX hot spots. Our depth was inverted
 * against the calendar — 1,882 pages for the UK, one for Ireland, three for
 * Australia, three for Canada. This is that gap closed for the markets where
 * an English page can rank on merit.
 *
 * Which countries, and why not simply the busiest ones, is argued in
 * scripts/build-country-cities.mjs. Short version: race count would say France
 * and Spain next, and English pages cannot win "personal trainer paris".
 *
 * These sit in their own catalogue rather than in registry.json for the same
 * reason the race cities do: a UK row carries a region and a county, and every
 * UK consumer would have to learn to skip foreign rows. Slugs are deduplicated
 * against both the UK registry and the race cities at build time, so nothing
 * here can collide with an existing page.
 */

const DATA_DIR = path.join(process.cwd(), "data", "locations");

export type IntlCity = {
  slug: string;
  /** Set when the bare slug belongs to another place, e.g. newcastle-australia. */
  bareSlug?: string;
  name: string;
  country: string;
  countrySlug: string;
  continent?: string;
  admin1?: string;
  lat: number;
  lng: number;
  populationK: number;
  source?: string;
  verifiedOn?: string;
};

export const INTL_CITIES: IntlCity[] = (intlJson.cities as IntlCity[]).slice();

export const INTL_COUNTRIES = (
  intlJson.countries as { cc: string; country: string; countrySlug: string }[]
).slice();

export function getIntlCity(slug: string): IntlCity | undefined {
  return INTL_CITIES.find((c) => c.slug === slug);
}

export function listIntlCitySlugs(): string[] {
  return INTL_CITIES.map((c) => c.slug);
}

type Enrichment = {
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

function getEnrichment(slug: string): Enrichment | undefined {
  const file = path.join(DATA_DIR, "enrichment-country", `${slug}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as Enrichment;
}

export function intlCityAsLocation(city: IntlCity): UkLocation {
  return {
    slug: city.slug,
    name: city.name,
    // The template renders this in the eyebrow, where the country is what a
    // reader in Ballarat or Galway expects to see.
    region: city.country,
    populationK: city.populationK,
    lat: city.lat,
    lng: city.lng,
  };
}

/**
 * The same `GeoSeo` shape every other geo page runs on.
 *
 * The nearest race is scored against that city's own country plus its
 * neighbours, not the whole calendar: telling somebody in Perth that their
 * nearest race is in Singapore is technically true and practically useless,
 * and telling somebody in Cork it is Dublin is the answer they wanted.
 */
export function getIntlCityGeo(slug: string): GeoSeo {
  const city = getIntlCity(slug);
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

  const gyms = getEnrichment(slug)?.gyms?.equippedGyms ?? [];
  const chains = [...new Set(gyms.map((g) => g.chain).filter(Boolean))] as string[];

  let nearestRace: GeoSeo["nearestRace"];
  const here = { lat: city.lat, lng: city.lng };
  const candidates = homeRacesFor(city.country);
  let bestKm = Infinity;
  for (const r of candidates) {
    const coords = raceCoords(r);
    if (!coords) continue;
    const km = haversineKm(here, coords);
    if (km < bestKm) {
      bestKm = km;
      nearestRace = {
        eventSlug: r.slug,
        eventName: r.name,
        venue: r.venueName ?? r.venue ?? r.city,
        city: r.city,
        startDate: r.startDate,
        rolledForward: false,
        straightLineKm: Math.round(km),
      };
    }
  }

  return {
    evidence: [],
    evidencedVolume: 0,
    // Named gyms are the local substance, exactly as for the UK towns.
    indexable: gyms.length > 0,
    parkruns: [],
    gyms,
    chains,
    nearestRace,
    hostsRace: nearestRace ? nearestRace.straightLineKm <= 15 : false,
  };
}

/** Other cities in the same country, nearest first, for cross-linking. */
export function nearbyIntlCities(
  slug: string,
  count = 6,
): { slug: string; name: string; km: number }[] {
  const here = getIntlCity(slug);
  if (!here) return [];
  const origin = { lat: here.lat, lng: here.lng };
  return INTL_CITIES.filter(
    (c) => c.slug !== slug && c.country === here.country,
  )
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      km: Math.round(haversineKm(origin, { lat: c.lat, lng: c.lng })),
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

/** Cities in one expanded country, largest first. Feeds the country directory. */
export function intlCitiesInCountry(countrySlug: string): IntlCity[] {
  return INTL_CITIES.filter((c) => c.countrySlug === countrySlug).sort(
    (a, b) => b.populationK - a.populationK,
  );
}
