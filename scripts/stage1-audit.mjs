#!/usr/bin/env node
// Stage 1.3 + 1.4 + 1.5 — capture key pages at desktop 1280/1440/1920 + mobile 375/390/414.
// Saves to docs/{desktop,mobile,blog-desktop}-audit-screenshots/

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "https://vyrek.vercel.app";
const ROOT = "/Users/kieronhawke/code/vyrek/docs";
await mkdir(`${ROOT}/desktop-audit-screenshots`, { recursive: true });
await mkdir(`${ROOT}/mobile-audit-screenshots`, { recursive: true });
await mkdir(`${ROOT}/blog-desktop-screenshots`, { recursive: true });

const PUBLIC = [
  ["home", "/"],
  ["programmes", "/programmes"],
  ["how-it-works", "/how-it-works"],
  ["about", "/about"],
  ["partners", "/partners"],
  ["contact", "/contact"],
  ["pricing", "/pricing"],
  ["blog", "/blog"],
  ["blog-post", "/blog/12-week-hyrox-training-plan"],
  ["results", "/results"],
  ["results-events", "/results/events"],
  ["quiz", "/quiz"],
  ["login", "/login"],
];

const browser = await chromium.launch();

// Desktop 1280 / 1440 / 1920
for (const w of [1280, 1440, 1920]) {
  const ctx = await browser.newContext({ ...devices["Desktop Chrome"], viewport: { width: w, height: 900 } });
  const page = await ctx.newPage();
  for (const [name, path] of PUBLIC) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${ROOT}/desktop-audit-screenshots/${name}-${w}.png`,
        fullPage: true,
      });
      // Also capture blog post under its own dir per Stage 1.3
      if (name === "blog-post") {
        await page.screenshot({
          path: `${ROOT}/blog-desktop-screenshots/blog-post-${w}.png`,
          fullPage: true,
        });
      }
      console.log(`  d${w}  ${path}`);
    } catch (e) {
      console.log(`  ✗ d${w} ${path}: ${e.message.slice(0, 80)}`);
    }
  }
  await ctx.close();
}

// Mobile 375 / 390 / 414
for (const w of [375, 390, 414]) {
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: w, height: 844 },
  });
  const page = await ctx.newPage();
  for (const [name, path] of PUBLIC) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: `${ROOT}/mobile-audit-screenshots/${name}-${w}.png`,
        fullPage: true,
      });
      console.log(`  m${w}  ${path}`);
    } catch (e) {
      console.log(`  ✗ m${w} ${path}: ${e.message.slice(0, 80)}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log("\nDone");
