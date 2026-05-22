import lighthouse from "lighthouse";
import * as ChromeLauncher from "chrome-launcher";

const base = process.argv[2] || "http://localhost:3000";
const routes = [
  { path: "/blog", name: "blog-index" },
  { path: "/blog/first-hyrox-preparation-guide", name: "post-1" },
  { path: "/blog/12-week-hyrox-training-plan", name: "post-2" },
  { path: "/blog/category/training", name: "category" },
  { path: "/blog/author/james-wright", name: "author" },
];

const chrome = await ChromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox"],
});

console.log("\nLighthouse · mobile\n────────────────────────────────────────────────────────────────────────");
console.log("ROUTE                                                Perf  A11y  BP   SEO   LCP    CLS    TBT");
console.log("────────────────────────────────────────────────────────────────────────────────────────────");

try {
  for (const r of routes) {
    const result = await lighthouse(base + r.path, {
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
    const c = result.lhr.categories;
    const a = result.lhr.audits;
    const fmt = (s) =>
      s === null || s === undefined ? "  -" : Math.round(s * 100).toString().padStart(3);
    console.log(
      r.path.padEnd(53),
      fmt(c.performance.score),
      fmt(c.accessibility.score).padStart(5),
      fmt(c["best-practices"].score).padStart(4),
      fmt(c.seo.score).padStart(4),
      Math.round(a["largest-contentful-paint"].numericValue).toString().padStart(5) + "ms",
      a["cumulative-layout-shift"].numericValue.toFixed(3).padStart(5),
      Math.round(a["total-blocking-time"].numericValue).toString().padStart(3) + "ms",
    );
  }
} finally {
  await chrome.kill();
}
console.log("");
