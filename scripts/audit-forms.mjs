#!/usr/bin/env node
// Exercise every form on the site with realistic input. Capture validation
// behaviour + any 5xx responses.

import { chromium } from "@playwright/test";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const findings = [];
function note(area, severity, msg) {
  findings.push({ area, severity, msg });
  console.log(`  [${severity}] ${area}: ${msg}`);
}

// ── 1. /contact ─────────────────────────────
console.log("\n/contact:");
await page.goto(`${BASE}/contact`, { waitUntil: "networkidle" });
const contactForms = await page.locator("form").count();
const contactMailto = await page.locator('a[href^="mailto:"]').count();
note("/contact", "info", `${contactForms} forms, ${contactMailto} mailto links`);

// ── 2. /partners/apply ───────────────────────
console.log("\n/partners/apply:");
await page.goto(`${BASE}/partners/apply`, { waitUntil: "networkidle" });
const inputs = await page.locator("input, textarea, select").count();
const submit = await page.locator('button[type="submit"], input[type="submit"]').count();
note("/partners/apply", "info", `${inputs} input fields, ${submit} submit buttons`);
// Submit empty to test validation
if (submit > 0) {
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(800);
  const errors = await page.locator('[role="alert"], .text-vyrek-danger, .text-red-300').count();
  note("/partners/apply", errors > 0 ? "ok" : "WARN", `empty submit → ${errors} error indicator(s)`);
}

// ── 3. /login (email/password form) ─────────
console.log("\n/login:");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "not-a-real-email@example-fake.invalid");
await page.fill('input[type="password"]', "wrongpassword123");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
const loginErr = await page.locator('[role="alert"], .text-vyrek-danger, .text-red-300').count();
note("/login", loginErr > 0 ? "ok" : "WARN", `bad creds → ${loginErr} error indicator(s); url=${page.url()}`);

// Email format validation (HTML5)
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "not-an-email");
await page.fill('input[type="password"]', "x");
const beforeSubmit = page.url();
await page.click('button[type="submit"]');
await page.waitForTimeout(500);
const stillOnLogin = page.url() === beforeSubmit;
note("/login", stillOnLogin ? "ok" : "WARN", `invalid email format blocked client-side: ${stillOnLogin}`);

// ── 4. /admin/login ─────────────────────────
console.log("\n/admin/login:");
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.fill('input[type="email"]', "bad@example.com");
await page.fill('input[type="password"]', "wrongpassword");
await page.click('button[type="submit"]');
await page.waitForTimeout(2000);
const adminErr = await page.locator('[role="alert"], .text-vyrek-danger, .text-red-300, .text-red-500').count();
note("/admin/login", adminErr > 0 ? "ok" : "WARN", `bad creds → ${adminErr} error indicator(s); url=${page.url()}`);

// ── 5. /pricing CTA destination ─────────────
console.log("\n/pricing CTA:");
await page.goto(`${BASE}/pricing`, { waitUntil: "networkidle" });
const ctaHref = await page.locator('a:has-text("Find your plan"), a:has-text("Start trial")').first().getAttribute("href").catch(() => null);
note("/pricing", ctaHref ? "ok" : "WARN", `primary CTA href: ${ctaHref ?? "MISSING"}`);

// ── 6. /tools/pace-calculator ───────────────
console.log("\n/tools/pace-calculator:");
await page.goto(`${BASE}/tools/pace-calculator`, { waitUntil: "networkidle" });
const calcInputs = await page.locator("input[type=number], input[type=text]").count();
note("/tools/pace-calculator", "info", `${calcInputs} input fields`);
// Try entering a pace
if (calcInputs > 0) {
  await page.locator("input").first().fill("4");
  await page.waitForTimeout(500);
  note("/tools/pace-calculator", "info", "fillable: yes");
}

// ── 7. /account/refer (referral input) ──────
console.log("\n/account/refer:");
await page.goto(`${BASE}/account/refer`, { waitUntil: "networkidle" });
note("/account/refer", "info", `url after nav: ${page.url()}`);

// ── 8. Cookie banner ────────────────────────
console.log("\nCookie banner:");
await page.context().clearCookies();
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const banner = await page.locator('text=/cookies/i, [role="alertdialog"]').first().isVisible().catch(() => false);
note("cookie banner", banner ? "ok" : "WARN", `banner visible on fresh load: ${banner}`);

await browser.close();

console.log("\n\nSUMMARY:");
const warns = findings.filter(f => f.severity === "WARN");
console.log(`  ${warns.length} warnings, ${findings.length - warns.length} ok/info`);
for (const w of warns) console.log(`  WARN: ${w.area} - ${w.msg}`);
