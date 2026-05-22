/**
 * Scrolls through a route and captures sequential viewport-sized PNGs.
 * Then stitches them into one tall image via sharp, scaling out any
 * fixed-positioned chrome (nav + cookie banner) so we get a clean
 * representation of the document flow.
 *
 * This sidesteps puppeteer's fullPage capture, which tiles the viewport
 * incorrectly on very tall pages (causing the hero to appear repeatedly).
 *
 * Usage: node scripts/screenshot-sections.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdir, rm, unlink } from "node:fs/promises";
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

    // Pre-seed consent so the cookie banner doesn't appear in shots.
    await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate((v) => window.localStorage.setItem("vyrek:consent:v1", v), CONSENT_VALUE);

    for (const route of ROUTES) {
      const url = `${BASE}${route.path}`;
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

        // Trigger every `whileInView` block first.
        await page.evaluate(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          const total = document.documentElement.scrollHeight;
          const step = Math.floor(window.innerHeight * 0.6);
          for (let y = 0; y < total; y += step) {
            window.scrollTo({ top: y, behavior: "instant" });
            await sleep(120);
          }
          window.scrollTo({ top: 0, behavior: "instant" });
          await sleep(250);
        });

        const docHeight = await page.evaluate(() =>
          Math.ceil(
            Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
            ),
          ),
        );

        // Hide fixed chrome only for sections past the first viewport — keep
        // them in the top shot so we still see the nav landing.
        const slices = [];
        const sliceOffsets = []; // actual top position in the stitched image
        let y = 0;
        let index = 0;
        let lastActualScroll = -1;
        while (y < docHeight) {
          if (index === 1) {
            await page.addStyleTag({
              content: `
                header.fixed, [role="dialog"][aria-label="Cookie preferences"] {
                  display: none !important;
                }
              `,
            });
          }
          const actualScroll = await page.evaluate((top) => {
            window.scrollTo({ top, behavior: "instant" });
            return Math.round(window.scrollY);
          }, y);
          // Stop if the browser clamped us back to a position we already
          // captured (last viewport reached).
          if (actualScroll === lastActualScroll) break;
          lastActualScroll = actualScroll;

          await new Promise((r) => setTimeout(r, 180));
          const tmp = join(OUT, `__tmp_${vp.name}_${route.name}_${index}.png`);
          await page.screenshot({ path: tmp, fullPage: false });
          slices.push(tmp);
          sliceOffsets.push(actualScroll);
          y += vp.height;
          index += 1;
        }

        // Stitch slices vertically — place each at its real scroll offset.
        const final = join(OUT, `${vp.name}__${route.name}.png`);
        const composite = slices.map((s, i) => ({
          input: s,
          top: sliceOffsets[i] * vp.deviceScaleFactor,
          left: 0,
        }));
        const w = vp.width * vp.deviceScaleFactor;
        const h = docHeight * vp.deviceScaleFactor;
        await sharp({
          create: {
            width: w,
            height: h,
            channels: 4,
            background: { r: 10, g: 10, b: 10, alpha: 1 },
          },
        })
          .composite(composite)
          .png()
          .toFile(final);
        await Promise.all(slices.map((s) => unlink(s).catch(() => {})));

        // Trim trailing empty space — crop to actual content.
        const trimmed = await sharp(final).trim({ background: "#0A0A0A", threshold: 12 }).toBuffer();
        await sharp(trimmed).toFile(final);

        const meta = await sharp(final).metadata();
        console.log(
          `✓ ${vp.name.padEnd(8)} ${route.path.padEnd(28)} → ${final.split("/").pop()} (${meta.width}x${meta.height})`,
        );
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
