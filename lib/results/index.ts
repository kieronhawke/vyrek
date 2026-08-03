/**
 * The only entry point components may use to reach race data.
 *
 * Import `getResultsSource()` from here, never `demo-source`, `live-source` or
 * `live-source.stub` directly — that indirection is what makes swapping the
 * data layer a data-layer change instead of a rewrite (frontend brief §8).
 *
 * There are now three sources and they are not interchangeable:
 *
 * | Source | Selected by | What it is |
 * |---|---|---|
 * | `demoDataSource` | default | Seeded synthetic data from `/data/results-demo` |
 * | `liveFeedStub` | `RESULTS_SOURCE=feed` | File-backed provider feed (CSV import path) |
 * | `engineDataSource` | `NEXT_PUBLIC_DATA_MODE=live` | Our ingested database, via the results engine |
 */

import type { ResultsDataSource } from "./source";
import { demoDataSource } from "./demo-source";
import { liveDataSource as liveFeedStub } from "./live-source.stub";
import { liveDataSource as engineDataSource } from "./live-source";
import { getDataMode } from "./source";

/**
 * `RESULTS_SOURCE=feed` wins when set, because it is an explicit instruction
 * about *this deployment* and outranks a mode flag. Otherwise `live` means the
 * ingested database, and everything else means demo — so local dev and CI keep
 * working with no database, which is the point of keeping demo around at all
 * (engine brief §7).
 */
export function getResultsSource(): ResultsDataSource {
  if (process.env.RESULTS_SOURCE === "feed") return liveFeedStub;
  if (getDataMode() === "live") return engineDataSource;
  return demoDataSource;
}

export { getDataMode } from "./source";
export type * from "./source";
