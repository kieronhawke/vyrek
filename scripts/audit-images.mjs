#!/usr/bin/env node
// Spider key pages for <img> tags, HEAD-check each unique src, flag 404s
// and oversize assets.

import { chromium } from "@playwright/test";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";

const PAGES = [
  "/", "/about", "/pricing", "/programmes", "/how-it-works", "/press",
  "/press/brand-guidelines", "/partners", "/quiz",
  "/blog", "/blog/12-week-hyrox-training-plan",
  "/hyrox", "/hyrox/london", "/hyrox/events", "/hyrox/stations",
  "/hyrox/stations/ski-erg", "/compare", "/compare/hyrox-vs-crossfit",
  "/topics", "/plans", "/plans/sub-90-hyrox-training-plan",
  "/legal/privacy", "/legal/terms",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const allSrcs = new Map(); // url -> first page seen
for (const path of PAGES) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 20000 });
    const srcs = await page.$$eval("img", (imgs) => imgs.map((i) => i.currentSrc || i.src).filter(Boolean));
    for (const s of srcs) {
      if (!allSrcs.has(s)) allSrcs.set(s, path);
    }
    process.stdout.write(`.`);
  } catch (e) {
    process.stdout.write(`x`);
  }
}
await browser.close();
console.log(`\n${allSrcs.size} unique img sources across ${PAGES.length} pages`);

const failures = [];
const oversize = [];
let i = 0;
for (const [url, foundOn] of allSrcs) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const size = Number(r.headers.get("content-length") ?? "0");
    if (!r.ok) failures.push({ url, status: r.status, foundOn });
    if (size > 0 && size > 500 * 1024) oversize.push({ url, size, foundOn });
    if (++i % 25 === 0) process.stdout.write(`${i}…`);
  } catch (e) {
    failures.push({ url, err: e.message.slice(0, 80), foundOn });
  }
}

console.log(`\n\nFAILED (${failures.length}):`);
for (const f of failures) console.log(`  [${f.status ?? "ERR"}] ${f.url}  (first on ${f.foundOn})`);

console.log(`\nOVERSIZE >500KB (${oversize.length}):`);
for (const o of oversize.sort((a, b) => b.size - a.size).slice(0, 20)) {
  console.log(`  ${(o.size / 1024).toFixed(0)}KB  ${o.url}  (${o.foundOn})`);
}
