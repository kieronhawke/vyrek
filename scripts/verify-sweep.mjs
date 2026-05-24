#!/usr/bin/env node
// Capture every key surface at mobile-390 + desktop-1440.
// Output: scripts/audit-shots/<route>--<vp>.png

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/scripts/audit-shots-v2";
await mkdir(OUT, { recursive: true });

const EMAIL = "demo@vyrek.test";
const PASSWORD = "VyrekDemo2026!";

const ROUTES_PUBLIC = [
  "/",
  "/programmes",
  "/plans",
  "/plans/sub-90-hyrox-training-plan",
  "/how-it-works",
  "/about",
  "/partners",
  "/contact",
  "/pricing",
  "/blog",
  "/blog/12-week-hyrox-training-plan",
  "/blog/category/training",
  "/hyrox",
  "/hyrox/london",
  "/hyrox/stations/sled-push",
  "/quiz",
  "/login",
];

const ROUTES_MEMBER = [
  "/app/today",
  "/app/plan",
  "/app/plan/stations",
  "/app/nutrition",
  "/app/analysis",
  "/app/account",
];

const VIEWPORTS = [
  { name: "m390", engine: "webkit", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  { name: "d1440", engine: "chromium", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
];

for (const vp of VIEWPORTS) {
  const browser = await (vp.engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();

  // PUBLIC
  for (const path of ROUTES_PUBLIC) {
    const name = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "_");
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${name}--${vp.name}.png`, fullPage: true });
      console.log(`  ${vp.name} ${path}`);
    } catch (e) {
      console.log(`  ✗ ${vp.name} ${path}: ${e.message.slice(0, 80)}`);
    }
  }

  // MEMBER (sign in first)
  await page.goto(`${BASE}/login?next=/app/today`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 20000 });
  } catch {
    console.log(`  ✗ ${vp.name} sign-in failed`);
    await browser.close();
    continue;
  }

  for (const path of ROUTES_MEMBER) {
    const name = path.replace(/^\//, "").replace(/\//g, "_");
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${name}--${vp.name}.png`, fullPage: true });
      console.log(`  ${vp.name} ${path}`);
    } catch (e) {
      console.log(`  ✗ ${vp.name} ${path}: ${e.message.slice(0, 80)}`);
    }
  }

  await browser.close();
}

console.log(`\nSaved to ${OUT}`);
