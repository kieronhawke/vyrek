/**
 * Uniqueness validator — the publish gate for programmatic location pages.
 * Spec: docs/strategy/rules/uniqueness-validator.md
 *
 * A location publishes only if it has ≥5 populated countable fields,
 * including at least one gym/facility record AND at least one
 * results/performance data point. bensTake must be ≥40 words and not
 * templated across locations.
 *
 * Runs as `prebuild` before every `next build`. Writes:
 *   data/locations/publish-status.json   (consumed by lib/locations)
 *   docs/location-validator-report.md    (human report)
 *
 * There is deliberately NO bypass, force, or skip flag, and none may be
 * added (hard rule 3). Exit code is non-zero only for structural errors
 * (malformed JSON, unknown slugs, missing sources) — a blocked page is
 * the gate working, not a build failure.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "locations");
const ENRICH_DIR = path.join(DATA_DIR, "enrichment");

const MIN_POPULATED_FIELDS = 5;
const MIN_BENS_TAKE_WORDS = 40;
const SHINGLE_SIZE = 10; // shared 10-word run between two takes = templated

// ── Load ─────────────────────────────────────────────────────────────
const errors = [];
const registry = JSON.parse(
  readFileSync(path.join(DATA_DIR, "registry.json"), "utf8"),
).locations;
const known = new Set(registry.map((l) => l.slug));
{
  const seen = new Set();
  for (const l of registry) {
    if (seen.has(l.slug)) errors.push(`registry: duplicate slug "${l.slug}"`);
    seen.add(l.slug);
  }
}

const enrichments = new Map();
if (existsSync(ENRICH_DIR)) {
  for (const file of readdirSync(ENRICH_DIR).filter((f) => f.endsWith(".json"))) {
    const slug = file.replace(/\.json$/, "");
    let data;
    try {
      data = JSON.parse(readFileSync(path.join(ENRICH_DIR, file), "utf8"));
    } catch (e) {
      errors.push(`enrichment/${file}: malformed JSON (${e.message})`);
      continue;
    }
    if (!known.has(slug))
      errors.push(`enrichment/${file}: slug not in registry.json`);
    if (data.slug !== slug)
      errors.push(`enrichment/${file}: slug field "${data.slug}" does not match filename`);
    enrichments.set(slug, data);
  }
}

// Every record-shaped fact must carry source + verifiedOn.
function checkSources(slug, node, trail) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => checkSources(slug, item, `${trail}[${i}]`));
    return;
  }
  if (node && typeof node === "object") {
    const keys = Object.keys(node);
    const isRecord = keys.includes("name") || keys.includes("venue") || keys.includes("station");
    if (isRecord && (!node.source || !node.verifiedOn))
      errors.push(`${slug}: ${trail} is missing source/verifiedOn — unsourced facts do not ship`);
    for (const [k, v] of Object.entries(node)) checkSources(slug, v, `${trail}.${k}`);
  }
}
for (const [slug, e] of enrichments) {
  for (const layer of ["gyms", "races", "results", "terrain", "community"]) {
    if (e[layer]) checkSources(slug, e[layer], layer);
  }
}

// ── Countable fields (names per the spec) ────────────────────────────
const nonEmpty = (a) => Array.isArray(a) && a.length > 0;

const FIELDS = [
  ["affiliated_gyms", (e) => nonEmpty(e.gyms?.affiliatedGyms), "gym"],
  ["equipped_gyms", (e) => nonEmpty(e.gyms?.equippedGyms), "gym"],
  ["chain_locations", (e) => nonEmpty(e.gyms?.chainLocations), "gym"],
  [
    "equipment_matrix",
    (e) => Object.keys(e.gyms?.equipmentMatrix ?? {}).length >= 3,
    "gym",
  ],
  ["equipment_gaps", (e) => nonEmpty(e.gyms?.equipmentGaps), null],
  [
    "nearest_race",
    (e) =>
      Boolean(
        e.races?.nearestRace &&
          e.races.nearestRace.distanceKm != null &&
          e.races.nearestRace.travelNote,
      ),
    null,
  ],
  ["race_history", (e) => nonEmpty(e.races?.raceHistory), null],
  ["next_3_races", (e) => nonEmpty(e.races?.next3Races), null],
  ["local_athlete_count", (e) => (e.results?.localAthleteCount?.count ?? 0) > 0, "results"],
  ["local_median_time", (e) => Boolean(e.results?.localMedianTime), "results"],
  ["local_fastest_time", (e) => Boolean(e.results?.localFastestTime), "results"],
  ["notable_local_athletes", (e) => nonEmpty(e.results?.notableLocalAthletes), "results"],
  ["running_routes", (e) => (e.terrain?.runningRoutes?.length ?? 0) >= 2, null],
  ["parkrun_locations", (e) => nonEmpty(e.terrain?.parkrunLocations), null],
  ["run_clubs", (e) => nonEmpty(e.community?.runClubs), null],
  // bens_take handled separately (word count + anti-templating).
];

// bensTake anti-templating: any shared 10-word shingle between two takes.
const shingles = (text) => {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
  const out = new Set();
  for (let i = 0; i + SHINGLE_SIZE <= words.length; i++)
    out.add(words.slice(i, i + SHINGLE_SIZE).join(" "));
  return out;
};
const takeShingles = new Map();
for (const [slug, e] of enrichments)
  if (typeof e.bensTake === "string") takeShingles.set(slug, shingles(e.bensTake));
const templatedTakes = new Set();
const takeEntries = [...takeShingles.entries()];
for (let i = 0; i < takeEntries.length; i++)
  for (let j = i + 1; j < takeEntries.length; j++) {
    const [slugA, a] = takeEntries[i];
    const [slugB, b] = takeEntries[j];
    for (const s of a)
      if (b.has(s)) {
        templatedTakes.add(slugA);
        templatedTakes.add(slugB);
        break;
      }
  }

// ── Evaluate ─────────────────────────────────────────────────────────
const results = {};
for (const loc of registry) {
  const e = enrichments.get(loc.slug) ?? {};
  const populated = [];
  const categories = new Set();
  for (const [name, test, category] of FIELDS) {
    let ok = false;
    try {
      ok = Boolean(test(e));
    } catch {
      errors.push(`${loc.slug}: field "${name}" has unexpected shape`);
    }
    if (ok) {
      populated.push(name);
      if (category) categories.add(category);
    }
  }
  if (typeof e.bensTake === "string") {
    const words = e.bensTake.trim().split(/\s+/).filter(Boolean).length;
    if (words >= MIN_BENS_TAKE_WORDS && !templatedTakes.has(loc.slug)) {
      populated.push("bens_take");
    } else if (templatedTakes.has(loc.slug)) {
      errors.push(`${loc.slug}: bens_take shares a ${SHINGLE_SIZE}-word run with another location — takes must be original per page`);
    }
  }
  const missingMandatory = [];
  if (!categories.has("gym")) missingMandatory.push("gym/facility record");
  if (!categories.has("results")) missingMandatory.push("results/performance data point");
  const publishable =
    populated.length >= MIN_POPULATED_FIELDS && missingMandatory.length === 0;

  /**
   * What actually governs the site today.
   *
   * The gate above is the spec in docs/strategy/rules/uniqueness-validator.md,
   * and nothing consumes it: `getPublishableSlugs()` has no callers, and the
   * 3,764 geo pages render from the registry. So the validator reported
   * "0/1885 publishable" on every build while 3,764 pages shipped, which is
   * not a gate holding the line — it is a number nobody can act on.
   *
   * The rule that does hold the line is `indexable` in lib/locations/seo.ts:
   * a page enters the index when it has something local to say. Mirrored here
   * so the report describes the site that exists. The two are deliberately
   * both reported rather than reconciled: the strict gate is still the
   * standard we want, and it becomes reachable the moment the results layer
   * has a source (growth-plan open question 1).
   */
  const hasGym = categories.has("gym");
  const hasTerrain =
    nonEmpty(e.terrain?.parkrunLocations) ||
    (e.terrain?.runningRoutes?.length ?? 0) >= 2;
  const hasEvidence = nonEmpty(loc.keywordEvidence);
  const indexed = hasGym || hasTerrain || hasEvidence;

  results[loc.slug] = {
    publishable,
    indexed,
    populatedFields: populated,
    missingMandatory,
  };
}

