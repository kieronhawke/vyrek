/**
 * Row validation. Anything that fails goes to quarantine with its raw payload
 * and never reaches a live table (brief §9, §11).
 *
 * The bar is *plausibility*, not correctness — we cannot know that a 1:04:07 is
 * the right time, only that it is a time a human could have run. The checks are
 * deliberately generous at the edges: a real 14-year-old's first race and a real
 * elite's world record both have to pass, so the bounds are set where physics
 * and the rulebook are, not where the bell curve is.
 *
 * A false quarantine loses one real athlete's result quietly. A missed bad row
 * publishes a 12-second HYROX at the top of a leaderboard. Both are bad; the
 * second is worse, and the first is visible in the console.
 */

import type { Splits } from "../types";

/** Nobody has finished a HYROX in under half an hour. The record is ~53 min. */
export const MIN_FINISH_MS = 30 * 60 * 1000;
/** Cut-offs sit well inside this; beyond it the row is a parsing artefact. */
export const MAX_FINISH_MS = 5 * 60 * 60 * 1000;
/** Runs and stations: a 30-second segment is possible, a 3-second one is not. */
export const MIN_SEGMENT_MS = 20 * 1000;
export const MAX_SEGMENT_MS = 90 * 60 * 1000;
/**
 * How far the sum of splits may drift from the finish time. Timing mats,
 * rounding and transition attribution all introduce honest slack.
 */
export const SPLIT_SUM_TOLERANCE = 0.08;

export type ValidationInput = {
  sourceResultId: string;
  finishTimeMs: number | null;
  roxzoneTimeMs: number | null;
  splits: Splits;
  status: string;
  rankOverall: number | null;
  name: string;
};

export type ValidationFailure = { reason: string; detail: Record<string, unknown> };
export type ValidationOutcome =
  | { ok: true }
  | { ok: false; failures: ValidationFailure[] };

export function validateRow(row: ValidationInput): ValidationOutcome {
  const failures: ValidationFailure[] = [];

  // ⚠️ A name has to contain a letter.
  //
  // A length check alone passes "- -", "--" and ". .", which the source uses as
  // a placeholder for an entry with no name attached. One of those reached the
  // world-record board as the fastest women's HYROX ever recorded — a page that
  // is meant to be the most authoritative thing on the site.
  //
  // `\p{L}` rather than A–Z: the field is full of Chinese, Japanese, Korean,
  // Greek and Cyrillic names, and every one of them is a real person.
  if (!row.name || row.name.trim().length < 2 || !/\p{L}/u.test(row.name)) {
    failures.push({ reason: "missing_name", detail: { name: row.name } });
  }

  // DNF and DNS legitimately have no time; only finishers must have one.
  const isFinisher = row.status === "finished";

  if (isFinisher) {
    if (row.finishTimeMs === null) {
      failures.push({ reason: "missing_finish_time", detail: {} });
    } else if (row.finishTimeMs < MIN_FINISH_MS || row.finishTimeMs > MAX_FINISH_MS) {
      failures.push({
        reason: "finish_time_out_of_range",
        detail: { finishTimeMs: row.finishTimeMs, min: MIN_FINISH_MS, max: MAX_FINISH_MS },
      });
    }
  }

  const segments = [...row.splits.runs, ...row.splits.stations];
  for (const segment of segments) {
    if (segment.timeMs < MIN_SEGMENT_MS || segment.timeMs > MAX_SEGMENT_MS) {
      failures.push({
        reason: "segment_out_of_range",
        detail: { key: segment.key, timeMs: segment.timeMs },
      });
    }
  }

  // Only check the sum when the row claims to be complete. A partial live board
  // legitimately has three of eight stations and must not be quarantined for it.
  if (isFinisher && row.finishTimeMs && segments.length >= 16) {
    const sum =
      segments.reduce((total, s) => total + s.timeMs, 0) + (row.splits.roxzoneMs ?? 0);
    const drift = Math.abs(sum - row.finishTimeMs) / row.finishTimeMs;
    if (drift > SPLIT_SUM_TOLERANCE) {
      failures.push({
        reason: "splits_do_not_sum",
        detail: {
          sumMs: sum,
          finishTimeMs: row.finishTimeMs,
          driftPercent: Math.round(drift * 1000) / 10,
          tolerancePercent: SPLIT_SUM_TOLERANCE * 100,
        },
      });
    }
  }

  if (row.rankOverall !== null && row.rankOverall <= 0) {
    failures.push({ reason: "invalid_rank", detail: { rankOverall: row.rankOverall } });
  }

  return failures.length === 0 ? { ok: true } : { ok: false, failures };
}
