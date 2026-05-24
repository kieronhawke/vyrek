#!/usr/bin/env node
// Live assessment walk for the user.
//
// Captures the key surfaces side-by-side at m390 and d1440, then walks
// the /plan page in detail (because that's where Fixes 1-5 landed), and
// captures the new calculating cinematic across its 4-second sequence
// at 4 evenly-spaced moments.

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";
const OUT = "/Users/kieronhawke/code/vyrek/docs/live-assess";
await mkdir(OUT, { recursive: true });

const EMAIL = "demo@vyrek.test";
const PASSWORD = "VyrekDemo2026!";

const browser = await chromium.launch();

const findings = [];
function check(name, ok, detail = "") {
  findings.push({ name, ok, detail });
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? "  " + detail : ""}`);
}

// =================================================================
// PASS 1 — Mobile 390 walk
// =================================================================
console.log("\n=== mobile 390 ===");
{
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  const consoleErrs = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/posthog|hotjar|favicon|cookie|429/i.test(t)) return;
    consoleErrs.push(t.slice(0, 150));
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/01-home--m390.png`, fullPage: true });

  // Home checks
  check(
    "home hero copy 'Hyrox training, built around your race.'",
    await page.locator("text=/built around your race/i").first().isVisible().catch(() => false),
  );
  check(
    "home final CTA '12 weeks to race-ready'",
    await page.locator("text=/12 weeks to race-ready/i").first().isVisible().catch(() => false),
  );
  check(
    "home Programmes card 'First Race' visible",
    await page.locator("text=/^First Race$/").first().isVisible().catch(() => false),
  );

  // Click Programmes nav
  await page.goto(`${BASE}/programmes`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/02-programmes--m390.png`, fullPage: true });

  // Blog walk
  await page.goto(`${BASE}/blog`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const blogImgs = await page.locator("img").count();
  check("blog index has imagery", blogImgs > 5, `found ${blogImgs} imgs`);
  await page.screenshot({ path: `${OUT}/03-blog--m390.png`, fullPage: true });

  await page.goto(`${BASE}/blog/12-week-hyrox-training-plan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const hasHero = await page.locator('img[alt*="training plan" i], img[alt*="hyrox" i]').first().isVisible().catch(() => false);
  check("blog post hero image present", hasHero);
  await page.screenshot({ path: `${OUT}/04-blog-post--m390.png`, fullPage: true });

  // Partners
  await page.goto(`${BASE}/partners`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  check(
    "partners 'Over £2,000/mo' box",
    await page.locator("text=/Over £2,000/").first().isVisible().catch(() => false),
  );
  check(
    "partners 'Who's earning' section",
    await page.locator("text=/Who's earning/i").first().isVisible().catch(() => false),
  );
  await page.screenshot({ path: `${OUT}/05-partners--m390.png`, fullPage: true });

  // About — verify count-up + parallax don't break paint
  await page.goto(`${BASE}/about`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/06-about--m390.png`, fullPage: true });

  // Quiz welcome carousel
  await page.goto(`${BASE}/quiz`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/07-quiz-welcome--m390.png`, fullPage: true });

  // Sign in
  await page.goto(`${BASE}/login?next=/app/today`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 15000 });
  check("login redirects to /app/today", page.url().includes("/app/today"));

  // /app/today
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/08-app-today--m390.png`, fullPage: true });

  // Seed quiz state + navigate to /plan
  await page.evaluate(() => localStorage.setItem("vyrek:quiz:v3:state", JSON.stringify({
    uuid: "550e8400-e29b-41d4-a716-446655440099",
    startedAt: new Date().toISOString(),
    screenIndex: 14,
    answers: { intent: ["first-hyrox"], experience: "never", sex: "men", weight: 75, weightUnit: "kg", activity: "recreational", days: 4, sessionLength: "60", location: "gym-full", partner: "solo", injuries: "none", equipment: ["barbell","dumbbells","sled","wall-ball","rower","ski-erg","sandbag","farmers"] }
  })));
  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/09-plan--m390.png`, fullPage: true });

  // /plan content checks
  check("plan: 'First Race' h1", await page.locator("h1:has-text('First Race')").first().isVisible().catch(() => false));
  check("plan: 12 week circles", (await page.locator('[role="tablist"] button').count()) === 12);
  check("plan: WHAT YOU UNLOCK section", await page.locator("text=/WHAT YOU UNLOCK/").first().isVisible().catch(() => false));
  check("plan: PRIVATE COACH CALL item", await page.locator("text=/PRIVATE COACH CALL/").first().isVisible().catch(() => false));
  check("plan: 'Unlock my plan' button", await page.locator('button:has-text("Unlock my plan")').first().isVisible().catch(() => false));
  check("plan: 'No charge for 7 days' subtext", await page.locator("text=/No charge for 7 days/").first().isVisible().catch(() => false));
  check("plan: NO old 'Start training. 7 days free' StickyCta", !(await page.locator("text=/Start training\\. 7 days free/").first().isVisible().catch(() => false)));
  check("plan: NO 'First week free. £8.99' old paywall copy", !(await page.locator("text=/First week free\\. £8\\.99/").first().isVisible().catch(() => false)));

  // Console errors during the whole walk
  check(`console errors during walk: ${consoleErrs.length}`, consoleErrs.length === 0, consoleErrs.length ? `samples: ${consoleErrs.slice(0,2).join(" | ")}` : "");

  await ctx.close();
}

