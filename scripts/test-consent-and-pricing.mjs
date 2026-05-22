/**
 * Verify:
 *   1. Cookie banner appears on every page (not just /), after 1.5s delay
 *   2. After accepting, banner doesn't show again
 *   3. Press page no longer renders £14.99
 *   4. Pricing page shows £4.99
 *   5. Quiz page hero no longer says "90 seconds"
 *
 * Usage: node scripts/test-consent-and-pricing.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const settle = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

let pass = true;
const fail = (msg) => {
  pass = false;
  console.log("  ✗ " + msg);
};

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // Clear consent and visit /quiz first
  console.log("\n[1] Cookie banner appears on /quiz");
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.removeItem("vyrek:consent:v1");
  });
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle2" });
  await settle(2200); // wait past the 1500ms delay + grace
  const bannerOnQuiz = await page.evaluate(() => {
    const dialogs = Array.from(
      document.querySelectorAll('[role="dialog"]'),
    );
    return dialogs.some((d) =>
      (d.textContent || "").includes("We use cookies"),
    );
  });
  if (!bannerOnQuiz) fail("Cookie banner did not appear on /quiz");
  else console.log("  ✓ banner visible on /quiz");

  // Accept all
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => (b.textContent || "").trim() === "Accept all",
    );
    btn?.click();
  });
  await settle(500);
  const bannerGone = await page.evaluate(() => {
    const dialogs = Array.from(
      document.querySelectorAll('[role="dialog"]'),
    );
    return !dialogs.some((d) =>
      (d.textContent || "").includes("We use cookies"),
    );
  });
  if (!bannerGone) fail("Cookie banner did not dismiss after Accept all");
  else console.log("  ✓ banner dismisses after Accept all");

  // Reload to confirm consent is persistent
  await page.reload({ waitUntil: "networkidle2" });
  await settle(2200);
  const bannerStillGone = await page.evaluate(() => {
    const dialogs = Array.from(
      document.querySelectorAll('[role="dialog"]'),
    );
    return !dialogs.some((d) =>
      (d.textContent || "").includes("We use cookies"),
    );
  });
  if (!bannerStillGone) fail("Cookie banner re-appears after consent given");
  else console.log("  ✓ banner stays dismissed after reload");

  console.log("\n[2] Press page price is £4.99, not £14.99");
  await page.goto(`${BASE}/press`, { waitUntil: "networkidle2" });
  const pressText = await page.evaluate(() => document.body.innerText);
  if (pressText.includes("£14.99")) fail("Press page still mentions £14.99");
  else console.log("  ✓ no £14.99");
  if (!pressText.includes("£4.99")) fail("Press page missing £4.99");
  else console.log("  ✓ includes £4.99");
  if (pressText.includes("90-second")) fail("Press page still says 90-second");
  else console.log("  ✓ no '90-second' wording");

  console.log("\n[3] Pricing page hero is £4.99");
  await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle2" });
  const pricingText = await page.evaluate(() => document.body.innerText);
  if (pricingText.includes("£14.99")) fail("Pricing page still mentions £14.99");
  else console.log("  ✓ no £14.99 on /pricing");
  if (!pricingText.includes("£4.99")) fail("Pricing page missing £4.99");
  else console.log("  ✓ includes £4.99");

  console.log("\n[4] Landing hero copy");
  await page.goto(BASE, { waitUntil: "networkidle2" });
  const landingText = await page.evaluate(() => document.body.innerText);
  if (landingText.includes("in 90 seconds")) fail("Landing hero still says 'in 90 seconds'");
  else console.log("  ✓ no 'in 90 seconds'");
  if (!landingText.includes("Week 1")) fail("Landing missing 'Week 1' value claim");
  else console.log("  ✓ Week 1 value claim present");

  console.log("\n[5] How-it-works price update");
  await page.goto(`${BASE}/how-it-works`, { waitUntil: "networkidle2" });
  const howText = await page.evaluate(() => document.body.innerText);
  if (howText.includes("£14.99")) fail("How-it-works still says £14.99");
  else console.log("  ✓ no £14.99");
  if (howText.includes("90-second")) fail("How-it-works still says 90-second");
  else console.log("  ✓ no 90-second");

  console.log("\n[6] Terms price update");
  await page.goto(`${BASE}/legal/terms`, { waitUntil: "networkidle2" });
  const termsText = await page.evaluate(() => document.body.innerText);
  if (termsText.includes("£14.99")) fail("Terms still says £14.99");
  else console.log("  ✓ no £14.99");

  console.log("\n[7] FAQ on landing references £4.99");
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await settle(800);
  // Click first FAQ to expand if necessary
  await page.evaluate(() => {
    const summaries = Array.from(document.querySelectorAll("summary, button"));
    for (const s of summaries) {
      if ((s.textContent || "").includes("trial ends")) {
        s.click();
      }
    }
  });
  await settle(400);
  const faqText = await page.evaluate(() => document.body.innerText);
  if (faqText.includes("£14.99")) fail("FAQ still mentions £14.99");
  else console.log("  ✓ no £14.99 in FAQ");
  if (!faqText.includes("£4.99")) fail("FAQ missing £4.99");
  else console.log("  ✓ FAQ mentions £4.99");

  console.log("\n" + (pass ? "✓ PASS" : "✗ FAIL"));
} finally {
  await browser.close();
}

process.exit(pass ? 0 : 1);
