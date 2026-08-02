import geo from "@/data/hyrox/races.geocoded.json";
import type { Race } from "@/lib/hyrox/races";

/**
 * Coordinates for the race calendar.
 *
 * `lib/hyrox/races.ts` reads dates and venues from hyrox.com; it carries no
 * coordinates, because the source has none. `scripts/seed-race-geo.mjs`
 * geocodes both the host city and the venue address through Nominatim, and
 * this is the read side of that file.
 *
 * Two consumers, which is the point of it living here rather than in either:
 *
 *   lib/locations/seo.ts  — how far the nearest race is from a UK town
 *   lib/race-cities.ts    — how far the venue is from the city centre
 *
 * Before this, the first of those computed distances against four venue
 * coordinates hard-coded next to four placeholder dates, so every UK town page
 * measured the distance to a race weekend that did not exist.
 *
 * Resolution rates, from the last run: 96 of 96 cities, 90 of 113 venues. The
 * misses are mostly non-Latin-script addresses and six races HYROX has not yet
 * given a venue. A miss returns undefined and the caller says less, rather than
 * falling back to a number about somewhere else.
 */

type Point = { lat: number; lng: number };

type GeoDoc = {
  cities: Record<string, { lat: number | null; lng: number | null }>;
  venues: Record<string, { lat: number | null; lng: number | null }>;
};

const doc = geo as unknown as GeoDoc;

function slugifyCity(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The host city's centroid. */
export function cityCoords(city: string): Point | undefined {
  const c = doc.cities[slugifyCity(city)];
  if (!c || c.lat == null || c.lng == null) return undefined;
  return { lat: c.lat, lng: c.lng };
}

/** The venue itself, where it geocoded. */
export function venueCoords(raceSlug: string): Point | undefined {
  const v = doc.venues[raceSlug];
  if (!v || v.lat == null || v.lng == null) return undefined;
  return { lat: v.lat, lng: v.lng };
}

/**
 * Where to measure a race from: the venue if we have it, otherwise the middle
 * of the host city. Both are honest answers to "how far away is this race" at
 * the scale a location page talks about; the venue is simply the better one.
 */
export function raceCoords(race: Pick<Race, "slug" | "city">): Point | undefined {
  return venueCoords(race.slug) ?? cityCoords(race.city);
}

/** Straight-line distance, kilometres. Never present this as a journey. */
export function haversineKm(a: Point, b: Point): number {
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
