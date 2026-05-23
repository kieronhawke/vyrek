#!/usr/bin/env node
// Walk the V3 quiz end-to-end by choosing the first option on each screen.
// Capture every URL transition + every console error.

import { chromium } from "@playwright/test";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const events = [];
page.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text();
    if (!/posthog|gtag|hotjar|favicon/i.test(t)) events.push({ kind: "console", text: t.slice(0, 200) });
  }
});
page.on("pageerror", (e) => events.push({ kind: "pageerror", text: e.message.slice(0, 200) }));

console.log("Opening /quiz");
await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
events.push({ kind: "url", at: page.url() });

// Welcome carousel: tap Skip or wait for it to auto-advance, then start.
for (let step = 0; step < 30; step++) {
  await page.waitForTimeout(500);
  const url = page.url();

  // 1) Try a "Start" / "Get started" / "Find my plan" button
  // 2) Then a single-select option (first listbox option)
  // 3) Then a "Continue" button
  const candidates = [
    'button:has-text("Start")',
    'button:has-text("Get started")',
    'button:has-text("Find my plan")',
    'button:has-text("Continue")',
    'button:has-text("Next")',
    'a:has-text("Continue")',
    '[role="radio"]', // single-select
    'button:not(:has-text("Skip")):not(:has-text("Close"))', // primary
  ];

  let advanced = false;
  for (const sel of candidates) {
    const loc = page.locator(sel).first();
    if (await loc.isVisible().catch(() => false)) {
      try {
        await loc.click({ timeout: 2000 });
        advanced = true;
        events.push({ kind: "click", step, sel, url });
        break;
      } catch { /* try next */ }
    }
  }

  if (!advanced) {
    events.push({ kind: "stuck", step, url, html: (await page.content()).slice(0, 500) });
    console.log(`  STUCK at step ${step}, url=${url}`);
    break;
  }

  // After click, wait a tick for url / state transition
  await page.waitForTimeout(700);
  if (page.url() !== url) events.push({ kind: "navigate", from: url, to: page.url(), step });

  // Termination conditions
  if (/\/quiz\/done|\/pricing|\/plan(?:\?|$)|\/account\/create/.test(page.url())) {
    events.push({ kind: "completed", url: page.url() });
    console.log(`  COMPLETED at ${page.url()}`);
    break;
  }
}

await page.screenshot({ path: "/tmp/quiz-final.png", fullPage: true });
console.log(`\nFinal URL: ${page.url()}`);
console.log(`Events: ${events.length}`);
console.log(`Console errors: ${events.filter(e => e.kind === "console" || e.kind === "pageerror").length}`);

const ev = events.filter(e => e.kind === "console" || e.kind === "pageerror");
for (const e of ev.slice(0, 10)) console.log(`  ${e.kind}: ${e.text}`);

await browser.close();