// =================================================================
// PASS 2 — Desktop 1440 walk (lighter, just the marketing key pages)
// =================================================================
console.log("\n=== desktop 1440 ===");
{
  const ctx = await browser.newContext({ ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  for (const [name, path] of [
    ["10-home", "/"],
    ["11-programmes", "/programmes"],
    ["12-blog", "/blog"],
    ["13-blog-post", "/blog/12-week-hyrox-training-plan"],
    ["14-partners", "/partners"],
    ["15-about", "/about"],
    ["16-quiz", "/quiz"],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${name}--d1440.png`, fullPage: true });
    console.log(`  d1440 ${path}`);
  }
  // Sign in + /plan
  await page.goto(`${BASE}/login?next=/app/today`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem("vyrek:quiz:v3:state", JSON.stringify({
    uuid: "550e8400-e29b-41d4-a716-446655440099",
    startedAt: new Date().toISOString(),
    screenIndex: 14,
    answers: { intent: ["first-hyrox"], experience: "never", sex: "men", weight: 75, weightUnit: "kg", activity: "recreational", days: 4, sessionLength: "60", location: "gym-full", partner: "solo", injuries: "none", equipment: ["barbell","dumbbells","sled","wall-ball","rower","ski-erg","sandbag","farmers"] }
  })));
  await page.goto(`${BASE}/plan`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/17-plan--d1440.png`, fullPage: true });
  console.log(`  d1440 /plan`);
  await ctx.close();
}

// =================================================================
// PASS 3 — Cinematic 4-second capture: 4 frames evenly spaced
// =================================================================
console.log("\n=== calculating cinematic frames ===");
{
  const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  // Sign in so the calculating screen can run + push to /plan with auth
  await page.goto(`${BASE}/login?next=/app/today`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 15000 });
  await page.evaluate(() => localStorage.setItem("vyrek:quiz:v3:state", JSON.stringify({
    uuid: "550e8400-e29b-41d4-a716-446655440099",
    startedAt: new Date().toISOString(),
    screenIndex: 15,
    answers: { intent: ["first-hyrox"], experience: "never", sex: "men", weight: 75, weightUnit: "kg", activity: "recreational", days: 4, sessionLength: "60", location: "gym-full", partner: "solo", injuries: "none", equipment: ["barbell","dumbbells","sled","wall-ball","rower","ski-erg","sandbag","farmers"] }
  })));

  // Force-mount the cinematic by going directly to /quiz with the screenIndex
  // pointing past plan-summary. Then capture every 800ms.
  await page.goto(`${BASE}/quiz`, { waitUntil: "domcontentloaded" });
  // wait for the cinematic to be visible (any progress line / phase)
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/18-cinematic-0400ms.png`, fullPage: false });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/19-cinematic-1100ms.png`, fullPage: false });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/20-cinematic-1900ms.png`, fullPage: false });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/21-cinematic-2800ms.png`, fullPage: false });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/22-cinematic-3500ms.png`, fullPage: false });
  await ctx.close();
}

await browser.close();

console.log("\n\n=== ASSESSMENT SUMMARY ===");
const fails = findings.filter((f) => !f.ok);
console.log(`Total checks: ${findings.length}`);
console.log(`Passing: ${findings.length - fails.length}`);
console.log(`Failing: ${fails.length}`);
if (fails.length) {
  console.log(`\nFailures:`);
  for (const f of fails) console.log(`  ✗ ${f.name}  ${f.detail}`);
}
