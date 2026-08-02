/**
 * The only entry point components may use to reach race data.
 *
 * Import `getResultsSource()` from here, never `demo-source` or
 * `live-source.stub` directly — that indirection is what makes the live-feed
 * swap a data-layer change instead of a rewrite (brief §8).
 */

import type { ResultsDataSource } from "./source";
import { demoDataSource } from "./demo-source";
import { liveDataSource } from "./live-source.stub";
import { getDataMode } from "./source";

/**
 * The file-backed source serves both modes — it just reads a different
 * directory (see `demo-source.ts`). `liveDataSource` is the stub for a
 * *streaming* provider feed and is only used when one is explicitly wired up
 * via RESULTS_SOURCE=feed, so importing real CSVs needs no code change at all.
 */
export function getResultsSource(): ResultsDataSource {
  if (process.env.RESULTS_SOURCE === "feed") return liveDataSource;
  return demoDataSource;
}

export { getDataMode } from "./source";
export type * from "./source";
