#!/usr/bin/env node
// Walk /quiz as a real user, picking the FIRST option on each select
// screen, then explicit Continue. Capture every screen URL, every
// rendered question text, every console error and 4xx/5xx response.
// Save a screenshot of every screen for review.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const SHOTS = "/tmp/quiz-walk";
await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const errs = [];
const reqs = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/posthog|hotjar|favicon|cookie/i.test(m.text())) {
    errs.push(m.text().slice(0, 200));
  }
});
page.on("pageerror", (e) => errs.push(`pageerror: ${e.message.slice(0, 200)}`));
page.on("response", (r) => {
  const u = r.url();
  if (u.startsWith(BASE) && r.status() >= 400 && !/[?&]_rsc=/.test(u)) {
    reqs.push({ status: r.status(), url: u.slice(BASE.length, BASE.length + 100) });
  }
});

await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
console.log(`→ ${page.url()}`);

let stepKey = "";
let stuckCount = 0;
const maxSteps = 30;

for (let i = 0; i < maxSteps; i++) {
  await page.waitForTimeout(500);

  // Read question / screen identifier
  const headingText = (await page.locator("h1, h2").first().textContent().catch(() => "")) ?? "";
  const newKey = headingText.trim().slice(0, 50);
  if (newKey === stepKey) {
    stuckCount++;
    if (stuckCount > 2) {
      console.log(`  STUCK on "${stepKey}" — no progress in 3 cycles`);
      await page.screenshot({ path: `${SHOTS}/stuck-${i}.png`, fullPage: true });
      break;
    }
  } else {
    stuckCount = 0;
    stepKey = newKey;
  }

  const shot = `${SHOTS}/${String(i).padStart(2, "0")}-${newKey.replace(/[^a-z0-9]+/gi, "_").slice(0, 30) || "blank"}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  console.log(`  step ${String(i).padStart(2)}  url=${page.url().replace(BASE, "")}  Q="${newKey}"`);

  // Termination
  if (/\/plan(?:\?|$)|\/quiz\/done|\/account\/create/.test(page.url())) {
    console.log(`  ✓ REACHED ${page.url().replace(BASE, "")}`);
    break;
  }

  // Strategy:
  // 1) If there's a primary chartreuse pill that says Continue / Find my plan / Save / Get my, click it.
  // 2) If there are aria-pressed buttons (single-select options) and none pressed, pick first.
  // 3) If there are date-picker buttons (calendar), pick first enabled.
  // 4) Else: click the first non-Back, non-Skip, non-Close affordance.

  // 1: primary CTA
  const primary = page.locator('button:has-text("Continue"):not([disabled]), button:has-text("Find my plan"):not([disabled]), button:has-text("See my plan"):not([disabled]), button:has-text("Save"):not([disabled]), button:has-text("Get my"):not([disabled])').first();
  if (await primary.isVisible().catch(() => false)) {
    await primary.click().catch(() => {});
    continue;
  }

  // 2: pick first single-select
  const radios = page.locator('button[aria-pressed]');
  const anyPressed = await page.locator('button[aria-pressed="true"]').count();
  if ((await radios.count()) > 0 && anyPressed === 0) {
    await radios.first().click().catch(() => {});
    await page.waitForTimeout(400);
    const cont = page.locator('button:has-text("Continue"):not([disabled])').first();
    if (await cont.isVisible().catch(() => false)) await cont.click().catch(() => {});
    continue;
  }

  // 3: calendar buttons (RDP date cells have role gridcell containing buttons)
  const calBtn = page.locator('[role="gridcell"] button:not([disabled])').first();
  if (await calBtn.isVisible().catch(() => false)) {
    await calBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const cont2 = page.locator('button:has-text("Continue"):not([disabled])').first();
    if (await cont2.isVisible().catch(() => false)) await cont2.click().catch(() => {});
    continue;
  }

  // 4a: number input (e.g. calibration weight). On this screen there are
  // also sex options (OptionCard renders as button[aria-pressed]) plus
  // a kg/lb unit toggle (also aria-pressed). The unit defaults to "kg"
  // pressed, so the simple "any pressed" check is wrong for sex. Pick
  // the first UNPRESSED aria-pressed button instead.
  if (await page.locator('input[type="number"]').first().isVisible().catch(() => false)) {
    const unpressed = page.locator('button[aria-pressed="false"]').first();
    if (await unpressed.isVisible().catch(() => false)) {
      await unpressed.click().catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.locator('input[type="number"]').first().fill("75");
    await page.locator('input[type="number"]').first().blur().catch(() => {});
    await page.waitForTimeout(400);
    const cont3 = page.locator('button:has-text("Continue"):not([disabled])').first();
    if (await cont3.isVisible().catch(() => false)) await cont3.click().catch(() => {});
    continue;
  }

  // 4b: account-creation email + password
  if (await page.locator('input[type="email"]').isVisible().catch(() => false)) {
    // Use a unique email per run so account-creation doesn't 409 on retries
    const stamp = Date.now().toString(36);
    await page.fill('input[type="email"]', `demo+${stamp}@vyrek.test`);
    if (await page.locator('input[type="password"]').isVisible().catch(() => false)) {
      await page.fill('input[type="password"]', "VyrekDemo2026!");
    }
    const save = page.locator('button:has-text("See my plan"), button:has-text("Save"), button:has-text("Create"), button:has-text("Continue"), button[type="submit"]').first();
    if (await save.isVisible().catch(() => false)) {
      await save.click().catch(() => {});
      // Account creation does an async Supabase signUp + /api/account/create.
      // Give it real time before the next loop iteration.
      await page.waitForTimeout(2500);
    }
    continue;
  }

  // 5: any prominent button (welcome / interstitial / reassurance: a Start/Continue)
  const fallback = page.locator('button:visible:not([aria-label*="Close"]):not(:has-text("Skip")):not(:has-text("Back"))').first();
  if (await fallback.isVisible().catch(() => false)) {
    await fallback.click().catch(() => {});
    continue;
  }

  console.log(`  no actionable element found at step ${i}`);
  await page.screenshot({ path: `${SHOTS}/dead-${i}.png`, fullPage: true });
  break;
}

await page.screenshot({ path: `${SHOTS}/final.png`, fullPage: true });
console.log(`\nFinal URL: ${page.url()}`);
console.log(`Console errors: ${errs.length}`);
errs.slice(0, 5).forEach((e) => console.log(`  ${e}`));
console.log(`HTTP 4xx/5xx: ${reqs.length}`);
reqs.slice(0, 5).forEach((r) => console.log(`  ${r.status}  ${r.url}`));

await browser.close();
