/**
 * Multi-viewport visual sweep. Takes a full-page screenshot of every
 * route at every viewport. Saves to docs/audit-2026-05-26-viewport/.
 *
 * Also detects horizontal overflow (page wider than viewport on mobile
 * widths) and reports any non-200 responses or console errors.
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.BASE || process.argv[2];
if (!BASE) throw new Error("Set BASE=https://<prod-url>");
const OUT = process.env.OUT || "docs/audit-2026-05-26-viewport";

const ROUTES = [
  "/",
  "/quiz",
  "/pricing",
  "/programmes",
  "/blog",
  "/blog/first-hyrox-preparation-guide",
  "/partners",
  "/partners/apply",
  "/login",
  "/contact",
  "/legal/terms",
  "/about",
];

const VIEWPORTS = [
  { name: "iphone-se", width: 320, height: 568, mobile: true },
  { name: "iphone-mini", width: 375, height: 667, mobile: true },
  { name: "iphone-13", width: 390, height: 844, mobile: true },
  { name: "iphone-plus", width: 414, height: 896, mobile: true },
  { name: "tablet-portrait", width: 768, height: 1024, mobile: true },
  { name: "tablet-landscape", width: 1024, height: 768, mobile: false },
  { name: "laptop", width: 1280, height: 800, mobile: false },
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "wide", width: 1920, height: 1080, mobile: false },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const findings = [];

for (const vp of VIEWPORTS) {
  await mkdir(`${OUT}/${vp.name}`, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.mobile,
    hasTouch: vp.mobile,
    deviceScaleFactor: vp.mobile ? 2 : 1,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`${vp.name} ${e.message.slice(0, 200)}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (/posthog|gtag|favicon|preload|hydration mismatch/i.test(t)) return;
    errs.push(`${vp.name} console: ${t.slice(0, 200)}`);
  });

  for (const path of ROUTES) {
    try {
      const resp = await page.goto(`${BASE}${path}`, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      if (resp && resp.status() >= 400) {
        findings.push({
          vp: vp.name,
          path,
          kind: "http-error",
          status: resp.status(),
        });
        continue;
      }
      await page.waitForTimeout(400);

      // Horizontal-overflow detector: docEl.scrollWidth > viewport width
      const overflow = await page.evaluate((vpw) => {
        const docW = document.documentElement.scrollWidth;
        const offenders = [];
        for (const el of document.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (r.right > vpw + 1) {
            offenders.push({
              tag: el.tagName,
              cls: (el.getAttribute("class") || "").slice(0, 80),
              right: Math.round(r.right),
            });
            if (offenders.length >= 4) break;
          }
        }
        return { docW, vpw, offenders };
      }, vp.width);
      if (overflow.docW > vp.width + 1) {
        findings.push({
          vp: vp.name,
          path,
          kind: "overflow",
          docW: overflow.docW,
          vpW: overflow.vpw,
          offenders: overflow.offenders,
        });
      }

      const safeName = path === "/" ? "index" : path.replace(/\//g, "_").replace(/^_/, "");
      await page.screenshot({
        path: `${OUT}/${vp.name}/${safeName}.png`,
        fullPage: true,
      });
    } catch (e) {
      findings.push({
        vp: vp.name,
        path,
        kind: "exception",
        err: e.message.slice(0, 200),
      });
    }
  }

  if (errs.length) findings.push({ vp: vp.name, kind: "errors", errs });
  await ctx.close();
  console.error(`✓ ${vp.name}`);
}
await browser.close();
await writeFile(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));

// Summary
const overflows = findings.filter((f) => f.kind === "overflow");
const httpErrors = findings.filter((f) => f.kind === "http-error");
const exceptions = findings.filter((f) => f.kind === "exception");
const errorsByVp = findings.filter((f) => f.kind === "errors");

console.log("\n=== Multi-viewport sweep summary ===");
console.log(`Total findings: ${findings.length}`);
console.log(`HTTP errors:    ${httpErrors.length}`);
console.log(`Exceptions:     ${exceptions.length}`);
console.log(`Overflows:      ${overflows.length}`);
console.log(`Console errs:   ${errorsByVp.reduce((n, e) => n + e.errs.length, 0)}`);

if (overflows.length) {
  console.log("\nOverflows:");
  for (const o of overflows) {
    console.log(`  ${o.vp.padEnd(18)} ${o.path.padEnd(40)} doc=${o.docW} vp=${o.vpW}`);
    for (const off of (o.offenders ?? []).slice(0, 2)) {
      console.log(`    ${off.tag} .${off.cls.slice(0, 60)} right=${off.right}`);
    }
  }
}

if (httpErrors.length) {
  console.log("\nHTTP errors:");
  for (const e of httpErrors) {
    console.log(`  ${e.vp} ${e.path} -> ${e.status}`);
  }
}

if (errorsByVp.length) {
  console.log("\nConsole errors:");
  for (const e of errorsByVp) {
    for (const m of e.errs.slice(0, 3)) console.log(`  ${m}`);
  }
}