// ── Outputs ──────────────────────────────────────────────────────────
if (errors.length) {
  console.error("\nLOCATION VALIDATOR — STRUCTURAL ERRORS\n");
  for (const err of errors) console.error("  ✗ " + err);
  console.error(`\n${errors.length} error(s). Fix the data — the gate has no bypass.\n`);
  process.exit(1);
}

const publishable = Object.entries(results).filter(([, r]) => r.publishable);
const enrichedBlocked = Object.entries(results).filter(
  ([slug, r]) => !r.publishable && enrichments.has(slug),
);
const bare = registry.length - publishable.length - enrichedBlocked.length;

const status = {
  generatedAt: new Date().toISOString().slice(0, 10),
  gate: {
    minPopulatedFields: MIN_POPULATED_FIELDS,
    mandatoryCategories: ["gym/facility record", "results/performance data point"],
    note:
      "`publishable` is the strict spec gate and currently governs nothing: " +
      "getPublishableSlugs() has no callers. `indexed` mirrors the rule that " +
      "does govern robots and the sitemap (lib/locations/seo.ts, getGeoSeo().indexable). " +
      "The strict gate becomes reachable once the results layer has a source.",
  },
  locations: results,
};
writeFileSync(
  path.join(DATA_DIR, "publish-status.json"),
  JSON.stringify(status, null, 2) + "\n",
);

