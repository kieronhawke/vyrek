import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3005/ranking/s9-2026-london-hyrox-men", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
const info = await p.evaluate(() => {
  const row = document.querySelector('[class*="results-band"] .flex.h-11');
  if (!row) return "no row";
  const kids = [...row.children].map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: (el.className||"").toString().slice(0,55), top: Math.round(r.top), h: Math.round(r.height) };
  });
  const link = row.querySelector("a");
  const lr = link.getBoundingClientRect();
  const rowR = row.getBoundingClientRect();
  return { rowTop: Math.round(rowR.top), rowH: Math.round(rowR.height), kids,
           link: { top: Math.round(lr.top), h: Math.round(lr.height), display: getComputedStyle(link).display, lh: getComputedStyle(link).lineHeight } };
});
console.log(JSON.stringify(info, null, 1));
await b.close();
