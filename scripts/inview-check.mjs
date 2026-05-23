#!/usr/bin/env node
// Tests whether RevealOnView elements that are in the viewport at mount
// actually become visible (opacity 1), as opposed to staying at opacity 0
// because the IO never fires.

import { chromium, devices } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// All major sections by id. Query their first child opacity.
const sections = [
  "#hero-heading",
  "[aria-labelledby='what-you-get-heading']",
  "#programmes",
  "[aria-labelledby='dated-week-heading']",
  "[aria-labelledby='adapt-heading']",
  "[aria-labelledby='week-heading']",
  "[aria-labelledby='coaches-heading']",
  "[aria-labelledby='methodology-heading']",
  "[aria-labelledby='testimonials-heading']",
  "[aria-labelledby='faq-heading']",
  "[aria-labelledby='final-cta-heading']",
];

for (const sel of sections) {
  const result = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { sel: s, found: false };
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      sel: s,
      found: true,
      top: Math.round(rect.top),
      opacity: cs.opacity,
      visibility: cs.visibility,
      // Look at first child too; RevealOnView often wraps the section
      child: el.firstElementChild
        ? {
            opacity: getComputedStyle(el.firstElementChild).opacity,
            tag: el.firstElementChild.tagName,
          }
        : null,
    };
  }, sel);
  console.log(JSON.stringify(result));
}

await browser.close();
