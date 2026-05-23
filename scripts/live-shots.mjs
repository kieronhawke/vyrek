#!/usr/bin/env node
// Capture the LIVE site at vyrek.vercel.app so we can sanity-check the
// just-deployed build. Includes a signed-in admin pass to prove the
// production deploy can read Supabase + render the dashboard.

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = "https://vyrek.vercel.app";
const ADMIN_EMAIL = "kieron.hawke@googlemail.com";
const ADMIN_PASSWORD = "VyrekAdminTemp!2026";

await mkdir(OUT, { recursive: true });

const PUBLIC = [
  { name: "live-landing", path: "/" },
  { name: "live-programmes", path: "/programmes" },
  { name: "live-how-it-works", path: "/how-it-works" },
  { name: "live-partners", path: "/partners" },
  { name: "live-partners-apply", path: "/partners/apply" },
  { name: "live-partner-dashboard-login", path: "/partners/dashboard" },
  { name: "live-quiz", path: "/quiz" },
  { name: "live-blog", path: "/blog" },
  { name: "live-pricing", path: "/pricing" },
  { name: "live-admin-login", path: "/admin/login" },
];

const ADMIN_PAGES = [
  { name: "live-admin-overview", path: "/admin" },
  { name: "live-admin-customers", path: "/admin/customers" },
  { name: "live-admin-partners", path: "/admin/partners" },
  { name: "live-admin-payouts", path: "/admin/payouts" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();

for (const p of PUBLIC) {
  try {
    const r = await page.goto(`${BASE}${p.path}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: join(OUT, `${p.name}.png`),
      fullPage: true,
    });
    console.log(`OK ${r?.status() ?? "?"} ${p.path}`);
  } catch (e) {
    console.error(`FAIL ${p.path}: ${e.message}`);
  }
}

// Sign in as admin and snap dashboard pages
try {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin($|\?|\/)/, { timeout: 20000 });
  console.log("admin signed in");
  for (const p of ADMIN_PAGES) {
    await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `${p.name}.png`), fullPage: true });
    console.log(`OK admin ${p.path}`);
  }
} catch (e) {
  console.error(`admin signin failed: ${e.message}`);
}

await browser.close();
