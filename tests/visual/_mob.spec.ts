import { test, chromium } from "@playwright/test";
const BASE = "http://localhost:3123";
const PAGES = ["/results","/results/tools","/events","/results/city","/results/city/london","/results/course-index","/event/s9-2026-london","/ranking/s9-2026-london-hyrox-men","/result/s9-2026-london-hyrox-men-1600","/report/s9-2026-london-hyrox-men-1600","/athlete/charlie-johansson","/rankings","/rankings/records","/simulator","/results/compare","/tools/good-hyrox-time","/reports","/starters/s9-2026-dublin"];
// 320 is the narrowest real phone; 360 is the commonest Android; 390 is iPhone.
const WIDTHS = [320, 360, 390];

test("mobile sweep", async () => {
  test.setTimeout(25 * 60 * 1000);
  const b = await chromium.launch();
  const findings: string[] = [];
  for (const w of WIDTHS) {
    const c = await b.newContext({ viewport: { width: w, height: 844 }, hasTouch: true, isMobile: true });
    const p = await c.newPage();
    for (const path of PAGES) {
      const res = await p.goto(BASE + path, { waitUntil: "load", timeout: 40000 }).catch(() => null);
      if (!res || res.status() >= 400) { findings.push(`${w} ${path} HTTP ${res?.status()}`); continue; }
      await p.waitForTimeout(1400);
      const r = await p.evaluate(() => {
        const doc = document.documentElement;
        const over = doc.scrollWidth - doc.clientWidth;
        // Tap targets that are neither prose links nor opted out.
        const small: string[] = [];
        for (const el of Array.from(document.querySelectorAll("main button, main a[class*='rounded'], main input, main select"))) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (el.closest("[data-inline-tap]") || el.hasAttribute("data-inline-tap")) continue;
          if (rect.height < 36) small.push(`${el.tagName.toLowerCase()} ${Math.round(rect.width)}x${Math.round(rect.height)} "${(el.textContent ?? "").trim().slice(0,20)}"`);
        }
        // Anything the bottom tab bar covers.
        const bar = document.querySelector("nav[aria-label*='ections'], nav[class*='fixed'][class*='bottom']");
        const barTop = bar ? bar.getBoundingClientRect().top : Infinity;
        const covered = Array.from(document.querySelectorAll("main button, main a[class*='rounded']"))
          .filter((el) => { const rr = el.getBoundingClientRect(); return rr.height > 0 && rr.bottom > barTop && rr.top < barTop; }).length;
        return { over, small: small.slice(0, 3), covered };
      });
      if (r.over > 1) findings.push(`${w} ${path} OVERFLOW ${r.over}px`);
      for (const s of r.small) findings.push(`${w} ${path} SMALL ${s}`);
      if (r.covered > 0) findings.push(`${w} ${path} COVERED ${r.covered} controls under the tab bar`);
    }
    await c.close();
  }
  await b.close();
  console.log(`\n===== MOBILE: ${findings.length} finding(s) =====`);
  for (const f of findings.slice(0, 30)) console.log("  " + f);
  if (!findings.length) console.log("  clean at 320, 360 and 390");
});
