/**
 * Visual + functional sweep across every public route. Screenshots at
 * 390×844 (iPhone-ish) and 1440×900 (desktop), captures console errors,
 * notes any failed network requests, and verifies the page has visible
 * content above the fold.
 *
 * Usage: node scripts/full-route-sweep.mjs [baseUrl]
 */

import puppeteer from "puppeteer-core";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", ".screenshots", "sweep");
const BASE = process.argv[2] || "https://vyrek.vercel.app";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ROUTES = [
  { path: "/", name: "landing" },
  { path: "/about", name: "about" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/programmes", name: "programmes" },
  { path: "/pricing", name: "pricing" },
  { path: "/press", name: "press" },
  { path: "/contact", name: "contact" },
  { path: "/quiz", name: "quiz-v3-welcome" },
  { path: "/quiz/done", name: "quiz-done" },
  { path: "/plan", name: "plan" },
  { path: "/welcome?session_id=cs_test_bogus", name: "welcome-bogus-session" },
  { path: "/account/refer", name: "account-refer" },
  { path: "/legal/cookies", name: "legal-cookies" },
  { path: "/legal/privacy", name: "legal-privacy" },
  { path: "/legal/refunds", name: "legal-refunds" },
  { path: "/legal/terms", name: "legal-terms" },
  { path: "/some-page-that-does-not-exist", name: "404" },
];

const PRESETS = [
  {
    name: "mobile",
    viewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  },
  {
    name: "desktop",
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
];

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const results = [];

try {
  for (const preset of PRESETS) {
    const page = await browser.newPage();
    await page.setViewport(preset.viewport);

    for (const route of ROUTES) {
      const url = `${BASE}${route.path}`;
      const result = {
        route: route.path,
        preset: preset.name,
        consoleErrors: [],
        consoleWarns: [],
        failedRequests: [],
        finalUrl: null,
        h1: null,
        title: null,
        statusCode: null,
        bytesIn: 0,
        renderMs: null,
      };

      const onConsole = (msg) => {
        const type = msg.type();
        const text = msg.text();
        if (type === "error") result.consoleErrors.push(text);
        else if (type === "warning") result.consoleWarns.push(text);
      };
      const onRequest = (req) => {
        const r = req.response();
      };
      const onResponse = (resp) => {
        try {
          const status = resp.status();
          if (status >= 400) {
            result.failedRequests.push(`${status} ${resp.url()}`);
          }
        } catch {
          /* noop */
        }
      };

      page.on("console", onConsole);
      page.on("response", onResponse);

      const t0 = Date.now();
      try {
        const resp = await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 25000,
        });
        result.statusCode = resp?.status() ?? null;
      } catch (err) {
        result.consoleErrors.push(`navigation: ${err.message}`);
      }
      result.renderMs = Date.now() - t0;

      // Settle for animations
      await new Promise((r) => setTimeout(r, 600));

      try {
        const info = await page.evaluate(() => ({
          h1: document.querySelector("h1")?.textContent?.trim() ?? null,
          title: document.title,
          url: location.href,
          hasContent: document.body.innerText.trim().length > 50,
        }));
        result.h1 = info.h1;
        result.title = info.title;
        result.finalUrl = info.url;
        if (!info.hasContent) {
          result.consoleErrors.push("page-body-empty");
        }
      } catch (err) {
        result.consoleErrors.push(`evaluate: ${err.message}`);
      }

      const shotPath = join(
        OUT,
        `${preset.name}__${route.name}.png`,
      );
      try {
        await page.screenshot({ path: shotPath, fullPage: false });
      } catch (err) {
        result.consoleErrors.push(`screenshot: ${err.message}`);
      }

      page.off("console", onConsole);
      page.off("response", onResponse);
      results.push(result);
    }

    await page.close();
  }
} finally {
  await browser.close();
}

// Save full results JSON
await writeFile(
  join(OUT, "_results.json"),
  JSON.stringify(results, null, 2),
);

// Print summary
console.log(
  "\n──── Full route sweep ─────────────────────────────────────────────────",
);
console.log(
  "PRESET   ROUTE                                STATUS  RENDER  H1                                 ERRORS  WARNINGS",
);
console.log(
  "──────────────────────────────────────────────────────────────────────────",
);
for (const r of results) {
  const sep = "  ";
  const route = r.route.padEnd(36);
  const status = (r.statusCode ?? "—").toString().padEnd(6);
  const render = `${r.renderMs}ms`.padEnd(7);
  const h1 = (r.h1 ?? "—").slice(0, 32).padEnd(34);
  const errs = r.consoleErrors.length.toString().padEnd(7);
  const warns = r.consoleWarns.length.toString();
  console.log(
    `${r.preset.padEnd(8)} ${route}${sep}${status}${render} ${h1}${errs}${warns}`,
  );
}
console.log(
  "──────────────────────────────────────────────────────────────────────────\n",
);

// Print issues
const issues = results.filter(
  (r) =>
    r.consoleErrors.length > 0 ||
    r.failedRequests.length > 0 ||
    (r.statusCode && r.statusCode >= 500),
);
if (issues.length) {
  console.log(`Issues found in ${issues.length} runs:\n`);
  for (const r of issues) {
    console.log(`✗ ${r.preset} ${r.route}`);
    if (r.consoleErrors.length) {
      for (const e of r.consoleErrors.slice(0, 4)) {
        console.log(`   error: ${e}`);
      }
    }
    if (r.failedRequests.length) {
      for (const f of r.failedRequests.slice(0, 4)) {
        console.log(`   net:   ${f}`);
      }
    }
  }
} else {
  console.log("✓ No console errors or failed requests");
}

process.exit(0);
