/**
 * Seeds the terrain.parkrunLocations layer of the location database from
 * parkrun's own published events feed.
 *
 * Source: https://images.parkrun.com/events.json — parkrun's official
 * machine-readable event list (GeoJSON), the same feed that powers their
 * event map. Country code 97 is the UK.
 *
 * This is a manual, occasional data job, NOT part of the build. It hits
 * the network; the build must not. Run it, eyeball the diff, commit.
 *
 *   node scripts/seed-parkruns.mjs --dry-run      # print, write nothing
 *   node scripts/seed-parkruns.mjs                # merge into enrichment
 *   node scripts/seed-parkruns.mjs --only=manchester,leeds
 *
 * Sourcing rules (data/locations/README.md): every record carries source
 * and verifiedOn. Nothing here is invented — a location with no parkrun
 * inside the radius simply gets no records, which is the correct outcome.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const FEED_URL = "https://images.parkrun.com/events.json";
const UK_COUNTRY_CODE = 97;
/** seriesid 1 is the adult 5k; seriesid 2 is junior parkrun, a 2k event
 *  for 4-14s. Only the 5k is relevant to a HYROX training audience, and
 *  including juniors crowded the real events out of the nearest-N list. */
const SERIES_5K = 1;
/** Straight-line radius from the registry centroid. A parkrun further out
 *  than this is not credibly "in" the town for page-copy purposes. */
const RADIUS_KM = 10;
/** Keep pages readable — the nearest N, not every one in the conurbation. */
const MAX_PER_LOCATION = 8;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "locations");
const ENRICH_DIR = path.join(DATA_DIR, "enrichment");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

// ── Great-circle distance, km ────────────────────────────────────────
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ── Load ─────────────────────────────────────────────────────────────
const registry = JSON.parse(
  readFileSync(path.join(DATA_DIR, "registry.json"), "utf8"),
).locations;

console.log(`Fetching ${FEED_URL} …`);
const res = await fetch(FEED_URL, {
  headers: {
    // The feed 403s the default fetch agent.
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  },
});
if (!res.ok) {
  console.error(`Feed fetch failed: HTTP ${res.status}. Nothing written.`);
  process.exit(1);
}
const feed = await res.json();
const ukEvents = feed.events.features.filter(
  (f) =>
    f.properties.countrycode === UK_COUNTRY_CODE &&
    f.properties.seriesid === SERIES_5K,
);
console.log(`  ${ukEvents.length} UK 5k parkrun events in the feed.`);

// verifiedOn is the day we actually read the feed.
const verifiedOn = new Date().toISOString().slice(0, 10);

// ── Match ────────────────────────────────────────────────────────────
let touched = 0;
let skippedNoCoords = 0;

for (const loc of registry) {
  if (only && !only.has(loc.slug)) continue;
  if (loc.lat == null || loc.lng == null) {
    skippedNoCoords++;
    continue;
  }

  const near = ukEvents
    .map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      return {
        name: f.properties.EventLongName,
        area: f.properties.EventLocation || undefined,
        distanceKm: Number(haversineKm(loc.lat, loc.lng, lat, lng).toFixed(1)),
      };
    })
    .filter((e) => e.distanceKm <= RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_PER_LOCATION)
    .map((e) => ({ ...e, source: FEED_URL, verifiedOn }));

  if (!near.length) continue;

  const file = path.join(ENRICH_DIR, `${loc.slug}.json`);
  const existing = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { slug: loc.slug };

  const merged = {
    ...existing,
    terrain: { ...(existing.terrain ?? {}), parkrunLocations: near },
  };

  console.log(
    `${loc.slug.padEnd(20)} ${String(near.length).padStart(2)} parkrun(s): ` +
      near.map((n) => `${n.name} (${n.distanceKm}km)`).join(", "),
  );

  if (!dryRun) {
    if (!existsSync(ENRICH_DIR)) mkdirSync(ENRICH_DIR, { recursive: true });
    writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
  }
  touched++;
}

console.log(
  `\n${dryRun ? "[dry run] would update" : "Updated"} ${touched} location(s). ` +
    `${skippedNoCoords} skipped for missing lat/lng.`,
);
if (!dryRun) console.log("Now run: node scripts/validate-locations.mjs");
