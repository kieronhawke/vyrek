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

export function getResultsSource(): ResultsDataSource {
  return getDataMode() === "live" ? liveDataSource : demoDataSource;
}

export { getDataMode } from "./source";
export type * from "./source";
