/**
 * Focus cities: markets we target that are not on the HYROX race calendar.
 *
 * Kieron's directive of 3 August 2026 names Dubai as a priority. Dubai is not
 * in data/hyrox/races.normalised.json — HYROX's own event sitemap carries no
 * UAE race — so it cannot come through scripts/build-race-cities.mjs, which
 * builds a city only where a race exists.
 *
 * That absence is a fact about our source, not a fact about the world, and the
 * page says so in those terms rather than either inventing a Dubai race or
 * asserting that none has ever happened.
 *
 * Sources:
 *   https://nominatim.openstreetmap.org/    (coordinates)
 *   https://overpass-api.de/                (gyms, ODbL, attributed on-page)
 *
 * Run: node scripts/build-focus-cities.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "locations", "focus-cities.json");
const ENRICH_DIR = path.join(ROOT, "data", "locations", "enrichment-focus");
const TODAY = new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes("--dry-run");

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS = "https://overpass-api.de/api/interpreter";
const UA = "SuthPerformance-LocationDB/1.0 (kieron.hawke@googlemail.com)";
const SOURCE = "https://www.openstreetmap.org/copyright (via Overpass API)";
/** Dubai sprawls; 8 km around the centre would miss Dubai Marina entirely. */
const RADIUS_KM = 18;
const MAX_PER_CITY = 24;

const CITIES = [
  {
    slug: "dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    countrySlug: "united-arab-emirates",
    continent: "Asia",
    query: "Dubai, United Arab Emirates",
    /** Marks the city as carrying the in-person VIP offer. */
    vip: true,
  },
];

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

mkdirSync(ENRICH_DIR, { recursive: true });
const out = [];

for (const city of CITIES) {
  // ── Coordinates ────────────────────────────────────────────────────
  await sleep(1100);
  const res = await fetch(
    `${NOMINATIM}?q=${encodeURIComponent(city.query)}&format=json&limit=1`,
    { headers: { "user-agent": UA } },
  );
  if (!res.ok) {
    console.error(`${city.slug}: Nominatim HTTP ${res.status}. Skipped.`);
    continue;
  }
  const hit = (await res.json())[0];
  if (!hit) {
    console.error(`${city.slug}: unresolved. Skipped rather than guessed.`);
    continue;
  }
  const lat = Number(Number(hit.lat).toFixed(4));
  const lng = Number(Number(hit.lon).toFixed(4));
  console.log(`${city.slug}: ${lat}, ${lng} — ${hit.display_name.slice(0, 60)}`);

  // ── Gyms ───────────────────────────────────────────────────────────
  const metres = Math.round(RADIUS_KM * 1000);
  const query = `[out:json][timeout:300];
(
 node["leisure"~"^(fitness_centre|sports_centre)$"](around:${metres},${lat},${lng});
 way["leisure"~"^(fitness_centre|sports_centre)$"](around:${metres},${lat},${lng});
);
out center tags;`;

  const gres = await fetch(OVERPASS, {
    method: "POST",
    headers: { "user-agent": "SuthPerformance/1.0 (+https://suthperformance.com)" },
    body: new URLSearchParams({ data: query }),
  });
  if (!gres.ok) {
    console.error(`${city.slug}: Overpass HTTP ${gres.status}. No gym layer.`);
    out.push({ ...city, lat, lng, source: NOMINATIM, verifiedOn: TODAY });
    continue;
  }
  const raw = await gres.json();

  const brand = new Map();
  for (const el of raw.elements ?? []) {
    const b = (el.tags?.brand || el.tags?.operator || "").trim();
    if (b) brand.set(b, (brand.get(b) ?? 0) + 1);
  }
  const CLASSIFY = { fitness_centre: "gym", sports_centre: "sports-centre" };
  const seen = new Set();
  const gyms = [];
  for (const el of raw.elements ?? []) {
    const t = el.tags ?? {};
    if (!t.name) continue;
    const glat = el.lat ?? el.center?.lat;
    const glng = el.lon ?? el.center?.lon;
    if (glat == null || glng == null) continue;
    const k = t.name.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    const b = (t.brand || t.operator || "").trim();
    gyms.push({
      name: t.name.trim(),
      type: CLASSIFY[t.leisure] ?? "gym",
      chain: b && (brand.get(b) ?? 0) >= 3 ? b : undefined,
      website: t.website || t["contact:website"] || undefined,
      distanceKm: Number(haversineKm({ lat, lng }, { lat: glat, lng: glng }).toFixed(1)),
      source: SOURCE,
      verifiedOn: TODAY,
    });
  }
  gyms.sort((a, b) => a.distanceKm - b.distanceKm);
  console.log(`${city.slug}: ${gyms.length} named sites within ${RADIUS_KM} km.`);

  if (!dryRun) {
    const file = path.join(ENRICH_DIR, `${city.slug}.json`);
    const existing = existsSync(file)
      ? JSON.parse(readFileSync(file, "utf8"))
      : { slug: city.slug };
    existing.gyms = { equippedGyms: gyms.slice(0, MAX_PER_CITY) };
    writeFileSync(file, JSON.stringify(existing, null, 2) + "\n");
  }

  out.push({
    ...city,
    lat,
    lng,
    gymCount: Math.min(gyms.length, MAX_PER_CITY),
    source: NOMINATIM,
    verifiedOn: TODAY,
  });
}

if (dryRun) {
  console.log("\n--dry-run: nothing written.");
} else {
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: TODAY,
        note:
          "Markets we target that carry no HYROX race. Generated by " +
          "scripts/build-focus-cities.mjs. Do not edit by hand.",
        cities: out,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(ROOT, OUT)} (${out.length} cities)`);
}
