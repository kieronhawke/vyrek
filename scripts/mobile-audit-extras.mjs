#!/usr/bin/env node
// Top-of-viewport captures for the pages whose fullPage shots are too tall
// to inspect at a glance.

import { webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://vyrek.vercel.app";

const PAGES = [
  { name: "blog", path: "/blog" },
  { name: "blog-post", path: "/blog/hyrox-vs-spartan-vs-deka" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "about", path: "/about" },
  { name: "partners", path: "/partners" },
  { name: "partners-apply", path: "/partners/apply" },
  { name: "pricing", path: "/pricing" },
];

const vp = { name: "mobile-390", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } };

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await webkit.launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle", timeout: 25000 });
    await page.waitForTimeout(500);
    // Top-of-page
    await page.screenshot({ path: join(OUT, `mobile-${p.name}-top--${vp.name}.png`), fullPage: false });
    // Scroll to mid-content (1 viewport down)
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1, behavior: "instant" }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `mobile-${p.name}-vp1--${vp.name}.png`), fullPage: false });
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2, behavior: "instant" }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `mobile-${p.name}-vp2--${vp.name}.png`), fullPage: false });
    console.log(`captured ${p.name}`);
  }
  await ctx.close();
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
