#!/usr/bin/env node
// Forensic UX/visual/animation audit of vyrek.vercel.app.
// Captures every page across 4 viewports + interaction states.

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = "https://vyrek.vercel.app";

await mkdir(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 667, device: "iPhone SE" },
  { name: "mobile-390", width: 390, height: 844, device: "iPhone 13" },
  { name: "tablet-768", width: 768, height: 1024, device: "iPad (gen 7)" },
  { name: "desktop-1440", width: 1440, height: 900, device: "Desktop Chrome" },
];

const PAGES = [
  { name: "landing", path: "/" },
  { name: "quiz", path: "/quiz" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "about", path: "/about" },
  { name: "contact", path: "/contact" },
  { name: "press", path: "/press" },
  { name: "press-brand-guidelines", path: "/press/brand-guidelines" },
  { name: "blog", path: "/blog" },
  { name: "blog-hyrox-vs-spartan-deka", path: "/blog/hyrox-vs-spartan-vs-deka" },
  { name: "blog-hyrox-mental-cues", path: "/blog/hyrox-mental-cues-mid-race" },
  { name: "blog-hyrox-with-young-kids", path: "/blog/hyrox-with-young-kids" },
  { name: "plan-sub-90", path: "/plans/sub-90-hyrox-training-plan" },
  { name: "partners", path: "/partners" },
  { name: "partners-apply", path: "/partners/apply" },
  { name: "partners-dashboard", path: "/partners/dashboard" },
  { name: "partners-onboard-bad", path: "/partners/onboard?token=bad" },
  { name: "login", path: "/login" },
  { name: "pricing", path: "/pricing" },
  { name: "admin-login", path: "/admin/login" },
  { name: "legal-privacy", path: "/legal/privacy" },
  { name: "legal-terms", path: "/legal/terms" },
  { name: "legal-cookies", path: "/legal/cookies" },
  { name: "legal-refunds", path: "/legal/refunds" },
  { name: "404", path: "/this-does-not-exist" },
];

const browser = await chromium.launch();

async function scrollFully(page) {
  // Scroll in 3 passes so RevealOnView / IntersectionObserver fires for
  // everything, then return to top for fullPage capture from origin.
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const total = document.documentElement.scrollHeight;
    const step = Math.max(window.innerHeight * 0.7, 400);
    for (let y = 0; y < total; y += step) {
      window.scrollTo(0, y);
      await sleep(120);
    }
    window.scrollTo(0, total);
    await sleep(250);
    window.scrollTo(0, 0);
    await sleep(150);
  });
}

let okCount = 0;
let failCount = 0;
const failures = [];

for (const vp of VIEWPORTS) {
  const deviceProfile = devices[vp.device] || devices["Desktop Chrome"];
  const ctx = await browser.newContext({
    ...deviceProfile,
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await ctx.newPage();
  // Suppress noisy console
  page.on("pageerror", () => {});

  for (const p of PAGES) {
    const file = join(OUT, `forensic-${p.name}--${vp.name}.png`);
    try {
      const r = await page.goto(`${BASE}${p.path}`, {
        waitUntil: "networkidle",
        timeout: 45000,
      });
      await page.waitForTimeout(400);
      await scrollFully(page);
      await page.waitForTimeout(300);
      await page.screenshot({ path: file, fullPage: true });
      okCount++;
      console.log(`OK  ${r?.status() ?? "?"} ${vp.name} ${p.path}`);
    } catch (e) {
      failCount++;
      failures.push({ vp: vp.name, path: p.path, err: e.message });
      console.error(`FAIL ${vp.name} ${p.path}: ${e.message}`);
    }
  }
  await ctx.close();
}

// PHASE B — interaction states (desktop-1440 + mobile-390)
async function interactions() {
  // Desktop nav hover, button hover, focused field, cmd-K palette
  {
    const ctx = await browser.newContext({
      ...devices["Desktop Chrome"],
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    page.on("pageerror", () => {});
    try {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(500);

      // Nav hover: try first nav link
      try {
        const navLink = page.locator("header a").first();
        await navLink.hover();
        await page.waitForTimeout(250);
        await page.screenshot({
          path: join(OUT, "forensic-state-nav-hover--desktop-1440.png"),
          fullPage: false,
        });
      } catch {}

      // Primary button hover
      try {
        const cta = page.getByRole("link", { name: /find your plan|start|take the quiz/i }).first();
        await cta.hover();
        await page.waitForTimeout(250);
        await page.screenshot({
          path: join(OUT, "forensic-state-cta-hover--desktop-1440.png"),
          fullPage: false,
        });
      } catch {}

      // Cmd-K palette
      try {
        await page.keyboard.press("Meta+k");
        await page.waitForTimeout(400);
        await page.screenshot({
          path: join(OUT, "forensic-state-cmdk--desktop-1440.png"),
          fullPage: false,
        });
        await page.keyboard.press("Escape");
      } catch {}

      // Cookie banner (clear storage to force banner)
      try {
        await ctx.clearCookies();
        await page.evaluate(() => {
          try { localStorage.clear(); } catch {}
          try { sessionStorage.clear(); } catch {}
        });
        await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
        await page.waitForTimeout(800);
        await page.screenshot({
          path: join(OUT, "forensic-state-cookie-banner--desktop-1440.png"),
          fullPage: false,
        });
      } catch {}

      // Focused field on contact
      try {
        await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
        await page.waitForTimeout(500);
        const field = page.locator('input, textarea').first();
        await field.focus();
        await page.waitForTimeout(200);
        await page.screenshot({
          path: join(OUT, "forensic-state-focus-field--desktop-1440.png"),
          fullPage: false,
        });
      } catch {}
    } catch (e) {
      console.error(`Desktop interactions failed: ${e.message}`);
    }
    await ctx.close();
  }

  // Mobile hamburger drawer
  {
    const ctx = await browser.newContext({
      ...devices["iPhone 13"],
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    page.on("pageerror", () => {});
    try {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(500);
      // Try common hamburger triggers
      const triggers = [
        'button[aria-label*="menu" i]',
        'button[aria-label*="navigation" i]',
        'header button:has(svg)',
      ];
      let opened = false;
      for (const sel of triggers) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.count()) {
            await btn.click({ timeout: 2000 });
            await page.waitForTimeout(400);
            opened = true;
            break;
          }
        } catch {}
      }
      await page.screenshot({
        path: join(OUT, `forensic-state-mobile-drawer--mobile-390.png`),
        fullPage: false,
      });
      console.log(`mobile drawer: opened=${opened}`);
    } catch (e) {
      console.error(`Mobile drawer failed: ${e.message}`);
    }
    await ctx.close();
  }
}

await interactions();

await browser.close();

console.log(`\nDONE. OK=${okCount} FAIL=${failCount}`);
if (failures.length) {
  console.log("Failures:");
  for (const f of failures) console.log(` - ${f.vp} ${f.path}: ${f.err}`);
}
