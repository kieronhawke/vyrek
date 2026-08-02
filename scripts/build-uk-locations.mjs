/**
 * Build the UK location registry from GeoNames.
 *
 * Kieron's directive (1 August 2026): every big town and city in the UK, not a
 * shortlist. This replaces the hand-written 104-entry registry with every GB
 * populated place at or above a population floor, sourced rather than typed.
 *
 * Source: https://download.geonames.org/export/dump/GB.zip — GeoNames' own GB
 * extract, CC BY 4.0. Columns are documented at
 * https://download.geonames.org/export/dump/readme.txt
 *
 * What it does NOT do: invent anything. Population, coordinates, county and
 * country all come straight from the feed. Region is the one derived field,
 * mapped from GeoNames' county to the site's existing taxonomy.
 *
 * Existing entries are merged, never overwritten: keywordEvidence is the
 * output of the Semrush work and is preserved on every slug that carries it.
 *
 * Run: node scripts/build-uk-locations.mjs [--min-population 15000]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "locations");
const REGISTRY = path.join(DATA_DIR, "registry.json");
const FEED_URL = "https://download.geonames.org/export/dump/GB.zip";

const argMin = process.argv.indexOf("--min-population");
const MIN_POP = argMin > -1 ? Number(process.argv[argMin + 1]) : 15000;

/* ── Region mapping ──────────────────────────────────────────────────
   GeoNames gives a county or unitary authority. The site groups pages by a
   coarser region, so each county maps to one. Metropolitan boroughs are
   listed explicitly because their names do not contain their county. */

const REGION_BY_COUNTY = {
  // London
  "Greater London": "London",
  // North East
  "County Durham": "North East", Northumberland: "North East",
  "Tyne and Wear": "North East", "Stockton-on-Tees": "North East",
  Darlington: "North East", Hartlepool: "North East",
  "Middlesbrough": "North East", "Redcar and Cleveland": "North East",
  Gateshead: "North East", Sunderland: "North East",
  "Newcastle upon Tyne": "North East", "North Tyneside": "North East",
  "South Tyneside": "North East",
  // North West
  Lancashire: "North West", Cumbria: "North West", Merseyside: "North West",
  "Greater Manchester": "North West", Cheshire: "North West",
  "Cheshire East": "North West", "Cheshire West and Chester": "North West",
  Liverpool: "North West", Sefton: "North West", "St. Helens": "North West",
  Knowsley: "North West", "Metropolitan Borough of Wirral": "North West",
  Trafford: "North West", "Borough of Wigan": "North West",
  "Borough of Tameside": "North West", "Borough of Stockport": "North West",
  "Borough of Oldham": "North West", "Borough of Bury": "North West",
  "City and Borough of Salford": "North West", Rochdale: "North West",
  Bolton: "North West", Manchester: "North West", Blackpool: "North West",
  "Blackburn with Darwen": "North West", Halton: "North West",
  Warrington: "North West",
  // Yorkshire
  "North Yorkshire": "Yorkshire", "South Yorkshire": "Yorkshire",
  "West Yorkshire": "Yorkshire", "East Riding of Yorkshire": "Yorkshire",
  "City and Borough of Leeds": "Yorkshire", Kirklees: "Yorkshire",
  Doncaster: "Yorkshire", Sheffield: "Yorkshire", Rotherham: "Yorkshire",
  Bradford: "Yorkshire", "City and Borough of Wakefield": "Yorkshire",
  Calderdale: "Yorkshire", Barnsley: "Yorkshire", "City of York": "Yorkshire",
  "Kingston upon Hull": "Yorkshire", "North Lincolnshire": "Yorkshire",
  "North East Lincolnshire": "Yorkshire",
  // East Midlands
  Derbyshire: "East Midlands", Leicestershire: "East Midlands",
  Lincolnshire: "East Midlands", Northamptonshire: "East Midlands",
  Nottinghamshire: "East Midlands", Rutland: "East Midlands",
  Derby: "East Midlands", Leicester: "East Midlands",
  Nottingham: "East Midlands", "North Northamptonshire": "East Midlands",
  "West Northamptonshire": "East Midlands",
  // West Midlands
  Staffordshire: "West Midlands", Warwickshire: "West Midlands",
  Worcestershire: "West Midlands", Shropshire: "West Midlands",
  Herefordshire: "West Midlands", "West Midlands": "West Midlands",
  "City and Borough of Birmingham": "West Midlands", Dudley: "West Midlands",
  Walsall: "West Midlands", Sandwell: "West Midlands",
  Solihull: "West Midlands", Coventry: "West Midlands",
  Wolverhampton: "West Midlands", "Stoke-on-Trent": "West Midlands",
  Telford: "West Midlands", "Telford and Wrekin": "West Midlands",
  // East
  Essex: "East", Hertfordshire: "East", Suffolk: "East", Norfolk: "East",
  Cambridgeshire: "East", Bedfordshire: "East", "Central Bedfordshire": "East",
  Bedford: "East", Luton: "East", "Southend-on-Sea": "East",
  Thurrock: "East", Peterborough: "East", "Milton Keynes": "East",
  // South East
  Surrey: "South East", Kent: "South East", Hampshire: "South East",
  "West Sussex": "South East", "East Sussex": "South East",
  Oxfordshire: "South East", Buckinghamshire: "South East",
  Berkshire: "South East", "Isle of Wight": "South East",
  "Royal Borough of Windsor and Maidenhead": "South East",
  "Brighton and Hove": "South East", Portsmouth: "South East",
  Southampton: "South East", "Reading": "South East",
  "West Berkshire": "South East", Wokingham: "South East",
  Bracknell: "South East", "Bracknell Forest": "South East",
  Slough: "South East", "Medway": "South East",
  // South West
  Devon: "South West", Cornwall: "South West", Somerset: "South West",
  Dorset: "South West", Wiltshire: "South West",
  Gloucestershire: "South West", "South Gloucestershire": "South West",
  Bristol: "South West", "City of Bristol": "South West",
  "Bath and North East Somerset": "South West",
  "North Somerset": "South West", "Bournemouth, Christchurch and Poole": "South West",
  Swindon: "South West", Torbay: "South West", Plymouth: "South West",
  "Isles of Scilly": "South West", Torbay: "South West",
  "Bournemouth, Christchurch and Poole": "South West",
  Bolton: "North West", Rochdale: "North West", Halton: "North West",
  Thurrock: "East", "Kingston upon Hull": "Yorkshire",
};

