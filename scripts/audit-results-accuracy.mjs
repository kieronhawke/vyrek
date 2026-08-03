/**
 * Accuracy audit for the whole results database.
 *
 * The completeness check in `syncDivision` verifies one division at the moment
 * it is written. This verifies *everything already stored*, at any time, and it
 * is the thing to run before trusting a number on the public site.
 *
 * It answers nine questions, and it does not fix anything — an audit that
 * silently repairs what it finds cannot be trusted to report honestly.
 *
 *   1. Does every division hold as many rows as the source said it had?
 *   2. Does every result belong to an event and a division that exist?
 *   3. Are ranks contiguous from 1, or are there gaps and duplicates?
 *   4. Do any finish times fall outside what a human could run?
 *   5. Where splits exist, do they reconcile with the finish time?
 *   6. Are there duplicate athletes that should have been resolved to one?
 *   7. Is any athlete profile orphaned — reachable from no race at all?
 *   8. Is any athlete in both the men's and women's board of one event?
 *   9. Is anything stored that no ingestion run can account for?
 *
 *   node --env-file=.env.local scripts/audit-results-accuracy.mjs
 *   node --env-file=.env.local scripts/audit-results-accuracy.mjs --json
 *
 * Exit code 1 if anything failed, so it can gate a deploy.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.RESULTS_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.RESULTS_SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing RESULTS_SUPABASE_URL / RESULTS_SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const asJson = process.argv.includes("--json");
const db = createClient(url, key, { auth: { persistSession: false } });
const findings = [];

const report = (check, severity, message, detail) =>
  findings.push({ check, severity, message, detail });

/** Everything, paged — PostgREST caps a single response at 1,000 rows. */
async function all(table, columns, filter = (q) => q) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await filter(db.from(table).select(columns)).range(from, from + page - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return out;
}

const log = (s) => { if (!asJson) console.log(s); };

log("Auditing the results database\n");

const events = await all("results_events", "id,slug,city,season,year,status,start_datetime");
const divisions = await all(
  "results_divisions",
  "id,event_id,division_key,display_name,entrant_count,published_entrant_count,source_division_id",
);
const results = await all(
  "results_results",
  "id,event_id,division_id,athlete_id,partner_athlete_ids,source_result_id,rank_overall," +
    "finish_time_ms,roxzone_time_ms,status,splits",
);
const athletes = await all("results_athletes", "id,slug,name,nationality,is_anonymised");

log(
  `  ${events.length} events · ${divisions.length} divisions · ` +
    `${results.length} results · ${athletes.length} athletes\n`,
);

/* 1 ── Completeness against what the source published ─────────────────── */

// ⚠️ Counted in people, on both sides.
//
// The published figure counts entrants; we store one row per *entry*, and a
// doubles or relay entry is several people. Counting rows against it reported
// every team division as half-missing, which is enough false noise to make the
// whole audit ignorable.
const byDivision = new Map();
for (const r of results) {
  const people = 1 + (r.partner_athlete_ids?.length ?? 0);
  byDivision.set(r.division_id, (byDivision.get(r.division_id) ?? 0) + people);
}

let short = 0;
let over = 0;
for (const d of divisions) {
  const stored = byDivision.get(d.id) ?? 0;
  const published = d.published_entrant_count;
  if (published === null || published === undefined) continue;

  // ⚠️ The published figure is derived and carries rounding.
  //
  // The board counts rendered rows, not people — each athlete renders two to
  // four times — so the headcount is that counter divided by the duplication
  // factor measured on the page (SOURCE.md §4). Division and rounding land it
  // within a row or so, and flagging "239 of 240" as an error is how an audit
  // teaches you to skim past it. One row, or 1% on a big board.
  const tolerance = Math.max(1, Math.round(published * 0.01));

  if (stored + tolerance < published) {
    short += 1;
    report("completeness", "error", `${d.division_key} holds ${stored} of ${published} published`, {
      divisionId: d.id, sourceDivisionId: d.source_division_id, stored, published,
    });
  } else if (stored > published + tolerance) {
    // More than published is as suspicious as fewer: it suggests rows from
    // another division leaked in, which is a correctness failure not a gap.
    // That is exactly what the unfiltered fallback adapter did — it returned a
    // whole event under one division's name — so this check earns its keep.
    over += 1;
    report("completeness", "error", `${d.division_key} holds ${stored}, more than the ${published} published`, {
      divisionId: d.id, stored, published,
    });
  }
}
log(`  1. completeness        ${short} short, ${over} over-full`);

