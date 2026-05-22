/**
 * Capture screenshots of every route at mobile + desktop viewports using the
 * system Chrome.
 *
 * Sets the consent cookie before each visit so the cookie banner doesn't
 * cover the hero, and scrolls through each long page to trigger
 * `motion/react` `whileInView` animations before snapping fullPage.
 *
 * Usage: node scripts/screenshot.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".screenshots");
const BASE = process.argv[2] || "http://localhost:3000";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/pricing", name: "pricing" },
  { path: "/quiz", name: "quiz-intro" },
  { path: "/quiz/experience", name: "quiz-q1" },
  { path: "/quiz/days-per-week", name: "quiz-slider" },
  { path: "/quiz/done", name: "quiz-done" },
  { path: "/legal/privacy", name: "legal-privacy" },
  { path: "/account/refer", name: "account-refer" },
];

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { name: "desktop", width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
];

const CONSENT_VALUE = JSON.stringify({
  decided: true,
  categories: { necessary: true, analytics: false, marketing: false },
  decidedAt: new Date().toISOString(),
});

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--hide-scrollbars"],
});

try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport(vp);

    // Skip cookie banner by pre-seeding consent in localStorage on the origin.
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate((value) => {
      window.localStorage.setItem("vyrek:consent:v1", value);
    }, CONSENT_VALUE);

    for (const route of ROUTES) {
      const url = `${BASE}${route.path}`;
      try {
        await page.setViewport(vp);
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

        // Trigger every `whileInView` block by scrolling through the page.
        await page.evaluate(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const total = document.documentElement.scrollHeight;
          const step = Math.floor(window.innerHeight * 0.6);
          for (let y = 0; y < total; y += step) {
            window.scrollTo({ top: y, behavior: "instant" });
            await sleep(150);
          }
          window.scrollTo({ top: 0, behavior: "instant" });
          await sleep(250);
        });

        // Hide fixed-positioned chrome (nav + cookie banner) during capture
        // so they don't reappear at every scroll-stitch position.
        await page.addStyleTag({
          content: `
            header.fixed, [role="dialog"][aria-label="Cookie preferences"] {
              display: none !important;
            }
          `,
        });

        const file = join(OUT, `${vp.name}__${route.name}.png`);
        await page.screenshot({
          path: file,
          fullPage: true,
          captureBeyondViewport: true,
        });
        console.log(`✓ ${vp.name.padEnd(8)} ${route.path.padEnd(28)} → ${file.split("/").pop()}`);
      } catch (err) {
        console.error(`✗ ${vp.name} ${route.path} — ${err.message}`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`\nScreenshots written to ${OUT}`);
