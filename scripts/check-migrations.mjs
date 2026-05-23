#!/usr/bin/env node
// Quick probe to see which Supabase tables / columns are present and
// which migrations still need to be applied. Reads SUPABASE_* env vars
// from the loaded environment.
//
// Run: node --env-file=.env.local scripts/check-migrations.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const checks = [
  // 0001
  { name: "customers table", table: "customers" },
  { name: "subscriptions table", table: "subscriptions" },
  { name: "waitlist table", table: "waitlist" },
  // 0002
  { name: "customers.auth_user_id (0002)", table: "customers", column: "auth_user_id" },
  { name: "customers.marketing_opt_in (0002)", table: "customers", column: "marketing_opt_in" },
  { name: "quiz_responses.weight_kg (0002)", table: "quiz_responses", column: "weight_kg" },
  { name: "abandoned_plans.customer_id (0002)", table: "abandoned_plans", column: "customer_id" },
  // 0003
  { name: "partner_applications (0003)", table: "partner_applications" },
  { name: "partners (0003)", table: "partners" },
  { name: "partner_referrals (0003)", table: "partner_referrals" },
  { name: "partner_payouts (0003)", table: "partner_payouts" },
];

const results = [];

for (const c of checks) {
  try {
    const q = sb.from(c.table).select(c.column ?? "*", { count: "exact", head: true });
    const { error } = await q;
    if (error) {
      results.push({ name: c.name, ok: false, detail: error.message });
    } else {
      results.push({ name: c.name, ok: true });
    }
  } catch (err) {
    results.push({ name: c.name, ok: false, detail: String(err) });
  }
}

let allOk = true;
for (const r of results) {
  if (r.ok) {
    console.log(`OK    ${r.name}`);
  } else {
    allOk = false;
    console.log(`FAIL  ${r.name}  -> ${r.detail}`);
  }
}

if (!allOk) {
  console.log("");
  console.log(
    "Some migrations have not been applied. Paste the contents of",
  );
  console.log("supabase/migrations/0002_quiz_v3.sql and");
  console.log("supabase/migrations/0003_partner_programme.sql");
  console.log("into the Supabase Dashboard SQL Editor and run them.");
  process.exit(1);
}
