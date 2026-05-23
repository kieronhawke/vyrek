#!/usr/bin/env node
import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

await mkdir(OUT, { recursive: true });

const PAGES = [
  { name: "partner-dashboard-login", path: "/partners/dashboard" },
  { name: "partner-onboard-invalid", path: "/partners/onboard?token=garbage" },
];

const VIEWPORTS = [
  { name: "desktop-1440", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  { name: "mobile-390", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
];

for (const vp of VIEWPORTS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const out = join(OUT, `${p.name}--${vp.name}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`[${vp.name}] ${p.path} -> ${out}`);
  }
  await browser.close();
}
