import raw from "@/data/hyrox/races.normalised.json";

/**
 * The real HYROX race calendar.
 *
 * Replaces lib/hyrox-events.ts, which carried four races whose dates its own
 * header admitted were "placeholder approximations based on the 2024-26
 * calendar cadence" — and emitted them as SportsEvent JSON-LD startDate. That
 * was the hard blocker on the noindex switch: inaccurate Event markup breaches
 * Google's structured-data policy, and an athlete could plan a season around a
 * date we invented. The repo asserted Manchester in April 2026; it is January
 * 2027.
 *
 * Source and provenance: scripts/fetch-hyrox-races.mjs reads every race page
 * listed in hyrox.com's event sitemap; scripts/normalise-hyrox-races.mjs turns
 * that into data/hyrox/races.normalised.json. Dates and venues are read, never
 * derived. Country comes from an explicit city map, because HYROX venue lines
 * have no consistent country field.
 */

export type Race = {
  slug: string;
  sourceUrl: string;
  name: string;
  city: string;
  country: string | null;
  continent: string | null;
  venue: string | null;
  venueName: string | null;
  /** ISO date, read from the event page. */
  startDate: string;
  endDate: string;
  sponsor: string | null;
  isYoungstars: boolean;
  isWorldChampionship: boolean;
  description: string | null;
};

export const RACES: Race[] = (raw.races as Race[]).slice().sort((a, b) =>
  a.startDate.localeCompare(b.startDate),
);

/** ISO-3166 alpha-2 for the countries the calendar actually contains. */
const ISO: Record<string, string> = {
  Argentina: "AR", Australia: "AU", Austria: "AT", Belgium: "BE", Brazil: "BR",
  Canada: "CA", China: "CN", Denmark: "DK", Egypt: "EG", Finland: "FI",
  France: "FR", Germany: "DE", Greece: "GR", "Hong Kong": "HK", Hungary: "HU",
  India: "IN", Ireland: "IE", Italy: "IT", Japan: "JP", Latvia: "LV",
  Malaysia: "MY", Mexico: "MX", Netherlands: "NL", "New Zealand": "NZ",
  Norway: "NO", Poland: "PL", Singapore: "SG", "South Africa": "ZA",
  "South Korea": "KR", Spain: "ES", Sweden: "SE", Switzerland: "CH",
  Taiwan: "TW", Thailand: "TH", "Türkiye": "TR", "United Kingdom": "GB",
  "United States": "US",
};

/**
 * Regional-indicator flag for a country.
 *
 * Runna puts a flag beside every race and it is the fastest way to read a
 * calendar of 113 races (docs/design/app-references.md §1.7). Returns null
 * rather than a placeholder if the country is unknown, so nothing renders a
 * wrong flag.
 */
export function flagFor(country: string | null): string | null {
  if (!country) return null;
  const code = ISO[country];
  if (!code) return null;
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/**
 * The venue name as a reader would say it.
 *
 * HYROX writes the venue field as a name and a street joined by a dash —
 * "ExCel - 1 Western Gateway", "NEC - Pendigo Way", "Port Messe Nagoya
 * Exhibition Hall - 3 Chome-2-1 Kinjofuto". Rendered raw, a location page
 * says "your nearest race is ExCel - 1 Western Gateway", which reads like a
 * database field because it is one.
 *
 * Everything before the first " - " is the name; what follows is always the
 * address. Parentheses are kept, because "(SEC)" and "(RDS)" are how people
 * refer to those two.
 */
export function venueLabel(race: {
  venueName?: string | null;
  venue?: string | null;
  /** Fallback when the calendar carries no venue at all. */
  city: string;
}): string {
  const raw = race.venueName ?? race.venue;
  if (!raw) return race.city;
  return raw.split(/\s+[-–]\s+/)[0].trim() || race.city;
}

/** Races that have not finished yet, relative to `now`. */
export function upcoming(now: Date = new Date()): Race[] {
  const today = now.toISOString().slice(0, 10);
  return RACES.filter((r) => r.endDate >= today);
}

export function findRace(slug: string): Race | undefined {
  return RACES.find((r) => r.slug === slug);
}

export function racesInCountry(country: string, now?: Date): Race[] {
  return upcoming(now).filter((r) => r.country === country);
}

/** The home calendar: UK plus Ireland, which UK athletes routinely travel to. */
export function homeRaces(now?: Date): Race[] {
  return upcoming(now).filter(
    (r) => r.country === "United Kingdom" || r.country === "Ireland",
  );
}

/** Whole days between now and the start. Negative once it has begun. */
export function daysUntil(race: Race, now: Date = new Date()): number {
  const start = new Date(`${race.startDate}T00:00:00Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((start - today) / 86_400_000);
}

/** "Fri 20 – Sun 29 Nov 2026", or a single date for a one-day race. */
export function formatDates(race: Race): string {
  const fmt = (iso: string, withYear: boolean) =>
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      ...(withYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    }).format(new Date(`${iso}T00:00:00Z`));

  if (race.startDate === race.endDate) return fmt(race.startDate, true);
  const sameYear = race.startDate.slice(0, 4) === race.endDate.slice(0, 4);
  return `${fmt(race.startDate, !sameYear)} – ${fmt(race.endDate, true)}`;
}

/**
 * How long a 12-week build would need to start to land on this race.
 * The single most useful thing we can say on a race page that HYROX cannot.
 */
export function buildStarts(race: Race): { date: string; weeksAway: number } | null {
  const start = new Date(`${race.startDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 12 * 7);
  const iso = start.toISOString().slice(0, 10);
  const weeksAway = Math.round(
    (start.getTime() - Date.now()) / (7 * 86_400_000),
  );
  return { date: iso, weeksAway };
}

export const RACE_COUNT = RACES.length;
