#!/usr/bin/env node
// Print the SQL needed to bring the live Supabase DB up to date.
// Concatenates 0002 + 0003 + a schema-cache reload notify.
//
// Run: node scripts/apply-pending-migrations.mjs > /tmp/migrate.sql
// then paste /tmp/migrate.sql into Supabase Dashboard → SQL Editor.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const files = [
  "supabase/migrations/0002_quiz_v3.sql",
  "supabase/migrations/0003_partner_programme.sql",
  "supabase/migrations/0004_admin_observability.sql",
  "supabase/migrations/0005_live_presence.sql",
];

console.log(`-- Vyrek consolidated pending migrations`);
console.log(`-- Generated: ${new Date().toISOString()}`);
console.log("");

for (const f of files) {
  const sql = await readFile(join(ROOT, f), "utf8");
  console.log(`-- ╔═════════════════════════════════════════════════════════╗`);
  console.log(`-- ║ ${f}`);
  console.log(`-- ╚═════════════════════════════════════════════════════════╝`);
  console.log(sql.trimEnd());
  console.log("");
}

console.log(`-- Tell PostgREST to refresh its schema cache so the admin`);
console.log(`-- dashboard sees the new tables/columns immediately.`);
console.log(`NOTIFY pgrst, 'reload schema';`);
