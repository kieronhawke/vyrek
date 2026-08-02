/**
 * Geocodes the HYROX race calendar: every host city, and every race venue.
 *
 * data/hyrox/races.normalised.json carries 113 real races scraped from
 * hyrox.com, with a venue address string but no coordinates. Coordinates are
 * what turn that list into a data layer: they place a city on the map so the
 * gym search has a centre, and they let a location page say how far the
 * nearest race actually is.
 *
 * Source: Nominatim, the OpenStreetMap geocoder.
 *   https://nominatim.openstreetmap.org/
 * Its usage policy caps automated use at 1 request/second and requires a real
 * user-agent with contact details. Both are honoured below. This is a manual,
 * occasional data job, NOT part of the build — the build must never hit the
 * network.
 *
 *   node scripts/seed-race-geo.mjs --dry-run    # print, write nothing
 *   node scripts/seed-race-geo.mjs              # write races.geocoded.json
 *   node scripts/seed-race-geo.mjs --only=paris,tokyo
 *
 * Two passes, because they answer different questions:
 *
 *   city   — "Tokyo, Japan" resolved to a place, which is the centroid the
 *            location page and its gym search are built around.
 *   venue  — the full address line, which is where the race is actually held.
 *            Falls back to nothing, never to the city: a venue silently
 *            standing in for a city centroid would make "12 km from you" a
 *            number about the wrong place.
 *
 * Nothing is invented. A city the geocoder cannot resolve to a settlement is
 * written with null coordinates and listed for a human, which is the correct
 * outcome under hard rule 1 in data/locations/README.md.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "SuthPerformance-LocationDB/1.0 (kieron.hawke@googlemail.com)";
/** Nominatim's published limit is 1 req/sec. Sit comfortably under it. */
const THROTTLE_MS = 1100;
const TODAY = new Date().toISOString().slice(0, 10);

const ROOT = process.cwd();
const RACES = path.join(ROOT, "data", "hyrox", "races.normalised.json");
const OUT = path.join(ROOT, "data", "hyrox", "races.geocoded.json");

/**
 * Nominatim place classes we accept for a city. Anything else (a shop, a
 * building, a road) means the query matched the wrong kind of thing.
 */
const OK_CITY_TYPES = new Set([
  "city",
  "town",
  "village",
  "municipality",
  "suburb",
  "quarter",
  "borough",
  "administrative",
  "island",
  "state",
  "province",
  "region",
]);

/**
 * Cities whose bare "name, country" resolves to the wrong place, or to
 * nothing. Each one was checked by hand against the venue address in the
 * source data.
 */
const CITY_OVERRIDES = {
  // The race is in Washington, the district, not Washington state.
  "washington-d-c": "Washington, District of Columbia, United States",
  // Tenerife is an island; the race is at the Santa Cruz trade fair site.
  tenerife: "Santa Cruz de Tenerife, Canary Islands, Spain",
  // Miami Beach is its own city, distinct from Miami.
  "miami-beach": "Miami Beach, Florida, United States",
  // Chiba is a city near Tokyo, and also a prefecture. Want the city.
  chiba: "Chiba, Chiba Prefecture, Japan",
  // Gent is the Dutch spelling; Nominatim ranks Ghent higher.
  gent: "Ghent, East Flanders, Belgium",
  // Disambiguate from Cologne, Minnesota.
  cologne: "Köln, North Rhine-Westphalia, Germany",
  // Several Bari-named places; want the Puglian city.
  bari: "Bari, Apulia, Italy",
  // Sanya is on Hainan island.
  sanya: "Sanya, Hainan, China",
  // Incheon is a metropolitan city west of Seoul.
  incheon: "Incheon, South Korea",
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg
  ? new Set(onlyArg.slice("--only=".length).split(","))
  : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Slug that survives accents and non-Latin punctuation. */
export function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function geocode(query, accept) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) {
    console.error(`  ! HTTP ${res.status} for "${query}"`);
    return null;
  }
  const hits = await res.json();
  for (const h of hits) {
    if (accept && !accept(h)) continue;
    return {
      lat: Number(h.lat),
      lng: Number(h.lon),
      matched: h.display_name,
      osmType: h.type,
    };
  }
  return null;
}

const doc = JSON.parse(readFileSync(RACES, "utf8"));
const races = Array.isArray(doc) ? doc : doc.races;

// Reuse any previous run so a re-run only fetches what is missing.
const prior =
  existsSync(OUT) && !args.includes("--refetch")
    ? JSON.parse(readFileSync(OUT, "utf8"))
    : { cities: {}, venues: {} };

const cities = { ...(prior.cities ?? {}) };
const venues = { ...(prior.venues ?? {}) };

// ── Pass 1: one entry per host city ──────────────────────────────────
const cityOf = new Map();
for (const r of races) {
  if (!r.city) continue;
  const slug = slugify(r.city);
  if (!cityOf.has(slug)) {
    cityOf.set(slug, { slug, name: r.city, country: r.country, continent: r.continent });
  }
}

