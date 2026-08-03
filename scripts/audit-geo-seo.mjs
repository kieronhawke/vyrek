/**
 * The geo SEO gate.
 *
 * Every check here caught a real defect that tsc, the build and the test suite
 * all passed cleanly over:
 *
 *   - 17 town-vs-directory title collisions (Leeds the city, Leeds the county)
 *   - 60 expanded-market cities sharing a title with their UK namesake
 *   - Virginia the state against Virginia in South Africa
 *   - ~1,700 pages carrying a link to a page that does not exist
 *   - three hub pages saying "Suth Performance" twice
 *
 * None of those are type errors or failing assertions. They are properties of
 * the built output, and the only way to keep them fixed is to measure the
 * built output. Run after `next build`.
 *
 *   node scripts/audit-geo-seo.mjs            # report, exit 1 on failure
 *   node scripts/audit-geo-seo.mjs --report   # report only, always exit 0
 *
 * Thresholds are deliberately set at today's measured values, not at the
 * eventual targets. This gate stops things getting worse; docs/strategy/
 * geo-ranking-plan.md is the plan for making them better.
 */
import fs from "node:fs";
import path from "node:path";

const A = ".next/server/app/";
const reportOnly = process.argv.includes("--report");

const FAMILIES = [
  "personal-trainer", "hyrox-training",
  "personal-trainer/state", "hyrox-training/state",
  "personal-trainer/country", "hyrox-training/country",
  "personal-trainer/in", "hyrox-training/in",
  "personal-trainer/county", "hyrox-training/county",
  "de/hyrox-training", "fr/hyrox-training", "es/hyrox-training",
];

/** Ratchets. Raise them as the plan lands; never lower them silently. */
const LIMITS = {
  duplicateTitles: 0,
  duplicateDescriptions: 0,
  missingH1: 0,
  brokenLinks: 0,
  titlesOver65: 10,   // 8 Montreal boroughs; prefixed titles beat truncation
  minUniqueFraction: 0.65, // measured 0.71 on 3 Aug
};

if (!fs.existsSync(A)) {
  console.error("No build found. Run `next build` first.");
  process.exit(1);
}

const failures = [];
const note = (ok, label, detail) => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

const pagesIn = (dir) => {
  try {
    return fs.readdirSync(path.join(A, dir)).filter((f) => f.endsWith(".html"));
  } catch {
    return [];
  }
};

// ── Metadata uniqueness ──────────────────────────────────────────────
console.log("\nMetadata");
const titles = new Map(), descs = new Map();
let missingH1 = 0, longTitles = 0, total = 0;

for (const dir of FAMILIES) {
  for (const f of pagesIn(dir)) {
    const h = fs.readFileSync(path.join(A, dir, f), "utf8");
    const t = (h.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "";
    const d = (h.match(/name="description" content="([^"]*)"/) ?? [])[1] ?? "";
    const key = `${dir}/${f}`;
    if (!titles.has(t)) titles.set(t, []);
    titles.get(t).push(key);
    if (!descs.has(d)) descs.set(d, []);
    descs.get(d).push(key);
    if (!/<h1/.test(h)) missingH1++;
    if (t.length > 65) longTitles++;
    total++;
  }
}
const dupT = [...titles].filter(([, p]) => p.length > 1);
const dupD = [...descs].filter(([, p]) => p.length > 1);

console.log(`  ${total} geo pages`);
note(dupT.length <= LIMITS.duplicateTitles, "no duplicate titles", `${dupT.length} found`);
for (const [t, p] of dupT.slice(0, 5)) console.log(`      "${t.slice(0, 60)}" → ${p.slice(0, 3).join(", ")}`);
note(dupD.length <= LIMITS.duplicateDescriptions, "no duplicate descriptions", `${dupD.length} found`);
note(missingH1 <= LIMITS.missingH1, "every page has an H1", `${missingH1} missing`);
note(longTitles <= LIMITS.titlesOver65, "titles within 65 chars", `${longTitles} over (limit ${LIMITS.titlesOver65})`);

// ── Internal links resolve ───────────────────────────────────────────
console.log("\nInternal links");
const built = new Set(["/"]);
(function walk(d) {
  for (const e of fs.readdirSync(path.join(A, d), { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(d, e.name));
    else if (e.name.endsWith(".html"))
      built.add("/" + path.join(d, e.name.replace(/\.html$/, "")).replace(/^\.\//, "").replace(/\/index$/, ""));
  }
})(".");

const SKIP = /^\/(_next|api|media|login)|\.(xml|json|txt|jpg|png|svg|ico|webmanifest)$/;
const sampled = [];
for (const dir of FAMILIES) {
  const f = pagesIn(dir);
  const step = Math.max(1, Math.floor(f.length / 20));
  for (let i = 0; i < f.length && sampled.length < 260; i += step) sampled.push(path.join(dir, f[i]));
}
const broken = new Map();
for (const s of sampled) {
  const html = fs.readFileSync(path.join(A, s), "utf8");
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const l = m[1].replace(/\/$/, "") || "/";
    if (SKIP.test(l) || built.has(l)) continue;
    if (!broken.has(l)) broken.set(l, s);
  }
}
console.log(`  ${sampled.length} pages sampled against ${built.size} built routes`);
note(broken.size <= LIMITS.brokenLinks, "every internal link resolves", `${broken.size} broken`);
for (const [l, src] of [...broken].slice(0, 6)) console.log(`      ${l}  ← ${src}`);

// ── Content uniqueness ───────────────────────────────────────────────
console.log("\nContent uniqueness");
const textOf = (p) => {
  let h = fs.readFileSync(path.join(A, p), "utf8");
  const m = h.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (m) h = m[1];
  return h.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, "|")
    .replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
    .split("|").map((x) => x.trim()).filter((x) => x.split(" ").length >= 8);
};
const sample = [];
for (const dir of ["personal-trainer", "hyrox-training"]) {
  const f = pagesIn(dir);
  const step = Math.max(1, Math.floor(f.length / 60));
  for (let i = 0; i < f.length && sample.length < 120; i += step) sample.push(path.join(dir, f[i]));
}
const freq = new Map();
const blocksBy = new Map();
for (const p of sample) {
  const b = [...new Set(textOf(p))];
  blocksBy.set(p, b);
  for (const x of b) freq.set(x, (freq.get(x) ?? 0) + 1);
}
const words = (b) => b.split(" ").length;
let sharedW = 0, uniqueW = 0;
for (const b of blocksBy.values())
  for (const x of b) (freq.get(x) >= sample.length * 0.2 ? (sharedW += words(x)) : (uniqueW += words(x)));
const frac = uniqueW / (sharedW + uniqueW);
console.log(`  ${sample.length} pages · ${Math.round(uniqueW / sample.length)} unique words/page`);
note(frac >= LIMITS.minUniqueFraction, "unique content fraction",
  `${(frac * 100).toFixed(1)}% (floor ${(LIMITS.minUniqueFraction * 100).toFixed(0)}%)`);

// ── Verdict ──────────────────────────────────────────────────────────
console.log("");
if (!failures.length) {
  console.log("Geo SEO gate: passed.\n");
  process.exit(0);
}
console.log(`Geo SEO gate: ${failures.length} failure(s) — ${failures.join("; ")}\n`);
process.exit(reportOnly ? 0 : 1);
