#!/usr/bin/env node
/**
 * Interactive flow walker. Tests two critical user journeys:
 *   1. Quiz happy path (first-race persona, beginner, 3 days/week, no race)
 *   2. Partner application — all 11 screens, no submit
 *
 * Captures console errors, page errors, failed requests, and HTML snapshots
 * at each key step.
 */
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/scripts/flow-walker";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const issues = [];

async function track(page, label) {
  const errs = [];
  const failed = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (/posthog|gtag|gtm|sentry|hotjar|favicon|preload/i.test(t)) return;
    errs.push(`[${label}] ${t.slice(0, 200)}`);
  });
  page.on("pageerror", (e) => errs.push(`[${label}] pageerror: ${e.message.slice(0, 200)}`));
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (/posthog|gtag|gtm|favicon/.test(u)) return;
    failed.push(`[${label}] ${req.failure()?.errorText ?? "failed"} ${u.slice(0, 140)}`);
  });
  return { errs, failed };
}

// ──────────────────────────────────────────────────────
// FLOW 1: Quiz happy path
// ──────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const { errs, failed } = await track(page, "quiz");
  const steps = [];

  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/quiz-01-welcome.png` });
  steps.push({ step: "01-welcome", url: page.url() });

  // Tap through the 3-slide carousel
  for (let i = 0; i < 3; i++) {
    await page.locator('button[aria-label="Next slide"], [aria-label="Continue"], button:has-text("Continue"), button:has-text("Start")').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${OUT}/quiz-02-post-welcome.png` });
  steps.push({ step: "02-post-welcome", url: page.url() });

  // Try to advance through 6-8 question screens by clicking the first
  // selectable option then Continue
  for (let i = 0; i < 10; i++) {
    const url = page.url();
    // Pick the first unpressed option (radio or checkbox-style button)
    const optionBtn = page.locator('button[aria-pressed="false"], [role="radio"]:not([aria-checked="true"])').first();
    if (await optionBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await optionBtn.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    // Fill weight if calibration screen
    const numInput = page.locator('input[type="number"]').first();
    if (await numInput.isVisible({ timeout: 500 }).catch(() => false)) {
      await numInput.fill("75");
      await page.waitForTimeout(150);
    }
    // Click Continue if present
    const cont = page.locator('button:has-text("Continue"), button:has-text("Skip"), button:has-text("Save")').first();
    if (await cont.isEnabled({ timeout: 500 }).catch(() => false)) {
      await cont.click().catch(() => {});
      await page.waitForTimeout(700);
    } else {
      break;
    }
    if (page.url().includes("/calculating") || page.url().includes("/plan") || page.url().includes("account")) {
      steps.push({ step: `walker-stop-at-${i}`, url: page.url() });
      break;
    }
  }
  await page.screenshot({ path: `${OUT}/quiz-99-final.png`, fullPage: true });
  steps.push({ step: "99-final", url: page.url() });

  await ctx.close();
  issues.push({
    flow: "quiz",
    consoleErrors: errs,
    failedRequests: failed,
    steps,
  });
  console.log(`Quiz flow: ${steps.length} steps, ${errs.length} errors, ${failed.length} fails`);
}

// ──────────────────────────────────────────────────────
// FLOW 2: Partner application 11-screen wizard
// ──────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const { errs, failed } = await track(page, "partner");
  const steps = [];

  await page.goto(`${BASE}/partners/apply`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT}/partner-01-welcome.png` });
  steps.push({ step: "01-welcome", url: page.url() });

  // Welcome → Continue
  await page.locator('button:has-text("Continue")').first().click({ timeout: 5000 });
  await page.waitForTimeout(300);

  // Name
  await page.locator('input[name="name"]').fill("Test Applicant");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Email
  await page.locator('input[name="email"]').fill("test+walker@example.com");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Country
  await page.locator('input[name="country"]').fill("United Kingdom");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Platform (radio)
  await page.locator('input[type="radio"][value="Instagram"]').click();
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Followers (radio)
  await page.locator('input[type="radio"][value="5K to 20K"]').click();
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Content description (textarea)
  await page.locator('textarea[name="contentDescription"]').fill(
    "UK Hyrox training content, weekly station breakdowns, beginner-focused.",
  );
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Why Vyrek (textarea)
  await page.locator('textarea[name="whyVyrek"]').fill(
    "My audience asks me which programme to follow constantly. Vyrek is the cleanest answer.",
  );
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Primary URL
  await page.locator('input[name="primaryUrl"]').fill("https://instagram.com/test-applicant");
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Past affiliate (optional)
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(200);

  // Final screen: methods checkbox + terms — do NOT submit
  await page.locator('input[type="checkbox"][value="Organic posts"]').click();
  await page.locator('input[type="checkbox"][name="termsAccepted"]').click().catch(() => {});
  // Look for any checkbox that includes "terms"; fallback to first unchecked checkbox
  const termsBox = page.locator('label:has-text("accept the")').locator('input[type="checkbox"]');
  if (await termsBox.isVisible({ timeout: 500 }).catch(() => false)) {
    await termsBox.click().catch(() => {});
  }
  await page.screenshot({ path: `${OUT}/partner-99-final.png`, fullPage: true });
  steps.push({ step: "99-final-pre-submit", url: page.url() });

  // Verify submit button is enabled
  const submitBtn = page.locator('button[type="submit"]:has-text("Submit application")');
  const enabled = await submitBtn.isEnabled({ timeout: 1000 }).catch(() => false);
  steps.push({ step: "submit-enabled-check", url: page.url(), enabled });

  await ctx.close();
  issues.push({
    flow: "partner-application",
    consoleErrors: errs,
    failedRequests: failed,
    steps,
  });
  console.log(
    `Partner flow: ${steps.length} steps, ${errs.length} errors, ${failed.length} fails, submit enabled=${enabled}`,
  );
}

await browser.close();
await writeFile(`${OUT}/issues.json`, JSON.stringify(issues, null, 2));
console.log(`\nSaved: ${OUT}/issues.json`);