const legacy = registry.filter((l) => l.legacy);
const legacyPassing = legacy.filter((l) => results[l.slug].publishable);
const indexedCount = Object.values(results).filter((r) => r.indexed).length;
const lines = [
  "# Location uniqueness validator — report",
  "",
  `Generated by \`scripts/validate-locations.mjs\` on ${status.generatedAt}. Do not edit.`,
  "",
  `Strict gate: ≥${MIN_POPULATED_FIELDS} populated unique-data fields, including at least`,
  "one gym/facility record and one results/performance data point",
  "(docs/strategy/rules/uniqueness-validator.md).",
  "",
  "**Read the two numbers below as two different questions.** The strict gate",
  "governs nothing today: `getPublishableSlugs()` has no callers, and the geo",
  "pages render from the registry. It reported `0/1885 publishable` on every",
  "build while 3,764 pages shipped, which is a number nobody could act on.",
  "",
  "What actually governs robots and the sitemap is `getGeoSeo().indexable` in",
  "lib/locations/seo.ts — a page enters the index when it has something local",
  "to say. That rule is mirrored here as **Indexed**.",
  "",
  "Both are kept rather than reconciled. The strict gate is still the standard,",
  "and it becomes reachable the moment the results layer has a source.",
  "",
  "## Summary",
  "",
  `| | Count |`,
  `|---|---|`,
  `| Locations in registry | ${registry.length} |`,
  `| **Indexed** (the rule the site runs on) | ${indexedCount} |`,
  `| Publishable (pass the strict gate) | ${publishable.length} |`,
  `| Enriched but short of the strict gate | ${enrichedBlocked.length} |`,
  `| Identity only (no enrichment yet) | ${bare} |`,
  "",
];
if (publishable.length) {
  lines.push("## Publishable", "");
  for (const [slug, r] of publishable)
    lines.push(`- **${slug}** — ${r.populatedFields.join(", ")}`);
  lines.push("");
}
if (enrichedBlocked.length) {
  lines.push("## Enriched but blocked", "");
  for (const [slug, r] of enrichedBlocked)
    lines.push(
      `- **${slug}** — has: ${r.populatedFields.join(", ") || "nothing countable"}; ` +
        `missing mandatory: ${r.missingMandatory.join(" and ") || "none"} ` +
        `(${r.populatedFields.length}/${MIN_POPULATED_FIELDS} fields)`,
    );
  lines.push("");
}
lines.push(
  "## Legacy pages audit",
  "",
  `${legacy.length} locations have live pages today (three templates each: /hyrox,`,
  "/hyrox-training, /personal-trainer) that predate this gate. Of those,",
  `**${legacyPassing.length} would pass it**. The gate does not unpublish them — that is a`,
  "decision for Kieron. See the recommendations in the Phase D report.",
  "",
  "## What unblocks pages",
  "",
  "1. **Gym layer** — seed and verify gyms per town (Hyrox club directory,",
  "   chain locators, Google Places). Biggest single data job; unblocked now.",
  "2. **Results layer** — blocked on growth-plan open question 1 (results",
  "   data source). Every page needs one results data point to pass the strict",
  "   gate, so nothing passes it until this resolves. Note this blocks the",
  "   gate, not the pages: they index on the rule above and have done since",
  "   the geo programme shipped.",
  "3. **bens_take** — human-written paragraph per location, min 40 words.",
  "",
);
writeFileSync(path.join(ROOT, "docs", "location-validator-report.md"), lines.join("\n"));

console.log(
  `Locations: ${indexedCount}/${registry.length} indexed · ` +
    `${publishable.length} pass the strict gate (needs the results layer) · ` +
    `${bare} identity-only · report: docs/location-validator-report.md`,
);
