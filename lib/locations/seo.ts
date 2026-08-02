import { getAllLocations, getLocation, getEnrichment } from "./index";
import type { KeywordEvidence, LocationIdentity } from "./types";
import { homeRaces, venueLabel } from "@/lib/hyrox/races";
import { raceCoords, haversineKm } from "@/lib/hyrox/race-geo";

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
 * Every location with real local data indexes. Kieron's directive of
 * 1 August 2026 is every big town and city in the UK, and the registry now
 * carries 879 of them from GeoNames.
 *
 * The safeguard is not a shortlist, it is the data: a page indexes when it has
 * something local to say. In practice that means parkrun terrain, which 846 of
 * the 879 carry, seeded from parkrun's own feed with real distances. A place
 * with no terrain data and no keyword evidence has nothing on it that another
 * page does not also have, so it stays out of the index until it does.
 *
 * Keyword evidence still matters, it just is not the gate any more: it drives
 * priority in the sitemap and tells us which pages to write a human paragraph
 * for first.
 *
 * Nothing here invents a fact. Every number is either computed from
 * coordinates (and labelled as straight-line) or read from a sourced record.
 */

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
 * Kept for the international race cities, which read a per-city calendar that
 * can legitimately contain a date that has passed.
 *
 * It used to be load-bearing here: `nearestRace` was computed from the four
 * placeholder-dated events in lib/hyrox-events.ts, two of which were already
 * in the past, so rolling forward was the only thing standing between a
 * reader and a race weekend that had been and gone. That is no longer the
 * shape of the problem — the calendar is real now, and `homeRaces()` only
 * returns races that have not finished — so nothing in the UK path rolls
 * anything forward any more.
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
  /** Indexable when the page has something local on it: terrain data, a
   *  hand-written paragraph, or evidenced demand. Not a shortlist. */
  indexable: boolean;
  parkruns: { name: string; area?: string; distanceKm?: number; source: string }[];
  /** Named local gyms and sports centres from OpenStreetMap. The substance
   *  of a location page: the one thing on it no other town's page has. */
  gyms: {
    name: string;
    type: string;
    chain?: string;
    website?: string;
    distanceKm?: number;
  }[];
  /** Gyms that belong to a national chain, which tells a reader whether their
   *  existing membership works here. */
  chains: string[];
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
  const gyms = (enrichment?.gyms?.equippedGyms ?? []).map((g) => ({
    name: g.name,
    type: g.type,
    chain: (g as { chain?: string }).chain,
    website: (g as { website?: string }).website,
    distanceKm: (g as { distanceKm?: number }).distanceKm,
  }));
  const chains = [...new Set(gyms.map((g) => g.chain).filter(Boolean))] as string[];
  const parkruns = (enrichment?.terrain?.parkrunLocations ?? []).map((p) => ({
    name: p.name,
    area: p.area,
    distanceKm: p.distanceKm,
    source: p.source,
  }));

  /**
   * The nearest race, from the real calendar.
   *
   * This used to score the four placeholder-dated events in
   * lib/hyrox-events.ts against four hard-coded venue coordinates, so every
   * one of these pages told a reader their nearest race weekend was a date
   * nobody had published. `63c7611` replaced that file's authority for
   * /hyrox/events and /hyrox/{city} but not here, which left the invented
   * dates rendering on 3,764 geo pages — the largest surface of the three.
   *
   * Now: the soonest race that has not finished, in the UK or Ireland,
   * measured to the venue where it geocoded and the host city where it did
   * not. `homeRaces()` is the same UK-plus-Ireland calendar the events page
   * leads with, and it exists because UK athletes routinely travel to Dublin.
   * Scoring the whole world instead would make Paris the honest answer for
   * parts of Kent, which is true, useless, and not what the page is asking.
   */
  let nearestRace: NearestRace | undefined;
  if (identity?.lat != null && identity?.lng != null) {
    const here = { lat: identity.lat, lng: identity.lng };
    const scored = homeRaces()
      .map((r) => {
        const coords = raceCoords(r);
        if (!coords) return null;
        return {
          eventSlug: r.slug,
          eventName: r.name,
          venue: venueLabel(r),
          city: r.city,
          startDate: r.startDate,
          // Every candidate is already in the future, so nothing is rolled.
          rolledForward: false,
          straightLineKm: Math.round(haversineKm(here, coords)),
        };
      })
      .filter((x): x is NearestRace => x !== null);
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
    // Local substance, not a shortlist: terrain data or evidenced demand.
    indexable: gyms.length > 0 || parkruns.length > 0 || evidence.length > 0,
    parkruns,
    gyms,
    chains,
    nearestRace,
    hostsRace: nearestRace ? nearestRace.straightLineKm <= 15 : false,
  };
}

/**
 * Robots directive for a geo page. A place with no local data at all stays
 * crawlable and followable, so link equity still flows through it, but out of
 * the index until it has something of its own to say.
 */
export function geoRobots(slug: string): {
  index: boolean;
  follow: boolean;
} {
  return { index: getGeoSeo(slug).indexable, follow: true };
}

/**
 * The towns nearest this one, for cross-linking.
 *
 * Every location page was an orphan: 876 pages, none linking to another. A
 * crawler arriving at one had nowhere lateral to go, and a reader in a town
 * with two gyms had no route to the city twenty minutes away that has thirty.
 * Both problems are fixed by the same handful of links.
 *
 * Nearest by straight-line distance, which for towns is a good enough proxy
 * for "the next place you would drive to".
 */
export function nearbyTowns(
  slug: string,
  count = 6,
): { slug: string; name: string; km: number }[] {
  const here = getLocation(slug);
  if (here?.lat == null || here?.lng == null) return [];
  const origin = { lat: here.lat, lng: here.lng };
  return getAllLocations()
    .filter((l) => l.slug !== slug && l.lat != null && l.lng != null)
    .map((l) => ({
      slug: l.slug,
      name: l.name,
      km: Math.round(haversineKm(origin, { lat: l.lat!, lng: l.lng! })),
    }))
    .filter((l) => l.km <= 60)
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}

/** Sitemap priority: evidenced places first, then everything else. */
export function geoPriority(slug: string): number {
  const g = getGeoSeo(slug);
  if (g.evidencedVolume >= 500) return 0.9;
  if (g.evidencedVolume > 0) return 0.8;
  if (g.parkruns.length >= 3) return 0.6;
  return 0.5;
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

/**
 * The cities that actually host a UK or Irish race, from the real calendar.
 *
 * Was derived from the four placeholder events, so it claimed exactly the four
 * cities that file happened to list. Now it answers from what HYROX has
 * actually scheduled, which is the only version of this that stays true as the
 * calendar moves.
 */
export function hostCitySlugs(): string[] {
  return [
    ...new Set(
      homeRaces().map((r) =>
        r.city
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-"),
      ),
    ),
  ];
}
