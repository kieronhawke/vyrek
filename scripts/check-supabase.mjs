#!/usr/bin/env node
/**
 * Does the database actually work?
 *
 * Run after restoring the project (docs/supabase-restore.md) and before
 * assuming anything is fixed. It answers three questions in order, because
 * they fail in that order and a later answer is meaningless without an
 * earlier one:
 *
 *   1. Is the host even there?  The last project was deleted, and the
 *      symptom was a DNS failure, not an auth error. Every "invalid API
 *      key" theory came after somebody assumed the host existed.
 *   2. Do the keys work?
 *   3. Does every table the app reads exist? A half-run migration is the
 *      likeliest outcome of pasting eight files into a SQL editor by hand,
 *      and it surfaces days later as one broken page.
 *
 * No dependencies, no build step: node scripts/check-supabase.mjs
 */

import { readFileSync } from "node:fs";
import { lookup } from "node:dns/promises";

/** Minimal .env.local reader — this runs before any bundler. */
function env() {
  const out = { ...process.env };
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      out[m[1]] ??= v;
    }
  } catch {
    /* no .env.local is fine if the vars are already exported */
  }
  return out;
}

/** Every table the app reads or writes, minus the results engine's own. */
const TABLES = [
  "abandoned_plans",
  "admin_events",
  "consultation_requests",
  "customers",
  "live_sessions",
  "partner_applications",
  "partner_clicks",
  "partner_payouts",
  "partner_referrals",
  "partners",
  "quiz_responses",
  "referrals",
  "stripe_events",
  "subscriptions",
  "waitlist",
];

const ok = (m) => console.log(`  [32m✓[0m ${m}`);
const bad = (m) => console.log(`  [31m✗[0m ${m}`);

const e = env();
const url = e.NEXT_PUBLIC_SUPABASE_URL;
const anon = e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = e.SUPABASE_SECRET_KEY;

console.log("\nSupabase check\n");

if (!url || !anon || !secret) {
  bad("Missing env vars.");
  console.log(
    "\n  Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,",
  );
  console.log("  and SUPABASE_SECRET_KEY in .env.local.\n");
  process.exit(1);
}

console.log(`  Project: ${url}\n`);

/* 1 — the host */
const host = new URL(url).hostname;
try {
  await lookup(host);
  ok("DNS resolves");
} catch {
  bad(`DNS does NOT resolve: ${host}`);
  console.log(
    "\n  The project does not exist. This is exactly how the last one failed —",
  );
  console.log("  see docs/supabase-restore.md.\n");
  process.exit(1);
}

/* 2 — the keys */
let reachable = false;
try {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: anon },
    signal: AbortSignal.timeout(10000),
  });
  reachable = res.status < 500;
  reachable ? ok(`REST API answers (${res.status})`) : bad(`REST API ${res.status}`);
} catch (err) {
  bad(`REST API unreachable: ${err.message}`);
  process.exit(1);
}

/* 2b — is the secret key the right one for THIS project?
 *
 * Worth its own step. Left to the table loop, a stale secret key reports
 * every table as missing and tells you to re-run the migrations — which is
 * both wrong and destructive advice. This tool exists to stop exactly that
 * kind of misdiagnosis, and the first version of it made the mistake.
 */
const probe = await fetch(`${url}/rest/v1/${TABLES[0]}?select=*&limit=0`, {
  headers: { apikey: secret, Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(10000),
});
if (probe.status === 401) {
  bad("SUPABASE_SECRET_KEY is not valid for this project");
  console.log(
    `\n  The URL points at ${host} but the secret key was issued by a`,
  );
  console.log("  different project — most likely the old, deleted one.");
  console.log(
    "\n  Dashboard → Project Settings → API → secret / service_role key.\n",
  );
  process.exit(1);
}
ok("Secret key matches the project");

/* 3 — the tables */
console.log("\n  Tables:\n");
const missing = [];
for (const table of TABLES) {
  try {
    const res = await fetch(
      `${url}/rest/v1/${table}?select=*&limit=0`,
      {
        headers: {
          apikey: secret,
          Authorization: `Bearer ${secret}`,
          // HEAD-like: ask for the count, transfer no rows.
          Prefer: "count=exact",
          Range: "0-0",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (res.ok || res.status === 206) {
      const range = res.headers.get("content-range") ?? "";
      ok(`${table.padEnd(24)} ${range.split("/")[1] ?? "?"} rows`);
    } else {
      missing.push(table);
      bad(`${table.padEnd(24)} ${res.status} ${(await res.text()).slice(0, 60)}`);
    }
  } catch (err) {
    missing.push(table);
    bad(`${table.padEnd(24)} ${err.message}`);
  }
}

console.log();
if (missing.length) {
  bad(`${missing.length} table(s) missing — a migration did not run.`);
  console.log(`\n  Missing: ${missing.join(", ")}`);
  console.log(
    "\n  Fix: node scripts/bundle-migrations.mjs > /tmp/schema.sql, then run",
  );
  console.log("  it in the SQL editor. It is safe to run more than once.\n");
  process.exit(1);
}

ok("Every table the app needs is present.");
console.log("\n  Next: admin login, member login, and the onboarding journey.\n");
