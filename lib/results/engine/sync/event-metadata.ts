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
import { resolveCityName } from "../normalise/city-name";
import { HOST_CITIES } from "../normalise/host-cities";

/** Every city we can place, from the live calendar and the archive together. */
const PLACEABLE_CITIES = new Set([
  ...RACES.map((r) => normaliseKey(r.city)),
  ...Object.keys(HOST_CITIES).map(normaliseKey),
]);

const HOST_CITY_BY_KEY = new Map(
  Object.entries(HOST_CITIES).map(([city, place]) => [normaliseKey(city), { city, ...place }]),
);

/**
 * Country, region and timezone for an event whose weekend has no calendar entry.
 *
 * Deliberately partial: it answers *where*, never *when*. A finished event's
 * date is year-specific and cannot be recovered from its city, so this leaves
 * dates null rather than inventing one — an event with a wrong date sorts wrong
 * and, if it were ever `upcoming`, would arm the live poller on the wrong day.
 */
export function placeFor(label: string): { city: string; country: string; timeZone: string } | null {
  const resolved = resolveCityName(label, PLACEABLE_CITIES);
  if (!resolved) return null;

  const host = HOST_CITY_BY_KEY.get(normaliseKey(resolved));
  if (host) return { city: host.city, country: host.country, timeZone: host.timeZone };

  // On the calendar but not in the archive table: take its country from there.
  const race = RACES.find((r) => normaliseKey(r.city) === normaliseKey(resolved));
  if (race?.country) {
    const zone = timeZoneFor(race.city, race.country);
    if (zone) return { city: race.city, country: race.country, timeZone: zone };
  }
  return null;
}

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

/**
 * Status derived from the clock, never downgraded.
 *
 * `final` is a decision the reconciler and the live poller make deliberately;
 * this only ever promotes a stale `upcoming` whose date has passed, and leaves
 * a live or paused event alone so a race in progress is never demoted
 * mid-flight by a metadata pass.
 */
export function statusFor(
  current: EngineEvent["status"],
  endsAt: string | null,
  now: Date = new Date(),
): EngineEvent["status"] {
  if (current !== "upcoming") return current;
  if (!endsAt) return current;
  return new Date(endsAt).getTime() < now.getTime() ? "final" : "upcoming";
}

/** `s8` when the current season is `s9`. */
export function isPastSeason(season: string, current = process.env.HYROX_CURRENT_SEASON ?? "season-9"): boolean {
  const n = Number(/s(\d+)/.exec(season)?.[1]);
  const c = Number(/season-(\d+)/.exec(current)?.[1]);
  return Number.isFinite(n) && Number.isFinite(c) && n < c;
}

export type EnrichResult = {
  enriched: string[];
  unmatched: { slug: string; city: string; year: number }[];
  ambiguous: string[];
  /** Undated events closed because their season is over. */
  closedBySeason: string[];
  /** Events with no calendar entry that were still given a country and region. */
  placed: string[];
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
  const result: EnrichResult = {
    enriched: [], unmatched: [], ambiguous: [], closedBySeason: [], placed: [],
  };

  for (const event of await repo.listEvents()) {
    // Already dated: leave it alone. Re-deriving would overwrite a correction
    // an operator made by hand.
    if (event.startDatetime) continue;

    const metadata = metadataFor(event.city, event.year, races);
    if (!metadata) {
      result.unmatched.push({ slug: event.slug, city: event.city, year: event.year });

      // No calendar entry, but the archive still knows where this raced.
      //
      // 208 of 223 events reach this branch — the published calendar only lists
      // upcoming races, so every finished season falls off it. Left as it was,
      // all of them had a null country and region, which emptied the regional
      // calendars and left the whole archive unfilterable. `placeFor` answers
      // where without pretending to know when.
      const place = placeFor(event.city);
      const status =
        event.status === "upcoming" && isPastSeason(event.season) ? "final" : event.status;

      if (place && (!event.country || !event.region)) {
        await repo.upsertEvent({
          ...(event as EngineEvent),
          status,
          country: event.country || place.country,
          countryIso: event.countryIso || countryIsoFor(place.country),
          region: event.region || regionFor(place.country),
        });
        result.placed.push(event.slug);
        if (status !== event.status) result.closedBySeason.push(event.slug);
        continue;
      }

      // No date, but a season number is itself evidence: HYROX runs one season
      // at a time, so anything from an earlier one has finished. Without this,
      // 208 undated historical events sit as "upcoming" for ever and the live
      // poller reconsiders every one of them every minute.
      if (status !== event.status) {
        await repo.upsertEvent({ ...(event as EngineEvent), status });
        result.closedBySeason.push(event.slug);
      }
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
      // A race that has already happened is not upcoming. Left alone, every
      // historical event stays "upcoming" for ever — 221 of them, back to
      // 2017 — and the live poller re-examines all of them every minute.
      status: statusFor(event.status, metadata.endDatetime ?? metadata.startDatetime),
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

  // Only the events we could not even place are worth an operator's attention.
  //
  // Nearly every event misses the calendar — it lists upcoming races only, so
  // the whole archive falls off it — and alerting on all of them buried the
  // signal under 208 lines of routine history. What actually needs a human is an
  // event whose label names no city we recognise: it has no country, no region,
  // and sits outside every regional calendar until someone looks at it.
  const unplaceable = result.unmatched.filter((u) => !placeFor(u.city));
  if (unplaceable.length > 0) {
    await repo.raiseAlert({
      kind: "completeness",
      severity: "info",
      message:
        `${unplaceable.length} event(s) name no city we can place, so they have no country or ` +
        `region: ${unplaceable.map((u) => `${u.slug} ("${u.city}")`).join(", ")}`,
      detail: { unplaceable, placed: result.placed.length, unmatched: result.unmatched.length },
      sourceEventId: null,
      acknowledgedAt: null,
    });
  }

  return result;
}
