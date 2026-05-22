/**
 * Run Lighthouse against a set of routes (mobile + desktop) and print a
 * compact summary. Saves the full JSON per run to .lighthouse/.
 *
 * Usage: node scripts/lighthouse.mjs [baseUrl]
 */

import lighthouse from "lighthouse";
import * as ChromeLauncher from "chrome-launcher";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".lighthouse");
const BASE = process.argv[2] || "https://vyrek.vercel.app";

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/pricing", name: "pricing" },
  { path: "/quiz", name: "quiz-intro" },
  { path: "/quiz/done", name: "quiz-done" },
];

const PRESETS = ["mobile", "desktop"];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const chrome = await ChromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

const baseOpts = {
  port: chrome.port,
  output: "json",
  logLevel: "error",
  onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
};

function format(score) {
  if (score === null || score === undefined) return "  -";
  const v = Math.round(score * 100);
  return v.toString().padStart(3, " ");
}

const rows = [];

try {
  for (const preset of PRESETS) {
    for (const route of ROUTES) {
      const url = `${BASE}${route.path}`;
      try {
        const result = await lighthouse(url, {
          ...baseOpts,
          formFactor: preset,
          screenEmulation:
            preset === "mobile"
              ? {
                  mobile: true,
                  width: 390,
                  height: 844,
                  deviceScaleFactor: 3,
                  disabled: false,
                }
              : {
                  mobile: false,
                  width: 1440,
                  height: 900,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
        });
        const lhr = result.lhr;
        const cats = lhr.categories;
        await writeFile(
          join(OUT, `${preset}__${route.name}.json`),
          JSON.stringify(lhr, null, 2),
        );
        rows.push({
          preset,
          route: route.path,
          perf: cats.performance?.score,
          a11y: cats.accessibility?.score,
          bp: cats["best-practices"]?.score,
          seo: cats.seo?.score,
          lcp: lhr.audits["largest-contentful-paint"]?.numericValue,
          cls: lhr.audits["cumulative-layout-shift"]?.numericValue,
          tbt: lhr.audits["total-blocking-time"]?.numericValue,
        });
      } catch (err) {
        console.error(`✗ ${preset} ${route.path} — ${err.message}`);
      }
    }
  }
} finally {
  await chrome.kill();
}

console.log("\n──── Lighthouse summary ─────────────────────────────────────────");
console.log(
  "Preset   Route                Perf  A11y  BP   SEO   LCP    CLS    TBT",
);
console.log("─────────────────────────────────────────────────────────────────");
for (const r of rows) {
  console.log(
    `${r.preset.padEnd(8)} ${r.route.padEnd(20)} ${format(r.perf)}   ${format(r.a11y)}   ${format(r.bp)}  ${format(r.seo)}   ${Math.round(r.lcp ?? 0).toString().padStart(4, " ")}ms ${(r.cls ?? 0).toFixed(3)}  ${Math.round(r.tbt ?? 0).toString().padStart(3, " ")}ms`,
  );
}
console.log("─────────────────────────────────────────────────────────────────\n");

// Print top opportunities for any score < 95
for (const r of rows) {
  if ((r.perf ?? 0) < 0.95) {
    const lhr = JSON.parse(
      await import("node:fs").then((fs) =>
        fs.promises.readFile(join(OUT, `${r.preset}__${ROUTES.find((x) => x.path === r.route).name}.json`), "utf8"),
      ),
    );
    const opps = Object.values(lhr.audits)
      .filter(
        (a) =>
          a.details?.type === "opportunity" &&
          a.numericValue &&
          a.numericValue > 100,
      )
      .sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0))
      .slice(0, 3);
    if (opps.length) {
      console.log(`\n${r.preset} ${r.route} top opportunities:`);
      for (const o of opps) {
        console.log(
          `  ${Math.round(o.numericValue ?? 0)}ms — ${o.title}`,
        );
      }
    }
  }
}
