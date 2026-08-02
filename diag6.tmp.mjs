import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3005/ranking/s9-2026-london-hyrox-men", { waitUntil: "networkidle" });
await p.waitForTimeout(1000);
console.log(await p.evaluate(() => {
  const link = document.querySelector('[class*="results-band"] .flex.h-11 a');
  const chain = [];
  let el = link;
  for (let i = 0; i < 4 && el; i++) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    chain.push({
      tag: el.tagName, cls: (el.className||"").toString().slice(0,70),
      h: Math.round(r.height), top: Math.round(r.top),
      display: cs.display, alignItems: cs.alignItems, alignSelf: cs.alignSelf,
      fontSize: cs.fontSize, lineHeight: cs.lineHeight,
    });
    el = el.parentElement;
  }
  const flag = document.querySelector('[class*="results-band"] .flex.h-11 span[aria-hidden]');
  const fr = flag?.getBoundingClientRect();
  return JSON.stringify({ chain, flag: fr ? { h: Math.round(fr.height), cls: flag.className } : null }, null, 1);
}));
await b.close();
