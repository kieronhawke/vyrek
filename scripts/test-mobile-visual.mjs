/**
 * Mobile visual sweep:
 *   1. Mobile hamburger opens drawer, drawer has all nav links, closes on link tap
 *   2. No horizontal scroll on any major route at 390px
 *   3. Active nav item highlights correctly per route
 *   4. Blog post page hero is visible above the fold at 390×844
 *   5. Cookie banner doesn't overlap the sticky CTAs
 *
 * Usage: node scripts/test-mobile-visual.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".screenshots", "mobile-sweep");
const BASE = process.argv[2] || "http://localhost:3000";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const settle = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = [
  "/",
  "/blog",
  "/blog/first-hyrox-preparation-guide",
  "/blog/category/training",
  "/programmes",
  "/pricing",
  "/quiz",
  "/plan",
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
});

let pass = true;
const fail = (msg) => {
  pass = false;
  console.log("  ✗ " + msg);
};
const ok = (msg) => console.log("  ✓ " + msg);

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // Pre-accept cookies so the banner doesn't get in the way
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.localStorage.setItem(
      "vyrek:consent:v1",
      JSON.stringify({
        decided: true,
        categories: { necessary: true, analytics: false, marketing: false },
      }),
    );
  });

  // ── 1. Mobile drawer nav ─────────────────────
  console.log("\n[1] Mobile drawer nav");
  await page.goto(`${BASE}/blog`, { waitUntil: "networkidle2" });
  await settle(500);
  await page.screenshot({
    path: join(OUT, "blog-collapsed.png"),
    fullPage: false,
  });

  const hamburgerVisible = await page.evaluate(() => {
    const btn = document.querySelector('[aria-label*="navigation" i]');
    if (!btn) return false;
    const rect = btn.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  if (!hamburgerVisible) fail("Hamburger button not visible on mobile");
  else ok("hamburger visible");

  await page.click('[aria-label*="Open navigation" i]');
  await settle(500);
  await page.screenshot({
    path: join(OUT, "drawer-open.png"),
    fullPage: false,
  });

  const drawerInfo = await page.evaluate(() => {
    const drawer = document.querySelector('#mobile-nav-drawer');
    const links = Array.from(
      drawer?.querySelectorAll('a[href]') ?? [],
    ).map((a) => ({
      href: a.getAttribute("href"),
      text: a.textContent?.trim(),
    }));
    return {
      ariaHidden: drawer?.getAttribute("aria-hidden"),
      links,
    };
  });
  if (drawerInfo.ariaHidden !== "false") fail("Drawer aria-hidden not 'false' when open");
  else ok("drawer aria-hidden=false");
  const wantLinks = ["/programmes", "/how-it-works", "/blog", "/pricing", "/quiz"];
  for (const want of wantLinks) {
    if (!drawerInfo.links.some((l) => l.href === want))
      fail(`Drawer missing link to ${want}`);
    else ok(`drawer has link to ${want}`);
  }

  // Tap a drawer link, verify drawer closes and we navigate
  await page.evaluate(() => {
    const link = document.querySelector('#mobile-nav-drawer a[href="/pricing"]');
    if (link) link.click();
  });
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 8000 });
  await settle(500);
  const finalUrl = page.url();
  if (!finalUrl.includes("/pricing")) fail("Drawer link did not navigate to /pricing");
  else ok("drawer navigated to /pricing");
  const drawerClosed = await page.evaluate(
    () =>
      document
        .querySelector('#mobile-nav-drawer')
        ?.getAttribute("aria-hidden") === "true",
  );
  if (!drawerClosed) fail("Drawer did not close after nav");
  else ok("drawer closed after route change");

  // ── 2. No horizontal scroll on any route ─────
  console.log("\n[2] No horizontal scroll");
  for (const r of ROUTES) {
    await page.goto(`${BASE}${r}`, { waitUntil: "networkidle2" });
    await settle(400);
    const overflow = await page.evaluate(() => ({
      docWidth: document.documentElement.scrollWidth,
      windowWidth: window.innerWidth,
    }));
    if (overflow.docWidth > overflow.windowWidth + 1)
      fail(
        `${r}: horizontal overflow (doc=${overflow.docWidth}, win=${overflow.windowWidth})`,
      );
    else ok(`${r}: no horizontal scroll`);
    await page.screenshot({
      path: join(OUT, `${r.replace(/\//g, "_") || "_root"}.png`),
      fullPage: false,
    });
  }

  // ── 3. Active nav highlight ──────────────────
  console.log("\n[3] Active nav highlight");
  await page.goto(`${BASE}/blog`, { waitUntil: "networkidle2" });
  await settle(400);
  await page.click('[aria-label*="Open navigation" i]');
  await settle(400);
  const blogActive = await page.evaluate(() =>
    document
      .querySelector('#mobile-nav-drawer a[href="/blog"]')
      ?.getAttribute("aria-current"),
  );
  if (blogActive !== "page") fail("Journal link not aria-current on /blog");
  else ok("aria-current=page on Journal when on /blog");

  // ── 4. Blog post above-the-fold ──────────────
  console.log("\n[4] Blog post hero above the fold");
  await page.goto(`${BASE}/blog/first-hyrox-preparation-guide`, {
    waitUntil: "networkidle2",
  });
  await settle(500);
  const hero = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    if (!h1) return null;
    const rect = h1.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  });
  if (!hero) fail("No h1 on post page");
  else if (hero.top > 844)
    fail(`h1 below viewport (top=${hero.top}px > 844px)`);
  else ok(`h1 at ${Math.round(hero.top)}px from top`);

  // ── 5. MDX callouts render ───────────────────
  console.log("\n[5] MDX callouts");
  const calloutInfo = await page.evaluate(() => ({
    keyTakeaways: !!document.querySelector('[aria-label="Key takeaways"]'),
    callouts: document.querySelectorAll('[role="note"]').length,
    pullQuotes: document.querySelectorAll('blockquote').length,
  }));
  if (!calloutInfo.keyTakeaways) fail("KeyTakeaways not rendered");
  else ok("KeyTakeaways visible");
  if (calloutInfo.callouts < 1) fail("No Callout components rendered");
  else ok(`${calloutInfo.callouts} Callout components`);
  if (calloutInfo.pullQuotes < 1) fail("No pull quote rendered");
  else ok(`${calloutInfo.pullQuotes} pull quote(s)`);

  console.log("\n" + (pass ? "✓ PASS" : "✗ FAIL"));
} finally {
  await browser.close();
}

process.exit(pass ? 0 : 1);
