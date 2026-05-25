#!/usr/bin/env node
/**
 * Mobile Lighthouse pass on top 8 pages. Compact table output + JSON dump.
 */
import lighthouse from "lighthouse";
import * as ChromeLauncher from "chrome-launcher";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.argv[2] || "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/scripts/lighthouse-top8";
await mkdir(OUT, { recursive: true });

const ROUTES = [
  { path: "/", name: "home" },
  { path: "/programmes", name: "programmes" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/quiz", name: "quiz" },
  { path: "/blog", name: "blog" },
  { path: "/blog/hyrox-station-weights-explained", name: "blog-station-weights" },
  { path: "/partners", name: "partners" },
  { path: "/contact", name: "contact" },
];

const chrome = await ChromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

console.log("\nLighthouse · mobile · vyrek.vercel.app");
console.log("────────────────────────────────────────────────────────────────────────────────────");
console.log("ROUTE                                Perf A11y  BP  SEO    LCP    CLS   TBT");
console.log("────────────────────────────────────────────────────────────────────────────────────");

const results = [];
try {
  for (const r of ROUTES) {
    try {
      const result = await lighthouse(BASE + r.path, {
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
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
      });
      const c = result.lhr.categories;
      const a = result.lhr.audits;
      const fmt = (s) =>
        s === null || s === undefined ? "  -" : Math.round(s * 100).toString().padStart(3);
      const row = {
        route: r.path,
        name: r.name,
        perf: Math.round((c.performance.score ?? 0) * 100),
        a11y: Math.round((c.accessibility.score ?? 0) * 100),
        bp: Math.round((c["best-practices"].score ?? 0) * 100),
        seo: Math.round((c.seo.score ?? 0) * 100),
        lcp: Math.round(a["largest-contentful-paint"].numericValue),
        cls: a["cumulative-layout-shift"].numericValue,
        tbt: Math.round(a["total-blocking-time"].numericValue),
      };
      results.push(row);
      console.log(
        r.path.padEnd(36),
        fmt(c.performance.score),
        fmt(c.accessibility.score).padStart(5),
        fmt(c["best-practices"].score).padStart(4),
        fmt(c.seo.score).padStart(4),
        (row.lcp + "ms").padStart(7),
        row.cls.toFixed(3).padStart(6),
        (row.tbt + "ms").padStart(5),
      );
    } catch (e) {
      console.error(`! ${r.path} failed: ${e.message?.slice(0, 100)}`);
      results.push({ route: r.path, name: r.name, error: e.message?.slice(0, 200) });
    }
  }
} finally {
  await chrome.kill();
}

await writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 2));
console.log("\nSaved to", `${OUT}/results.json`);
