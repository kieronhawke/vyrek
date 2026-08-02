/**
 * Backfills lat/lng on registry locations that lack them, so geo-derived
 * layers (currently scripts/seed-parkruns.mjs) can reach the whole registry
 * rather than the third of it that happened to carry coordinates.
 *
 * Source: Nominatim, the OpenStreetMap geocoder.
 *   https://nominatim.openstreetmap.org/
 * Its usage policy caps automated use at 1 request/second and requires a
 * real user-agent with contact details. Both are honoured below. This is a
 * manual, occasional data job, NOT part of the build — the build must never
 * hit the network.
 *
 *   node scripts/seed-coordinates.mjs --dry-run     # print, write nothing
 *   node scripts/seed-coordinates.mjs               # write registry.json
 *   node scripts/seed-coordinates.mjs --only=leeds,derby
 *
 * Nothing is invented: a location the geocoder cannot resolve confidently
 * is left without coordinates and listed for a human to resolve, which is
 * the correct outcome under hard rule 1.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "SuthPerformance-LocationDB/1.0 (kieron.hawke@googlemail.com)";
/** Nominatim's published limit is 1 req/sec. Sit comfortably under it. */
const THROTTLE_MS = 1100;
/** Rough UK bounding box, used to reject a match that landed abroad. */
const UK_BOUNDS = { minLat: 49.8, maxLat: 61.0, minLng: -8.7, maxLng: 1.8 };
/** Nominatim place classes we accept. Anything else (a shop, a building)
 *  means the query matched the wrong kind of thing. */
const OK_TYPES = new Set([
  "city",
  "town",
  "village",
  "suburb",
  "quarter",
  "neighbourhood",
  "borough",
  "administrative",
]);

/** Slugs whose bare name resolves to the wrong place. Everything else is
 *  queried as "<name>, United Kingdom" and relies on Nominatim's ranking. */
const QUERY_OVERRIDES = {
  newcastle: "Newcastle upon Tyne, United Kingdom",
  // Stratford, London — not Stratford-upon-Avon, 150km away.
  stratford: "Stratford, London, United Kingdom",
  chester: "Chester, Cheshire, United Kingdom",
  // "Hove, East Sussex" ranks a bus depot in Eastbourne above the town.
  hove: "Hove, Brighton and Hove, United Kingdom",
  lincoln: "Lincoln, Lincolnshire, United Kingdom",
  preston: "Preston, Lancashire, United Kingdom",
};

const ROOT = process.cwd();
const REGISTRY = path.join(ROOT, "data", "locations", "registry.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

const doc = JSON.parse(readFileSync(REGISTRY, "utf8"));
const registry = doc.locations;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildQuery(loc) {
  if (QUERY_OVERRIDES[loc.slug]) return QUERY_OVERRIDES[loc.slug];
  // London districts are ambiguous nationally; anchor them to London.
  if (loc.kind === "london-area") return `${loc.name}, London, United Kingdom`;
  return `${loc.name}, United Kingdom`;
}

const targets = registry.filter((l) => {
  if (only && !only.has(l.slug)) return false;
  if (l.lat != null && l.lng != null) return false;
  return true;
});

// A county centroid is not a training location. Seeding one would let the
// parkrun radius emit "parkruns near the middle of Kent", which is worse
// than no data. Counties need their own page model, not a fake centre.
const counties = targets.filter((l) => l.kind === "county");
const geocodable = targets.filter((l) => l.kind !== "county");

console.log(
  `${targets.length} location(s) without coordinates: ` +
    `${geocodable.length} geocodable, ${counties.length} county skipped ` +
    `(${counties.map((c) => c.slug).join(", ")}).`,
);

const resolved = [];
const unresolved = [];

for (const [i, loc] of geocodable.entries()) {
  const q = buildQuery(loc);
  // Ask for several candidates and take the first that is actually a place.
  // The top hit is often a railway station sharing the district's name —
  // "Stratford, London" ranks the station above the suburb.
  const url =
    `${ENDPOINT}?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;

  let candidates;
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    candidates = await res.json();
  } catch (e) {
    unresolved.push({ slug: loc.slug, q, why: `request failed (${e.message})` });
    await sleep(THROTTLE_MS);
    continue;
  }

  const inUk = (lat, lng) =>
    lat >= UK_BOUNDS.minLat && lat <= UK_BOUNDS.maxLat &&
    lng >= UK_BOUNDS.minLng && lng <= UK_BOUNDS.maxLng;

  const hit = candidates.find(
    (c) =>
      (c.class === "place" || OK_TYPES.has(c.type)) &&
      inUk(Number(c.lat), Number(c.lon)),
  );

  if (!candidates.length) {
    unresolved.push({ slug: loc.slug, q, why: "no match" });
  } else if (!hit) {
    const top = candidates[0];
    unresolved.push({
      slug: loc.slug,
      q,
      why:
        `no candidate was a UK place; best was ${top.class}/${top.type} — ` +
        top.display_name,
    });
  } else {
    loc.lat = Number(Number(hit.lat).toFixed(4));
    loc.lng = Number(Number(hit.lon).toFixed(4));
    resolved.push({
      slug: loc.slug,
      lat: loc.lat,
      lng: loc.lng,
      name: hit.display_name,
    });
  }

  process.stdout.write(
    `\r  geocoding ${i + 1}/${geocodable.length} … ${loc.slug.padEnd(20)}`,
  );
  await sleep(THROTTLE_MS);
}

console.log("\n");
console.log(`Resolved ${resolved.length}:`);
for (const r of resolved)
  console.log(`  ${r.slug.padEnd(18)} ${String(r.lat).padStart(8)}, ${String(r.lng).padStart(9)}  ${r.name}`);

if (unresolved.length) {
  console.log(`\nUnresolved ${unresolved.length} — left without coordinates, resolve by hand:`);
  for (const u of unresolved) console.log(`  ${u.slug.padEnd(18)} "${u.q}" — ${u.why}`);
}

if (!dryRun && resolved.length) {
  doc.coordinateSource =
    "Nominatim (OpenStreetMap), https://nominatim.openstreetmap.org/ — " +
    "town/city centroids, 4dp. Counties deliberately have none.";
  writeFileSync(REGISTRY, JSON.stringify(doc, null, 2) + "\n");
  console.log(`\nWrote ${resolved.length} coordinate pair(s) to registry.json.`);
  console.log("Now run: node scripts/seed-parkruns.mjs && node scripts/validate-locations.mjs");
} else if (dryRun) {
  console.log("\n[dry run] registry.json untouched.");
}
