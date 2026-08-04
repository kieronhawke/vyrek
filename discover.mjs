import { chromium } from "@playwright/test";
const BASE = "http://localhost:3030";
// Index pages that list the dynamic children we want to sample.
const SEEDS = ["/blog", "/topics", "/events", "/hyrox/events", "/hyrox/stations",
  "/hyrox/gear", "/plans", "/compare", "/results", "/rankings", "/results/city",
  "/hyrox-training", "/personal-trainer", "/reports"];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:1440,height:900} });
const found = new Map();
for (const seed of SEEDS) {
  const p = await ctx.newPage();
  try {
    await p.goto(BASE + seed, { waitUntil: "load", timeout: 60000 });
    await p.waitForTimeout(400);
    const hrefs = await p.evaluate(() => [...document.querySelectorAll("a[href^='/']")]
      .map(a => a.getAttribute("href")).filter(Boolean));
    for (const h of hrefs) {
      const clean = h.split("?")[0].split("#")[0];
      const seg = clean.split("/").filter(Boolean);
      if (seg.length < 2) continue;
      // Group by the route shape so we sample one of each kind.
      const shape = "/" + seg.slice(0, -1).join("/") + "/*";
      if (!found.has(shape)) found.set(shape, clean);
    }
  } catch (e) { console.log("seed failed:", seed, String(e).slice(0,60)); }
  await p.close();
}
await b.close();
console.log(JSON.stringify([...found.entries()].sort(), null, 0));
