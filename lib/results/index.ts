/**
 * The only entry point components may use to reach race data.
 *
 * Import `getResultsSource()` from here, never `demo-source` or
 * `live-source.stub` directly — that indirection is what makes the live-feed
 * swap a data-layer change instead of a rewrite (brief §8).
 */

import type { ResultsDataSource } from "./source";
import { demoDataSource } from "./demo-source";
import { apiDataSource } from "./api-source";
import { liveDataSource } from "./live-source.stub";
import { getDataMode } from "./source";

/**
 * Which source serves the section.
 *
 * | RESULTS_SOURCE | Source        | Data from                          |
 * |----------------|---------------|------------------------------------|
 * | (unset)        | file          | data/results-demo or results-live  |
 * | `api`          | HTTP API      | RESULTS_API_URL                    |
 * | `feed`         | streaming     | not implemented — stub with TODOs  |
 *
 * The file source covers both demo fixtures and imported real CSVs; it just
 * reads a different directory (see `demo-source.ts`), so importing real results
 * needs no code change at all. `api` is for the REST API currently being
 * built — contract in docs/results/API-CONTRACT.md.
 */
export function getResultsSource(): ResultsDataSource {
  switch (process.env.RESULTS_SOURCE) {
    case "api": return apiDataSource;
    case "feed": return liveDataSource;
    default: return demoDataSource;
  }
}

export { getDataMode } from "./source";
export type * from "./source";
