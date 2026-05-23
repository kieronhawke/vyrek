#!/usr/bin/env node
// Browser-driven test pass. Loads key routes, listens for console errors
// and pageerrors, and reports any runtime regression that an HTTP check
// would miss.

import { chromium, devices } from "@playwright/test";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/programmes",
  "/how-it-works",
  "/about",
  "/contact",
  "/press",
  "/quiz",
  "/blog",
  "/blog/12-week-hyrox-training-plan",
  "/hyrox",
  "/hyrox/london",
  "/hyrox/events",
  "/hyrox/gear",
  "/hyrox/stations",
  "/hyrox/stations/ski-erg",
  "/compare",
  "/compare/hyrox-vs-crossfit",
  "/topics",
  "/topics/womens-hyrox",
  "/plans",
  "/plans/sub-90-hyrox-training-plan",
  "/tools/pace-calculator",
  "/partners",
  "/login",
  "/legal/privacy",
  "/legal/terms",
];

const MEMBER_ROUTES = [
  "/app/today",
  "/app/plan",
  "/app/plan/stations",
  "/app/nutrition",
  "/app/analysis",
  "/app/analysis/athlete/james-wright",
  "/app/analysis/athlete/aisha-mortimer",
  "/app/analysis/race/hyrox-london-jun-2026",
  "/app/account",
  "/app/account/pr",
];

const EMAIL = "kieron.hawke@googlemail.com";
const PASSWORD = "VyrekAdminTemp!2026";

const failures = [];

function track(page, route) {
  const errs = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      // ignore noise from third-party (analytics, posthog, etc.)
      if (/posthog|gtag|gtm|sentry|hotjar|cookie|onesignal/i.test(t)) return;
      // ignore Next.js dev hydration mismatch warnings (we test prod, but just in case)
      if (/hydration|favicon\.ico/i.test(t)) return;
      errs.push(`console.error: ${t.slice(0, 200)}`);
    }
  });
  page.on("pageerror", (e) => {
    errs.push(`pageerror: ${e.message.slice(0, 200)}`);
  });
  page.on("requestfailed", (req) => {
    const u = req.url();
    if (!u.startsWith(BASE)) return;
    // Noise: RSC prefetches and presence ping are aborted on fast nav
    if (/[?&]_rsc=|\/api\/presence\/ping|_next\/image|favicon/i.test(u)) return;
    errs.push(`requestfailed: ${u} (${req.failure()?.errorText})`);
  });
  return errs;
}

async function visit(page, path) {
  const errs = track(page, path);
  let status = -1;
  try {
    const res = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 25000,
    });
    status = res?.status() ?? -1;
    await page.waitForTimeout(400);
  } catch (e) {
    errs.push(`nav: ${e.message.slice(0, 200)}`);
  }
  if (status >= 400 || errs.length) {
    failures.push({ path, status, errs });
    console.log(`  ✗ [${status}] ${path}  (${errs.length} issues)`);
    for (const m of errs) console.log(`      ${m}`);
  } else {
    console.log(`  ✓ [${status}] ${path}`);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();

console.log("\n── Public ─────────────────────");
for (const p of PUBLIC_ROUTES) {
  await visit(page, p);
}

console.log("\n── Member app (signed in) ─────");
// Sign in
await page.goto(`${BASE}/login?next=/app/today`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 20000 });
console.log("  · signed in");
for (const p of MEMBER_ROUTES) {
  await visit(page, p);
}

await browser.close();

console.log(`\nTotal failures: ${failures.length}\n`);
if (failures.length) {
  process.exit(1);
}
