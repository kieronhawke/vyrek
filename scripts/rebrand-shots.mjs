// Capture mobile + desktop screenshots of key pages post-rebrand.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = "docs/rebrand-screenshots";
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  ["home", "/"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["press", "/press"],
  ["programmes", "/programmes"],
  ["how-it-works", "/how-it-works"],
  ["journal", "/blog"],
  ["quiz", "/quiz"],
  ["pricing", "/pricing"],
  ["privacy", "/legal/privacy"],
];

const VIEWPORTS = [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1440, height: 900 }],
];

const browser = await chromium.launch();
for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  for (const [name, path] of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    // dismiss cookie banner for clean shots
    const reject = page.locator("button", { hasText: "Reject" }).first();
    if (await reject.isVisible().catch(() => false)) await reject.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}-${vpName}.png`, fullPage: false });
    // flag horizontal overflow
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (overflow > 1) console.log(`OVERFLOW ${name} ${vpName}: ${overflow}px`);
  }
  await ctx.close();
}
await browser.close();
console.log("done");
