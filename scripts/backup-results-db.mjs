/**
 * Snapshot the results database, and restore it.
 *
 * Recovery has two tiers and it matters which one you are relying on:
 *
 * **Tier 1 — re-ingest.** Everything we hold is derived from a public source
 * and every write is idempotent on a stable source id, so the real disaster
 * recovery is "run the backfill again". It is exercised constantly rather than
 * being a procedure nobody has tried.
 *
 * **Tier 2 — this snapshot.** Re-ingesting a full season takes hours and a lot
 * of requests against someone else's servers. More importantly it cannot
 * restore the things that are *not* re-derivable: claimed profiles,
 * anonymisation decisions, quarantine review state, merge resolutions and
 * operator settings. Those are ours, and losing them is permanent.
 *
 *   node --env-file=.env.local scripts/backup-results-db.mjs
 *   node --env-file=.env.local scripts/backup-results-db.mjs --restore backups/x.json.gz
 *
 * Deliberately JSON over the API rather than pg_dump: pg_dump refuses to talk
 * to a server newer than itself, which makes a backup that depends on a
 * matching client version a backup that fails on the day you need it. This
 * works from anywhere the API key works, including a scheduled function.
 *
 * Output is gzipped into backups/, which is gitignored — a snapshot contains
 * personal data and does not belong in a repository.
 */

import { createClient } from "@supabase/supabase-js";
import { createGzip, gunzipSync } from "node:zlib";
import { createWriteStream, mkdirSync, readFileSync, existsSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { join } from "node:path";

const url = process.env.RESULTS_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.RESULTS_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing RESULTS_SUPABASE_URL / RESULTS_SUPABASE_SECRET_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/**
 * Order matters on restore: a result references an event, a division and an
 * athlete, so those have to exist first. Listed parent-first and restored in
 * the same order.
 */
const TABLES = [
  { name: "results_events", conflict: "slug" },
  { name: "results_divisions", conflict: "event_id,division_key" },
  { name: "results_athletes", conflict: "slug" },
  { name: "results_results", conflict: "source_result_id" },
  { name: "results_station_distributions", conflict: "scope,event_id,division_key,station_key,age_group,sex" },
  { name: "results_sync_state", conflict: "source_event_id" },
  { name: "results_engine_settings", conflict: "key" },
  { name: "results_quarantine", conflict: "id" },
  { name: "results_alerts", conflict: "id" },
  { name: "results_athlete_merge_reviews", conflict: "id" },
  { name: "results_ingestion_runs", conflict: "id" },
];

async function readAll(table) {
  const rows = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db.from(table).select("*").range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return rows;
}

const restoreAt = process.argv.indexOf("--restore");

if (restoreAt !== -1) {
  const file = process.argv[restoreAt + 1];
  if (!file || !existsSync(file)) {
    console.error("Usage: --restore <backups/file.json.gz>");
    process.exit(1);
  }
  const raw = file.endsWith(".gz") ? gunzipSync(readFileSync(file)).toString() : readFileSync(file, "utf8");
  const snapshot = JSON.parse(raw);
  console.log(`Restoring snapshot taken ${snapshot.takenAt}\n`);

  for (const { name, conflict } of TABLES) {
    const rows = snapshot.tables[name] ?? [];
    if (rows.length === 0) { console.log(`  ${name}: nothing to restore`); continue; }
    // Upsert, not insert: a restore into a partially-populated database should
    // top it up rather than fail on the first row that already exists.
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await db.from(name).upsert(chunk, { onConflict: conflict });
      if (error) throw new Error(`${name}: ${error.message}`);
    }
    console.log(`  ${name}: ${rows.length} rows`);
  }
  console.log("\nRestored. Schema comes from supabase/migrations/0101_results_engine.sql.");
  process.exit(0);
}

const dir = join(process.cwd(), "backups");
mkdirSync(dir, { recursive: true });
// A timestamped name, so today's broken snapshot cannot overwrite yesterday's
// good one — which is a classic way to end up with no backup at all.
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = join(dir, `results-${stamp}.json.gz`);

const snapshot = { takenAt: new Date().toISOString(), project: url, tables: {} };
let total = 0;
for (const { name } of TABLES) {
  const rows = await readAll(name);
  snapshot.tables[name] = rows;
  total += rows.length;
  console.log(`  ${name.padEnd(34)} ${rows.length}`);
}

await pipeline(Readable.from([JSON.stringify(snapshot)]), createGzip(), createWriteStream(out));
console.log(`\n${total} rows → ${out}`);
console.log(`Restore: node --env-file=.env.local scripts/backup-results-db.mjs --restore ${out}`);
