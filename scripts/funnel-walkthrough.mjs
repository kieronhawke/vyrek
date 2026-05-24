#!/usr/bin/env node
// Fix 6: E2E funnel walkthrough per the brief's 16 steps.
// Captures one screenshot per step into docs/funnel-walkthrough-screenshots/

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/docs/funnel-walkthrough-screenshots";
await mkdir(OUT, { recursive: true });

const EMAIL = "demo@vyrek.test";
const PASSWORD = "VyrekDemo2026!";

const findings = [];
function note(step, kind, msg) {
  findings.push({ step, kind, msg });
  console.log(`  [${kind}] step ${step}: ${msg}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  if (/posthog|hotjar|favicon|cookie/i.test(t)) return;
  findings.push({ step: "console", kind: "console-error", msg: t.slice(0, 200) });
});
page.on("pageerror", (e) => {
  findings.push({ step: "console", kind: "pageerror", msg: e.message.slice(0, 200) });
});

async function shoot(n, label) {
  const file = `${OUT}/step-${String(n).padStart(2, "0")}-${label}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  step ${String(n).padStart(2, "0")}  ${label}  -> ${file}`);
}

// 1. Land on /
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await shoot(1, "home");

// 2. Click "Find your plan"
const hero = page.locator('a:has-text("Find your plan")').first();
if (!(await hero.isVisible().catch(() => false))) {
  note(2, "MISS", `hero "Find your plan" anchor not visible at first viewport`);
} else {
  await hero.click();
  await page.waitForTimeout(800);
}
await shoot(2, "after-hero-cta-click");

// 3. Walk the quiz screens
console.log("\n--- Walking quiz screens ---");
let stuckKey = "";
let stuckCount = 0;
for (let i = 0; i < 25; i++) {
  await page.waitForTimeout(450);
  const h = (await page.locator("h1, h2").first().textContent().catch(() => "")) ?? "";
  const key = h.trim().slice(0, 50);
  if (key === stuckKey) stuckCount++;
  else { stuckCount = 0; stuckKey = key; }
  if (stuckCount > 3) {
    note(3, "STUCK", `quiz stuck on "${stuckKey}" at iteration ${i}`);
    await shoot(3, `stuck-${i}-${(key||"blank").replace(/[^a-z0-9]+/gi,"_").slice(0,20)}`);
    break;
  }

  if (/\/plan(?:\?|$)|\/welcome|\/quiz\/done|\/account\/create/.test(page.url())) {
    console.log(`  quiz reached ${page.url()}`);
    break;
  }

  // 1) primary affirmative CTA enabled
  const primary = page.locator(
    'button:has-text("Continue"):not([disabled]), button:has-text("See my plan"):not([disabled]), button:has-text("Save my plan"):not([disabled]), button:has-text("Find my plan"):not([disabled]), button:has-text("Save"):not([disabled])',
  ).first();
  if (await primary.isVisible().catch(() => false)) {
    await primary.click().catch(() => {});
    continue;
  }
  // 2) Calibration: number input + multiple aria-pressed groups (sex
  //    options + kg/lb unit toggle). Handle the whole screen in one
  //    iteration: pick first unpressed sex option, fill weight, click
  //    Continue. Otherwise the loop toggles kg<->lb forever because
  //    both buttons carry aria-pressed.
  if (await page.locator('input[type="number"]').first().isVisible().catch(() => false)) {
    const sex = page.locator('button[aria-pressed="false"]').first();
    if (await sex.isVisible().catch(() => false)) {
      await sex.click().catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.locator('input[type="number"]').first().fill("75");
    await page.locator('input[type="number"]').first().blur().catch(() => {});
    await page.waitForTimeout(300);
    const c2 = page.locator('button:has-text("Continue"):not([disabled])').first();
    if (await c2.isVisible().catch(() => false)) await c2.click().catch(() => {});
    continue;
  }
  // 3) single-select option (aria-pressed=false)
  const unpressed = page.locator('button[aria-pressed="false"]').first();
  if (await unpressed.isVisible().catch(() => false)) {
    await unpressed.click().catch(() => {});
    await page.waitForTimeout(250);
    const cont = page.locator('button:has-text("Continue"):not([disabled])').first();
    if (await cont.isVisible().catch(() => false)) await cont.click().catch(() => {});
    continue;
  }
  // 4) calendar cell
  const calBtn = page.locator('[role="gridcell"] button:not([disabled])').first();
  if (await calBtn.isVisible().catch(() => false)) {
    await calBtn.click().catch(() => {});
    await page.waitForTimeout(300);
    const c3 = page.locator('button:has-text("Continue"):not([disabled])').first();
    if (await c3.isVisible().catch(() => false)) await c3.click().catch(() => {});
    continue;
  }
  // 5) account-creation form
  if (await page.locator('input[type="email"]').isVisible().catch(() => false)) {
    const stamp = Date.now().toString(36);
    await page.fill('input[type="email"]', `funnel+${stamp}@vyrek.test`);
    await page.fill('input[type="password"]', "VyrekDemo2026!");
    const save = page.locator('button:has-text("See my plan"), button:has-text("Save my plan"), button[type="submit"]').first();
    if (await save.isVisible().catch(() => false)) {
      await save.click().catch(() => {});
      await page.waitForTimeout(2500);
    }
    continue;
  }
  // 6) any other visible CTA
  const any = page.locator('button:visible:not(:has-text("Skip")):not(:has-text("Back")):not([aria-label*="Close"])').first();
  if (await any.isVisible().catch(() => false)) {
    await any.click().catch(() => {});
    continue;
  }
  note(3, "DEAD", `no actionable element at "${key}"`);
  break;
}

// 4. Calculating cinematic — capture mid-flight
console.log("\n--- Step 4: calculating cinematic ---");
if (/\/quiz/.test(page.url())) {
  await page.waitForTimeout(800);
  await shoot(4, "calculating-mid");
}

// 5. Auto-route to /plan
console.log("\n--- Step 5: auto-route to /plan ---");
try {
  await page.waitForURL(/\/plan/, { timeout: 8000 });
} catch {
  note(5, "MISS", `did not auto-route to /plan within 8s; current url=${page.url()}`);
}
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(1200);
await shoot(5, "plan-landed");

// 6-9. /plan verifications
console.log("\n--- Steps 6-9: /plan content ---");
const week1Header = (await page.locator("text=/WEEK 1/").first().textContent().catch(() => null));
note(6, week1Header ? "OK" : "MISS", `Week 1 header: ${week1Header ?? "NOT FOUND"}`);

const weekCircles = await page.locator('[role="tablist"] button').count().catch(() => 0);
note(7, weekCircles >= 12 ? "OK" : "MISS", `week circles found: ${weekCircles}`);

const valueSection = (await page.locator("text=/WHAT YOU UNLOCK/").first().isVisible().catch(() => false));
note(8, valueSection ? "OK" : "MISS", `value section visible: ${valueSection}`);

const paywallCta = page.locator('button:has-text("Unlock my plan")').first();
const paywallSub = await page.locator("text=/No charge for 7 days/").first().isVisible().catch(() => false);
note(9, await paywallCta.isVisible().catch(() => false) ? "OK" : "MISS", `paywall "Unlock my plan" button visible`);
note(9, paywallSub ? "OK" : "MISS", `paywall "No charge for 7 days" subtext visible`);
await shoot(9, "plan-full");

// 10. Click "Unlock my plan"
console.log("\n--- Step 10: click Unlock my plan ---");
if (!(await paywallCta.isVisible().catch(() => false))) {
  note(10, "MISS", `Unlock my plan button not visible — cannot proceed to Stripe`);
} else {
  await paywallCta.click();
  await page.waitForTimeout(4000);
  await shoot(10, "after-unlock-click");

  // 11. Should be at Stripe checkout
  console.log("\n--- Step 11: verify Stripe redirect ---");
  const url = page.url();
  if (/checkout\.stripe\.com/.test(url)) {
    note(11, "OK", `at Stripe checkout: ${url.slice(0, 80)}`);
    await shoot(11, "stripe-checkout");

    note(12, "SKIP", `not entering real card details — Stripe test cards require real form interaction in their iframe; flag for manual verification`);
    note(13, "SKIP", `cannot fully test /welcome without completing Stripe`);
    note(14, "SKIP", `cannot fully test "Start training" without completing Stripe`);
    note(15, "SKIP", `cannot fully test return to /plan unlocked without completing Stripe`);
  } else {
    note(11, "MISS", `did not reach Stripe — current url=${url.slice(0, 100)}`);
  }
}

await browser.close();

console.log(`\n\n=== Walkthrough summary ===`);
console.log(`Total findings: ${findings.length}`);
const byKind = findings.reduce((acc, f) => { acc[f.kind] = (acc[f.kind] ?? 0) + 1; return acc; }, {});
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k}: ${n}`);

console.log(`\nDetails:`);
for (const f of findings) console.log(`  [step ${f.step}] [${f.kind}] ${f.msg}`);
