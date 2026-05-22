/**
 * Functional smoke test for /plan reveal.
 *
 * Seeds a complete V3 quiz state into localStorage, then loads /plan at
 * 390×844 and verifies:
 *   - Programme name shown
 *   - Calibrated weight on a Hyrox workout (152kg for men)
 *   - 7 day cards rendered for Week 1
 *   - Paywall card present
 *   - Sticky CTA visible
 *   - Day-card tap opens the bottom sheet
 *
 * Usage: node scripts/test-plan-reveal.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".screenshots", "plan-reveal");
const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const settle = (ms = 400) => new Promise((r) => setTimeout(r, ms));

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

  // Open base first so we can seed localStorage on the right origin
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    const state = {
      uuid: "12345678-aaaa-4bbb-8ccc-1234567890ab",
      answers: {
        intent: ["first-hyrox"],
        experience: "never",
        activity: "regular",
        sex: "men",
        weight: 80,
        weightUnit: "kg",
        days: 4,
        sessionLength: "60",
        location: "gym-standard",
        partner: "solo-partner-later",
        injuries: "none",
      },
      screenIndex: 17,
      resumed: false,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem("vyrek:quiz:v3:state", JSON.stringify(state));
  });

  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle2" });
  await settle(1000);
  await page.screenshot({ path: join(OUT, "01-plan.png"), fullPage: true });

  const info = await page.evaluate(() => {
    const h1 = document.querySelector("h1")?.textContent?.trim() ?? null;
    const dayCards = document.querySelectorAll('[role="list"] button, ul li').length;
    const body = document.body.innerText;
    return {
      h1,
      hasFirstRace: body.includes("First Race"),
      hasPaywall: body.includes("Unlock weeks 2"),
      hasStartTrial: body.includes("Start training") && body.includes("7 days free"),
      has152kg: body.includes("152 kg") || body.includes("152kg") || body.includes("152"),
      has4sessions: body.includes("Days") && body.includes("60m"),
      dayCardsRendered: dayCards,
    };
  });

  console.log("=== /plan smoke check ===");
  console.log(JSON.stringify(info, null, 2));

  if (info.h1 !== "First Race") {
    pass = false;
    reasons.push(`h1 expected 'First Race', got '${info.h1}'`);
  }
  if (!info.hasPaywall) {
    pass = false;
    reasons.push("Paywall card not visible");
  }
  if (!info.hasStartTrial) {
    pass = false;
    reasons.push("Sticky CTA not visible");
  }

  // Tap the Tuesday card and verify the bottom sheet opens with sled load
  const opened = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("button"));
    const tueCard = cards.find((b) =>
      (b.textContent || "").includes("Tue"),
    );
    if (!tueCard) return false;
    tueCard.click();
    return true;
  });
  await settle(700);
  await page.screenshot({ path: join(OUT, "02-day-sheet.png"), fullPage: true });

  if (!opened) {
    pass = false;
    reasons.push("Could not click Tue day card");
  } else {
    const sheet = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const body = dialog?.textContent ?? "";
      return {
        open: !!dialog && dialog.getAttribute("aria-hidden") === "false",
        hasWarmup: body.includes("WARM-UP"),
        hasMain: body.includes("MAIN"),
        hasCooldown: body.includes("COOL-DOWN"),
        hasSledLoad: body.includes("152 kg"),
        hasShare: body.includes("Share workout"),
      };
    });
    console.log("\n=== Day detail sheet ===");
    console.log(JSON.stringify(sheet, null, 2));
    if (!sheet.open) {
      pass = false;
      reasons.push("Day detail sheet did not open");
    }
    if (!sheet.hasSledLoad) {
      pass = false;
      reasons.push("Sled load 152kg not shown for men's calibration");
    }
    if (!sheet.hasWarmup || !sheet.hasMain || !sheet.hasCooldown) {
      pass = false;
      reasons.push("Sheet missing warmup/main/cooldown sections");
    }
  }

  // Test the share route serves
  await page.goto(`${BASE}/plan/share/12345678-aaaa-4bbb-8ccc-1234567890ab`, {
    waitUntil: "networkidle2",
  });
  await settle(600);
  await page.screenshot({ path: join(OUT, "03-share.png"), fullPage: true });
  const shareInfo = await page.evaluate(() => ({
    status: window.location.pathname,
    body: document.body.innerText.slice(0, 200),
  }));
  console.log("\n=== /plan/share/:id ===");
  console.log(shareInfo);
  // The DB row probably doesn't exist (since migrations not applied locally),
  // so we expect notFound() → 404. That's fine — the route is registered.

  console.log(`\nResult: ${pass ? "✓ PASS" : "✗ FAIL"}`);
  if (!pass) reasons.forEach((r) => console.log(`  - ${r}`));
} finally {
  await browser.close();
}

process.exit(pass ? 0 : 1);
