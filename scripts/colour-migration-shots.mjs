#!/usr/bin/env node
// Capture the 5 brief-mandated pages at mobile-390 + desktop-1440.
// Output: docs/colour-migration-screenshots/<route>--<vp>.png

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SHOT_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/docs/colour-migration-screenshots";
await mkdir(OUT, { recursive: true });

const ROUTES = [
  { name: "home", path: "/" },
  { name: "quiz", path: "/quiz" },
  { name: "plan", path: "/plan" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
];

const VIEWPORTS = [
  { name: "m390", engine: "webkit", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  { name: "d1440", engine: "chromium", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
];

for (const vp of VIEWPORTS) {
  const browser = await (vp.engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  for (const r of ROUTES) {
    await page.goto(`${BASE}${r.path}`, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(400);
    const out = `${OUT}/${r.name}--${vp.name}.png`;
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  ${vp.name} ${r.path} -> ${out}`);
  }
  await browser.close();
}
