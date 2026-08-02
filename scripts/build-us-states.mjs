/**
 * Builds the US state catalogue: every state, its largest cities, and the
 * HYROX races held in it.
 *
 * Kieron's directive of 3 August 2026: the USA is a priority market and wants
 * state-level pages, properly optimised and genuinely useful.
 *
 * THE THIN-CONTENT PROBLEM, AND WHY THIS SOURCES SO MUCH
 *
 * Only 13 states have ever hosted a HYROX. Fifty state pages built from a
 * template plus a state name would be 37 pages with nothing on them, which is
 * precisely the scaled-content shape docs/strategy/rules/uniqueness-validator.md
 * exists to prevent, and it is what gets a domain penalised rather than ranked.
 *
 * So every state carries facts that are true only of that state:
 *   - its largest cities, with real populations, from GeoNames
 *   - the races held there, with real venues and dates, from hyrox.com
 *   - for a state with no race, the nearest one and how far it actually is,
 *     computed from coordinates and labelled as straight-line
 *   - gyms in its main metros, seeded separately by scripts/seed-gyms-us.mjs
 *
 * Sources, in the order they are used:
 *   https://download.geonames.org/export/dump/US.zip                (cities)
 *   https://download.geonames.org/export/dump/admin1CodesASCII.txt  (state names)
 *   data/hyrox/races.normalised.json                                (races)
 *   data/hyrox/races.geocoded.json                                  (coordinates)
 *
 * State names come from GeoNames rather than a typed list for the same reason
 * the UK town names do: a typed list is a place for a mistake to hide, and
 * there is no reason to introduce one when the feed already carries them.
 *
 * Run: node scripts/build-us-states.mjs [--dry-run] [--min-pop 30000]
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const CITIES_URL = "https://download.geonames.org/export/dump/US.zip";
const ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "locations", "us-states.json");
const RACES = path.join(ROOT, "data", "hyrox", "races.normalised.json");
const GEO = path.join(ROOT, "data", "hyrox", "races.geocoded.json");

const TODAY = new Date().toISOString().slice(0, 10);
const dryRun = process.argv.includes("--dry-run");
const minPopArg = process.argv.indexOf("--min-pop");
/** Population floor for a city to appear on its state page. */
const MIN_POP = minPopArg > -1 ? Number(process.argv[minPopArg + 1]) : 30000;
/** How many cities a state page lists. */
const CITIES_PER_STATE = 12;
/** How many metros get a gym layer. Seeded by scripts/seed-gyms-us.mjs. */
const METROS_PER_STATE = 3;

/**
 * Territories GeoNames files under US that are not states and that nobody
 * searches "personal trainer <name>" for in the sense this page family means.
 * DC is deliberately kept: it is a real market with a real race nearby.
 */
const NOT_A_STATE = new Set([
  "AS", // American Samoa
  "GU", // Guam
  "MP", // Northern Mariana Islands
  "PR", // Puerto Rico
  "UM", // US Minor Outlying Islands
  "VI", // US Virgin Islands
]);

/**
 * Race cities HYROX names differently from GeoNames. Each one is checked by
 * hand against the venue address in the source data before it goes in here,
 * because an alias is a claim that two names are the same place.
 */
const RACE_CITY_ALIASES = {
  // HYROX writes "Washington D.C."; GeoNames files the city as "Washington"
  // under admin1 DC. The venue address confirms the District.
  "washington-d-c": "washington",
};

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

// ── Fetch ────────────────────────────────────────────────────────────
const tmp = path.join(os.tmpdir(), "suth-geonames-us");
mkdirSync(tmp, { recursive: true });
const zip = path.join(tmp, "US.zip");
const txt = path.join(tmp, "US.txt");
const admin1 = path.join(tmp, "admin1CodesASCII.txt");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";

if (!existsSync(txt)) {
  console.log(`Fetching ${CITIES_URL} …`);
  const res = await fetch(CITIES_URL, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.error(`Feed fetch failed: HTTP ${res.status}. Nothing written.`);
    process.exit(1);
  }
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync("unzip", ["-o", "-q", zip, "-d", tmp]);
}

if (!existsSync(admin1)) {
  console.log(`Fetching ${ADMIN1_URL} …`);
  const res = await fetch(ADMIN1_URL, { headers: { "user-agent": UA } });
  if (!res.ok) {
    console.error(`admin1 fetch failed: HTTP ${res.status}. Nothing written.`);
    process.exit(1);
  }
  writeFileSync(admin1, await res.text());
}

// ── State names, from the feed rather than a typed list ──────────────
const stateName = new Map();
for (const line of readFileSync(admin1, "utf8").split("\n")) {
  const [code, name] = line.split("\t");
  if (!code?.startsWith("US.")) continue;
  stateName.set(code.slice(3), name);
}
console.log(`${stateName.size} US admin1 entries in the feed.`);

// ── Cities ───────────────────────────────────────────────────────────
/**
 * GeoNames columns: geonameid, name, asciiname, alternatenames, lat, lng,
 * feature class, feature code, country, cc2, admin1, admin2, …, population.
 */
const byState = new Map();
let considered = 0;

for (const line of readFileSync(txt, "utf8").split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  const [, name, , , lat, lng, fclass, fcode, , , adm1] = f;
  const population = Number(f[14] || 0);
  if (fclass !== "P") continue; // populated places only
  if (!fcode?.startsWith("PPL")) continue;
  // PPLX is a section of a city; it double-counts the city it sits inside.
  if (fcode === "PPLX") continue;
  if (population < MIN_POP) continue;
  if (!adm1 || NOT_A_STATE.has(adm1)) continue;
  if (!stateName.has(adm1)) continue;
  considered++;

  if (!byState.has(adm1)) byState.set(adm1, []);
  byState.get(adm1).push({
    slug: slugify(name),
    name,
    lat: Number(Number(lat).toFixed(4)),
    lng: Number(Number(lng).toFixed(4)),
    populationK: Math.round(population / 1000),
  });
}
console.log(`${considered} US places at or above ${MIN_POP.toLocaleString("en-GB")} people.`);

