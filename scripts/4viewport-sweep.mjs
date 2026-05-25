#!/usr/bin/env node
/**
 * 4-viewport visual sweep — Stage 14 PART 13.2.1 spec coverage.
 *
 * Captures the page-coverage matrix at:
 *   - Mobile 375 (iPhone SE-ish)
 *   - Mobile 390 (iPhone 13/14)
 *   - Tablet 768 (iPad portrait)
 *   - Desktop 1440 (most common laptop)
 *
 * Reports console errors and failed network requests per page.
 * Output: scripts/4viewport-sweep/<viewport>/<route-slug>.png + summary.json
 */
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/scripts/4viewport-sweep";

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: false },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false },
];

const ROUTES = [
  { path: "/", slug: "home" },
  { path: "/programmes", slug: "programmes" },
  { path: "/how-it-works", slug: "how-it-works" },
  { path: "/quiz", slug: "quiz" },
  { path: "/plan", slug: "plan" },
  { path: "/welcome", slug: "welcome" },
  { path: "/about", slug: "about" },
  { path: "/contact", slug: "contact" },
  { path: "/press", slug: "press" },
  { path: "/press/screenshots", slug: "press-screenshots" },
  { path: "/press/brand-guidelines", slug: "press-brand-guidelines" },
  { path: "/blog", slug: "blog" },
  { path: "/blog/hyrox-station-weights-explained", slug: "blog-post-station-weights" },
  { path: "/blog/hyrox-sled-push-technique", slug: "blog-post-sled-push" },
  { path: "/partners", slug: "partners" },
  { path: "/partners/apply", slug: "partners-apply" },
  { path: "/legal/privacy", slug: "legal-privacy" },
  { path: "/legal/terms", slug: "legal-terms" },
  { path: "/legal/cookies", slug: "legal-cookies" },
  { path: "/legal/refunds", slug: "legal-refunds" },
  { path: "/results", slug: "results" },
  { path: "/pricing", slug: "pricing" },
];

await mkdir(OUT, { recursive: true });
for (const v of VIEWPORTS) await mkdir(`${OUT}/${v.name}`, { recursive: true });

const results = [];
const browser = await chromium.launch();

for (const v of VIEWPORTS) {
  console.log(`\n=== ${v.name} (${v.width}×${v.height}) ===`);
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.mobile ? 2 : 1,
    isMobile: v.mobile,
    hasTouch: v.mobile,
  });

  for (const route of ROUTES) {
    const consoleErrs = [];
    const failedReqs = [];
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      const t = msg.text();
      if (/posthog|gtag|gtm|sentry|hotjar|onesignal|cookie|favicon|hydration|preload/i.test(t)) return;
      consoleErrs.push(t.slice(0, 200));
    });
    page.on("pageerror", (e) => consoleErrs.push(`pageerror: ${e.message.slice(0, 200)}`));
    page.on("requestfailed", (req) => {
      const u = req.url();
      if (/posthog|gtag|gtm|sentry|hotjar|onesignal|favicon|chrome-extension/.test(u)) return;
      failedReqs.push(`${req.failure()?.errorText ?? "failed"} ${u.slice(0, 160)}`);
    });

    const t0 = Date.now();
    let status = 0;
    let networkIdle = true;
    try {
      const resp = await page.goto(`${BASE}${route.path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      status = resp?.status() ?? 0;
    } catch (e) {
      networkIdle = false;
      consoleErrs.push(`nav-failed: ${e.message.slice(0, 200)}`);
    }
    const loadMs = Date.now() - t0;

    // Detect horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    }).catch(() => false);

    // Capture full-page screenshot
    const shotPath = `${OUT}/${v.name}/${route.slug}.png`;
    try {
      await page.screenshot({ path: shotPath, fullPage: true, animations: "disabled" });
    } catch (e) {
      consoleErrs.push(`screenshot-failed: ${e.message.slice(0, 100)}`);
    }

    const result = {
      viewport: v.name,
      route: route.path,
      slug: route.slug,
      status,
      loadMs,
      networkIdle,
      hasHorizontalScroll,
      consoleErrors: consoleErrs.length,
      consoleErrorSample: consoleErrs.slice(0, 3),
      failedRequests: failedReqs.length,
      failedRequestSample: failedReqs.slice(0, 3),
    };
    results.push(result);
    const marker = consoleErrs.length || failedReqs.length || hasHorizontalScroll || status !== 200
      ? "⚠️ "
      : "  ";
    console.log(
      `${marker}${route.slug.padEnd(34)} ${String(status).padStart(3)} ${String(loadMs).padStart(5)}ms cons=${consoleErrs.length} fail=${failedReqs.length} hscroll=${hasHorizontalScroll}`,
    );

    await page.close();
  }
  await ctx.close();
}

await browser.close();

const summary = {
  base: BASE,
  generatedAt: new Date().toISOString(),
  viewports: VIEWPORTS.map((v) => v.name),
  routes: ROUTES.map((r) => r.path),
  total: results.length,
  byViewport: VIEWPORTS.map((v) => {
    const slice = results.filter((r) => r.viewport === v.name);
    return {
      viewport: v.name,
      pages: slice.length,
      errors: slice.filter((r) => r.consoleErrors).length,
      failedReqs: slice.filter((r) => r.failedRequests).length,
      hscroll: slice.filter((r) => r.hasHorizontalScroll).length,
      nonOk: slice.filter((r) => r.status !== 200 && r.status !== 307).length,
    };
  }),
  problems: results.filter(
    (r) =>
      r.consoleErrors > 0 ||
      r.failedRequests > 0 ||
      r.hasHorizontalScroll ||
      (r.status !== 200 && r.status !== 307),
  ),
};
await writeFile(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
console.log(`\nSummary saved to ${OUT}/summary.json`);
console.log(`Problems detected: ${summary.problems.length}`);