const REGION_BY_COUNTRY = {
  SCT: "Scotland",
  WLS: "Wales",
  NIR: "Northern Ireland",
};

const COUNTRY_BY_ADMIN1 = {
  ENG: "England",
  SCT: "Scotland",
  WLS: "Wales",
  NIR: "Northern Ireland",
};

/** GeoNames names many counties "Borough of X" or "X Council". The table
 *  above keys on the bare place name, so strip the wrapper before looking up. */
function bareCounty(county) {
  return (county ?? "")
    .replace(/^(Metropolitan |Royal |City and |City of |County )?(Borough|District) of /i, "")
    .replace(/^City of /i, "")
    .replace(/ (Council|County Borough|District|Unitary Authority)$/i, "")
    .trim();
}

/** Best-effort region when the county is not in the table above. */
function deriveRegion(admin1, county) {
  if (REGION_BY_COUNTRY[admin1]) return REGION_BY_COUNTRY[admin1];
  if (county && REGION_BY_COUNTY[county]) return REGION_BY_COUNTY[county];
  const bare = bareCounty(county);
  if (bare && REGION_BY_COUNTY[bare]) return REGION_BY_COUNTY[bare];
  // A handful of unitary authorities are named "<Town> ..." and inherit the
  // region of the county they sit in. Fall back to a keyword sweep rather
  // than guessing a compass point at random.
  const c = (county ?? "").toLowerCase();
  if (/yorkshire|humber/.test(c)) return "Yorkshire";
  if (/lancash|cumbr|mersey|manchester|cheshire/.test(c)) return "North West";
  if (/durham|northumb|tyne|tees/.test(c)) return "North East";
  if (/midlands|staffords|warwick|worcester|shrops|hereford/.test(c)) return "West Midlands";
  if (/derby|leicest|lincoln|northampton|nottingham|rutland/.test(c)) return "East Midlands";
  if (/essex|hertford|suffolk|norfolk|cambridge|bedford/.test(c)) return "East";
  if (/surrey|kent|hampshire|sussex|oxford|buckingham|berks/.test(c)) return "South East";
  if (/devon|cornwall|somerset|dorset|wilts|gloucester|bristol/.test(c)) return "South West";
  return "England";
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** GeoNames feature codes that are places people would search for. */
const PLACE_CODES = new Set(["PPL", "PPLA", "PPLA2", "PPLA3", "PPLA4", "PPLC", "PPLX", "PPLL"]);

/**
 * Mainland GB plus the isles. GeoNames' GB extract includes the Sovereign
 * Base Areas in Cyprus, which are British territory and emphatically not
 * somewhere anyone searches for a personal trainer in.
 */
const GB_BOUNDS = { minLat: 49.5, maxLat: 61.2, minLng: -9, maxLng: 2.1 };

/**
 * Known GeoNames errors, corrected by hand.
 *
 * Loughton: the feed puts Essex Loughton's population (33,346) on the
 * Shropshire hamlet's coordinates, and gives the real Essex town a population
 * of zero. Left alone it produces a 33k "town" in a Shropshire field with no
 * gyms within eight kilometres, which is exactly how it surfaced.
 */
const CORRECTIONS = {
  loughton: { lat: 51.646, lng: 0.054, county: "Essex", region: "East" },
};

/** Names that are administrative areas rather than towns anyone searches. */
const NOT_A_TOWN =
  /\b(district|county borough|borough of|city and borough|metropolitan|unitary|shire$)\b/i;

// ── Fetch ────────────────────────────────────────────────────────────
const tmp = path.join(os.tmpdir(), "suth-geonames");
mkdirSync(tmp, { recursive: true });
const zip = path.join(tmp, "GB.zip");
const txt = path.join(tmp, "GB.txt");

if (!existsSync(txt)) {
  console.log(`Fetching ${FEED_URL} …`);
  const res = await fetch(FEED_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    },
  });
  if (!res.ok) {
    console.error(`Feed fetch failed: HTTP ${res.status}. Nothing written.`);
    process.exit(1);
  }
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync("unzip", ["-o", "-q", zip, "-d", tmp]);
}

