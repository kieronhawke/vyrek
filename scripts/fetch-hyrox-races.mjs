/**
 * Fetch the real HYROX race calendar from hyrox.com.
 *
 * WHY THIS EXISTS
 * ---------------
 * lib/hyrox-events.ts carried four races with dates its own header admitted
 * were "placeholder approximations based on the 2024-26 calendar cadence".
 * Those invented dates were being emitted as SportsEvent JSON-LD startDate and
 * rendered on-page, which is both a structured-data policy breach and a way to
 * have an athlete plan a season around a date we made up. It was the hard
 * blocker on the noindex switch.
 *
 * HOW
 * ---
 * hyrox.com is WordPress. The race finder renders client-side (and 403s a
 * plain fetch), but every race has a server-rendered page listed in
 * https://hyrox.com/event-sitemap.xml, and those pages carry the date and
 * venue as custom fields. A browser User-Agent is required — without one the
 * whole domain 403s, which is what defeated the earlier attempt.
 *
 * Fields we read, and nothing else:
 *   event_date_1        start date, e.g. "7. Apr. 2027"
 *   event_date_3        end date (multi-day events only)
 *   "Event Location:"   the venue line, e.g. "PGE Narodowy, ..., Warsaw, Poland"
 *   <title>             the race name
 *
 * Everything written to data/hyrox/races.json is read from those fields. If a
 * date cannot be parsed the race is written with `date: null` and excluded
 * from anything that renders a date, rather than being guessed at.
 *
 * Usage: node scripts/fetch-hyrox-races.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const SITEMAP = "https://hyrox.com/event-sitemap.xml";
const OUT_DIR = "data/hyrox";
const OUT = `${OUT_DIR}/races.json`;

/** Politeness: hyrox.com is someone else's server. */
const DELAY_MS = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-GB,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/** "7. Apr. 2027" -> "2027-04-07". Returns null rather than guessing. */
function parseDate(raw) {
  if (!raw) return null;
  const m = raw
    .replace(/&nbsp;/g, " ")
    .trim()
    .match(/^(\d{1,2})\.?\s*([A-Za-zäöüÄÖÜ]+)\.?\s*(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function field(html, n) {
  const re = new RegExp(
    `event_date_${n}[^>]*>(?:<span class="w-post-elm-before">[^<]*</span>)?` +
      `<span class="w-post-elm-value">([^<]+)</span>`,
  );
  return (html.match(re) || [])[1] || null;
}

function decode(s) {
  return s
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function venueOf(html) {
  const i = html.indexOf("Event Location:");
  if (i === -1) return null;
  const chunk = html.slice(i, i + 900);
  const m = chunk.match(/<span class="w-post-elm-value">([^<]+)<\/span>/);
  return m ? decode(m[1]) : null;
}

/** Last comma-separated part of the venue line is the country. */
function splitVenue(venue) {
  if (!venue) return { venueName: null, city: null, country: null };
  const parts = venue.split(",").map((p) => p.trim()).filter(Boolean);
  const country = parts.length > 1 ? parts[parts.length - 1] : null;
  // Second to last is usually a postcode or the city; prefer the first
  // non-numeric part walking back from the country.
  let city = null;
  for (let i = parts.length - 2; i >= 1; i--) {
    if (!/^\d/.test(parts[i])) { city = parts[i]; break; }
  }
  return { venueName: parts[0] || null, city, country };
}

function nameOf(html) {
  const t = (html.match(/<title>(.*?)<\/title>/s) || [])[1] || "";
  return decode(t.replace(/\s*\|\s*HYROX\s*$/i, ""));
}

function descriptionOf(html) {
  const m = html.match(
    /<div class="w-post-elm post_content[^"]*"[^>]*>\s*<p>(.*?)<\/p>/s,
  );
  if (!m) return null;
  const text = decode(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  return text.length > 20 ? text : null;
}

async function main() {
  console.log("Fetching sitemap…");
  const xml = await get(SITEMAP);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log(`${urls.length} event pages`);

  const races = [];
  const failures = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const slug = url.replace(/\/$/, "").split("/").pop();
    try {
      const html = await get(url);
      const startRaw = field(html, 1);
      const endRaw = field(html, 3);
      const venue = venueOf(html);
      const { venueName, city, country } = splitVenue(venue);

      races.push({
        slug,
        source: url,
        name: nameOf(html),
        startDate: parseDate(startRaw),
        endDate: parseDate(endRaw),
        startDateRaw: startRaw,
        endDateRaw: endRaw,
        venue,
        venueName,
        city,
        country,
        description: descriptionOf(html),
      });
      process.stdout.write(
        `\r[${i + 1}/${urls.length}] ${slug.slice(0, 40).padEnd(40)}`,
      );
    } catch (err) {
      failures.push({ url, error: String(err.message || err) });
    }
    await sleep(DELAY_MS);
  }

  console.log();

  const dated = races.filter((r) => r.startDate);
  races.sort((a, b) => (a.startDate || "9999").localeCompare(b.startDate || "9999"));

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        // Deliberately not Date.now(): the fetch date is the provenance of
        // every date below, so it is recorded explicitly by the caller.
        fetchedFrom: SITEMAP,
        total: races.length,
        withDates: dated.length,
        races,
        failures,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`Wrote ${OUT}`);
  console.log(`  ${races.length} races, ${dated.length} with a parsed date`);
  if (failures.length) console.log(`  ${failures.length} failed to fetch`);
  const noDate = races.filter((r) => !r.startDate);
  if (noDate.length) {
    console.log(`  no date parsed for: ${noDate.map((r) => r.slug).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
