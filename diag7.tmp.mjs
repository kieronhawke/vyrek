import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3005/ranking/s9-2026-london-hyrox-men", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
console.log(await p.evaluate(() => {
  const span = document.querySelector('[class*="results-band"] .flex.h-11 > span:nth-child(2)');
  const kids = [...span.children].map(el => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls:(el.className||"").toString().slice(0,60), h: Math.round(r.height),
             ws: cs.whiteSpace, ov: cs.overflow, pos: cs.position, lh: cs.lineHeight, fs: cs.fontSize };
  });
  const a = span.querySelector("a");
  return JSON.stringify({ spanH: Math.round(span.getBoundingClientRect().height), kids,
    linkText: a.textContent, linkRects: a.getClientRects().length }, null, 1);
}));
await b.close();