// admin2 -> county name
const admin2Path = path.join(tmp, "admin2Codes.txt");
if (!existsSync(admin2Path)) {
  const res = await fetch(
    "https://download.geonames.org/export/dump/admin2Codes.txt",
    { headers: { "user-agent": "Mozilla/5.0" } },
  );
  writeFileSync(admin2Path, await res.text());
}
const countyByCode = new Map();
for (const line of readFileSync(admin2Path, "utf8").split("\n")) {
  const [code, name] = line.split("\t");
  if (code?.startsWith("GB.")) countyByCode.set(code, name);
}

// ── Parse ────────────────────────────────────────────────────────────
const rows = [];
const belowFloor = new Map();
for (const line of readFileSync(txt, "utf8").split("\n")) {
  const f = line.split("\t");
  if (f.length < 15) continue;
  const [, name, , , lat, lng, fclass, fcode, , , admin1, admin2] = f;
  const pop = Number(f[14]);
  if (fclass !== "P" || !PLACE_CODES.has(fcode)) continue;
  if (!Number.isFinite(pop) || pop <= 0) continue;
  // Everything below the floor is still worth keeping in memory: existing
  // entries (London districts, mostly) can borrow a population from it.
  if (pop < MIN_POP) {
    const s2 = slugify(name);
    if (!belowFloor.has(s2) || belowFloor.get(s2).populationK < Math.round(pop / 1000))
      belowFloor.set(s2, { populationK: Math.round(pop / 1000), lat: Number(Number(lat).toFixed(3)), lng: Number(Number(lng).toFixed(3)) });
    continue;
  }
  if (NOT_A_TOWN.test(name)) continue;
  const flat = Number(lat);
  const flng = Number(lng);
  if (
    flat < GB_BOUNDS.minLat || flat > GB_BOUNDS.maxLat ||
    flng < GB_BOUNDS.minLng || flng > GB_BOUNDS.maxLng
  )
    continue;
  // Store the county under the name people use. GeoNames gives the legal
  // entity ("City and Borough of Leeds", "Royal Borough of Windsor and
  // Maidenhead"), which nobody types and which reads badly as a page title.
  const county = bareCounty(countyByCode.get(`GB.${admin1}.${admin2}`)) || undefined;
  rows.push({
    slug: slugify(name),
    name,
    kind:
      fcode === "PPLC" || fcode === "PPLA" || fcode === "PPLA2"
        ? "city"
        : fcode === "PPLX"
          ? "london-area"
          : "town",
    country: COUNTRY_BY_ADMIN1[admin1] ?? "England",
    region: deriveRegion(admin1, county),
    county,
    populationK: Math.round(pop / 1000),
    lat: Number(Number(lat).toFixed(3)),
    lng: Number(Number(lng).toFixed(3)),
  });
}


