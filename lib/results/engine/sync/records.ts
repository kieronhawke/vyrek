/**
 * The all-time record board, precomputed.
 *
 * `/rankings/world-records` is one row per division and changes only when an
 * event finalises — perhaps weekly. Deriving it per request meant asking, for
 * every division key, which of its ~75 divisions holds the fastest finish, and
 * that is expensive however it is written: the first version walked all 2,692
 * divisions and every row and took **six minutes**, and the indexed rewrite
 * still took ten seconds and hit the statement timeout whenever the backfill was
 * writing.
 *
 * The consequence was worse than slowness. `ResilientDataSource` cannot tell a
 * timeout from an outage, so the page degraded to the demo tier — and the demo
 * dataset has no records at all. In live mode, against a database holding half a
 * million results, the record board rendered "No records yet".
 *
 * So it is computed once by the worker that already knows when results changed,
 * and stored as a settings blob. Serving is a single key read.
 */

import type { ResultsRepository } from "../repository";

export const RECORDS_SETTING_KEY = "records_board";

export type StoredRecord = {
  divisionKey: string;
  divisionLabel: string;
  athleteId: string;
  finishTimeMs: number;
  eventId: string;
};

export type StoredRecordsBoard = {
  computedAt: string;
  records: StoredRecord[];
};

/**
 * Recompute and store the board.
 *
 * Cheap enough to run at the end of a catalogue or reconcile pass, and
 * idempotent — it derives from the results table rather than accumulating.
 */
export async function recomputeRecords(
  repo: ResultsRepository,
  now: Date = new Date(),
): Promise<StoredRecordsBoard> {
  const records = await repo.getDivisionRecords();
  const board: StoredRecordsBoard = { computedAt: now.toISOString(), records };
  await repo.setSetting(RECORDS_SETTING_KEY, board, "records-worker");
  return board;
}

/** The stored board, or null when it has never been computed. */
export async function readStoredRecords(
  repo: ResultsRepository,
): Promise<StoredRecordsBoard | null> {
  return repo.getSetting<StoredRecordsBoard>(RECORDS_SETTING_KEY);
}
