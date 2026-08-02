/**
 * Seed the gym layer for every location from OpenStreetMap.
 *
 * growth-plan.md open question 1b called this blocked: the HYROX club
 * directory and HyroxVault both 403, and no chain publishes a machine-readable
 * locator. That is true of the chains. It is not true of OpenStreetMap, which
 * aggregates them and is free.
 *
 * Source: Overpass API over OSM data, licensed ODbL. Attribution is required
 * and is rendered on every page that shows these records.
 *
 * One request, not 879. The first version of this script queried a bounding
 * box per town and took 40-plus seconds each, which is ten hours for the
 * country. Overpass will return every gym in the UK in a single 34-second
 * call, so it does that and assigns them to towns locally by distance.
 *
 * Tags kept: name, leisure class, brand/operator, website. Everything carries
 * its source and the date it was read, per the enrichment contract in
 * lib/locations/types.ts. Nothing is inferred.
 *
 * What this does NOT establish is whether a gym holds a sled, a ski erg or a
 * wall-ball target. OSM does not record it, so the equipment matrix stays
 * empty rather than guessed, and the page says so.
 *
 * Run: node scripts/seed-gyms.mjs [--radius-km 8] [--refetch]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const DATA_DIR = path.join(process.cwd(), "data", "locations");
const ENRICH_DIR = path.join(DATA_DIR, "enrichment");
const CACHE = path.join(os.tmpdir(), "suth-uk-gyms.json");
const ENDPOINT = "https://overpass-api.de/api/interpreter";
const TODAY = new Date().toISOString().slice(0, 10);
const SOURCE = "https://www.openstreetmap.org/copyright (via Overpass API)";

const argR = process.argv.indexOf("--radius-km");
const RADIUS_KM = argR > -1 ? Number(process.argv[argR + 1]) : 8;
const REFETCH = process.argv.includes("--refetch");
/** Cap per town. Twelve render; the rest inform the count and the FAQ. */
const MAX_PER_TOWN = 20;

const UK_QUERY = `[out:json][timeout:600];
(node["leisure"~"^(fitness_centre|sports_centre)$"](49.8,-8.7,61.0,1.8);
 way["leisure"~"^(fitness_centre|sports_centre)$"](49.8,-8.7,61.0,1.8););
out center tags;`;

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

// ── Fetch the whole country once ─────────────────────────────────────
let raw;
if (!REFETCH && existsSync(CACHE)) {
  console.log(`Using cached ${CACHE}`);
  raw = JSON.parse(readFileSync(CACHE, "utf8"));
} else {
  console.log("Fetching every UK gym and sports centre from Overpass …");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "user-agent": "SuthPerformance/1.0 (+https://suthperformance.com)",
    },
    body: new URLSearchParams({ data: UK_QUERY }),
  });
  if (!res.ok) {
    console.error(`Overpass returned HTTP ${res.status}. Nothing written.`);
    process.exit(1);
  }
  const text = await res.text();
  writeFileSync(CACHE, text);
  raw = JSON.parse(text);
}

const CLASSIFY = { fitness_centre: "gym", sports_centre: "sports-centre" };

/* A chain is a name that recurs across the country, not whatever sits in the
   operator tag. OSM frequently sets operator to the single club that runs a
   site ("Kendal Rugby Club"), which is not useful to a reader deciding whether
   an existing membership travels. Count first, then decide. */
const brandCount = new Map();
for (const el of raw.elements ?? []) {
  const t = el.tags ?? {};
  const b = t.brand || t.operator;
  if (b) brandCount.set(b.trim(), (brandCount.get(b.trim()) ?? 0) + 1);
}
const CHAIN_MIN_SITES = 5;
const isChain = (b) =>
  Boolean(b) && (brandCount.get(b.trim()) ?? 0) >= CHAIN_MIN_SITES;

const sites = [];
for (const el of raw.elements ?? []) {
  const t = el.tags ?? {};
  if (!t.name) continue;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (lat == null || lng == null) continue;
  sites.push({
    name: t.name.trim(),
    type: CLASSIFY[t.leisure] ?? "gym",
    chain: isChain(t.brand || t.operator)
      ? (t.brand || t.operator).trim()
      : undefined,
    website: t.website || t["contact:website"] || undefined,
    lat,
    lng,
  });
}
console.log(`${sites.length} named sites in the feed.`);
console.log(`${[...brandCount.values()].filter((n) => n >= CHAIN_MIN_SITES).length} names recur on ${CHAIN_MIN_SITES}+ sites and count as chains.`);

