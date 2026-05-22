/**
 * Functional smoke test of the quiz flow. Drives a real browser through:
 *   landing → /quiz → answer each question → /quiz/done → /pricing
 * Captures one screenshot per stop so we can confirm interactions work.
 *
 * Usage: node scripts/test-flow.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".screenshots", "flow");
const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

async function waitForUrlChange(page, opts = {}) {
  const startUrl = page.url();
  await page.waitForFunction(
    (start) => window.location.href !== start,
    { timeout: opts.timeout ?? 8000 },
    startUrl,
  );
  // Let the destination page settle
  await new Promise((r) => setTimeout(r, 350));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // Bypass cookie banner
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.setItem(
      "vyrek:consent:v1",
      JSON.stringify({
        decided: true,
        categories: { necessary: true, analytics: false, marketing: false },
      }),
    );
  });

  // 1. Landing → click "Find your plan"
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await page.screenshot({ path: join(OUT, "01-landing.png") });

  // Find the CTA and click it
  await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll("a")).find(
      (a) => a.textContent?.includes("Find your plan") && a.href.endsWith("/quiz"),
    );
    if (link) link.click();
  });
  await waitForUrlChange(page);

  // 2. Quiz intro — click Begin
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "02-quiz-intro.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Begin"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // 3. Q1 (experience) — pick "Raced one or more" (so finish-time appears)
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "03-q1-experience.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Raced one or more"),
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Next"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // 4. Q2 (finish-time) — pick "75 to 90 min"
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "04-q2-finish-time.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("75 to 90"),
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Next"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // 5. Q3 (partner) — pick Solo
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "05-q3-partner.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Solo",
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Next"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // 6. Slider (days-per-week) — default value is fine, just advance
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "06-q4-slider.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Next"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // 7. Location — pick gym-full
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "07-q5-location.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Full gym"),
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Next"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // (Equipment is skipped because location !== 'home')

  // 8. Session length — pick 60 min
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "08-q7-session.png") });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "60 min",
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.startsWith("Next"),
    );
    if (btn) btn.click();
  });
  await waitForUrlChange(page);

  // 9. Race date — skip
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: join(OUT, "09-q8-race-date.png") });
  await page.evaluate(() => {
    const skip = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("No race booked"),
    );
    if (skip) skip.click();
  });
  await waitForUrlChange(page);

  // 10. Done page
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: join(OUT, "10-quiz-done.png") });

  // Final state: did we land on /quiz/done?
  const url = page.url();
  console.log(`\nFinal URL: ${url}`);
  console.log(`Quiz flow completed: ${url.includes("/quiz/done") ? "✓ PASS" : "✗ FAIL"}\n`);
} finally {
  await browser.close();
}
