/**
 * Builds a city catalogue for a whole country, from GeoNames.
 *
 * Kieron, 3 August 2026: target the HYROX hot spots. The calendar says where
 * those are — 20 races in the US, 8 in France, 7 in Spain and the UK, 6 in
 * China — and our depth was inverted against it: 1,882 pages for the UK, one
 * for Ireland, three for Australia, one for Hong Kong where the 2027 World
 * Championship is held.
 *
 * WHY THIS RUNS FOR SOME COUNTRIES AND NOT OTHERS
 *
 * Race count alone would put France and Spain next. Our pages are in English.
 * An English page for "personal trainer paris" competes with French results
 * and loses, so 1,800 English town pages across the non-English markets would
 * be the thin-content mistake at industrial scale — the exact failure
 * docs/strategy/rules/uniqueness-validator.md exists to prevent, just wearing
 * a passport.
 *
 * So this expands the markets where an English page can rank on merit:
 * Ireland, Australia, Canada, New Zealand, South Africa. The non-English
 * markets keep their race-city pages and wait on a translation decision,
 * which is a real investment call rather than something a script should
 * assume.
 *
 * Source: https://download.geonames.org/export/dump/<CC>.zip
 * Gyms are seeded separately by scripts/seed-gyms-country.mjs.
 *
 * Run: node scripts/build-country-cities.mjs [--only IE,AU] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data", "locations", "intl-cities.json");
const RACE_CITIES = path.join(ROOT, "data", "locations", "race-cities.json");
const TODAY = new Date().toISOString().slice(0, 10);

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";

/**
 * Population floors are per country on purpose. Ireland's fifth-largest city
 * has 20,000 people; Australia's has 300,000. One global floor would either
 * flood Australia or erase Ireland.
 */
const COUNTRIES = [
  { cc: "IE", country: "Ireland", countrySlug: "ireland", minPop: 5000, continent: "Europe" },
  { cc: "AU", country: "Australia", countrySlug: "australia", minPop: 15000, continent: "Oceania" },
  { cc: "CA", country: "Canada", countrySlug: "canada", minPop: 15000, continent: "North America" },
  { cc: "NZ", country: "New Zealand", countrySlug: "new-zealand", minPop: 5000, continent: "Oceania" },
  { cc: "ZA", country: "South Africa", countrySlug: "south-africa", minPop: 40000, continent: "Africa" },
];

const dryRun = process.argv.includes("--dry-run");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > -1 ? new Set(process.argv[onlyIdx + 1].split(",")) : null;