// Highest population wins a duplicate slug: GeoNames lists a few names twice
// (Ashford, Bangor, Newport…) and the larger is the one people search for.
const bySlug = new Map();
for (const r of rows) {
  const seen = bySlug.get(r.slug);
  if (!seen || r.populationK > seen.populationK) bySlug.set(r.slug, r);
}

// ── Merge, preserving the Semrush work ───────────────────────────────
const existing = JSON.parse(readFileSync(REGISTRY, "utf8"));
const existingBySlug = new Map(existing.locations.map((l) => [l.slug, l]));

let kept = 0;
let added = 0;
for (const [slug, row] of bySlug) {
  const prev = existingBySlug.get(slug);
  if (prev) {
    kept++;
    // Keep the hand-curated fields; refresh the sourced ones.
    existingBySlug.set(slug, {
      ...prev,
      lat: prev.lat ?? row.lat,
      lng: prev.lng ?? row.lng,
      county: prev.county ?? row.county,
      populationK: prev.populationK || row.populationK,
    });
  } else {
    added++;
    existingBySlug.set(slug, row);
  }
}

// Legacy entries that sit below the floor (London districts, chiefly) still
// deserve a real population and centroid rather than a blank.
for (const [slug, entry] of existingBySlug) {
  const extra = belowFloor.get(slug);
  if (!extra) continue;
  if (entry.populationK == null || entry.populationK === 0) entry.populationK = extra.populationK;
  if (entry.lat == null) { entry.lat = extra.lat; entry.lng = extra.lng; }
}

// One legacy taxonomy fix: "South" predates the current region list.
const SOUTH_SPLIT = {
  southampton: "South East", portsmouth: "South East",
  basingstoke: "South East", winchester: "South East",
  bournemouth: "South West", poole: "South West", salisbury: "South West",
};
for (const [slug, entry] of existingBySlug) {
  if (entry.region === "South") entry.region = SOUTH_SPLIT[slug] ?? "South East";
}

// County names are re-normalised after the merge too: an entry stored before
// bareCounty() existed keeps its legal name otherwise, and "City and Borough
// of Leeds" is nobody's search term.
for (const entry of existingBySlug.values()) {
  if (entry.county) {
    const clean = bareCounty(entry.county);
    if (clean) entry.county = clean;
  }
}

// Corrections are authoritative: they exist precisely because the stored
// value is wrong, so they have to be applied after the merge, not before it.
for (const [slug, fix] of Object.entries(CORRECTIONS)) {
  const entry = existingBySlug.get(slug);
  if (entry) Object.assign(entry, fix);
}

for (const [slug, l] of [...existingBySlug]) {
  if (
    l.lat != null &&
    (l.lat < GB_BOUNDS.minLat || l.lat > GB_BOUNDS.maxLat ||
     l.lng < GB_BOUNDS.minLng || l.lng > GB_BOUNDS.maxLng)
  ) {
    existingBySlug.delete(slug);
    console.log(`dropped ${slug}: outside Great Britain`);
  }
}

const merged = [...existingBySlug.values()].sort(
  (a, b) => (b.populationK ?? 0) - (a.populationK ?? 0),
);

writeFileSync(
  REGISTRY,
  JSON.stringify({ ...existing, locations: merged }, null, 2) + "\n",
);

const evidenced = merged.filter((l) => l.keywordEvidence?.length).length;
console.log(`min population : ${MIN_POP.toLocaleString()}`);
console.log(`from GeoNames  : ${bySlug.size}`);
console.log(`already present: ${kept}`);
console.log(`newly added    : ${added}`);
console.log(`registry total : ${merged.length}`);
console.log(`with coords    : ${merged.filter((l) => l.lat != null).length}`);
console.log(`keyword evidence preserved on ${evidenced}`);
