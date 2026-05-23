#!/usr/bin/env node
// Run Lighthouse against 5 key pages (mobile + desktop) and persist scores.

import { execSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/scripts/stress-test/results/lighthouse";
await mkdir(OUT, { recursive: true });

const ROUTES = [
  { name: "home", path: "/" },
  { name: "quiz", path: "/quiz" },
  { name: "programmes", path: "/programmes" },
  { name: "pricing", path: "/pricing" },
  { name: "blog-post", path: "/blog/12-week-hyrox-training-plan" },
];

const PRESETS = [
  { name: "mobile", flag: "--preset=desktop --form-factor=mobile --screenEmulation.mobile=true --throttling.cpuSlowdownMultiplier=4" },
  { name: "desktop", flag: "--preset=desktop --form-factor=desktop --screenEmulation.mobile=false --throttling.cpuSlowdownMultiplier=1" },
];

const summary = [];

for (const route of ROUTES) {
  for (const preset of PRESETS) {
    const out = `${OUT}/${route.name}-${preset.name}.json`;
    const url = `${BASE}${route.path}`;
    console.log(`  ${route.name} (${preset.name}) …`);
    try {
      execSync(
        `npx --yes lighthouse "${url}" ${preset.flag} --quiet --output=json --output-path="${out}" --chrome-flags="--headless=new --no-sandbox" --max-wait-for-load=30000`,
        { stdio: "pipe", timeout: 90000 },
      );
      const data = JSON.parse(readFileSync(out, "utf8"));
      summary.push({
        route: route.path,
        viewport: preset.name,
        perf: Math.round((data.categories?.performance?.score ?? 0) * 100),
        a11y: Math.round((data.categories?.accessibility?.score ?? 0) * 100),
        bp: Math.round((data.categories?.["best-practices"]?.score ?? 0) * 100),
        seo: Math.round((data.categories?.seo?.score ?? 0) * 100),
        lcp_ms: Math.round(data.audits?.["largest-contentful-paint"]?.numericValue ?? 0),
        tbt_ms: Math.round(data.audits?.["total-blocking-time"]?.numericValue ?? 0),
        cls: Number((data.audits?.["cumulative-layout-shift"]?.numericValue ?? 0).toFixed(3)),
        fcp_ms: Math.round(data.audits?.["first-contentful-paint"]?.numericValue ?? 0),
        si_ms: Math.round(data.audits?.["speed-index"]?.numericValue ?? 0),
      });
    } catch (e) {
      console.log(`  ✗ ${route.name} ${preset.name}: ${e.message.slice(0, 80)}`);
      summary.push({ route: route.path, viewport: preset.name, error: e.message.slice(0, 80) });
    }
  }
}

await writeFile(`${OUT}/_summary.json`, JSON.stringify(summary, null, 2));
console.log(`\nSaved: ${OUT}/_summary.json`);
console.table(summary);
