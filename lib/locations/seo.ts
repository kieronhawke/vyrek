import { getLocation, getEnrichment } from "./index";
import type { KeywordEvidence, LocationIdentity } from "./types";
import { HYROX_EVENTS } from "@/lib/hyrox-events";

/**
 * The indexing and uniqueness layer for the three geo page families
 * (/hyrox-training/[location], /personal-trainer/[location], /hyrox/[city]).
 *
 * Why this exists
 * ---------------
 * The legacy catalogue in lib/uk-locations.ts renders 94 places across three
 * page types. Measured against each other, any two of those pages shared 64%
 * of their eight-word sequences: ~595 words each, of which only ~210 differed.
 * That is the shape Google's scaled-content policy describes, and hard rule 3
 * exists precisely because it is what kills sites like this one.
 *
 * The fix is not more copy. It is publishing only where we have something to
 * say, and saying the part that is genuinely local.
 *
 * The rule
 * --------
 * A location page is indexable only if the keyword database evidences demand
 * for it. 37 of 104 registry entries carry Semrush evidence; the other 67 are
 * long-tail guesses. Unevidenced pages stay live and reachable — internal
 * links, direct traffic and the region hubs all keep working — but they are
 * noindex until they earn their way in, either through keyword evidence or
 * through the gym and results layers that phase D is blocked on.
 *
 * Nothing here invents a fact. Every number is either computed from
 * coordinates (and labelled as straight-line) or read from a sourced record.
 */

/** Straight-line distance, kilometres. Never present this as a journey. */
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
 * Race venue coordinates. Public, fixed locations, verifiable on any map, so
 * stating them is reporting rather than inventing. Keyed by the venue city as
 * it appears in lib/hyrox-events.ts.
 */
const VENUE_COORDS: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.508, lng: 0.029 }, // ExCeL, Royal Victoria Dock
  Manchester: { lat: 53.476, lng: -2.246 }, // Manchester Central
  Birmingham: { lat: 52.45, lng: -1.72 }, // NEC, Marston Green
  Glasgow: { lat: 55.861, lng: -4.286 }, // OVO Hydro, Finnieston
};

export type NearestRace = {
  eventSlug: string;
  eventName: string;
  venue: string;
  city: string;
  /** The next occurrence, rolled forward if the stored date has passed. */
  startDate: string;
  /** True when the stored date was in the past and we rolled it a year on.
   *  Copy must hedge harder when this is set: it is a cadence, not a fixture. */
  rolledForward: boolean;
  /** Straight-line from the town centroid. Roughly, never a journey time. */
  straightLineKm: number;
};

/**
 * lib/hyrox-events.ts stores one date per venue and says in its own header
 * that these follow the annual calendar cadence rather than a confirmed
 * schedule. Two of the four are already in the past, and none carries the
 * `past` flag, so a page reading the raw value advertises a race weekend that
 * has been and gone.
 *
 * Rolling a stale date forward by whole years keeps the annual cadence the
 * data is claiming, and `rolledForward` tells the caller to say "expected"
 * rather than state it. The real fix is refreshing the calendar; this stops
 * the site being wrong in the meantime.
 */
export function nextOccurrence(iso: string, now = new Date()): {
  date: string;
  rolledForward: boolean;
} {
  const stored = new Date(iso);
  if (Number.isNaN(stored.getTime())) return { date: iso, rolledForward: false };
  const today = new Date(now.toISOString().slice(0, 10));
  if (stored >= today) return { date: iso, rolledForward: false };
  const next = new Date(stored);
  while (next < today) next.setFullYear(next.getFullYear() + 1);
  return { date: next.toISOString().slice(0, 10), rolledForward: true };
}

export type GeoSeo = {
  identity?: LocationIdentity;
  /** Semrush-evidenced keywords for this place, highest volume first. */
  evidence: KeywordEvidence[];
  evidencedVolume: number;
  /** Lowest keyword difficulty across the evidence. Undefined if none. */
  bestKd?: number;
  /** The one rule: evidence means index, no evidence means hold. */
  indexable: boolean;
  parkruns: { name: string; area?: string; distanceKm?: number; source: string }[];
  nearestRace?: NearestRace;
  /** True when this place hosts a race itself. */
  hostsRace: boolean;
};

function totalVolume(ev: KeywordEvidence[]): number {
  return ev.reduce((sum, k) => sum + k.volume, 0);
}

export function getGeoSeo(slug: string): GeoSeo {
  const identity = getLocation(slug);
  const evidence = [...(identity?.keywordEvidence ?? [])].sort(
    (a, b) => b.volume - a.volume,
  );
  const enrichment = getEnrichment(slug);
  const parkruns = (enrichment?.terrain?.parkrunLocations ?? []).map((p) => ({
    name: p.name,
    area: p.area,
    distanceKm: p.distanceKm,
    source: p.source,
  }));

  let nearestRace: NearestRace | undefined;
  if (identity?.lat != null && identity?.lng != null) {
    const here = { lat: identity.lat, lng: identity.lng };
    const scored = HYROX_EVENTS.map((e) => {
      const coords = VENUE_COORDS[e.venue.city];
      if (!coords) return null;
      const next = nextOccurrence(e.startDate);
      return {
        eventSlug: e.slug,
        eventName: e.name,
        venue: e.venue.name,
        city: e.venue.city,
        startDate: next.date,
        rolledForward: next.rolledForward,
        straightLineKm: Math.round(haversineKm(here, coords)),
      };
    }).filter((x): x is NearestRace => x !== null);
    scored.sort((a, b) => a.straightLineKm - b.straightLineKm);
    nearestRace = scored[0];
  }

  return {
    identity,
    evidence,
    evidencedVolume: totalVolume(evidence),
    bestKd: evidence.length
      ? Math.min(...evidence.map((k) => k.kdPercent))
      : undefined,
    indexable: evidence.length > 0,
    parkruns,
    nearestRace,
    hostsRace: nearestRace ? nearestRace.straightLineKm <= 15 : false,
  };
}

/**
 * Robots directive for a geo page. Unevidenced places stay crawlable and
 * followable so internal link equity still flows through them to the pages
 * that are indexed; they simply do not compete for a query nobody types.
 */
export function geoRobots(slug: string): {
  index: boolean;
  follow: boolean;
} {
  return { index: getGeoSeo(slug).indexable, follow: true };
}

/**
 * The only slugs that keep a /hyrox/[city] page.
 *
 * Four host a UK race. Cardiff hosts nothing and still draws 1,600 searches a
 * month, so it earns a page whose honest answer is "not here, here is the
 * nearest one". The other 89 towns have no "hyrox {town}" volume in any
 * dataset we hold and redirect to their coaching page instead.
 *
 * Kept here rather than in the route so the training pages can check it before
 * linking, and never point a reader at a redirect.
 */
export const RACE_CITY_SLUGS = [
  "london",
  "manchester",
  "birmingham",
  "glasgow",
  "cardiff",
] as const;

export function isRaceCity(slug: string): boolean {
  return (RACE_CITY_SLUGS as readonly string[]).includes(slug);
}

/** The cities that actually host a UK race, from the event calendar. */
export function hostCitySlugs(): string[] {
  return [...new Set(HYROX_EVENTS.map((e) => e.venue.city.toLowerCase()))];
}
