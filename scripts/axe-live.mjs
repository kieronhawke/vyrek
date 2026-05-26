/**
 * Run axe-core via Playwright on a list of live URLs. Prints violations.
 */
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.BASE || process.argv[2];
if (!BASE) throw new Error("Set BASE=https://<prod-url>");

const ROUTES = [
  "/",
  "/quiz",
  "/pricing",
  "/programmes",
  "/blog",
  "/blog/first-hyrox-preparation-guide",
  "/partners",
  "/login",
  "/admin/login",
  "/contact",
  "/legal/terms",
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const totals = { serious: 0, critical: 0, moderate: 0, minor: 0 };
let rows = [];

for (const path of ROUTES) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
      .analyze();
    const violations = results.violations;
    const summary = { serious: 0, critical: 0, moderate: 0, minor: 0 };
    for (const v of violations) {
      summary[v.impact ?? "minor"] = (summary[v.impact ?? "minor"] ?? 0) + v.nodes.length;
      totals[v.impact ?? "minor"] = (totals[v.impact ?? "minor"] ?? 0) + v.nodes.length;
    }
    rows.push({ path, violations, summary });
    console.error(
      `✓ ${path}  C${summary.critical} S${summary.serious} M${summary.moderate} m${summary.minor}`,
    );
  } catch (e) {
    console.error(`✗ ${path} — ${e.message?.slice(0, 100)}`);
  }
}
await browser.close();

console.log("\nAxe live — " + BASE);
console.log("Totals:", JSON.stringify(totals));
for (const r of rows) {
  if (r.violations.length === 0) continue;
  console.log(`\n── ${r.path} ──`);
  for (const v of r.violations) {
    console.log(
      `  [${(v.impact ?? "?").padEnd(8)}] ${v.id} — ${v.nodes.length}x  ${v.help}`,
    );
    // Sample first 2 nodes per violation
    for (const n of v.nodes.slice(0, 2)) {
      console.log(`     ${n.target.join(" ")}`);
    }
  }
}
