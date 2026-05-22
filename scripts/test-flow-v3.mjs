/**
 * Functional smoke test for Quiz V3.
 *
 * Walks the V3 happy path on a real Chrome at 390×844 (iPhone-ish):
 *   carousel → intent → interstitial-1 → experience → race-date →
 *   interstitial-2 → activity → calibration → days → session length →
 *   location → partner → injuries → plan summary → account creation screen
 *
 * Stops short of submitting the account form (would attempt real Supabase
 * Auth signup). One screenshot per stop in .screenshots/v3-flow/.
 *
 * Usage: node scripts/test-flow-v3.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".screenshots", "v3-flow");
const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const clickByText = (page, text) =>
  page.evaluate((needle) => {
    const buttons = Array.from(document.querySelectorAll("button, a"));
    const target = buttons.find((b) =>
      (b.textContent || "").trim().toLowerCase().includes(needle.toLowerCase()),
    );
    if (!target) return false;
    target.click();
    return true;
  }, text);

const clickFirstContinue = (page) =>
  page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const target = buttons.find(
      (b) =>
        (b.textContent || "").trim().toLowerCase().startsWith("continue") ||
        (b.textContent || "").trim().toLowerCase().startsWith("save my") ||
        (b.textContent || "").trim().toLowerCase().startsWith("see my"),
    );
    if (!target) return { clicked: false, found: false };
    if (target.disabled) return { clicked: false, found: true, disabled: true };
    target.click();
    return { clicked: true };
  });

const captureScreenInfo = (page) =>
  page.evaluate(() => {
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? null;
    const counter =
      document.querySelector('[class*="font-mono"][class*="tracking-"]')
        ?.textContent ?? null;
    return { url: location.pathname, h1, counter };
  });

const log = (label, info) =>
  console.log(
    `[${label.padEnd(28)}] url=${info.url} counter=${info.counter ?? "—"} h1="${info.h1}"`,
  );

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars", "--no-sandbox"],
});

let pass = true;
const reasons = [];

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // 1. Open /quiz — welcome carousel
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle2" });
  // Clear localStorage so the test always starts fresh
  await page.evaluate(() => {
    window.localStorage.removeItem("vyrek:quiz:v3:state");
    window.localStorage.removeItem("vyrek:customer:uuid");
  });
  await page.reload({ waitUntil: "networkidle2" });
  await settle(600);
  await page.screenshot({ path: join(OUT, "01-welcome.png") });
  log("welcome-carousel", await captureScreenInfo(page));

  // Click "Find your plan →"
  if (!(await clickByText(page, "Find your plan"))) {
    pass = false;
    reasons.push("Could not find 'Find your plan' CTA on welcome");
  }
  await settle(500);
  await page.screenshot({ path: join(OUT, "02-primary-intent.png") });
  log("primary-intent", await captureScreenInfo(page));

  // 2. Primary intent — pick "first Hyrox"
  await clickByText(page, "Training for my first Hyrox");
  await settle(250);
  const c1 = await clickFirstContinue(page);
  if (!c1.clicked) {
    pass = false;
    reasons.push("Could not click Continue on primary-intent");
  }
  await settle(500);
  await page.screenshot({ path: join(OUT, "03-reassurance-1.png") });
  log("reassurance-1", await captureScreenInfo(page));

  // 3. Reassurance interstitial — Continue
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "04-experience.png") });
  log("experience", await captureScreenInfo(page));

  // 4. Experience — "Never raced" (skips best-time)
  await clickByText(page, "Never raced");
  await settle(250);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "05-race-date.png") });
  log("race-date", await captureScreenInfo(page));

  // 5. Race date — skip
  await clickByText(page, "No race booked");
  await settle(500);
  await page.screenshot({ path: join(OUT, "06-reassurance-2.png") });
  log("reassurance-2", await captureScreenInfo(page));

  // 6. Reassurance 2 — Continue
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "07-activity.png") });
  log("activity-baseline", await captureScreenInfo(page));

  // 7. Activity baseline — "Training 3-4 days a week"
  await clickByText(page, "Training 3-4 days a week");
  await settle(250);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "08-calibration.png") });
  log("calibration", await captureScreenInfo(page));

  // 8. Calibration — pick Men's, ensure weight pre-filled 75 (default)
  await clickByText(page, "Men's standards");
  // Ensure weight input has a value
  await page.evaluate(() => {
    const input = document.querySelector('input[type="number"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )?.set;
    if (setter) setter.call(input, "75");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(300);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "09-frequency.png") });
  log("frequency", await captureScreenInfo(page));

  // 9. Frequency — pick 4 days
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll("button")).find((b) => {
      const t = (b.textContent || "").trim();
      return t.startsWith("4 days") || t.includes("4 days");
    });
    if (card) card.click();
  });
  await settle(250);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "10-session-length.png") });
  log("session-length", await captureScreenInfo(page));

  // 10. Session length — pick 60 min
  await page.evaluate(() => {
    const card = Array.from(document.querySelectorAll("button")).find((b) =>
      (b.textContent || "").trim().startsWith("60 min"),
    );
    if (card) card.click();
  });
  await settle(250);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "11-location.png") });
  log("location", await captureScreenInfo(page));

  // 11. Location — pick gym-standard (skips equipment)
  await clickByText(page, "Standard commercial gym");
  await settle(250);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "12-partner.png") });
  log("partner", await captureScreenInfo(page));

  // 12. Partner — pick "Solo for now, partner later" (tests addendum addition)
  await clickByText(page, "Solo for now, partner later");
  await settle(250);
  await clickFirstContinue(page);
  await settle(500);
  await page.screenshot({ path: join(OUT, "13-injuries.png") });
  log("injuries", await captureScreenInfo(page));

  // 13. Injuries — pick "No injuries"
  await clickByText(page, "No injuries, all clear");
  await settle(250);
  await clickFirstContinue(page);
  await settle(800); // give plan-summary animation time to start
  await page.screenshot({ path: join(OUT, "14-plan-summary.png") });
  log("plan-summary", await captureScreenInfo(page));

  // Verify the summary contains the user's calibration and partner answer
  const summary = await page.evaluate(() => document.body.innerText);
  if (!summary.includes("Solo for now")) {
    pass = false;
    reasons.push("Plan summary did not include 'Solo for now, partner later'");
  }
  if (!summary.includes("4 sessions per week")) {
    pass = false;
    reasons.push("Plan summary did not include '4 sessions per week'");
  }
  if (!summary.includes("FIRST RACE PROGRAMME")) {
    pass = false;
    reasons.push("Plan summary did not show FIRST RACE PROGRAMME");
  }

  // 14. Save my plan → account creation
  await clickFirstContinue(page);
  await settle(700);
  await page.screenshot({ path: join(OUT, "15-account-creation.png") });
  log("account-creation", await captureScreenInfo(page));

  // Verify we landed on account creation
  const accountVisible = await page.evaluate(() => {
    return document.body.innerText.includes("Save your plan");
  });
  if (!accountVisible) {
    pass = false;
    reasons.push("Did not reach account-creation screen");
  }

  // Verify localStorage state has expected fields
  const finalState = await page.evaluate(() => {
    const raw = window.localStorage.getItem("vyrek:quiz:v3:state");
    return raw ? JSON.parse(raw) : null;
  });

  console.log("\n=== Final localStorage state ===");
  console.log(JSON.stringify(finalState?.answers, null, 2));

  if (!finalState?.answers) {
    pass = false;
    reasons.push("No quiz state persisted");
  } else {
    const a = finalState.answers;
    if (!Array.isArray(a.intent) || !a.intent.includes("first-hyrox")) {
      pass = false;
      reasons.push("intent missing first-hyrox");
    }
    if (a.sex !== "men") {
      pass = false;
      reasons.push(`sex expected 'men', got '${a.sex}'`);
    }
    if (typeof a.weight !== "number" || a.weight < 30 || a.weight > 200) {
      pass = false;
      reasons.push(`weight invalid: ${a.weight}`);
    }
    if (a.partner !== "solo-partner-later") {
      pass = false;
      reasons.push(`partner expected 'solo-partner-later', got '${a.partner}'`);
    }
    if (a.activity !== "regular") {
      pass = false;
      reasons.push(`activity expected 'regular', got '${a.activity}'`);
    }
  }

  console.log(`\nResult: ${pass ? "✓ PASS" : "✗ FAIL"}`);
  if (!pass) {
    console.log("Failures:");
    reasons.forEach((r) => console.log(`  - ${r}`));
  }
} finally {
  await browser.close();
}

process.exit(pass ? 0 : 1);