console.log(`${cityOf.size} host cities, ${races.length} races.\n`);

let fetched = 0;
let failed = [];

for (const [slug, city] of cityOf) {
  if (only && !only.has(slug)) continue;
  if (cities[slug]?.lat != null) continue;

  const query = CITY_OVERRIDES[slug] ?? `${city.name}, ${city.country}`;
  await sleep(THROTTLE_MS);
  const hit = await geocode(query, (h) => OK_CITY_TYPES.has(h.type) || OK_CITY_TYPES.has(h.class));
  fetched++;

  if (!hit) {
    failed.push(`${slug} (city) — "${query}"`);
    cities[slug] = { ...city, lat: null, lng: null, source: null, verifiedOn: TODAY };
    console.log(`  ✗ ${slug.padEnd(20)} unresolved`);
    continue;
  }
  cities[slug] = {
    ...city,
    lat: Number(hit.lat.toFixed(4)),
    lng: Number(hit.lng.toFixed(4)),
    matched: hit.matched,
    source: "https://nominatim.openstreetmap.org/",
    verifiedOn: TODAY,
  };
  console.log(`  ✓ ${slug.padEnd(20)} ${hit.lat.toFixed(3)}, ${hit.lng.toFixed(3)}  ${hit.matched.slice(0, 60)}`);
}

// ── Pass 2: one entry per race venue ─────────────────────────────────
console.log(`\nVenues …\n`);

for (const r of races) {
  if (only && !only.has(slugify(r.city ?? ""))) continue;
  if (!r.venue) continue;
  if (venues[r.slug]?.lat != null) continue;

  /* Six races carry "VENUE INFORMATION COMING SOON" or "LOCATION TO BE
     ANNOUNCED" in the venue field. That is HYROX telling us they have not
     picked one, not a geocoder failure, and it must not be reported as an
     address a human should go and place by hand. */
  if (/coming soon|to be announced|tba|tbc/i.test(r.venue)) {
    venues[r.slug] = {
      lat: null,
      lng: null,
      announced: false,
      source: null,
      verifiedOn: TODAY,
    };
    console.log(`  – ${r.slug.padEnd(28)} venue not yet announced`);
    continue;
  }

  /**
   * Four shapes, cheapest and most specific first. Exhibition centres are
   * the hard case: HYROX writes them as "Palexpo Geneva (Hall 4 + 5), Rte
   * Francois-Peyrot 30, Grand Saconnex", where the hall reference and the
   * parenthetical both defeat a literal address lookup, and the venue sits
   * in a suburb the city name does not match.
   */
  const clean = (s) =>
    s
      .replace(/\([^)]*\)/g, " ") // "(Hall 4 + 5)", "(PCEC)"
      .replace(/\b(hall|halle|pavilion|building)\b[^,]*/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*[-–,]\s*$/, "")
      .trim();

  const attempts = [
    r.venue,
    r.venueName && `${clean(r.venueName)}, ${r.city}, ${r.country}`,
    // The part before the first " - " or "," is almost always the name.
    `${clean(r.venue.split(/\s+[-–]\s+|,/)[0])}, ${r.city}, ${r.country}`,
    // Last resort: the street line, which resolves when the name does not.
    r.venue.includes(",") &&
      `${clean(r.venue.split(",").slice(1).join(","))}, ${r.country}`,
  ].filter(Boolean);

  let hit = null;
  for (const q of attempts) {
    await sleep(THROTTLE_MS);
    fetched++;
    hit = await geocode(q, null);
    if (hit) break;
  }

  if (!hit) {
    failed.push(`${r.slug} (venue) — "${r.venue}"`);
    venues[r.slug] = { lat: null, lng: null, source: null, verifiedOn: TODAY };
    console.log(`  ✗ ${r.slug.padEnd(28)} unresolved`);
    continue;
  }
  venues[r.slug] = {
    lat: Number(hit.lat.toFixed(4)),
    lng: Number(hit.lng.toFixed(4)),
    matched: hit.matched,
    source: "https://nominatim.openstreetmap.org/",
    verifiedOn: TODAY,
  };
  console.log(`  ✓ ${r.slug.padEnd(28)} ${hit.lat.toFixed(3)}, ${hit.lng.toFixed(3)}`);
}

// ── Report ───────────────────────────────────────────────────────────
const cityOk = Object.values(cities).filter((c) => c.lat != null).length;
const venueOk = Object.values(venues).filter((v) => v.lat != null).length;

console.log(
  `\n${cityOk}/${cityOf.size} cities and ${venueOk}/${races.length} venues resolved. ${fetched} requests this run.`,
);
if (failed.length) {
  console.log(`\n${failed.length} unresolved, for a human to place:`);
  for (const f of failed) console.log(`  - ${f}`);
}

if (dryRun) {
  console.log("\n--dry-run: nothing written.");
} else {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: TODAY,
        source: "https://nominatim.openstreetmap.org/",
        note: "Geocoded from data/hyrox/races.normalised.json. Generated — do not edit by hand.",
        cities,
        venues,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(ROOT, OUT)}`);
}
