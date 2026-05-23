#!/usr/bin/env node
// One-shot screenshot script for QA. Saves labelled full-page screenshots
// into scripts/audit-shots/ so I can visually inspect each viewport+page.
//
// Run: node scripts/screenshot-audit.mjs

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const PAGES = [
  { name: "landing", path: "/" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "about", path: "/about" },
  { name: "contact", path: "/contact" },
  { name: "press", path: "/press" },
  { name: "journal", path: "/blog" },
  { name: "partners", path: "/partners" },
  { name: "partners-apply", path: "/partners/apply" },
  { name: "partners-dashboard", path: "/partners/dashboard" },
  { name: "legal-privacy", path: "/legal/privacy" },
  { name: "legal-terms", path: "/legal/terms" },
  { name: "legal-cookies", path: "/legal/cookies" },
  { name: "legal-refunds", path: "/legal/refunds" },
  { name: "quiz", path: "/quiz" },
  { name: "pricing", path: "/pricing" },
];

const VIEWPORTS = [
  { name: "mobile-375", engine: "webkit", config: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
  { name: "mobile-390", engine: "webkit", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  { name: "desktop-1440", engine: "chromium", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  for (const vp of VIEWPORTS) {
    const browser = await (vp.engine === "webkit" ? webkit : chromium).launch();
    const ctx = await browser.newContext(vp.config);
    const page = await ctx.newPage();
    for (const p of PAGES) {
      const url = `${BASE}${p.path}`;
      const out = join(OUT, `${p.name}--${vp.name}.png`);
      try {
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
        const status = resp ? resp.status() : "no-resp";
        // Wait a beat for above-the-fold animations to settle.
        await page.waitForTimeout(300);
        await page.screenshot({ path: out, fullPage: true });
        // eslint-disable-next-line no-console
        console.log(`[${vp.name}] ${status} ${p.path} -> ${out}`);
      } catch (e) {
        console.error(`[${vp.name}] FAILED ${p.path}: ${e.message}`);
      }
    }
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
