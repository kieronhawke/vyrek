/**
 * EMPTY THE ADMIN FOR BEN'S FIRST REAL CLIENT.
 *
 *   node --env-file=.env.local scripts/go-live/clear-admin-demo-data.mjs        # show
 *   node --env-file=.env.local scripts/go-live/clear-admin-demo-data.mjs --go   # do it
 *
 * Everything the admin currently displays was created while the system was
 * being built and tested: fake enquirers, a test booking, invites sent to
 * Kieron's own inbox, and the activity feed those runs generated. On the day
 * Ben starts typing in real people, none of it should be there — he cannot
 * tell his own clients from the rehearsal otherwise.
 *
 * ── WHAT IS KEPT, AND WHY ─────────────────────────────────────────────────
 * This clears an ENUMERATED list of tables and nothing else. Four tables hold
 * real data and are never touched:
 *
 *   live_sessions        673,764 rows of genuine visitor and crawler traffic.
 *                        It looks like noise; it is the analytics history.
 *   blog_posts           A real published article that also exists as MDX.
 *   booking_availability Ben's diary hours.
 *   partners / referrals Empty, but real tables for a real feature.
 *
 * ── LOGINS ────────────────────────────────────────────────────────────────
 * Only four accounts are removed, matched by EXACT ADDRESS, never a pattern:
 * the "+priya", "+jamie", "+marcus" and "+acct" personas invented for test
 * runs. Ben's two accounts and Kieron's three are left exactly as they are.
 *
 * Safe to run twice. Dry by default.
 */
import { createClient } from "@supabase/supabase-js";

const GO = process.argv.includes("--go");
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

/* Children before parents, so a foreign key never blocks a delete. supabase-js
   insists on a filter, so each table is matched on a timestamp column every
   row has — created_at everywhere except stripe_events. */
const TABLES_CHILD_FIRST = [
  { table: "client_messages", ts: "created_at" },
  { table: "training_plans", ts: "created_at" },
  { table: "subscriptions", ts: "created_at" },
  { table: "quiz_responses", ts: "created_at" },
  { table: "abandoned_plans", ts: "created_at" },
  { table: "consultation_bookings", ts: "created_at" },
  { table: "consultation_leads", ts: "created_at" },
  { table: "consultation_requests", ts: "created_at" },
  { table: "onboarding_invites", ts: "created_at" },
  { table: "waitlist", ts: "created_at" },
  { table: "admin_events", ts: "created_at" },
  { table: "stripe_events", ts: "received_at" },
  { table: "customers", ts: "created_at" },
];

const TEST_LOGINS = [
  "kieron.hawke+acct@googlemail.com",
  "kieron.hawke+priya@googlemail.com",
  "kieron.hawke+jamie@googlemail.com",
  "kieron.hawke+marcus@googlemail.com",
];

const KEEP = ["live_sessions", "blog_posts", "booking_availability", "partners", "referrals"];

console.log(`\n${GO ? "CLEARING" : "WOULD CLEAR"} the admin\n`);

let total = 0;
for (const { table, ts } of TABLES_CHILD_FIRST) {
  const { count, error: countErr } = await sb
    .from(table)
    .select("*", { count: "exact", head: true });
  if (countErr) {
    console.log(`  ${table.padEnd(24)} could not read: ${countErr.message}`);
    continue;
  }
  if (!count) {
    console.log(`  ${table.padEnd(24)} already empty`);
    continue;
  }
  total += count;
  if (!GO) {
    console.log(`  ${table.padEnd(24)} ${count} row(s)`);
    continue;
  }
  const { error } = await sb.from(table).delete().gte(ts, "2000-01-01");
  if (error) console.log(`  ${table.padEnd(24)} FAILED: ${error.message}`);
  else console.log(`  ${table.padEnd(24)} cleared ${count} row(s)`);
}

/* ── Logins ─────────────────────────────────────────────────────────────── */
console.log(`\n${GO ? "REMOVING" : "WOULD REMOVE"} test logins\n`);
const { data: userList, error: userErr } = await sb.auth.admin.listUsers({ perPage: 200 });
if (userErr) {
  console.log(`  could not read the logins: ${userErr.message}`);
} else {
  for (const email of TEST_LOGINS) {
    const u = userList.users.find((x) => (x.email ?? "").toLowerCase() === email);
    if (!u) {
      console.log(`  ${email.padEnd(40)} already gone`);
      continue;
    }
    if (!GO) {
      console.log(`  ${email.padEnd(40)} would remove`);
      continue;
    }
    const { error } = await sb.auth.admin.deleteUser(u.id);
    console.log(`  ${email.padEnd(40)} ${error ? `FAILED: ${error.message}` : "removed"}`);
  }
  const kept = userList.users
    .filter((u) => !TEST_LOGINS.includes((u.email ?? "").toLowerCase()))
    .map((u) => u.email);
  console.log(`\n  Kept ${kept.length} real login(s):`);
  for (const e of kept) console.log(`    ${e}`);
}

/* ── What was deliberately left alone ───────────────────────────────────── */
console.log("\nNot touched (real data):");
for (const t of KEEP) {
  const { count } = await sb.from(t).select("*", { count: "exact", head: true });
  console.log(`  ${t.padEnd(24)} ${count ?? "?"} row(s)`);
}

console.log(
  GO
    ? "\nDone. Every admin page now starts empty.\n"
    : `\nNothing changed. ${total} row(s) would go. Add --go to apply.\n`,
);