/* Bucket by a coarse grid so each town only compares against nearby sites.
   A degree of latitude is ~111 km, so 0.1 deg cells are ~11 km: with an 8 km
   radius, checking the 3x3 block around a town is always sufficient. */
const CELL = 0.1;
const grid = new Map();
const key = (la, ln) => `${Math.floor(la / CELL)}:${Math.floor(ln / CELL)}`;
for (const s of sites) {
  const k = key(s.lat, s.lng);
  if (!grid.has(k)) grid.set(k, []);
  grid.get(k).push(s);
}

// ── Assign ───────────────────────────────────────────────────────────
const registry = JSON.parse(
  readFileSync(path.join(DATA_DIR, "registry.json"), "utf8"),
).locations;
mkdirSync(ENRICH_DIR, { recursive: true });

let withGyms = 0;
let totalRecords = 0;
let none = 0;
let widened = 0;

for (const loc of registry) {
  if (loc.lat == null || loc.lng == null) continue;
  const here = { lat: loc.lat, lng: loc.lng };
  const ci = Math.floor(loc.lat / CELL);
  const cj = Math.floor(loc.lng / CELL);

  const near = [];
  const span = 2; // 5x5 cells ~ 55 km, enough for the widened sweep
  for (let i = ci - span; i <= ci + span; i++) {
    for (let j = cj - span; j <= cj + span; j++) {
      const bucket = grid.get(`${i}:${j}`);
      if (bucket) near.push(...bucket);
    }
  }

  /* Rural towns come back empty at 8 km. Widening for everyone would pull a
     city's gyms onto a village page, so the wider search only runs when the
     tight one found nothing, and the page says how far out it had to look. */
  const collect = (radius) => {
    const seenLocal = new Set();
    const out = [];
    for (const s of near) {
      const d = haversineKm(here, s);
      if (d > radius) continue;
      const k = s.name.toLowerCase();
      if (seenLocal.has(k)) continue;
      seenLocal.add(k);
      out.push({
        name: s.name,
        type: s.type,
        chain: s.chain,
        website: s.website,
        distanceKm: Number(d.toFixed(1)),
        source: SOURCE,
        verifiedOn: TODAY,
      });
    }
    return out;
  };

  const seen = new Set();
  const gyms = [];
  for (const s of near) {
    const d = haversineKm(here, s);
    if (d > RADIUS_KM) continue;
    const k = s.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    gyms.push({
      name: s.name,
      type: s.type,
      chain: s.chain,
      website: s.website,
      distanceKm: Number(d.toFixed(1)),
      source: SOURCE,
      verifiedOn: TODAY,
    });
  }
  gyms.sort((a, b) => a.distanceKm - b.distanceKm);

  // Nothing within the tight radius: widen once rather than ship a blank page.
  const finalGyms = gyms.length ? gyms : collect(RADIUS_KM * 2.5).sort((a, b) => a.distanceKm - b.distanceKm);

  const file = path.join(ENRICH_DIR, `${loc.slug}.json`);
  const existing = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : { slug: loc.slug };

  if (finalGyms.length) {
    existing.gyms = {
      ...(existing.gyms ?? {}),
      equippedGyms: finalGyms.slice(0, MAX_PER_TOWN),
    };
    withGyms++;
    totalRecords += Math.min(finalGyms.length, MAX_PER_TOWN);
    if (!gyms.length) widened++;
  } else {
    none++;
    if (existing.gyms) delete existing.gyms.equippedGyms;
  }
  writeFileSync(file, JSON.stringify(existing, null, 2) + "\n");
}

console.log("");
console.log(`radius            : ${RADIUS_KM} km`);
console.log(`towns with gyms   : ${withGyms}`);
console.log(`widened to ${RADIUS_KM * 2.5} km : ${widened}`);
console.log(`towns with none   : ${none}`);
console.log(`total gym records : ${totalRecords}`);
