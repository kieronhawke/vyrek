import "server-only";
import type { StationId } from "./model";
import type { DivisionCode } from "./types";

/**
 * Median splits and the finish-time percentile ladder for each division.
 *
 * Precomputed by `scripts/generate-demo-data.ts` and read from disk. The first
 * version aggregated this at request time over ~2,500 results per division and
 * cost 2s of TTFB on the simulator — well past the brief's LCP budget. A live
 * feed does the same thing: compute on ingest, not per request.
 *
 * The simulator, the target-plan builder and the percentile tool all read these
 * same numbers so the three surfaces cannot drift apart.
 */

export type DivisionReference = {
  division: DivisionCode;
  label: string;
  stations: Record<StationId, number>;
  runs: number[];
  roxzoneSeconds: number;
  medianFinishSeconds: number;
  /** Descending-speed ladder: [p99, p95, p90, p75, p50, p25, p10] in seconds. */
  finishBreakpoints: number[];
  sampleSize: number;
};

const FILE = [
  process.cwd(),
  "data",
  process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "results-live" : "results-demo",
  "references.json",
].join("/");

let cache: DivisionReference[] | null = null;

function all(): DivisionReference[] {
  if (cache) return cache;
  // Lazy require: see the note in demo-source.ts. A static `node:fs` import
  // here reaches client bundles through the engine and breaks the build.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { existsSync, readFileSync } = require("node:fs") as typeof import("node:fs");
  cache = existsSync(FILE)
    ? (JSON.parse(readFileSync(FILE, "utf8")) as DivisionReference[])
    : [];
  return cache;
}

export function getDivisionReference(division: DivisionCode): DivisionReference | null {
  return all().find((r) => r.division === division) ?? null;
}

export function listDivisionReferences(divisions: readonly DivisionCode[]): DivisionReference[] {
  return divisions
    .map((d) => getDivisionReference(d))
    .filter((r): r is DivisionReference => r !== null);
}

/** Divisions offered in the simulator and percentile tool. */
export const SIMULATOR_DIVISIONS: DivisionCode[] = [
  "hyrox-men",
  "hyrox-women",
  "hyrox-pro-men",
  "hyrox-pro-women",
  "hyrox-doubles-men",
  "hyrox-doubles-women",
  "hyrox-doubles-mixed",
];
