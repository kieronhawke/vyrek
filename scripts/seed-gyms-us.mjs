/**
 * Seeds the gym layer for the US state metros from OpenStreetMap.
 *
 * The sibling script, scripts/seed-gyms.mjs, pulls every gym in Great Britain
 * in one 34-second Overpass call and assigns them to towns locally. That works
 * because the UK is one small bounding box. The race cities are spread across
 * 36 countries, so "one box" is the whole planet, which Overpass will rightly
 * refuse. This queries a radius around each city instead, batched so the
 * request count stays in the tens rather than the hundreds.
 *
 * Source: Overpass API over OSM data, licensed ODbL. Attribution is required
 * and is rendered on every page that shows these records.
 *
 * Output goes to data/locations/enrichment-intl/, NOT the UK enrichment
 * directory. scripts/validate-locations.mjs walks the UK registry and treats an
 * enrichment file with no matching registry row as an orphan, which is a check
 * worth keeping rather than working around.
 *
 * What this does NOT establish is whether a gym holds a sled, a ski erg or a
 * wall-ball target. OSM does not record it, so the equipment matrix stays empty
 * rather than guessed, and the page says so.
 *
 * Run: node scripts/seed-gyms-intl.mjs [--radius-km 10] [--batch 8] [--only=paris]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STATES = path.join(ROOT, "data", "locations", "us-states.json");
const ENRICH_DIR = path.join(ROOT, "data", "locations", "enrichment-us");
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const TODAY = new Date().toISOString().slice(0, 10);
const SOURCE = "https://www.openstreetmap.org/copyright (via Overpass API)";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};
/* Wider than the UK's 8 km: these are capital cities and metro areas, where
   the gym a reader actually uses is routinely further out than it would be in
   an English market town. */
const RADIUS_KM = arg("--radius-km", 10);
const BATCH = arg("--batch", 8);
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const only = onlyArg ? new Set(onlyArg.slice("--only=".length).split(",")) : null;

/** Cap per city. Twelve render; the rest inform the count and the FAQ. */
const MAX_PER_CITY = 20;
/** Overpass asks for a pause between heavy queries. */
const PAUSE_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* One entry per metro, keyed `<state>__<city>` so two states with a Springfield
   do not overwrite each other's gym file. */
const cities = JSON.parse(readFileSync(STATES, "utf8")).states.flatMap((st) =>
  st.cities
    .filter((c) => st.metros.includes(c.slug))
    .map((c) => ({ ...c, slug: `${st.slug}__${c.slug}`, state: st.name })),
).filter((c) => (!only || only.has(c.slug)) && c.lat != null);

console.log(
  `${cities.length} cities, ${RADIUS_KM} km radius, ${BATCH} per request.\n`,
);

mkdirSync(ENRICH_DIR, { recursive: true });

const metres = Math.round(RADIUS_KM * 1000);
const allSites = new Map(); // city slug -> sites[]

/* Overpass answers a big multi-city query with a 504 often enough that a
   single pass leaves a third of the cities blank. A failed batch is split in
   half and re-queued rather than dropped, down to a single city, so the run
   finishes with one consistent chain table instead of needing a second pass
   whose chain counts would disagree with the first. */
const queue = [];
for (let i = 0; i < cities.length; i += BATCH) {
  queue.push(cities.slice(i, i + BATCH));
}
const failed = [];
let done = 0;

