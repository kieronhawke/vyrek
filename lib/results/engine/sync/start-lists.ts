/**
 * Who is racing this weekend.
 *
 * ## Why this exists
 *
 * Our HYROX Chiba 2026 page read "0 athletes" and "0 entered" against every
 * division two days before the race. The source held 996 men, 631 women and 8
 * adaptive entrants at that moment, with names, nationalities, age groups and
 * start waves. Nothing was broken loudly enough to notice: `fetchStartList`
 * asked for the search *form* instead of submitting it, the form answered 200
 * with an empty list, and every layer above reported no entrants because that
 * is genuinely what it was handed.
 *
 * A results archive that cannot tell you who is on the start line the week of
 * your race is missing the one moment when most people care most.
 *
 * ## The shape of it
 *
 * An entrant is a result without a finish time, so nothing new is stored. The
 * rows go through the same normaliser, get the same identity resolution and the
 * same per-division checkpoint, and `getStarters` reads exactly the rows it was
 * already written to read. When the race runs, the results board overwrites the
 * same `source_result_id`s with finished times and the start list becomes the
 * results — no migration, no second table to reconcile.
 *
 * ## What it deliberately does not do
 *
 * It only touches events that have not happened. A finished event's start list
 * is of no interest and re-pulling it would cost a request per division across
 * the whole archive for nothing.
 */

import type { EngineEvent } from "../types";
import type { ResultsRepository } from "../repository";
import type { SyncEngine } from "./engine";

export type StartListSyncResult = {
  eventsChecked: number;
  divisionsPulled: number;
  entrantsUpserted: number;
  /** Divisions the source has not published entries for yet. */
  divisionsEmpty: number;
  failures: { event: string; division: string; error: string }[];
};

export async function syncStartLists(
  engine: SyncEngine,
  opts: {
    repo: ResultsRepository;
    /** Stop cleanly rather than overrun a function timeout. */
    deadline?: number;
    /**
     * How far ahead to bother. Entries open months before a race and change
     * daily in the final week; beyond a fortnight the list is not yet news.
     */
    withinDays?: number;
    now?: Date;
    triggerSource?: string;
  },
): Promise<StartListSyncResult> {
  const { repo, deadline = Infinity, withinDays = 14, now = new Date() } = opts;

  const result: StartListSyncResult = {
    eventsChecked: 0,
    divisionsPulled: 0,
    entrantsUpserted: 0,
    divisionsEmpty: 0,
    failures: [],
  };

  const events = (await repo.listEvents()).filter((event) =>
    isWorthPulling(event, now, withinDays),
  );

  for (const event of events) {
    if (Date.now() > deadline) break;
    result.eventsChecked += 1;

    const divisions = await repo.listDivisions(event.id);
    const seasonPath =
      event.sourceSeasonPath ?? `season-${/s(\d+)/.exec(event.season)?.[1] ?? "9"}`;

    for (const division of divisions) {
      if (Date.now() > deadline) break;
      if (!division.sourceDivisionId) continue;

      try {
        const outcome = await engine.syncDivision({
          seasonPath,
          event,
          division,
          sourceDivisionId: division.sourceDivisionId,
          source: "start-list",
          // ⚠️ Always write, never trust the checkpoint.
          //
          // A start list changes every day of entry week and its hash is
          // compared against the one the *results* sync left behind. Letting an
          // unchanged hash win here means the list freezes on the first pull
          // and quietly goes stale exactly when it matters.
          force: true,
        });
        const written = outcome.inserted + outcome.updated;
        result.entrantsUpserted += written;
        if (written === 0) result.divisionsEmpty += 1;
        else result.divisionsPulled += 1;
      } catch (error) {
        // One division the source will not serve — doubles and relay boards
        // often have no entries published — must not cost the rest of the race.
        result.failures.push({
          event: event.slug,
          division: division.divisionKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return result;
}

/**
 * A race still to come, and close enough that its entry list is real.
 *
 * An event with no date is judged on status alone. Most of the archive has no
 * date — HYROX publishes a calendar of upcoming races only — so requiring one
 * would exclude the very events this is for.
 */
function isWorthPulling(event: EngineEvent, now: Date, withinDays: number): boolean {
  if (event.status !== "upcoming") return false;
  if (!event.startDate) return true;

  const start = new Date(event.startDate).getTime();
  if (Number.isNaN(start)) return true;

  const daysAway = (start - now.getTime()) / 86_400_000;
  // A race that started today is still worth a pull: the board flips from start
  // list to results during the day and this is what keeps the page honest until
  // it does.
  return daysAway <= withinDays && daysAway >= -1;
}