// ── Races, by state ──────────────────────────────────────────────────
const races = (() => {
  const d = JSON.parse(readFileSync(RACES, "utf8"));
  return (Array.isArray(d) ? d : d.races).filter(
    (r) => r.country === "United States",
  );
})();
const geo = JSON.parse(readFileSync(GEO, "utf8"));

/**
 * A race carries a city and a country but no state, so the state is resolved
 * by finding the city in the GeoNames set. Matching on name alone would put
 * Portland in Maine as often as Oregon, so the geocoded race coordinates pick
 * the nearest same-named city, and an unmatched race is reported rather than
 * guessed into a state.
 */
const unmatchedRaces = [];
const racesByState = new Map();

for (const r of races) {
  const raw = slugify(r.city);
  const wanted = RACE_CITY_ALIASES[raw] ?? raw;
  const cityCoords = geo.cities[raw];
  let best = null;
  let bestKm = Infinity;

  for (const [code, cities] of byState) {
    for (const c of cities) {
      if (c.slug !== wanted) continue;
      if (!cityCoords || cityCoords.lat == null) {
        if (!best) best = { code, city: c };
        continue;
      }
      const km = haversineKm(cityCoords, c);
      if (km < bestKm) {
        bestKm = km;
        best = { code, city: c };
      }
    }
  }

  if (!best || (bestKm !== Infinity && bestKm > 60)) {
    unmatchedRaces.push(`${r.slug} — ${r.city}`);
    continue;
  }
  if (!racesByState.has(best.code)) racesByState.set(best.code, []);
  const v = geo.venues[r.slug] ?? {};
  racesByState.get(best.code).push({
    slug: r.slug,
    name: r.name,
    city: r.city,
    citySlug: raw,
    venue: r.venue,
    venueName: r.venueName,
    venueAnnounced: v.announced !== false,
    lat: v.lat ?? cityCoords?.lat ?? null,
    lng: v.lng ?? cityCoords?.lng ?? null,
    startDate: r.startDate,
    endDate: r.endDate,
    sourceUrl: r.sourceUrl,
  });
}

// ── Assemble ─────────────────────────────────────────────────────────
/** Every US race, with coordinates, for the nearest-race computation. */
const allUsRaces = [...racesByState.values()].flat();

const states = [];
for (const [code, cities] of byState) {
  cities.sort((a, b) => b.populationK - a.populationK);
  const top = cities.slice(0, CITIES_PER_STATE);
  const inState = (racesByState.get(code) ?? []).sort((a, b) =>
    String(a.startDate).localeCompare(String(b.startDate)),
  );

  /* The anchor for "how far is the nearest race" is the state's largest city,
     not a centroid: nobody lives at the centroid of Nevada, and the honest
     answer to a Nevadan is measured from Las Vegas. */
  const anchor = top[0];
  let nearest = null;
  if (!inState.length && anchor) {
    let bestKm = Infinity;
    for (const r of allUsRaces) {
      if (r.lat == null) continue;
      const km = haversineKm(anchor, r);
      if (km < bestKm) {
        bestKm = km;
        nearest = { ...r, straightLineKm: Math.round(km), fromCity: anchor.name };
      }
    }
  }

  states.push({
    code,
    slug: slugify(stateName.get(code)),
    name: stateName.get(code),
    citiesTracked: cities.length,
    /** Cities the page lists, largest first. */
    cities: top,
    /** The metros that get a gym layer. */
    metros: top.slice(0, METROS_PER_STATE).map((c) => c.slug),
    races: inState,
    nearestRace: nearest,
  });
}

states.sort((a, b) => a.name.localeCompare(b.name));

// ── Report ───────────────────────────────────────────────────────────
const withRaces = states.filter((s) => s.races.length);
console.log(`\n${states.length} states and territories kept.`);
console.log(`${withRaces.length} host a race: ${withRaces.map((s) => s.name).join(", ")}`);
console.log(`${states.length - withRaces.length} carry a nearest-race answer instead.`);
console.log(
  `${states.reduce((n, s) => n + s.cities.length, 0)} cities listed, ` +
    `${states.reduce((n, s) => n + s.metros.length, 0)} metros to seed gyms for.`,
);
if (unmatchedRaces.length) {
  console.log(`\n${unmatchedRaces.length} races could not be placed in a state:`);
  for (const u of unmatchedRaces) console.log(`  - ${u}`);
}

const thin = states.filter((s) => s.cities.length < 3);
if (thin.length) {
  console.log(
    `\n${thin.length} states have fewer than 3 cities above the floor: ` +
      thin.map((s) => `${s.name} (${s.cities.length})`).join(", "),
  );
}

if (dryRun) {
  console.log("\n--dry-run: nothing written.");
} else {
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: TODAY,
        minPopulation: MIN_POP,
        note:
          "Generated by scripts/build-us-states.mjs from GeoNames and the " +
          "HYROX race calendar. Do not edit by hand.",
        sources: {
          cities: CITIES_URL,
          stateNames: ADMIN1_URL,
          races: "https://hyrox.com/ (event-sitemap.xml)",
        },
        states,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(ROOT, OUT)}`);
}
