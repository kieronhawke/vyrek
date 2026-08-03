import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { IntelSnapshot, PlaceIntel } from "./types";

/**
 * Build-time read of the athlete-reported equipment data.
 *
 * Reads a snapshot file rather than Redis. Every other data layer here works
 * the same way — the registry, the race calendar, the gym seeds — and it means
 * a build cannot fail because a third-party store is down, and 5,856 pages do
 * not each make a network call. `scripts/snapshot-gym-intel.mjs` writes the
 * file from Redis on demand.
 *
 * An absent file is the normal state on day one and returns empty rather than
 * throwing. Pages then render exactly as they do now.
 */

const FILE = path.join(process.cwd(), "data", "gym-intel.json");

let cache: IntelSnapshot | null | undefined;

function load(): IntelSnapshot | null {
  if (cache !== undefined) return cache;
  if (!existsSync(FILE)) {
    cache = null;
    return cache;
  }
  try {
    cache = JSON.parse(readFileSync(FILE, "utf8")) as IntelSnapshot;
  } catch {
    // A malformed snapshot must not take the build down. Empty is correct.
    cache = null;
  }
  return cache;
}

export function placeIntel(slug: string): PlaceIntel {
  return load()?.places[slug] ?? {};
}

export function snapshotDate(): string | null {
  return load()?.generatedAt ?? null;
}

/** Total reports held for a place, for the "n athletes have told us" line. */
export function reportCount(slug: string): number {
  const place = placeIntel(slug);
  let n = 0;
  for (const gym of Object.values(place))
    for (const t of Object.values(gym)) n += (t?.yes ?? 0) + (t?.no ?? 0);
  return n;
}
