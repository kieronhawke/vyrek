#!/usr/bin/env node
// Whole-site smoke test. Hits every route, records status + size,
// flags anything that isn't an expected success/redirect.

const BASE = process.env.SMOKE_BASE ?? "https://vyrek.vercel.app";

// expected -> set of (status code) considered "OK" for that route
const ROUTES = [
  // ── Marketing / public ───────────────────────
  ["/", [200]],
  ["/pricing", [200]],
  ["/programmes", [200]],
  ["/how-it-works", [200]],
  ["/about", [200]],
  ["/contact", [200]],
  ["/press", [200]],
  ["/press/brand-guidelines", [200]],
  ["/welcome", [200]],

  // Plans (public marketing detail pages)
  ["/plans", [200]],
  ["/plans/first-race", [200]],
  ["/plans/sub-90", [200]],
  ["/plans/doubles", [200]],
  ["/plans/pro", [200]],

  // Tools
  ["/tools", [200]],
  ["/tools/pace-calculator", [200]],

  // Compare / topics
  ["/compare", [200]],
  ["/compare/hyrox-vs-crossfit", [200]],
  ["/compare/hyrox-vs-spartan", [200]],
  ["/topics", [200]],
  ["/topics/womens-hyrox", [200]],
  ["/topics/masters-hyrox", [200]],

  // Hyrox hubs
  ["/hyrox", [200]],
  ["/hyrox/london", [200]],
  ["/hyrox/manchester", [200]],
  ["/hyrox/birmingham", [200]],
  ["/hyrox/events", [200]],
  ["/hyrox/events/london-excel-march-2026", [200]],
  ["/hyrox/events/manchester-central-april-2026", [200]],
  ["/hyrox/gear", [200]],
  ["/hyrox/gear/best-hyrox-shoes", [200]],
  ["/hyrox/gear/best-hyrox-gloves", [200]],
  ["/hyrox/stations", [200]],
  ["/hyrox/stations/ski-erg", [200]],
  ["/hyrox/stations/wall-balls", [200]],

  // Blog
  ["/blog", [200]],
  ["/blog/12-week-hyrox-training-plan", [200]],
  ["/blog/breaking-hyrox-plateau", [200]],
  ["/blog/hyrox-race-day-pacing", [200]],
  ["/blog/category/strategy", [200, 404]],
  ["/blog/author/coach-james", [200, 404]],
  ["/blog/rss.xml", [200]],
  ["/feed.json", [200]],

  // Quiz
  ["/quiz", [200]],
  ["/quiz/v2", [200]],
  ["/quiz/1", [200]],
  ["/quiz/3", [200]],

  // Partners
  ["/partners", [200]],
  ["/partners/apply", [200]],
  // Dashboard requires HMAC cookie — gated, expect 200 with login form OR 307
  ["/partners/dashboard", [200, 307, 308]],
  ["/partners/onboard", [200, 307, 308]],

  // Account (public — referral splash)
  ["/account/refer", [200, 307]],

  // Auth surfaces
  ["/login", [200]],
  ["/admin/login", [200]],

  // Member app — should 307 to /login?next=
  ["/app", [307]],
  ["/app/today", [307]],
  ["/app/plan", [307]],
  ["/app/plan/stations", [307]],
  ["/app/nutrition", [307]],
  ["/app/analysis", [307]],
  ["/app/analysis/athlete/james-wright", [307]],
  ["/app/analysis/race/hyrox-london-jun-2026", [307]],
  ["/app/account", [307]],
  ["/app/account/pr", [307]],

  // Admin — should 307 to /admin/login
  ["/admin", [307]],
  ["/admin/customers", [307]],
  ["/admin/quiz", [307]],
  ["/admin/subscriptions", [307]],

  // Legal
  ["/legal/privacy", [200]],
  ["/legal/terms", [200]],
  ["/legal/cookies", [200]],
  ["/legal/refunds", [200]],

  // SEO + crawler files
  ["/llms.txt", [200]],
  ["/sitemap.xml", [200]],
  ["/robots.txt", [200]],
  ["/manifest.webmanifest", [200, 404]],

  // API GETs that should respond (POST endpoints will 405)
  ["/api/stats/active", [200, 500]],
  ["/api/referral/state", [200, 401, 403]],
  ["/api/admin/live", [200, 401, 403]],

  // POST-only endpoints — GET should give 405
  ["/api/account/create", [405]],
  ["/api/email-gate", [405]],
  ["/api/partners/apply", [405]],
  ["/api/stripe/create-checkout-session", [405]],
  ["/api/stripe/webhook", [405, 400]],
];

const results = [];
const concurrency = 10;
let cursor = 0;

async function worker() {
  while (cursor < ROUTES.length) {
    const i = cursor++;
    const [path, expected] = ROUTES[i];
    const url = `${BASE}${path}`;
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        redirect: "manual",
        headers: { "User-Agent": "vyrek-smoke/1.0" },
      });
      const ok = expected.includes(res.status);
      const len = res.headers.get("content-length") ?? "";
      const loc = res.headers.get("location") ?? "";
      results.push({
        path,
        status: res.status,
        expected,
        ok,
        ms: Date.now() - t0,
        len,
        loc,
      });
    } catch (e) {
      results.push({
        path,
        status: -1,
        expected,
        ok: false,
        ms: Date.now() - t0,
        err: e.message,
      });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

results.sort((a, b) => a.path.localeCompare(b.path));

const failures = results.filter((r) => !r.ok);
const passing = results.filter((r) => r.ok);

console.log(`\nBASE: ${BASE}`);
console.log(`Total: ${results.length}   Passing: ${passing.length}   Failing: ${failures.length}\n`);

if (failures.length) {
  console.log("FAILURES:");
  for (const f of failures) {
    const exp = f.expected.join("|");
    const tail = f.err ? ` err=${f.err}` : f.loc ? ` -> ${f.loc}` : "";
    console.log(`  [${String(f.status).padStart(3)} ≠ ${exp}] ${f.path}${tail}  ${f.ms}ms`);
  }
  console.log("");
}

console.log("All routes (sorted):");
for (const r of results) {
  const mark = r.ok ? "✓" : "✗";
  const tail = r.loc ? ` -> ${r.loc}` : "";
  console.log(`  ${mark} [${String(r.status).padStart(3)}] ${r.path}${tail}  ${r.ms}ms`);
}

process.exit(failures.length ? 1 : 0);
