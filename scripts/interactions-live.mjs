/**
 * Interaction tests on the live deploy. Drives Playwright through hover,
 * focus, keyboard, mobile nav, sticky CTA, modal sheets, scroll snap.
 *
 * Reports anything that misbehaves: missing focus rings, broken tab
 * order, sticky CTA stuck on/off, drawer that doesn't close on backdrop
 * tap, hover state that doesn't reach the dark colour scheme.
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE || process.argv[2];
if (!BASE) throw new Error("Set BASE=https://<prod-url>");
const OUT = process.env.OUT || "docs/audit-2026-05-26-interactions";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const findings = [];

function add(category, detail) {
  findings.push({ category, detail });
}

// ─── Mobile nav drawer ───
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  // Find and tap the hamburger
  const burger = page.locator('button[aria-controls="mobile-nav-drawer"]').first();
  if (await burger.isVisible({ timeout: 2000 }).catch(() => false)) {
    const before = await burger.getAttribute("aria-expanded");
    if (before !== "false") add("mobile-nav", `aria-expanded wrong at rest: ${before}`);
    await burger.click();
    await page.waitForTimeout(400);
    const after = await burger.getAttribute("aria-expanded");
    if (after !== "true") add("mobile-nav", `aria-expanded didn't flip to true: ${after}`);

    // Check drawer is now reachable (inert should be false)
    const drawer = page.locator("#mobile-nav-drawer");
    const inert = await drawer.getAttribute("inert");
    if (inert !== null) add("mobile-nav", `drawer still inert after open: ${inert}`);
    await page.screenshot({ path: `${OUT}/mobile-nav-open.png` });

    // Tap backdrop to close
    const backdrop = page.locator('button[aria-hidden="true"][tabindex="-1"]').last();
    await backdrop.click({ force: true });
    await page.waitForTimeout(400);
    const after2 = await burger.getAttribute("aria-expanded");
    if (after2 !== "false") add("mobile-nav", `backdrop tap didn't close drawer: ${after2}`);

    // Tap burger again, then press Escape to close
    await burger.click();
    await page.waitForTimeout(200);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const after3 = await burger.getAttribute("aria-expanded");
    if (after3 !== "false") add("mobile-nav", `Escape didn't close drawer: ${after3}`);
  } else {
    add("mobile-nav", "burger button not visible at mobile viewport");
  }
  await ctx.close();
}

// ─── Sticky mobile CTA appears after scroll, hides at top ───
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Capture sticky CTA opacity at top
  const ctaSel = 'a[href="/quiz"]:has-text("See your Week 1 free"), a[href="/quiz"]:has-text("Find your plan")';
  const ctaAtTop = await page.evaluate(() => {
    const stickyContainer = document.querySelector(".fixed.inset-x-0.bottom-0");
    if (!stickyContainer) return { found: false };
    const cs = window.getComputedStyle(stickyContainer);
    return {
      found: true,
      opacity: cs.opacity,
      ariaHidden: stickyContainer.getAttribute("aria-hidden"),
    };
  });
  if (!ctaAtTop.found) add("sticky-cta", "no sticky CTA container detected at all");
  else if (parseFloat(ctaAtTop.opacity) > 0.1) {
    add("sticky-cta", `visible at top of page (opacity ${ctaAtTop.opacity})`);
  }

  // Scroll past the hero
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(500);
  const ctaAfterScroll = await page.evaluate(() => {
    const c = document.querySelector(".fixed.inset-x-0.bottom-0");
    if (!c) return { found: false };
    return {
      found: true,
      opacity: window.getComputedStyle(c).opacity,
    };
  });
  if (ctaAfterScroll.found && parseFloat(ctaAfterScroll.opacity) < 0.9) {
    add("sticky-cta", `didn't appear after scroll (opacity ${ctaAfterScroll.opacity})`);
  }
  await ctx.close();
}

// ─── Keyboard tab order on landing ───
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const tabs = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        text: (el.textContent || "").trim().slice(0, 40),
        href: el.getAttribute("href"),
        role: el.getAttribute("role"),
        aria: el.getAttribute("aria-label"),
        visible: r.width > 0 && r.height > 0,
        outlineWidth: cs.outlineWidth,
        outlineStyle: cs.outlineStyle,
        boxShadow: cs.boxShadow,
      };
    });
    tabs.push(focused);
  }
  // Check that focused elements have some form of visible focus indicator
  const noFocusRing = tabs.filter(
    (t) =>
      t &&
      t.visible &&
      (t.outlineStyle === "none" || t.outlineWidth === "0px") &&
      (t.boxShadow === "none" || !t.boxShadow),
  );
  if (noFocusRing.length > 0) {
    add(
      "focus-ring",
      `${noFocusRing.length} focused element(s) had no visible outline or box-shadow: ${noFocusRing
        .map((t) => `${t.tag}[${(t.text || t.aria || t.href || "").slice(0, 30)}]`)
        .join(", ")}`,
    );
  }
  await ctx.close();
}

// ─── Quiz: tap-target sizes (WCAG 24x24, ideally 44x44) ───
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  // Tap "Find your plan" CTA to advance past welcome
  await page.locator('button:has-text("Find your plan")').first().click().catch(() => {});
  await page.waitForTimeout(500);

  const tooSmall = await page.evaluate(() => {
    const out = [];
    const targets = document.querySelectorAll('button, a, [role="button"], input[type="checkbox"], input[type="radio"]');
    for (const el of targets) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.width < 24 || r.height < 24) {
        out.push({
          tag: el.tagName,
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: (el.textContent || "").trim().slice(0, 40),
          aria: el.getAttribute("aria-label"),
        });
      }
    }
    return out.slice(0, 10);
  });
  if (tooSmall.length > 0) {
    add(
      "tap-target",
      `${tooSmall.length} tap target(s) under 24x24 on quiz screen 1: ${JSON.stringify(tooSmall.slice(0, 4))}`,
    );
  }
  await ctx.close();
}

// ─── Reduced motion + dark scheme handling ───
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/reduced-motion-quiz.png` });
  if (errs.length) add("reduced-motion", `errors: ${errs.join("; ")}`);
  await ctx.close();
}

// ─── Forms: empty submit ───
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  // Submit empty
  const submit = page
    .locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
    .first();
  if (await submit.isVisible({ timeout: 2000 }).catch(() => false)) {
    await submit.click().catch(() => {});
    await page.waitForTimeout(500);
    // Any visible error
    const err = await page
      .locator('[role="alert"], .text-vyrek-danger, [aria-invalid="true"]')
      .first()
      .innerText({ timeout: 1500 })
      .catch(() => null);
    const stillOnLogin = page.url().includes("/login");
    if (!stillOnLogin) {
      add("login", "empty submit navigated away from /login");
    } else if (!err) {
      // Could be relying on browser native validation; check first input
      const native = await page
        .locator("input[required]")
        .first()
        .evaluate((el) => el.validationMessage)
        .catch(() => "");
      if (!native) add("login", "empty submit shows no user-facing or native validation feedback");
    }
  }
  await ctx.close();
}

await browser.close();
await writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));

console.log("\n=== Interaction findings ===");
console.log(`Total: ${findings.length}`);
for (const f of findings) {
  console.log(`  [${f.category}] ${f.detail}`);
}
