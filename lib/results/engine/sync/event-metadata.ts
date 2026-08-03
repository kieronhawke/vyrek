/**
 * Filling in what the results source does not tell us.
 *
 * The timing platform gives a weekend label — "2026 Chiba" — a set of division
 * codes, and day names. No date, no country, no venue. Without a date, live
 * mode cannot self-arm, the calendar cannot sort, and `SportsEvent` markup has
 * nothing to assert.
 *
 * Those facts already exist in the repo. `data/hyrox/races.normalised.json` is
 * HYROX's own published calendar — 113 races, read from their event pages by
 * `scripts/fetch-hyrox-races.mjs`, with real ISO dates and venues. So this is a
 * join, not a fetch: match on city and year, take the dates from the calendar,
 * resolve a real UTC start instant through the city's timezone.
 *
 * Matching is deliberately conservative. A wrong join puts one race's date on
 * another race's results, and an event armed on the wrong day either polls a
 * finished board for hours or misses a live one entirely. Unmatched events keep
 * null dates and are listed for a human, which is the recoverable failure.
 */

import { RACES, type Race } from "@/lib/hyrox/races";
import type { ResultsRepository } from "../repository";
import type { EngineEvent } from "../types";
import {
  countryIsoFor,
  localStartToUtc,
  normaliseKey,
  regionFor,
  timeZoneFor,
} from "../normalise/timezones";

/**
 * Local start hour assumed for arming.
 *
 * The calendar publishes dates, not start times. 07:00 local is earlier than
 * any HYROX first wave, and `PRE_ROLL_MINUTES` widens it further — so the board
 * is armed before the first athlete starts rather than after. Being early costs
 * a few wasted polls; being late costs the start of the race.
 */
export const ASSUMED_LOCAL_START_HOUR = Number(process.env.HYROX_LOCAL_START_HOUR ?? 7);

export type EventMetadata = {
  startDate: string;
  endDate: string;
  startDatetime: string | null;
  endDatetime: string | null;
  tzOffsetMinutes: number;
  country: string;
  countryIso: string;
  region: string;
  venue: string | null;
  matchedSlug: string;
};

/**
 * Find the calendar race for a city and year.
 *
 * Year is required, not optional: HYROX returns to the same cities annually, so
 * "Manchester" alone matches several races and would silently pick one.
 */
export function matchRace(city: string, year: number, races: Race[] = RACES): Race | null {
  const key = normaliseKey(city);
  const candidates = races.filter(
    (r) => normaliseKey(r.city) === key && Number(r.startDate.slice(0, 4)) === year,
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) return null;

  // A city can host twice in a year. Without a date from the source there is no
  // way to tell which, so the earliest is taken and the ambiguity is reported
  // by the caller rather than hidden here.
  return [...candidates].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export function metadataFor(city: string, year: number, races: Race[] = RACES): EventMetadata | null {
  const race = matchRace(city, year, races);
  if (!race) return null;

  const timeZone = timeZoneFor(race.city, race.country);
  const start = timeZone
    ? localStartToUtc(race.startDate, timeZone, ASSUMED_LOCAL_START_HOUR)
    : null;
  const end = timeZone
    ? localStartToUtc(race.endDate ?? race.startDate, timeZone, 22)
    : null;

  return {
    startDate: race.startDate,
    endDate: race.endDate ?? race.startDate,
    startDatetime: start?.utc ?? null,
    endDatetime: end?.utc ?? null,
    tzOffsetMinutes: start?.offsetMinutes ?? 0,
    country: race.country ?? "",
    countryIso: countryIsoFor(race.country),
    region: regionFor(race.country),
    venue: race.venueName ?? race.venue ?? null,
    matchedSlug: race.slug,
  };
}

export type EnrichResult = {
  enriched: string[];
  unmatched: { slug: string; city: string; year: number }[];
  ambiguous: string[];
};

/**
 * Fill in dates and place for every event that lacks them.
 *
 * Idempotent and cheap — no network at all — so it runs at the end of every
 * catalog sync rather than as a separate job.
 */
export async function enrichEventMetadata(
  repo: ResultsRepository,
  opts: { races?: Race[] } = {},
): Promise<EnrichResult> {
  const races = opts.races ?? RACES;
  const result: EnrichResult = { enriched: [], unmatched: [], ambiguous: [] };

  for (const event of await repo.listEvents()) {
    // Already dated: leave it alone. Re-deriving would overwrite a correction
    // an operator made by hand.
    if (event.startDatetime) continue;

    const metadata = metadataFor(event.city, event.year, races);
    if (!metadata) {
      result.unmatched.push({ slug: event.slug, city: event.city, year: event.year });
      continue;
    }

    const sameCityYear = races.filter(
      (r) =>
        normaliseKey(r.city) === normaliseKey(event.city) &&
        Number(r.startDate.slice(0, 4)) === event.year,
    );
    if (sameCityYear.length > 1) result.ambiguous.push(event.slug);

    await repo.upsertEvent({
      ...(event as EngineEvent),
      startDate: metadata.startDate,
      endDate: metadata.endDate,
      startDatetime: metadata.startDatetime,
      endDatetime: metadata.endDatetime,
      tzOffsetMinutes: metadata.tzOffsetMinutes,
      country: event.country || metadata.country,
      countryIso: event.countryIso || metadata.countryIso,
      region: event.region || metadata.region,
      venue: event.venue ?? metadata.venue,
    });
    result.enriched.push(event.slug);
  }

  // An event we cannot date can never self-arm, so it is worth an operator
  // seeing rather than a silent gap in the calendar.
  if (result.unmatched.length > 0) {
    await repo.raiseAlert({
      kind: "completeness",
      severity: "info",
      message:
        `${result.unmatched.length} event(s) have no match in the HYROX calendar, so they have ` +
        `no dates and cannot self-arm: ${result.unmatched.map((u) => u.slug).join(", ")}`,
      detail: { unmatched: result.unmatched },
      sourceEventId: null,
      acknowledgedAt: null,
    });
  }

  return result;
}
