import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import focusJson from "@/data/locations/focus-cities.json";
import type { UkLocation } from "@/lib/uk-locations";
import type { GeoSeo } from "@/lib/locations/seo";

/**
 * Focus cities: markets we target that carry no HYROX race.
 *
 * Dubai is the first, named by Kieron on 3 August 2026. It cannot come through
 * lib/race-cities.ts, which builds a city only where the calendar has a race,
 * and HYROX's own event sitemap carries no UAE date.
 *
 * That absence is a fact about our source rather than about the world, and the
 * page is written to say exactly that — no invented race, and no claim that
 * none has ever happened.
 *
 * A focus city also carries the in-person VIP offer, which is the thing that
 * makes Dubai different from every other page on the site: online coaching is
 * the product everywhere else, and here there is a version where Ben gets on a
 * plane.
 */

const DATA_DIR = path.join(process.cwd(), "data", "locations");

export type FocusCity = {
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  continent?: string;
  lat: number;
  lng: number;
  gymCount?: number;
  /** True where the in-person VIP package is offered. */
  vip?: boolean;
  source?: string;
  verifiedOn?: string;
};

export const FOCUS_CITIES: FocusCity[] = (
  focusJson.cities as FocusCity[]
).slice();

export function getFocusCity(slug: string): FocusCity | undefined {
  return FOCUS_CITIES.find((c) => c.slug === slug);
}

export function listFocusCitySlugs(): string[] {
  return FOCUS_CITIES.map((c) => c.slug);
}

type FocusEnrichment = {
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

function getFocusEnrichment(slug: string): FocusEnrichment | undefined {
  const file = path.join(DATA_DIR, "enrichment-focus", `${slug}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as FocusEnrichment;
}

/** Adapts a focus city to the shape the shared geo template consumes. */
export function focusCityAsLocation(city: FocusCity): UkLocation {
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
 * The same `GeoSeo` the other geo pages run on.
 *
 * `hostsRace` is false and `nearestRace` is undefined, which is the honest
 * shape: we hold no sourced race for this city and will not compute a
 * "nearest" from a calendar that has nothing within three thousand kilometres.
 * The template renders no race section when there is no race, which is the
 * correct outcome rather than a gap to fill.
 */
export function getFocusCityGeo(slug: string): GeoSeo {
  const gyms = getFocusEnrichment(slug)?.gyms?.equippedGyms ?? [];
  const chains = [...new Set(gyms.map((g) => g.chain).filter(Boolean))] as string[];
  return {
    evidence: [],
    evidencedVolume: 0,
    // Named gyms are real local substance; 71 of them in Dubai's case.
    indexable: gyms.length > 0,
    parkruns: [],
    gyms,
    chains,
    hostsRace: false,
  };
}

export function focusCityGyms(slug: string) {
  return getFocusEnrichment(slug)?.gyms?.equippedGyms ?? [];
}
