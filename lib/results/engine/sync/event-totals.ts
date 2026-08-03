/**
 * How many people raced at an event.
 *
 * The catalogue creates events before any results exist, so it writes
 * `athleteCount: 0`. Nothing revised it afterwards, and the number is on the
 * surface of the whole section — event tiles, city pages, the event FAQ, race
 * reports, and `maximumAttendeeCapacity` in `SportsEvent` markup. Every event
 * advertised a field of zero with hundreds of stored results behind it.
 *
 * The divisions already hold the truth: each carries `entrantCount`, written
 * from the rows actually stored. This is the roll-up, and it is deliberately
 * derived rather than incremented — a counter that is added to on each sync
 * drifts the moment a sync runs twice, and these syncs are idempotent by design.
 */

import type { ResultsRepository } from "../repository";

/** Sum of the stored entrant counts across an event's divisions. */
export async function eventAthleteTotal(
  repo: ResultsRepository,
  eventId: string,
): Promise<number> {
  const divisions = await repo.listDivisions(eventId);
  return divisions.reduce((sum, d) => sum + (d.entrantCount ?? 0), 0);
}

export type BackfillTotalsResult = { checked: number; updated: string[] };

/**
 * Repair every event's total in one pass.
 *
 * Cheap — one division read per event, no network — and idempotent, so it runs
 * at the end of a catalogue sync rather than as a job anyone has to remember.
 */
export async function backfillEventTotals(
  repo: ResultsRepository,
): Promise<BackfillTotalsResult> {
  const events = await repo.listEvents();
  const updated: string[] = [];

  for (const event of events) {
    const total = await eventAthleteTotal(repo, event.id);
    if (total === event.athleteCount) continue;
    await repo.upsertEvent({ ...event, athleteCount: total });
    updated.push(event.slug);
  }

  return { checked: events.length, updated };
}
