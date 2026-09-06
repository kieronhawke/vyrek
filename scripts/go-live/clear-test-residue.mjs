/**
 * REMOVE THE TEST CLIENTS FROM THE LIVE DASHBOARD.
 *
 *   node --env-file=.env.local scripts/go-live/clear-test-residue.mjs        # show
 *   node --env-file=.env.local scripts/go-live/clear-test-residue.mjs --go   # do it
 *
 * Production moved onto live Stripe keys, and three customer records were
 * created back when it was in test mode. Their Stripe ids only exist in the
 * test account, so the admin now reads them from two different places and
 * disagrees with itself: the roster counts two paying subscribers while the
 * revenue figure, which asks live Stripe, says £0. Neither number is right,
 * and on the day Ben starts adding real clients he cannot tell his own
 * takings from leftovers.
 *
 * ── THE RULE IS PROVABLE, NOT A GUESS ─────────────────────────────────────
 * A row is removed only when its `stripe_customer_id` RESOLVES UNDER THE TEST
 * KEY. A test-mode object cannot be a live paying client, so there is no
 * judgement involved and no pattern-matching on email addresses that might
 * catch somebody real.
 *
 * ── LOGINS ARE NOT TOUCHED ────────────────────────────────────────────────
 * Two of these are Ben's and Kieron's own addresses. Their Supabase accounts,
 * passwords and history stay exactly as they are; only the customer and
 * subscription rows that make the dashboard lie are removed. Nothing in the
 * Stripe test account is deleted either — it is still there if anybody wants
 * to look at what those test runs did.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const GO = process.argv.includes("--go");
const stripeTest = new Stripe(process.env.STRIPE_SECRET_KEY);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test")) {
  console.error(
    "\nRefusing to run: STRIPE_SECRET_KEY on this machine is not a test key.\n" +
      "The whole check is 'does this id resolve in TEST mode', which needs one.\n",
  );
  process.exit(2);
}

const { data: customers, error } = await sb
  .from("customers")
  .select("id, email, stripe_customer_id, created_at");
if (error) {
  console.error("Could not read the customers:", error.message);
  process.exit(1);
}

const doomed = [];
for (const c of customers ?? []) {
  if (!c.stripe_customer_id) continue;
  try {
    await stripeTest.customers.retrieve(c.stripe_customer_id);
    doomed.push(c);
  } catch {
    /* Not resolvable in test mode, so not provably test data. Left alone. */
  }
}

console.log(`\n${GO ? "REMOVING" : "WOULD REMOVE"} ${doomed.length} test customer record(s):\n`);
for (const c of doomed) {
  const { data: subs } = await sb
    .from("subscriptions")
    .select("id, status")
    .eq("customer_id", c.id);
  console.log(
    `  ${c.email.padEnd(38)} created ${c.created_at.slice(0, 10)}  ` +
      `${(subs ?? []).length} subscription row(s) [${(subs ?? []).map((s) => s.status).join(", ")}]`,
  );
  if (GO) {
    await sb.from("subscriptions").delete().eq("customer_id", c.id);
    await sb.from("customers").delete().eq("id", c.id);
  }
}

const untouched = (customers ?? []).filter((c) => !doomed.includes(c));
console.log(`\nLeft alone: ${untouched.length} customer record(s)`);
for (const c of untouched) console.log(`  ${c.email}`);
console.log("\nLogins are never touched by this script.");

if (!GO) {
  console.log("\nNothing has been changed. Add --go to apply.\n");
} else {
  const { count } = await sb
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "trialing", "past_due"]);
  console.log(`\nDone. The dashboard will now count ${count ?? 0} live subscription(s).\n`);
}
