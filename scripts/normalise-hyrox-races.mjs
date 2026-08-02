/**
 * Turn the scraped HYROX race pages into the dataset the site renders.
 *
 * Deliberately separate from scripts/fetch-hyrox-races.mjs: fetching touches
 * someone else's server, normalising is pure. This can be re-run as often as
 * we like without hitting hyrox.com again.
 *
 * WHAT IS DERIVED AND WHAT IS READ
 * --------------------------------
 * Read from hyrox.com, never invented:
 *   startDate, endDate   the event_date custom fields
 *   venue                the "Event Location:" line
 *   name                 the page <title>
 *   description          the first paragraph of the page body
 *
 * Derived here, from the name:
 *   city                 everything after "HYROX" in the name
 *   sponsor              everything before it
 *   isYoungstars         the junior series
 *   isWorldChampionship  the season finale
 *
 * Country is NOT derived from the address. HYROX venue lines have no
 * consistent country field — UK ones omit it entirely, US ones end in a state
 * and ZIP, Dutch ones end in a postcode. It comes from the explicit map below,
 * which is checkable by eye. A city missing from the map is reported and the
 * race is written with `country: null` rather than being guessed at.
 *
 * Usage: node scripts/normalise-hyrox-races.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const IN = "data/hyrox/races.json";
const OUT = "data/hyrox/races.normalised.json";

/** city (as it appears after "HYROX" in the name) -> country. */
const COUNTRY = {
  Acapulco: "Mexico", Amsterdam: "Netherlands", Anaheim: "United States",
  Athens: "Greece", Atlanta: "United States", Auckland: "New Zealand",
  Bangkok: "Thailand", Barcelona: "Spain", Bari: "Italy", Basel: "Switzerland",
  Beijing: "China", Bilbao: "Spain", Birmingham: "United Kingdom",
  Bordeaux: "France", Boston: "United States", Brisbane: "Australia",
  Budapest: "Hungary", "Buenos Aires": "Argentina", Cairo: "Egypt",
  "Cape Town": "South Africa", Cardiff: "United Kingdom", Chengdu: "China",
  Chiba: "Japan", Chicago: "United States", Cologne: "Germany",
  Copenhagen: "Denmark", Dallas: "United States", Denver: "United States",
  Dublin: "Ireland", "Düsseldorf": "Germany", Frankfurt: "Germany",
  "Gdańsk": "Poland", Geneva: "Switzerland", Gent: "Belgium",
  Glasgow: "United Kingdom", Guangzhou: "China", Hamburg: "Germany",
  Helsinki: "Finland", "Hong Kong": "Hong Kong", Houston: "United States",
  Incheon: "South Korea", Istanbul: "Türkiye", Izmir: "Türkiye",
  Johannesburg: "South Africa", Karlsruhe: "Germany", Katowice: "Poland",
  "Kraków": "Poland", "Kuala Lumpur": "Malaysia", "Las Vegas": "United States",
  London: "United Kingdom", Lyon: "France", Maastricht: "Netherlands",
  Madrid: "Spain", "Málaga": "Spain", Manchester: "United Kingdom",
  Melbourne: "Australia", "Mexico City": "Mexico", "Miami Beach": "United States",
  Milan: "Italy", Mumbai: "India", Nagoya: "Japan", Nashville: "United States",
  "New York": "United States", Nice: "France", Osaka: "Japan", Oslo: "Norway",
  Ottawa: "Canada", Paris: "France", Perth: "Australia",
  Phoenix: "United States", Portland: "United States", "Poznań": "Poland",
  Riga: "Latvia", Rimini: "Italy", "Rio de Janeiro": "Brazil", Rome: "Italy",
  "Salt Lake City": "United States", "San Diego": "United States",
  Sanya: "China", "São Paulo": "Brazil", Seoul: "South Korea",
  Shanghai: "China", Shenzhen: "China", Singapore: "Singapore",
  Stockholm: "Sweden", Taipei: "Taiwan", Tampa: "United States",
  Tenerife: "Spain", Toronto: "Canada", Toulouse: "France",
  Utrecht: "Netherlands", Valencia: "Spain", Vancouver: "Canada",
  Verona: "Italy", Vienna: "Austria", Warsaw: "Poland",
  "Washington D.C.": "United States",
};

/**
 * Names arrive in mixed case ("HYROX GDAŃSK", "INTERSPORT HYROX BORDEAUX")
 * and with venue suffixes. This maps the raw tail onto the canonical city.
 */
const CITY_FIXUPS = {
  "london excel": "London",
  "london excel ": "London",
  "paris grand-palais": "Paris",
  "izmir": "Izmir",
  "washington d.c.": "Washington D.C.",
  "sao paulo": "São Paulo",
};

