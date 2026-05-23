#!/usr/bin/env node
// Capture the 5 member-app tabs at mobile-390 and desktop-1440.
// Signs in with the existing admin (kieron.hawke@googlemail.com) — that
// account is also a regular Supabase Auth user so it can hit /app/*.

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const EMAIL = "kieron.hawke@googlemail.com";
const PASSWORD = "VyrekAdminTemp!2026";

await mkdir(OUT, { recursive: true });

const TABS = [
  { name: "today", path: "/app/today" },
  { name: "plan", path: "/app/plan" },
  { name: "plan-stations", path: "/app/plan/stations" },
  { name: "nutrition", path: "/app/nutrition" },
  { name: "analysis", path: "/app/analysis" },
  { name: "athlete", path: "/app/analysis/athlete/james-wright" },
  { name: "race", path: "/app/analysis/race/hyrox-london-jun-2026" },
  { name: "account", path: "/app/account" },
  { name: "account-pr", path: "/app/account/pr" },
];

const VPS = [
  { name: "m390", engine: "webkit", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  { name: "d1440", engine: "chromium", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
];

for (const vp of VPS) {
  const browser = await (vp.engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();

  // Sign in via /login (member auth path)
  await page.goto(`${BASE}/login?next=/app/today`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith("/app"), {
    timeout: 20000,
  });
  await page.waitForLoadState("networkidle");
  console.log(`[${vp.name}] signed in`);

  for (const t of TABS) {
    await page.goto(`${BASE}${t.path}`, {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(300);
    const out = join(OUT, `member-${t.name}--${vp.name}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`[${vp.name}] ${t.path} -> ${out}`);
  }

  await browser.close();
}
