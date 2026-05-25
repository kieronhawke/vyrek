#!/usr/bin/env node
import lighthouse from "lighthouse";
import * as ChromeLauncher from "chrome-launcher";

const URLS = [
  "https://vyrek.vercel.app/blog/hyrox-sled-push-technique",
  "https://vyrek.vercel.app/blog/hyrox-station-weights-explained",
];
const chrome = await ChromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox"],
});
try {
  for (const url of URLS) {
    const result = await lighthouse(url, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "mobile",
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 3, disabled: false },
      throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
    });
    const c = result.lhr.categories;
    const a = result.lhr.audits;
    const fmt = (s) => Math.round((s ?? 0) * 100).toString().padStart(3);
    console.log(
      url.replace("https://vyrek.vercel.app", "").padEnd(50),
      "perf=" + fmt(c.performance.score),
      "lcp=" + Math.round(a["largest-contentful-paint"].numericValue) + "ms",
      "tbt=" + Math.round(a["total-blocking-time"].numericValue) + "ms",
    );
  }
} finally {
  await chrome.kill();
}
