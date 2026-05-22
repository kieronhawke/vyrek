// Quick post-migration sanity check.
// Reads each table with the secret key — confirms tables exist + RLS doesn't
// block the service role. Prints a row count (should be 0 on a fresh DB).
//
// Usage: node scripts/verify-supabase.mjs

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hand-roll a minimal .env.local parser so we don't need dotenv as a dep.
const envText = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY;

if (!url || url.includes("YOUR-PROJECT-ID")) {
  console.error(
    "❌ NEXT_PUBLIC_SUPABASE_URL still has the placeholder. Edit .env.local first.",
  );
  process.exit(1);
}
if (!key) {
  console.error("❌ SUPABASE_SECRET_KEY missing from .env.local.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  "customers",
  "quiz_responses",
  "subscriptions",
  "referrals",
  "waitlist",
  "abandoned_plans",
];

let allOk = true;
for (const table of tables) {
  // HEAD-only count requests don't surface schema-cache errors (Supabase
  // bug? — they come back as { error: null, count: null }) so we issue a
  // real SELECT to force PostgREST to validate the table identifier.
  const { error: selectErr } = await supabase
    .from(table)
    .select("id")
    .limit(1);
  if (selectErr) {
    console.error(`❌ ${table.padEnd(18)} ${selectErr.message}`);
    allOk = false;
    continue;
  }
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    console.error(`❌ ${table.padEnd(18)} ${error.message}`);
    allOk = false;
  } else {
    console.log(`✅ ${table.padEnd(18)} ${count ?? 0} row(s)`);
  }
}

process.exit(allOk ? 0 : 1);