const CONTINENT = {
  "United Kingdom": "Europe", Ireland: "Europe", France: "Europe",
  Germany: "Europe", Spain: "Europe", Italy: "Europe", Poland: "Europe",
  Netherlands: "Europe", Belgium: "Europe", Switzerland: "Europe",
  Austria: "Europe", Denmark: "Europe", Sweden: "Europe", Norway: "Europe",
  Finland: "Europe", Latvia: "Europe", Hungary: "Europe", Greece: "Europe",
  "Türkiye": "Europe",
  "United States": "North America", Canada: "North America",
  Mexico: "North America",
  Brazil: "South America", Argentina: "South America",
  China: "Asia", Japan: "Asia", "South Korea": "Asia", Taiwan: "Asia",
  "Hong Kong": "Asia", Singapore: "Asia", Malaysia: "Asia", Thailand: "Asia",
  India: "Asia",
  Australia: "Oceania", "New Zealand": "Oceania",
  "South Africa": "Africa", Egypt: "Africa",
};

/** Title-case a shouted city name, preserving accents. */
function tidyCase(s) {
  if (s !== s.toUpperCase()) return s; // already mixed case, leave it
  return s
    .toLowerCase()
    .split(/(\s|-)/)
    .map((w) => (/[a-zà-ž]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join("");
}

function parseName(rawName) {
  let name = rawName.replace(/\s*\|\s*Season.*$/i, "").trim();

  const isWorldChampionship = /world championships?/i.test(name);
  const isYoungstars = /youngstars/i.test(name);

  const idx = name.toUpperCase().lastIndexOf("HYROX");
  const sponsor = idx > 0 ? name.slice(0, idx).trim() : null;
  let tail = idx >= 0 ? name.slice(idx + "HYROX".length) : name;

  tail = tail
    .replace(/youngstars/gi, "")
    .replace(/world championships?/gi, "")
    .trim();

  let city = tidyCase(tail).trim();
  // Turkish dotted capital: "İzmir".toLowerCase() yields "i" + U+0307, so a
  // plain lowercase comparison misses it. Strip combining marks first.
  const key = city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const fix = CITY_FIXUPS[key] ?? CITY_FIXUPS[city.toLowerCase()];
  if (fix) city = fix;
  // "London ExCeL" / "London ExCel" -> London
  if (/^london\b/i.test(city)) city = "London";
  if (/^paris\b/i.test(city)) city = "Paris";

  return { city, sponsor: sponsor || null, isYoungstars, isWorldChampionship };
}

const raw = JSON.parse(readFileSync(IN, "utf8"));
const unknownCities = new Set();

const races = raw.races
  .filter((r) => r.startDate)
  .map((r) => {
    const { city, sponsor, isYoungstars, isWorldChampionship } = parseName(r.name);
    const country = COUNTRY[city] ?? null;
    if (!country) unknownCities.add(`${city}  (from "${r.name}")`);

    return {
      slug: r.slug,
      sourceUrl: r.source,
      name: r.name.replace(/\s*\|\s*Season.*$/i, "").trim(),
      city,
      country,
      continent: country ? (CONTINENT[country] ?? null) : null,
      venue: r.venue,
      venueName: r.venueName,
      startDate: r.startDate,
      endDate: r.endDate ?? r.startDate,
      sponsor,
      isYoungstars,
      isWorldChampionship,
      description: r.description,
    };
  })
  .sort((a, b) => a.startDate.localeCompare(b.startDate));

const byCountry = {};
for (const r of races) byCountry[r.country ?? "unknown"] = (byCountry[r.country ?? "unknown"] ?? 0) + 1;

writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: "https://hyrox.com/event-sitemap.xml",
      note:
        "Dates and venues read from hyrox.com event pages. Country derived " +
        "from an explicit city map in scripts/normalise-hyrox-races.mjs, not " +
        "from the address line, which has no consistent country field.",
      total: races.length,
      races,
    },
    null,
    2,
  ) + "\n",
);

console.log(`Wrote ${OUT}: ${races.length} races`);
console.log(`  UK: ${races.filter((r) => r.country === "United Kingdom").length}`);
console.log(`  Youngstars: ${races.filter((r) => r.isYoungstars).length}`);
console.log(`  World Championships: ${races.filter((r) => r.isWorldChampionship).length}`);
console.log(`  countries: ${Object.keys(byCountry).length}`);
if (unknownCities.size) {
  console.log(`\n  UNMAPPED CITIES (country left null):`);
  for (const c of unknownCities) console.log(`    ${c}`);
}