while (queue.length) {
  const batch = queue.shift();
  const clauses = batch
    .map(
      (c) =>
        ` node["leisure"~"^(fitness_centre|sports_centre)$"](around:${metres},${c.lat},${c.lng});\n` +
        ` way["leisure"~"^(fitness_centre|sports_centre)$"](around:${metres},${c.lat},${c.lng});`,
    )
    .join("\n");
  const query = `[out:json][timeout:300];\n(\n${clauses}\n);\nout center tags;`;

  const label = batch.map((c) => c.slug).join(", ");
  process.stdout.write(
    `[${String(++done).padStart(3)}, ${String(queue.length).padStart(2)} queued] ${label.slice(0, 52)} … `,
  );

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "user-agent": "SuthPerformance/1.0 (+https://suthperformance.com)",
    },
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) {
    if (batch.length > 1) {
      const half = Math.ceil(batch.length / 2);
      queue.unshift(batch.slice(0, half), batch.slice(half));
      console.log(`HTTP ${res.status} — split into ${half} + ${batch.length - half}`);
    } else {
      failed.push(batch[0].slug);
      console.log(`HTTP ${res.status} — giving up on ${batch[0].slug}`);
    }
    await sleep(PAUSE_MS * 3);
    continue;
  }
  const raw = await res.json();
  const elements = raw.elements ?? [];
  console.log(`${elements.length} elements`);

  /* Assign each site to the nearest city in THIS batch. A single Overpass
     response covers eight scattered cities, so a site has to be placed rather
     than assumed — and a site outside every radius is dropped, not clamped. */
  for (const el of elements) {
    const t = el.tags ?? {};
    if (!t.name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;

    let best = null;
    let bestKm = Infinity;
    for (const c of batch) {
      const d = haversineKm({ lat, lng }, { lat: c.lat, lng: c.lng });
      if (d < bestKm) {
        bestKm = d;
        best = c;
      }
    }
    if (!best || bestKm > RADIUS_KM) continue;

    if (!allSites.has(best.slug)) allSites.set(best.slug, []);
    allSites.get(best.slug).push({
      name: t.name.trim(),
      leisure: t.leisure,
      brand: (t.brand || t.operator || "").trim() || undefined,
      website: t.website || t["contact:website"] || undefined,
      distanceKm: Number(bestKm.toFixed(1)),
    });
  }

  await sleep(PAUSE_MS);
}

/* A chain is a name that recurs across cities, not whatever sits in the
   operator tag: OSM routinely sets operator to the single club that runs a
   site, which tells a reader nothing about whether their membership travels.
   Count across the whole set first, then decide. */
const brandCount = new Map();
for (const sites of allSites.values()) {
  for (const s of sites) {
    if (s.brand) brandCount.set(s.brand, (brandCount.get(s.brand) ?? 0) + 1);
  }
}
const CHAIN_MIN_SITES = 4;
const isChain = (b) => Boolean(b) && (brandCount.get(b) ?? 0) >= CHAIN_MIN_SITES;

const CLASSIFY = { fitness_centre: "gym", sports_centre: "sports-centre" };

let withGyms = 0;
let none = [];
let total = 0;

for (const c of cities) {
  const sites = allSites.get(c.slug) ?? [];
  const seen = new Set();
  const gyms = [];
  for (const s of sites.sort((a, b) => a.distanceKm - b.distanceKm)) {
    const k = s.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    gyms.push({
      name: s.name,
      type: CLASSIFY[s.leisure] ?? "gym",
      chain: isChain(s.brand) ? s.brand : undefined,
      website: s.website,
      distanceKm: s.distanceKm,
      source: SOURCE,
      verifiedOn: TODAY,
    });
  }

  const file = path.join(ENRICH_DIR, `${c.slug}.json`);
  const existing = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { slug: c.slug };

  if (gyms.length) {
    existing.gyms = { equippedGyms: gyms.slice(0, MAX_PER_CITY) };
    withGyms++;
    total += Math.min(gyms.length, MAX_PER_CITY);
  } else {
    none.push(c.slug);
    delete existing.gyms;
  }
  writeFileSync(file, JSON.stringify(existing, null, 2) + "\n");
}

console.log("");
console.log(`cities with gyms  : ${withGyms}/${cities.length}`);
console.log(`total gym records : ${total}`);
console.log(
  `chains (${CHAIN_MIN_SITES}+ sites) : ${[...brandCount.values()].filter((n) => n >= CHAIN_MIN_SITES).length}`,
);
if (none.length) console.log(`no gym data       : ${none.join(", ")}`);
if (failed.length) {
  console.log(
    `\n${failed.length} cities Overpass would not answer even alone: ${failed.join(", ")}`,
  );
  console.log("Re-run with --only=<slugs> once it is less busy.");
}
