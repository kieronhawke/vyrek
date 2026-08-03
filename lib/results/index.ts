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
import { apiDataSource } from "./api-source";
import { liveDataSource as liveFeedStub } from "./live-source.stub";
import { liveDataSource as engineDataSource } from "./live-source";
import { getDataMode } from "./source";

/**
 * Which source serves the section.
 *
 * | Condition                       | Source   | Data from                        |
 * |---------------------------------|----------|----------------------------------|
 * | `RESULTS_SOURCE=api`            | REST API | `RESULTS_API_URL`                |
 * | `RESULTS_SOURCE=feed`           | stub     | not implemented                  |
 * | `RESULTS_SOURCE=file`           | files    | `data/results-live` (CSV import) |
 * | `NEXT_PUBLIC_DATA_MODE=live`    | engine   | the ingested database            |
 * | otherwise                       | demo     | `data/results-demo`              |
 *
 * An explicit `RESULTS_SOURCE` always wins: it is an instruction about *this
 * deployment* and outranks a mode flag. Below that, `live` means the ingested
 * database (engine brief §7) and everything else means demo, so local dev and
 * CI keep working with no database at all.
 *
 * `file` exists because there are two ways real data arrives: the HYROX
 * ingestion engine, and `scripts/import-results.ts` writing a CSV export to
 * `data/results-live`. Both are legitimate; this makes the choice explicit
 * rather than letting one silently shadow the other.
 */
export function getResultsSource(): ResultsDataSource {
  switch (process.env.RESULTS_SOURCE) {
    case "api": return apiDataSource;
    case "feed": return liveFeedStub;
    case "file": return demoDataSource;
  }
  if (getDataMode() === "live") return engineDataSource;
  return demoDataSource;
}

export { getDataMode } from "./source";
export type * from "./source";
