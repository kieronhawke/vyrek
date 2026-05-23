#!/usr/bin/env node
// Sign in as admin and capture every admin page.

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

await mkdir(OUT, { recursive: true });

const ADMIN_EMAIL = "kieron.hawke@googlemail.com";
const ADMIN_PASSWORD = "VyrekAdminTemp!2026";

const PAGES = [
  { name: "admin-overview", path: "/admin" },
  { name: "admin-customers", path: "/admin/customers" },
  { name: "admin-subscriptions", path: "/admin/subscriptions" },
  { name: "admin-partners", path: "/admin/partners" },
  { name: "admin-partners-list", path: "/admin/partners/list" },
  { name: "admin-payouts", path: "/admin/payouts" },
  { name: "admin-waitlist", path: "/admin/waitlist" },
  { name: "admin-quiz", path: "/admin/quiz" },
];

const VIEWPORTS = [
  { name: "desktop-1440", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  { name: "mobile-390", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
];

for (const vp of VIEWPORTS) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();

  // Sign in
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });

  for (const p of PAGES) {
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(300);
      const out = join(OUT, `${p.name}--${vp.name}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`[${vp.name}] ${p.path} -> ${out}`);
    } catch (e) {
      console.error(`[${vp.name}] FAIL ${p.path}: ${e.message}`);
    }
  }

  await browser.close();
}