/* 2 ── Referential integrity ───────────────────────────────────────────── */

const eventIds = new Set(events.map((e) => e.id));
const divisionIds = new Set(divisions.map((d) => d.id));
const athleteIds = new Set(athletes.map((a) => a.id));
let orphans = 0;
for (const r of results) {
  if (!eventIds.has(r.event_id) || !divisionIds.has(r.division_id) || !athleteIds.has(r.athlete_id)) {
    orphans += 1;
    report("integrity", "error", `result ${r.source_result_id} references something that does not exist`, {
      resultId: r.id,
    });
  }
}
log(`  2. referential         ${orphans} orphaned results`);

/* 3 ── Rank sanity ─────────────────────────────────────────────────────── */

let rankIssues = 0;
for (const d of divisions) {
  const rows = results.filter((r) => r.division_id === d.id && r.status === "finished");
  if (rows.length === 0) continue;
  const ranks = rows.map((r) => r.rank_overall).filter((r) => r !== null);
  const unique = new Set(ranks);
  if (unique.size !== ranks.length) {
    rankIssues += 1;
    report("ranks", "warning", `${d.division_key} has duplicate ranks`, {
      divisionId: d.id, rows: rows.length, distinct: unique.size,
    });
  }
  // A board should start at 1. Anything else means a page was missed.
  if (ranks.length > 0 && Math.min(...ranks) !== 1) {
    rankIssues += 1;
    report("ranks", "warning", `${d.division_key} starts at rank ${Math.min(...ranks)}, not 1`, {
      divisionId: d.id,
    });
  }
}
log(`  3. ranks               ${rankIssues} divisions with rank anomalies`);

/* 4 ── Plausible finish times ──────────────────────────────────────────── */

const MIN_MS = 30 * 60 * 1000;
const MAX_MS = 5 * 60 * 60 * 1000;
let implausible = 0;
for (const r of results) {
  if (r.status !== "finished" || r.finish_time_ms === null) continue;
  if (r.finish_time_ms < MIN_MS || r.finish_time_ms > MAX_MS) {
    implausible += 1;
    report("times", "error", `${r.source_result_id} finished in ${Math.round(r.finish_time_ms / 1000)}s`, {
      resultId: r.id,
    });
  }
}
log(`  4. finish times        ${implausible} outside human range`);

/* 5 ── Splits reconcile with the finish ────────────────────────────────── */

let withSplits = 0;
let drifted = 0;
for (const r of results) {
  const s = r.splits ?? {};
  const segments = [...(s.runs ?? []), ...(s.stations ?? [])];
  if (segments.length < 16 || !r.finish_time_ms) continue;
  withSplits += 1;
  const sum = segments.reduce((t, x) => t + (x.timeMs ?? 0), 0) + (s.roxzoneMs ?? 0);
  const drift = Math.abs(sum - r.finish_time_ms) / r.finish_time_ms;
  if (drift > 0.08) {
    drifted += 1;
    report("splits", "error", `${r.source_result_id} splits drift ${(drift * 100).toFixed(1)}% from finish`, {
      resultId: r.id, sum, finish: r.finish_time_ms,
    });
  }
}
log(`  5. splits              ${drifted} of ${withSplits} fail to reconcile`);

/* 6 ── Athlete identity ────────────────────────────────────────────────── */

const byName = new Map();
for (const a of athletes) {
  if (a.is_anonymised) continue;
  const k = `${a.name.toLowerCase()}|${a.nationality ?? ""}`;
  byName.set(k, [...(byName.get(k) ?? []), a]);
}
const dupes = [...byName.entries()].filter(([, list]) => list.length > 1);
for (const [k, list] of dupes.slice(0, 20)) {
  report("identity", "info", `${list.length} profiles share "${k}"`, { slugs: list.map((a) => a.slug) });
}
log(`  6. identity            ${dupes.length} name+nationality groups with more than one profile`);

/* 7 ── Orphaned profiles ───────────────────────────────────────────────── */

