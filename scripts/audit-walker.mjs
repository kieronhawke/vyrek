#!/usr/bin/env node
/**
 * Pre-launch audit walker. Captures screenshots of every key page at
 * mobile (390x844) and desktop (1440x900). Also walks the quiz end-to-end
 * as a first-race persona to surface flow issues.
 *
 * Usage: BASE=http://localhost:3000 OUT=docs/audit-2026-05-25-before node scripts/audit-walker.mjs [section]
 *   section = all | landing | quiz | blog | programmes | partner | results | misc
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "docs/audit-2026-05-25-before";
const SECTION = process.argv[2] ?? "all";

await mkdir(`${OUT}/mobile`, { recursive: true });
await mkdir(`${OUT}/desktop`, { recursive: true });

const browser = await chromium.launch();
const findings = [];

const pages = {
  landing: "/",
  pricing: "/pricing",
  "how-it-works": "/how-it-works",
  about: "/about",
  contact: "/contact",
  press: "/press",
  hyrox: "/hyrox",
  tools: "/tools",
  programmes: "/programmes",
  "programme-first-race": "/programmes/first-race",
  "programme-sub-90": "/programmes/sub-90",
  "programme-doubles": "/programmes/doubles",
  "programme-pro": "/programmes/pro",
  blog: "/blog",
  partners: "/partners",
  "partners-apply": "/partners/apply",
  login: "/login",
  "legal-terms": "/legal/terms",
  "legal-privacy": "/legal/privacy",
  "not-found": "/this-route-does-not-exist",
};

async function snap(slug, path) {
  for (const profile of [
    { name: "mobile", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  ]) {
    const ctx = await browser.newContext({
      viewport: profile.viewport,
      isMobile: profile.isMobile,
      hasTouch: profile.hasTouch,
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(`${slug}/${profile.name} pageerror: ${e.message.slice(0, 200)}`));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const t = m.text();
      if (/posthog|gtag|favicon|preload|sentry|webgl|hydration mismatch \(no warn\)/i.test(t)) return;
      errs.push(`${slug}/${profile.name} console: ${t.slice(0, 200)}`);
    });
    try {
      const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
      if (resp && resp.status() >= 400 && slug !== "not-found") {
        findings.push({ slug, profile: profile.name, kind: "http-error", status: resp.status(), path });
      }
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${profile.name}/${slug}.png`, fullPage: true });
    } catch (e) {
      findings.push({ slug, profile: profile.name, kind: "load-failed", err: e.message.slice(0, 200) });
    }
    if (errs.length) findings.push({ slug, profile: profile.name, kind: "errors", errs });
    await ctx.close();
  }
  console.log(`✓ ${slug}`);
}

if (SECTION === "all" || SECTION === "misc" || SECTION === "landing") {
  for (const [slug, path] of Object.entries(pages)) {
    if (SECTION === "landing" && slug !== "landing") continue;
    await snap(slug, path);
  }
}

// ─── Quiz full walk (mobile only — that's where most users will be) ───
if (SECTION === "all" || SECTION === "quiz") {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`quiz pageerror: ${e.message.slice(0, 200)}`));

  await mkdir(`${OUT}/quiz-walk`, { recursive: true });
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });

  let step = 0;
  const cap = async (label) => {
    step++;
    const n = String(step).padStart(2, "0");
    await page.screenshot({ path: `${OUT}/quiz-walk/${n}-${label}.png`, fullPage: false });
  };

  await cap("welcome-1");
  // welcome carousel: 3 slides, advance via Continue/Start
  for (let i = 0; i < 4; i++) {
    const btn = page.locator('button:has-text("Continue"), button:has-text("Start"), button:has-text("Next"), button:has-text("Get started")').first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(450);
      await cap(`welcome-${i + 2}`);
    }
    if (!page.url().endsWith("/quiz")) break;
  }

  // Walk up to 20 question screens
  for (let i = 0; i < 22; i++) {
    await cap(`q-${String(i + 1).padStart(2, "0")}`);

    // Multi-select: tap first non-pressed; single-select: tap first option
    const allOptions = page.locator('button[aria-pressed], [role="radio"], [role="checkbox"]');
    const count = await allOptions.count().catch(() => 0);
    if (count > 0) {
      // pick first option
      await allOptions.first().click().catch(() => {});
      await page.waitForTimeout(250);
    }

    // weight input on calibration
    const num = page.locator('input[type="number"], input[inputmode="numeric"]').first();
    if (await num.isVisible({ timeout: 500 }).catch(() => false)) {
      await num.fill("78");
      await page.waitForTimeout(150);
    }

    // skip / continue
    const cont = page.locator('button:has-text("Continue"), button:has-text("Save"), button:has-text("Next"), button:has-text("Skip"), button:has-text("No race yet")').first();
    if (await cont.isEnabled({ timeout: 800 }).catch(() => false)) {
      await cont.click().catch(() => {});
      await page.waitForTimeout(700);
    } else {
      // try clicking primary CTA generically
      const cta = page.locator('main button').last();
      if (await cta.isEnabled({ timeout: 300 }).catch(() => false)) {
        await cta.click().catch(() => {});
        await page.waitForTimeout(500);
      } else {
        findings.push({ flow: "quiz", kind: "stuck", at: page.url(), step: i + 1 });
        break;
      }
    }

    if (page.url().includes("/account") || page.url().includes("/calculating") || page.url().includes("/plan")) {
      await cap(`done-${i + 1}`);
      break;
    }
  }

  await cap("final");
  findings.push({ flow: "quiz", kind: "errors", errs });
  await ctx.close();
}

await browser.close();
await writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
console.log(`\nDone. Findings written to ${OUT}/findings.json`);
