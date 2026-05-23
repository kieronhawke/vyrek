#!/usr/bin/env node
// Mobile-focused audit screenshot capture against the live site.
// Captures: 13 pages x 2 viewports, landing scroll stops, quiz screen sequence,
// /plan empty state. Writes to scripts/audit-shots/mobile-*--*.png

import { webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://vyrek.vercel.app";

const PAGES = [
  { name: "landing", path: "/" },
  { name: "quiz", path: "/quiz" },
  { name: "pricing", path: "/pricing" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "about", path: "/about" },
  { name: "partners", path: "/partners" },
  { name: "partners-apply", path: "/partners/apply" },
  { name: "partners-dashboard", path: "/partners/dashboard" },
  { name: "blog", path: "/blog" },
  { name: "blog-post", path: "/blog/hyrox-vs-spartan-vs-deka" },
  { name: "login", path: "/login" },
  { name: "admin-login", path: "/admin/login" },
  { name: "plan", path: "/plan" },
];

const VIEWPORTS = [
  { name: "mobile-375", config: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
  { name: "mobile-390", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
];

async function capturePages(browser, vp) {
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  for (const p of PAGES) {
    const url = `${BASE}${p.path}`;
    const out = join(OUT, `mobile-${p.name}--${vp.name}.png`);
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
      const status = resp ? resp.status() : "no-resp";
      // Scroll the page fully to trigger reveal animations, then back to top.
      const fullHeight = await page.evaluate(() => document.body.scrollHeight);
      const step = vp.config.viewport.height * 0.7;
      for (let y = 0; y < fullHeight; y += step) {
        await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: "instant" }), y);
        await page.waitForTimeout(120);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(400);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`[${vp.name}] ${status} ${p.path} -> ${out}`);
    } catch (e) {
      console.error(`[${vp.name}] FAILED ${p.path}: ${e.message}`);
    }
  }
  await ctx.close();
}

async function captureLandingScrollStops(browser, vp) {
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(600);
  const h = await page.evaluate(() => document.body.scrollHeight);
  const stops = [
    { name: "stop1-top", y: 0 },
    { name: "stop2-hero-end", y: Math.floor(vp.config.viewport.height * 0.9) },
    { name: "stop3-quarter", y: Math.floor(h * 0.25) },
    { name: "stop4-mid", y: Math.floor(h * 0.5) },
    { name: "stop5-three-quarter", y: Math.floor(h * 0.75) },
    { name: "stop6-bottom", y: h },
  ];
  for (const s of stops) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), s.y);
    await page.waitForTimeout(450);
    const out = join(OUT, `mobile-landing-${s.name}--${vp.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`[${vp.name}] landing scroll ${s.name} -> ${out}`);
  }
  await ctx.close();
}

async function captureQuizFlow(browser, vp) {
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle", timeout: 25000 });
  await page.waitForTimeout(900);

  // 1. Welcome carousel - take first frame
  await page.screenshot({ path: join(OUT, `mobile-quiz-01-welcome--${vp.name}.png`), fullPage: false });
  console.log(`[${vp.name}] quiz welcome captured`);

  // Try to find a Skip / Continue / Begin button to advance through the carousel.
  // Welcome carousel typically has multiple slides; tap through them.
  async function tapAdvance() {
    const candidates = [
      "button:has-text('Begin')",
      "button:has-text('Start')",
      "button:has-text('Continue')",
      "button:has-text('Find your plan')",
      "[data-testid='quiz-continue']",
      "button[type='button']",
    ];
    for (const sel of candidates) {
      const el = await page.$(sel);
      if (el && (await el.isVisible())) {
        await el.click().catch(() => {});
        return true;
      }
    }
    return false;
  }

  // Advance through welcome (up to 4 taps)
  for (let i = 0; i < 4; i++) {
    const ok = await tapAdvance();
    if (!ok) break;
    await page.waitForTimeout(450);
  }
  await page.screenshot({ path: join(OUT, `mobile-quiz-02-primary-intent--${vp.name}.png`), fullPage: false });
  console.log(`[${vp.name}] quiz primary-intent captured`);

  // Select the first option then continue
  const firstOption = await page.$("button[role='checkbox'], [role='option'], button:has-text('First Hyrox'), button:has-text('Get faster')");
  if (firstOption) {
    await firstOption.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  // Try a more general option-card selector
  const anyCard = await page.$$("article, [data-option-card], button.option-card, button[class*='option']");
  if (anyCard.length > 0) {
    await anyCard[0].click().catch(() => {});
    await page.waitForTimeout(200);
  }
  await tapAdvance();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `mobile-quiz-03-reassurance1--${vp.name}.png`), fullPage: false });
  console.log(`[${vp.name}] quiz reassurance1 captured`);

  await tapAdvance();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `mobile-quiz-04-experience--${vp.name}.png`), fullPage: false });
  console.log(`[${vp.name}] quiz experience captured`);

  await ctx.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await webkit.launch();
  for (const vp of VIEWPORTS) {
    await capturePages(browser, vp);
    await captureLandingScrollStops(browser, vp);
    await captureQuizFlow(browser, vp);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