/**
 * A profile no race points at.
 *
 * This found a real runaway: athletes are created while a division is being
 * parsed, before the rows they belong to are written, so a sync that failed
 * afterwards left them behind — and without a stable id, the retry created them
 * again under an incremented slug. 1,006 orphans and one person with eleven
 * profiles. The count should now be zero and stay there.
 */
const attached = new Set();
for (const r of results) {
  attached.add(r.athlete_id);
  for (const p of r.partner_athlete_ids ?? []) attached.add(p);
}
const orphaned = athletes.filter((a) => !attached.has(a.id) && !a.is_anonymised);
if (orphaned.length > 0) {
  report("orphans", "error", `${orphaned.length} athlete profiles are attached to no race`, {
    examples: orphaned.slice(0, 10).map((a) => a.slug),
  });
}
log(`  7. orphaned profiles   ${orphaned.length}`);

/* 8 ── Division integrity ──────────────────────────────────────────────── */

// ⚠️ One athlete cannot be in both the men's and the women's board of one
// event. This is the only check that catches the worst failure this engine has
// had: the unfiltered fallback adapter sent no sex filter, returned the whole
// event, and it was stored under whichever division had been requested —
// Barcelona 2023's women's board ranked Lee Tuck first.
//
// It cannot be caught by looking at the stored `sex` column, which is stamped
// from the division and therefore agrees with the contamination. Only the
// impossibility gives it away.
const divisionById = new Map(divisions.map((d) => [d.id, d]));
const sexByAthleteEvent = new Map();

for (const r of results) {
  const d = divisionById.get(r.division_id);
  if (!d || d.division_key.includes("mixed")) continue;
  const sex = d.division_key.endsWith("-men") ? "men"
    : d.division_key.endsWith("-women") ? "women" : null;
  if (!sex) continue;

  for (const athleteId of [r.athlete_id, ...(r.partner_athlete_ids ?? [])]) {
    const key = `${athleteId}@${d.event_id}`;
    const seen = sexByAthleteEvent.get(key);
    if (seen && seen !== sex) sexByAthleteEvent.set(key, "BOTH");
    else if (!seen) sexByAthleteEvent.set(key, sex);
  }
}

const inBothBoards = [...sexByAthleteEvent.entries()].filter(([, v]) => v === "BOTH");
const contaminatedEvents = new Set(inBothBoards.map(([k]) => k.split("@")[1]));

if (inBothBoards.length > 0) {
  report(
    "division-integrity",
    "error",
    `${inBothBoards.length} athletes appear in both the men's and women's board of the ` +
      `same event, across ${contaminatedEvents.size} events`,
    { athletes: inBothBoards.length, events: [...contaminatedEvents].slice(0, 20) },
  );
}
log(
  `  8. division integrity  ${inBothBoards.length} athletes in both boards ` +
    `(${contaminatedEvents.size} events)`,
);

/* 9 ── Provenance ──────────────────────────────────────────────────────── */

const { count: runCount } = await db
  .from("results_ingestion_runs")
  .select("id", { count: "exact", head: true });
const { count: quarantined } = await db
  .from("results_quarantine")
  .select("id", { count: "exact", head: true });
if (results.length > 0 && !runCount) {
  report("provenance", "error", "results exist but no ingestion run explains them", {});
}
log(`  9. provenance          ${runCount} ingestion runs, ${quarantined} quarantined rows\n`);

/* ── Verdict ───────────────────────────────────────────────────────────── */

const errors = findings.filter((f) => f.severity === "error");
const warnings = findings.filter((f) => f.severity === "warning");

if (asJson) {
  console.log(JSON.stringify({
    totals: { events: events.length, divisions: divisions.length, results: results.length, athletes: athletes.length },
    errors: errors.length, warnings: warnings.length, findings,
  }, null, 2));
} else {
  if (errors.length === 0 && warnings.length === 0) {
    console.log("✓ No accuracy problems found.");
  } else {
    console.log(`${errors.length} error(s), ${warnings.length} warning(s):\n`);
    for (const f of [...errors, ...warnings].slice(0, 25)) {
      console.log(`  [${f.severity}] ${f.check}: ${f.message}`);
    }
    if (findings.length > 25) console.log(`  … and ${findings.length - 25} more`);
  }
}

process.exit(errors.length > 0 ? 1 : 0);
