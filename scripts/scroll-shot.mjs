#!/usr/bin/env node
// Scroll through landing page slowly and screenshot each viewport-height
// chunk to test whether sections actually become visible to real users.

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "scroll-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
const vh = 900;
const steps = Math.ceil(totalHeight / vh);

console.log(`Total height: ${totalHeight}px, ${steps} scroll steps`);

for (let i = 0; i < steps; i++) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), i * vh);
  // Let intersection observer + animations settle
  await page.waitForTimeout(700);
  const out = join(OUT, `step-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`step ${i} -> ${out}`);
}
await browser.close();
