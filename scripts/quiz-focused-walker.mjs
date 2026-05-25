#!/usr/bin/env node
/**
 * Focused quiz walker. Programmatically advances through every V3 screen
 * by clicking real interactive elements, then captures the key screens.
 * Used to verify post-fix copy.
 */
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "docs/audit-2026-05-25-after/quiz-walk";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("PAGEERR:", e.message));

// Bypass cookies + skip welcome by clicking "Find your plan" then advancing
await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// Reject cookies if banner appears (so it doesn't overlap)
const reject = page.locator('button:has-text("Reject")').first();
if (await reject.isVisible({ timeout: 800 }).catch(() => false)) {
  await reject.click().catch(() => {});
  await page.waitForTimeout(300);
}

let step = 0;
const cap = async (label) => {
  step++;
  const n = String(step).padStart(2, "0");
  await page.screenshot({ path: `${OUT}/post-${n}-${label}.png`, fullPage: true });
  console.log(`✓ post-${n}-${label}`);
};

await cap("welcome-1");

// Welcome: click "Find your plan →" (matches the actual button text on welcome screen)
const findBtn = page.locator('button:has-text("Find your plan")').first();
await findBtn.click().catch(() => {});
await page.waitForTimeout(600);
await cap("q1-primary-intent");

// Q1 primary-intent: tap "Training for my first Hyrox"
await page.locator('button:has-text("Training for my first Hyrox")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("reassurance-1");

// Reassurance 1
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q2-experience");

// Q2 experience: tap "Never raced"
await page.locator('button:has-text("Never raced")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q3-race-date");

// Q3 race-date: "No race yet"
await page.locator('button:has-text("No race yet")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("reassurance-2");

// Reassurance 2
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q4-activity");

// Q4 activity: "Training 3-4 days a week"
await page.locator('button:has-text("Training 3-4")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q5-calibration");

// Q5 calibration: pick women's open standards + 70kg
await page.locator('button:has-text("Women")').first().click().catch(() => {});
await page.waitForTimeout(300);
const weight = page.locator('input[type="number"], input[inputmode="decimal"]').first();
await weight.fill("70");
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q6-frequency");

// Q6 frequency: 4 days
await page.locator('button').filter({ hasText: /^4 days/ }).first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q7-session-length");

// Q7 session-length: 60 min
await page.locator('button').filter({ hasText: /^60 min/ }).first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q8-location");

// Q8 location: home
await page.locator('button:has-text("Home setup")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q9-equipment");

// Q9 equipment: tap a few kits
for (const kit of ["Dumbbells", "Sandbag"]) {
  await page.locator(`button:has-text("${kit}")`).first().click().catch(() => {});
  await page.waitForTimeout(150);
}
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(600);
await cap("q10-injuries");

// Q10 injuries: no injuries
await page.locator('button:has-text("No injuries")').first().click().catch(() => {});
await page.waitForTimeout(200);
await page.locator('button:has-text("Continue")').first().click().catch(() => {});
await page.waitForTimeout(900);
await cap("plan-summary-top");

// Scroll to capture full plan summary
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
await page.waitForTimeout(400);
await cap("plan-summary-mid");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
await cap("plan-summary-bottom");

await page.locator('button:has-text("Save my plan")').first().click().catch(() => {});
await page.waitForTimeout(800);
await cap("account-creation");

await ctx.close();
await browser.close();
console.log("Done.");
