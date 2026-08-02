import registryJson from "@/data/locations/registry.json";
import { LOCATION_CONTEXT } from "./uk-location-context";

/**
 * UK city and town catalogue behind the three geo page families:
 *
 *   /hyrox-training/[location]
 *   /personal-trainer/[location]
 *   /hyrox/[city]        (race cities only; the rest redirect)
 *
 * Sourced, not typed. This used to be a hand-written list of 94 places, which
 * capped the geo programme at whatever someone had got round to adding. It now
 * reads data/locations/registry.json, built by scripts/build-uk-locations.mjs
 * from GeoNames' GB extract: every populated place at or above a population
 * floor, with its real population, coordinates, county and country.
 *
 * Per Kieron's directive of 1 August 2026: every big town and city in the UK.
 *
 * The one hand-written field is `context`, a paragraph about a specific place
 * that no dataset can supply. Those live in ./uk-location-context and are
 * merged in here. A place without one renders no paragraph rather than a
 * generic stand-in, because a stand-in across hundreds of pages is exactly the
 * duplicate content the geo programme has to avoid.
 */

export type UkLocation = {
  /** URL slug, lowercase, hyphenated. */
  slug: string;
  /** Display name (proper case). */
  name: string;
  /** Region, used in copy ("in the North West", "in South Wales"). */
  region: string;
  /** Approximate population, in thousands. Drives one line of copy. */
  populationK: number;
  /** Nearest Hyrox race venue + city, derived from coordinates. */
  nearestVenue?: { name: string; city: string };
  /** Hand-written local paragraph. Absent for most places, and that is fine. */
  context?: string;
  /** Marks London areas so we can group them under one parent. */
  isLondonBorough?: boolean;
  /** Ceremonial county or unitary authority, from GeoNames. */
  county?: string;
  lat?: number;
  lng?: number;
};

type RegistryEntry = {
  slug: string;
  name: string;
  kind: string;
  country: string;
  region: string;
  county?: string;
  populationK?: number;
  lat?: number;
  lng?: number;
};

const EXCEL = { name: "ExCeL London", city: "London" };
const NEC = { name: "NEC Birmingham", city: "Birmingham" };
const MANCHESTER_CENTRAL = { name: "Manchester Central", city: "Manchester" };
const OVO = { name: "OVO Hydro", city: "Glasgow" };

/** Race venues, with the published coordinates used to pick the nearest. */
const VENUES = [
  { venue: EXCEL, lat: 51.508, lng: 0.029 },
  { venue: MANCHESTER_CENTRAL, lat: 53.476, lng: -2.246 },
  { venue: NEC, lat: 52.45, lng: -1.72 },
  { venue: OVO, lat: 55.861, lng: -4.286 },
];

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

/**
 * The legacy list hard-coded a venue per town and got some of them wrong:
 * Cardiff pointed at ExCeL with the NEC roughly 60 km closer. Computing it
 * removes a whole class of that error.
 */
function nearestVenue(loc: RegistryEntry) {
  if (loc.lat == null || loc.lng == null) return undefined;
  const here = { lat: loc.lat, lng: loc.lng };
  return [...VENUES].sort(
    (a, b) => haversineKm(here, a) - haversineKm(here, b),
  )[0].venue;
}

export const UK_LOCATIONS: UkLocation[] = (
  registryJson.locations as RegistryEntry[]
)
  .filter((l) => l.lat != null && l.lng != null)
  .map((l) => ({
    slug: l.slug,
    name: l.name,
    region: l.region,
    populationK: l.populationK ?? 0,
    county: l.county,
    lat: l.lat,
    lng: l.lng,
    nearestVenue: nearestVenue(l),
    context: LOCATION_CONTEXT[l.slug],
    isLondonBorough: l.kind === "london-area" || undefined,
  }))
  .sort((a, b) => b.populationK - a.populationK);

export function getLocationBySlug(slug: string): UkLocation | undefined {
  return UK_LOCATIONS.find((l) => l.slug === slug);
}

export function listLocationSlugs(): string[] {
  return UK_LOCATIONS.map((l) => l.slug);
}

/**
 * London itself carries region "Greater London" while its areas carry
 * "London", which split one place into two hub groups. Merged here for
 * grouping only. The `region` field stays as it is because `/hyrox/[city]`
 * feeds it to the Place schema as `containedInPlace`, where "Greater London"
 * is the correct parent for London and "London" would be circular.
 */
const REGION_GROUP_ALIASES: Record<string, string> = {
  "Greater London": "London",
};

export function groupLocationsByRegion(): Record<string, UkLocation[]> {
  const out: Record<string, UkLocation[]> = {};
  for (const l of UK_LOCATIONS) {
    const group = REGION_GROUP_ALIASES[l.region] ?? l.region;
    if (!out[group]) out[group] = [];
    out[group].push(l);
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => b.populationK - a.populationK);
  }
  return out;
}

/* ── Regions as pages ────────────────────────────────────────────────
   At 94 locations a hub could list every town. At 879 the same markup
   produced a 600 KB page carrying 1,748 links, which is bad for Core Web
   Vitals and spreads link equity so thin it does nothing. Regions become the
   middle layer: the hub links to 12 regions, each region lists its towns, and
   no page carries more than ~140 links. */

/** "the North West" but "Scotland": compass regions take the article. */
export function regionWithArticle(region: string): string {
  return /^(North|South|East|West)\b/.test(region) ? `the ${region}` : region;
}

export function regionSlug(region: string): string {
  return region.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function listRegionSlugs(): string[] {
  return Object.keys(groupLocationsByRegion()).map(regionSlug);
}

/* ── Counties as pages ───────────────────────────────────────────────
   "personal trainer kent", "personal trainer essex" and "personal trainer
   leicestershire" all carry evidenced search volume, but a county has no
   centroid worth using: parkruns near the middle of Kent is a meaningless
   sentence. So a county gets a directory of its towns rather than a location
   page, which is the honest answer to that query anyway. */

export function countySlug(county: string): string {
  return county.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Counties with enough towns to be worth a page of their own. */
export function listCountySlugs(): string[] {
  const counts = new Map<string, number>();
  for (const l of UK_LOCATIONS) {
    if (!l.county) continue;
    counts.set(l.county, (counts.get(l.county) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 8)
    .map(([c]) => countySlug(c));
}

export function getCountyBySlug(
  slug: string,
): { county: string; locations: UkLocation[] } | undefined {
  const county = [...new Set(UK_LOCATIONS.map((l) => l.county).filter(Boolean))]
    .find((c) => countySlug(c!) === slug);
  if (!county) return undefined;
  return {
    county,
    locations: UK_LOCATIONS.filter((l) => l.county === county).sort(
      (a, b) => b.populationK - a.populationK,
    ),
  };
}

export function getRegionBySlug(
  slug: string,
): { region: string; locations: UkLocation[] } | undefined {
  const groups = groupLocationsByRegion();
  const region = Object.keys(groups).find((r) => regionSlug(r) === slug);
  return region ? { region, locations: groups[region] } : undefined;
}