function slugify(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Names that are administrative areas rather than places anyone searches. */
const NOT_A_TOWN = /\b(county|regional municipality|district municipality|census|division)\b/i;

// Slugs already taken by the UK registry or the race cities. A collision would
// serve one place's page at another's URL — the Boston and Perth problem.
const taken = new Set();
/** Race cities already have a page; their slug maps to the country that owns it. */
const raceCityCountry = new Map();
{
  const uk = JSON.parse(
    readFileSync(path.join(ROOT, "data", "locations", "registry.json"), "utf8"),
  ).locations;
  for (const l of uk) taken.add(l.slug);
  const rc = JSON.parse(readFileSync(RACE_CITIES, "utf8")).cities;
  for (const c of rc) {
    taken.add(c.slug);
    raceCityCountry.set(c.slug, c.country);
    if (c.bareSlug) raceCityCountry.set(c.bareSlug, c.country);
  }
}
// US states share the namespace under /state/, not here, but a US city page
// does not exist outside the race cities, so nothing else to reserve.

const tmp = path.join(os.tmpdir(), "suth-geonames-intl");
mkdirSync(tmp, { recursive: true });

const all = [];
const collisions = [];
const qualified = [];
const skippedAsRaceCity = [];

for (const c of COUNTRIES) {
  if (only && !only.has(c.cc)) continue;

  const zip = path.join(tmp, `${c.cc}.zip`);
  const txt = path.join(tmp, `${c.cc}.txt`);
  if (!existsSync(txt)) {
    const url = `https://download.geonames.org/export/dump/${c.cc}.zip`;
    console.log(`Fetching ${url} …`);
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) {
      console.error(`  ${c.cc}: HTTP ${res.status}. Skipped.`);
      continue;
    }
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    execFileSync("unzip", ["-o", "-q", zip, "-d", tmp]);
  }

  const rows = [];
  for (const line of readFileSync(txt, "utf8").split("\n")) {
    if (!line) continue;
    const f = line.split("\t");
    const [, name, , , lat, lng, fclass, fcode, , , adm1] = f;
    const population = Number(f[14] || 0);
    if (fclass !== "P" || !fcode?.startsWith("PPL") || fcode === "PPLX") continue;
    if (population < c.minPop) continue;
    if (NOT_A_TOWN.test(name)) continue;

    const bare = slugify(name);
    if (!bare) continue;

    /* Two different outcomes for a taken slug, and conflating them was the bug.
       If a race city in THIS country already owns it, the page exists and a
       second one would be a duplicate — Melbourne, Perth and Dublin all hit
       this. If anything else owns it, this is a different real place and it
       gets the country qualifier, the same treatment Boston and Perth already
       get. Dropping it silently cost Newcastle NSW (322,000 people) to
       Newcastle, County Down (8,000). */
    let slug = bare;
    if (taken.has(bare)) {
      if (raceCityCountry.get(bare) === c.country) {
        skippedAsRaceCity.push(`${name}, ${c.country}`);
        continue;
      }
      slug = `${bare}-${c.countrySlug}`;
      if (taken.has(slug)) {
        collisions.push(`${name}, ${c.country} (both "${bare}" and "${slug}" taken)`);
        continue;
      }
      qualified.push(`${name}, ${c.country} → /${slug}`);
    }
    taken.add(slug);

    rows.push({
      slug,
      /** Set when the bare slug belongs to another place. Drives the H1/title. */
      bareSlug: slug === bare ? undefined : bare,
      name,
      country: c.country,
      countrySlug: c.countrySlug,
      continent: c.continent,
      admin1: adm1 || undefined,
      lat: Number(Number(lat).toFixed(4)),
      lng: Number(Number(lng).toFixed(4)),
      populationK: Math.round(population / 1000),
      source: `https://download.geonames.org/export/dump/${c.cc}.zip`,
      verifiedOn: TODAY,
    });
  }
  rows.sort((a, b) => b.populationK - a.populationK);
  console.log(`${c.country.padEnd(14)} ${String(rows.length).padStart(4)} places at or above ${c.minPop.toLocaleString("en-GB")}`);
  all.push(...rows);
}

console.log(`\n${all.length} cities across ${new Set(all.map((r) => r.country)).size} countries.`);
if (skippedAsRaceCity.length) {
  console.log(
    `\n${skippedAsRaceCity.length} already have a race-city page: ${skippedAsRaceCity.join(", ")}`,
  );
}
if (qualified.length) {
  console.log(`\n${qualified.length} qualified with their country to avoid a collision:`);
  for (const x of qualified.slice(0, 10)) console.log(`  - ${x}`);
  if (qualified.length > 10) console.log(`  … and ${qualified.length - 10} more`);
}
if (collisions.length) {
  console.log(
    `\n${collisions.length} dropped for slug collisions with an existing page:`,
  );
  for (const x of collisions.slice(0, 12)) console.log(`  - ${x}`);
  if (collisions.length > 12) console.log(`  … and ${collisions.length - 12} more`);
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
          "English-language markets expanded to full depth. Generated by " +
          "scripts/build-country-cities.mjs from GeoNames. Do not edit by hand.",
        countries: COUNTRIES.map(({ cc, country, countrySlug, minPop }) => ({
          cc,
          country,
          countrySlug,
          minPop,
        })),
        cities: all,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${path.relative(ROOT, OUT)}`);
}
