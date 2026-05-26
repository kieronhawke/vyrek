/**
 * Lighthouse against the live prod deploy. Mobile only (390x844). Saves
 * full JSON to .lighthouse-live/ and prints a compact summary, then a
 * "top opportunities" rollup for any route with a sub-95 score.
 *
 * Usage: BASE=https://vyrek-...vercel.app node scripts/lighthouse-live.mjs
 */
import lighthouse from "lighthouse";
import * as ChromeLauncher from "chrome-launcher";
import { mkdir, rm, writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".lighthouse-live");
const BASE = process.env.BASE || process.argv[2];
if (!BASE) throw new Error("Set BASE=https://<prod-url>");

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/quiz", name: "quiz" },
  { path: "/pricing", name: "pricing" },
  { path: "/programmes", name: "programmes" },
  { path: "/blog", name: "blog-index" },
  { path: "/blog/first-hyrox-preparation-guide", name: "blog-post" },
  { path: "/partners", name: "partners" },
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const chrome = await ChromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

const rows = [];
try {
  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`;
    try {
      const result = await lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          disabled: false,
        },
      });
      const lhr = result.lhr;
      const cats = lhr.categories;
      await writeFile(join(OUT, `${route.name}.json`), JSON.stringify(lhr, null, 2));
      rows.push({
        route: route.path,
        name: route.name,
        perf: cats.performance?.score,
        a11y: cats.accessibility?.score,
        bp: cats["best-practices"]?.score,
        seo: cats.seo?.score,
        lcp: lhr.audits["largest-contentful-paint"]?.numericValue,
        cls: lhr.audits["cumulative-layout-shift"]?.numericValue,
        tbt: lhr.audits["total-blocking-time"]?.numericValue,
        fcp: lhr.audits["first-contentful-paint"]?.numericValue,
      });
      console.error(`✓ ${route.name}`);
    } catch (err) {
      console.error(`✗ ${route.name} — ${err.message}`);
    }
  }
} finally {
  await chrome.kill();
}

function pct(s) {
  if (s == null) return "  -";
  return Math.round(s * 100).toString().padStart(3, " ");
}

console.log("\nLive Lighthouse (mobile) — " + BASE);
console.log("Route                 Perf  A11y  BP   SEO    LCP     CLS    TBT");
console.log("─".repeat(72));
for (const r of rows) {
  console.log(
    `${r.name.padEnd(20)} ${pct(r.perf)}   ${pct(r.a11y)}   ${pct(r.bp)}  ${pct(r.seo)}   ${Math.round(r.lcp ?? 0).toString().padStart(5, " ")}ms ${(r.cls ?? 0).toFixed(3)}  ${Math.round(r.tbt ?? 0).toString().padStart(4, " ")}ms`,
  );
}
console.log("");

// Top opportunities for any sub-95 perf
for (const r of rows) {
  if ((r.perf ?? 0) >= 0.95) continue;
  console.log(`\n── ${r.name} (perf ${pct(r.perf)}) ──`);
  const lhr = JSON.parse(await readFile(join(OUT, `${r.name}.json`), "utf8"));
  const opps = Object.values(lhr.audits).filter(
    (a) =>
      a.details?.type === "opportunity" &&
      a.numericValue > 50 &&
      a.score !== null &&
      a.score < 0.9,
  );
  opps.sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0));
  for (const a of opps.slice(0, 6)) {
    console.log(
      `  ${a.title} — ${Math.round(a.numericValue)}ms · ${a.displayValue ?? ""}`,
    );
  }
}

// Accessibility violations rollup
console.log("\n── Accessibility issues ──");
for (const r of rows) {
  const lhr = JSON.parse(await readFile(join(OUT, `${r.name}.json`), "utf8"));
  const fails = Object.values(lhr.audits).filter(
    (a) =>
      a.scoreDisplayMode === "binary" &&
      a.score === 0 &&
      (lhr.categories.accessibility.auditRefs ?? []).some((ref) => ref.id === a.id),
  );
  if (fails.length === 0) continue;
  console.log(`\n  ${r.name}:`);
  for (const f of fails) {
    console.log(`    - ${f.title}`);
  }
}
