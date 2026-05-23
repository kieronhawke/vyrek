#!/usr/bin/env node
// Visual regression grid. Snaps every page at multiple viewports + captures
// hover/focus/error states so I can eyeball anything that looks wrong.
//
// Out: scripts/audit-shots/grid-<page>--<viewport>[--state].png

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

await mkdir(OUT, { recursive: true });

const PAGES = [
  { name: "landing", path: "/" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "about", path: "/about" },
  { name: "contact", path: "/contact" },
  { name: "press", path: "/press" },
  { name: "press-brand", path: "/press/brand-guidelines" },
  { name: "journal", path: "/blog" },
  { name: "blog-post", path: "/blog/hyrox-sled-push-technique" },
  { name: "plan-detail", path: "/plans/sub-90-hyrox-training-plan" },
  { name: "partners", path: "/partners" },
  { name: "partners-apply", path: "/partners/apply" },
  { name: "partners-dashboard-login", path: "/partners/dashboard" },
  { name: "partners-onboard-invalid", path: "/partners/onboard?token=bad" },
  { name: "legal-privacy", path: "/legal/privacy" },
  { name: "legal-terms", path: "/legal/terms" },
  { name: "legal-cookies", path: "/legal/cookies" },
  { name: "legal-refunds", path: "/legal/refunds" },
  { name: "quiz", path: "/quiz" },
  { name: "pricing", path: "/pricing" },
  { name: "admin-login", path: "/admin/login" },
];

const VPS = [
  { name: "m375", engine: "webkit", config: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
  { name: "m390", engine: "webkit", config: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } } },
  { name: "t768", engine: "webkit", config: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } } },
  { name: "d1440", engine: "chromium", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
];

const results = [];

for (const vp of VPS) {
  const browser = await (vp.engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();

  page.on("pageerror", (e) =>
    results.push({ vp: vp.name, path: "(pageerror)", err: e.message }),
  );

  for (const p of PAGES) {
    const errors = [];
    const onMsg = (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    };
    page.on("console", onMsg);
    const url = `${BASE}${p.path}`;
    try {
      const r = await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
      // Scroll-into-view sweep so RevealOnView fires
      await page.evaluate(async () => {
        const h = document.documentElement.scrollHeight;
        for (let y = 0; y < h; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 30));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 200));
      });
      const status = r?.status() ?? "?";
      const out = join(OUT, `grid-${p.name}--${vp.name}.png`);
      await page.screenshot({ path: out, fullPage: true });
      results.push({
        vp: vp.name,
        path: p.path,
        status,
        errorCount: errors.length,
        errors: errors.slice(0, 3),
      });
    } catch (e) {
      results.push({ vp: vp.name, path: p.path, err: e.message });
    }
    page.off("console", onMsg);
  }
  await browser.close();
}

const blocked = results.filter((r) => r.err || (r.status && r.status >= 400));
const erroring = results.filter((r) => r.errorCount && r.errorCount > 0);

console.log("=== SUMMARY ===");
console.log(`captured ${results.length - blocked.length}/${results.length}`);
console.log(`pages with console errors: ${erroring.length}`);
if (blocked.length) {
  console.log("--- blocked / status >=400 ---");
  for (const r of blocked) console.log(JSON.stringify(r));
}
if (erroring.length) {
  console.log("--- console errors ---");
  for (const r of erroring) console.log(JSON.stringify(r));
}
