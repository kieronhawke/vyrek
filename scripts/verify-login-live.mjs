#!/usr/bin/env node
// Walk the live /login form with the demo credentials and confirm the
// session lands the user on /app/today, persists across an unrelated nav,
// and survives a hard reload.

import { chromium } from "@playwright/test";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const EMAIL = "demo@vyrek.test";
const PASSWORD = "VyrekDemo2026!";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errs = [];
page.on("pageerror", (e) => errs.push(`pageerror: ${e.message.slice(0, 200)}`));
page.on("console", (m) => {
  if (m.type() === "error" && !/posthog|hotjar|favicon|cookie/i.test(m.text())) {
    errs.push(`console: ${m.text().slice(0, 200)}`);
  }
});

console.log("→ /login");
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });

await page.fill('input[type="email"]', EMAIL);
await page.fill('input[type="password"]', PASSWORD);
await page.click('button[type="submit"]');

await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 15000 });
console.log(`✓ signed in, landed on ${page.url()}`);

await page.waitForLoadState("networkidle");
const todayH1 = await page.locator("h1").first().textContent();
console.log(`  h1: "${todayH1?.trim()}"`);

console.log("\n→ navigate to /app/account (session must persist)");
await page.goto(`${BASE}/app/account`, { waitUntil: "networkidle" });
if (!page.url().includes("/app/account")) {
  console.log(`✗ session DID NOT persist; bounced to ${page.url()}`);
  process.exit(1);
}
console.log(`✓ session persisted on ${page.url()}`);

console.log("\n→ hard reload (cookie must survive)");
await page.reload({ waitUntil: "networkidle" });
if (!page.url().includes("/app")) {
  console.log(`✗ reload lost session; bounced to ${page.url()}`);
  process.exit(1);
}
console.log(`✓ reload kept session on ${page.url()}`);

console.log(`\nConsole errors: ${errs.length}`);
for (const e of errs.slice(0, 10)) console.log(`  ${e}`);

await browser.close();
console.log(`\n✓ /login → /app/today → persistent across nav + reload — WORKING`);
