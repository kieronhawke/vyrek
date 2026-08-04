#!/usr/bin/env node
/**
 * One SQL file to bring an empty project up to date.
 *
 * WHY THIS EXISTS. Restoring the database means running eight files in
 * order in a dashboard SQL editor. That is eight chances to paste one
 * twice, miss one, or run them out of order — and the failure mode is not
 * an error, it is a table quietly missing that surfaces days later as one
 * broken page.
 *
 * IT IS MADE RE-RUNNABLE ON THE WAY THROUGH, which matters more than the
 * concatenation. `0001_init.sql` uses bare `create table customers (` and
 * bare `create index`, so if a paste dies halfway — a dropped connection,
 * a statement timeout — the second attempt fails on the tables that did
 * get created, and you are left hand-editing SQL to find where it stopped.
 * Every create here is rewritten to skip what already exists:
 *
 *   create table X            → create table if not exists X
 *   create index X on         → create index if not exists X on
 *   create type X as enum     → wrapped so a duplicate is ignored
 *   create trigger X          → dropped first, then created
 *
 * Postgres has no `create type if not exists`, hence the exception block;
 * and no `create trigger if not exists` before 14, hence the drop.
 *
 * THE RESULTS MIGRATIONS ARE NOT INCLUDED. 0101-0104 belong to a separate,
 * still-live project reached through RESULTS_SUPABASE_URL. Running them
 * here would create a second, empty copy of tables that already hold real
 * data somewhere else.
 *
 *   node scripts/bundle-migrations.mjs > /tmp/suth-schema.sql
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";

/** In order. The two 0004s touch different tables, so either order works. */
const FILES = [
  "0001_init.sql",
  "0002_quiz_v3.sql",
  "0003_partner_programme.sql",
  "0004_admin_observability.sql",
  "0004_consultation_requests.sql",
  "0005_live_presence.sql",
  "0006_stripe_events.sql",
  "0100_control_centre_identity.sql",
];

function makeRerunnable(sql) {
  let out = sql;

  // create table X ( → create table if not exists X (
  out = out.replace(
    /\bcreate\s+table\s+(?!if\s+not\s+exists)/gi,
    "create table if not exists ",
  );

  /* Unnamed indexes first: `create index on accounts (hub_status)` is legal
     and 0100 uses eight of them, but `if not exists` REQUIRES a name — the
     first version of this produced `create index if not exists on accounts`
     and the whole transaction failed on it.

     Postgres would otherwise auto-name them, and a second run would happily
     build a duplicate index under a `_1` suffix rather than skip it. Naming
     them from the table and columns makes them both guardable and legible
     in a query plan. */
  out = out.replace(
    /\bcreate\s+(unique\s+)?index\s+on\s+([\w.]+)\s*\(([^)]*)\)/gi,
    (_m, unique, table, cols) => {
      const slug = cols
        .split(",")
        .map((c) => c.trim().split(/\s+/)[0].replace(/\W/g, ""))
        .filter(Boolean)
        .join("_");
      const name = `${table.replace(/\W/g, "_")}_${slug}_idx`;
      return `create ${unique ?? ""}index if not exists ${name} on ${table} (${cols})`;
    },
  );

  // Named ones: create [unique] index X on → ... if not exists X on
  out = out.replace(
    /\bcreate\s+(unique\s+)?index\s+(?!if\s+not\s+exists)/gi,
    (_m, unique) => `create ${unique ?? ""}index if not exists `,
  );

  // Postgres has no `create type if not exists`. Swallow the duplicate.
  out = out.replace(
    /^\s*create\s+type\s+([^\s;]+)\s+as\s+enum\s*\(([^)]*)\)\s*;/gim,
    (_m, name, body) =>
      `do $$ begin\n  create type ${name} as enum (${body});\nexception when duplicate_object then null;\nend $$;`,
  );

  /* alter table X add column Y → add column if not exists Y.
     One of these in 0100, and it was the only statement left that failed a
     second run — proven by running the bundle twice against the real
     database rather than assuming. */
  out = out.replace(
    /\balter\s+table\s+([\w.]+)\s+add\s+column\s+(?!if\s+not\s+exists)/gi,
    (_m, table) => `alter table ${table} add column if not exists `,
  );

  // `create trigger if not exists` needs PG14+. Dropping first always works.
  out = out.replace(
    /^\s*create\s+trigger\s+(\w+)([\s\S]*?)\bon\s+([\w.]+)/gim,
    (m, name, mid, table) =>
      `drop trigger if exists ${name} on ${table};\ncreate trigger ${name}${mid}on ${table}`,
  );

  /* And the ones built with `execute format(...)` inside a DO loop, which
     the rule above cannot see because at parse time they are just a string.
     0100 attaches the shared updated_at trigger to eight tables this way,
     and it was the last statement failing a second run.

     Found by running the bundle three times against the real database and
     reading what broke, rather than by reasoning about what ought to. */
  out = out.replace(
    /'create trigger %I_(\w+) before update on %I/gi,
    (_m, suffix) =>
      `'drop trigger if exists %I_${suffix} on %I; create trigger %I_${suffix} before update on %I`,
  );
  // That doubles the format placeholders, so the argument list has to grow
  // to match: format() is strict about arity.
  out = out.replace(
    /for each row execute function set_updated_at\(\)',\s*t,\s*t\)/gi,
    "for each row execute function set_updated_at()', t, t, t, t)",
  );

  return out;
}

const parts = [
  "-- Suth Performance — full application schema.",
  "-- Generated by scripts/bundle-migrations.mjs. Do not edit by hand;",
  "-- edit the files in supabase/migrations/ and regenerate.",
  "--",
  "-- Safe to run more than once: every create skips what already exists,",
  "-- so a paste that dies halfway can simply be run again.",
  "--",
  "-- Does NOT include 0101-0104 (the results engine), which live on a",
  "-- separate project reached through RESULTS_SUPABASE_URL.",
  "",
  "begin;",
  "",
];

for (const file of FILES) {
  const sql = readFileSync(join(DIR, file), "utf8");
  parts.push(
    `-- ${"=".repeat(72)}`,
    `-- ${file}`,
    `-- ${"=".repeat(72)}`,
    "",
    makeRerunnable(sql).trim(),
    "",
  );
}

parts.push("commit;", "");
process.stdout.write(parts.join("\n"));
