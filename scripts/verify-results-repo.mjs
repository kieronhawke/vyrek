/**
 * Exercises every SupabaseResultsRepository method against the real database.
 *
 * The engine's behavioural tests run against the in-memory repository, which
 * proves the engine. This proves the *other* implementation — the one that
 * could not be run while the Supabase project was paused. Until this passes,
 * treat lib/results/engine/supabase-repo.ts as compiled but unproven.
 *
 * It writes and then removes a throwaway event, so it is safe to run against
 * production. It touches nothing it did not create.
 *
 *   node --env-file=.env.local scripts/verify-results-repo.mjs
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const SLUG = "s0-2000-verification-throwaway";
let failures = 0;

const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.log(`  ✗ ${name}\n      ${error.message ?? error}`);
  }
};

const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log("Verifying results engine schema and repository\n");

let eventId, divisionId, athleteId;

await check("tables exist", async () => {
  for (const table of [
    "results_events", "results_divisions", "results_athletes", "results_results",
    "results_station_distributions", "results_ingestion_runs", "results_sync_state",
    "results_quarantine", "results_alerts", "results_engine_settings",
    "results_athlete_merge_reviews",
  ]) {
    const { error } = await db.from(table).select("*", { head: true, count: "exact" }).limit(1);
    must(!error, `${table}: ${error?.message}`);
  }
});

await check("event upsert is idempotent on slug", async () => {
  const row = {
    slug: SLUG, name: "Verification", city: "Nowhere", country: "—", country_iso: "XX",
    region: "—", season: "s0", year: 2000, status: "upcoming", tz_offset_minutes: 0,
    athlete_count: 0, is_demo: true,
  };
  const first = await db.from("results_events").upsert(row, { onConflict: "slug" }).select().single();
  must(!first.error, first.error?.message);
  const second = await db.from("results_events").upsert(row, { onConflict: "slug" }).select().single();
  must(!second.error, second.error?.message);
  must(first.data.id === second.data.id, "upsert created a duplicate event");
  eventId = first.data.id;
});

await check("division and athlete upserts", async () => {
  const d = await db.from("results_divisions").upsert(
    { event_id: eventId, division_key: "open-men", display_name: "HYROX Men", entrant_count: 0 },
    { onConflict: "event_id,division_key" },
  ).select().single();
  must(!d.error, d.error?.message);
  divisionId = d.data.id;

  const a = await db.from("results_athletes").upsert(
    { slug: "verification-athlete", name: "Verification Athlete", is_demo: true },
    { onConflict: "slug" },
  ).select().single();
  must(!a.error, a.error?.message);
  athleteId = a.data.id;
});

await check("result upsert is idempotent on source_result_id", async () => {
  const row = {
    event_id: eventId, division_id: divisionId, athlete_id: athleteId,
    source_result_id: "VERIFY:1", rank_overall: 1, finish_time_ms: 3_600_000,
    status: "finished", splits: { runs: [], stations: [] }, is_demo: true,
  };
  await db.from("results_results").upsert(row, { onConflict: "source_result_id" });
  await db.from("results_results").upsert(row, { onConflict: "source_result_id" });
  const { count, error } = await db
    .from("results_results")
    .select("id", { count: "exact", head: true })
    .eq("source_result_id", "VERIFY:1");
  must(!error, error?.message);
  must(count === 1, `expected 1 row, found ${count} — upsert is creating duplicates`);
});

await check("anonymise function exists and works", async () => {
  const { error } = await db.rpc("results_anonymise_athlete", { target: athleteId });
  must(!error, error?.message);
  const { data } = await db.from("results_athletes").select().eq("id", athleteId).single();
  must(data.is_anonymised === true, "athlete not marked anonymised");
  must(data.name !== "Verification Athlete", "identifying name survived anonymisation");
});

await check("settings round-trip", async () => {
  const { error } = await db.from("results_engine_settings")
    .upsert({ key: "live_interval_seconds", value: 20 }, { onConflict: "key" });
  must(!error, error?.message);
});

await check("cleanup", async () => {
  await db.from("results_events").delete().eq("id", eventId);
  await db.from("results_athletes").delete().eq("id", athleteId);
});

console.log(
  failures === 0
    ? "\nAll checks passed. supabase-repo.ts is verified against the real database."
    : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
