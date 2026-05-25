import lighthouse from "lighthouse";
import * as ChromeLauncher from "chrome-launcher";

const chrome = await ChromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

for (const url of ["https://vyrek.vercel.app/", "https://vyrek.vercel.app/quiz"]) {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyAudits: [
      "largest-contentful-paint",
      "largest-contentful-paint-element",
      "lcp-lazy-loaded",
      "unsized-images",
      "preload-lcp-image",
      "render-blocking-resources",
      "uses-responsive-images",
      "modern-image-formats",
      "uses-optimized-images",
    ],
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
    },
  });
  const a = result.lhr.audits;
  console.log("\n=== " + url + " ===");
  console.log("LCP:", a["largest-contentful-paint"].displayValue);
  const lcpEl = a["largest-contentful-paint-element"];
  console.log("LCP element:", lcpEl?.displayValue ?? "n/a");
  if (lcpEl?.details?.items?.[0]) {
    console.log("LCP element detail:", JSON.stringify(lcpEl.details.items[0]).slice(0, 400));
  }
  console.log("Preload LCP image:", a["preload-lcp-image"]?.score, a["preload-lcp-image"]?.displayValue ?? "");
  console.log("Render-blocking resources score:", a["render-blocking-resources"]?.score);
  if (a["render-blocking-resources"]?.details?.items) {
    for (const item of a["render-blocking-resources"].details.items.slice(0, 5)) {
      console.log("  blocking:", item.url, item.wastedMs + "ms");
    }
  }
}
await chrome.kill();
