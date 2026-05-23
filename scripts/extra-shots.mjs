#!/usr/bin/env node
// Snap a few extra pages I'd missed: a blog post detail, a single
// programme card area on mobile, the quiz first screen, the welcome
// flow (after a fake Stripe session).

import { chromium, webkit, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "audit-shots");
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

await mkdir(OUT, { recursive: true });

const targets = [
  { name: "blog-post", path: "/blog/hyrox-sled-push-technique" },
  { name: "blog-category", path: "/blog/category/training" },
  { name: "plan-detail", path: "/plans/sub-90-hyrox-training-plan" },
  { name: "press-brand", path: "/press/brand-guidelines" },
  { name: "tools-pace", path: "/tools/pace-calculator" },
  { name: "welcome-no-session", path: "/welcome" },
];

const viewports = [
  { name: "mobile-375", engine: "webkit", config: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } } },
  { name: "desktop-1440", engine: "chromium", config: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
];

for (const vp of viewports) {
  const browser = await (vp.engine === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext(vp.config);
  const page = await ctx.newPage();
  for (const t of targets) {
    const url = `${BASE}${t.path}`;
    const out = join(OUT, `${t.name}--${vp.name}.png`);
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      // Wait a beat then scroll the page fully so RevealOnView fires.
      await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 200));
        const total = document.documentElement.scrollHeight;
        for (let y = 0; y < total; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 200));
      });
      await page.screenshot({ path: out, fullPage: true });
      console.log(`[${vp.name}] ${resp?.status() ?? "?"} ${t.path} -> ${out}`);
    } catch (e) {
      console.error(`[${vp.name}] FAILED ${t.path}: ${e.message}`);
    }
  }
  await browser.close();
}
