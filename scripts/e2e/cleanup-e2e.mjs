/**
 * Remove everything the browser runs created, so the live database and the
 * Stripe test account are as they were: e2e clients (Stripe subscriptions
 * cancelled, customers deleted; DB customers + subscriptions rows; auth
 * users), their stored invites, and the e2e admin login.
 *
 *   node --env-file=.env.local scripts/e2e/cleanup-e2e.mjs [--dry]
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const dry = process.argv.includes("--dry");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
/**
 * Exactly what the harness creates, and nothing else.
 *
 * ⚠️ DELIBERATELY NARROW. This runs against the live database with the
 * service key, so it matches only the addresses these scripts and the
 * Playwright spec mint for themselves. Ben, Kieron's own accounts and the
 * hand-made test clients from earlier work are all left alone — an
 * over-eager pattern here deletes somebody's real record.
 *
 * The Playwright spec creates an auth user on every run (the client sets a
 * password before paying) and never pays, so nothing else would ever tidy
 * those up. They were accumulating one per run.
 */
const E2E_PATTERNS = [
  /^kieron\.hawke\+e2e-/,
  /^kieron\.hawke\+sc-/,
  /^kieron\.hawke\+admin-e2e@/,
  /^kieron\.hawke\+editcheck@/,
  /^kieron\.hawke\+livecheck@/,
  /^playwright\+\d+@example\.com$/,
  /^pw\+\d+@example\.com$/,
  /^verify\+/,
  /^kieron\.hawke\+j-/,
  /^kieron\.hawke\+journey@/,
  /^load-\d+@example\.com$/,
];
const isE2E = (email) => E2E_PATTERNS.some((re) => re.test((email ?? "").toLowerCase()));
const out = { dry, stripeCustomers: [], dbCustomers: [], dbSubscriptions: 0, invites: [], authUsers: [] };

// Stripe: every test customer whose email is an e2e address.
for await (const c of stripe.customers.list({ limit: 100 })) {
  if (!isE2E(c.email)) continue;
  const subs = await stripe.subscriptions.list({ customer: c.id, limit: 20 });
  if (!dry) {
    for (const s of subs.data) if (s.status !== "canceled") await stripe.subscriptions.cancel(s.id);
    await stripe.customers.del(c.id);
  }
  out.stripeCustomers.push(`${c.email} (${subs.data.length} subs)`);
}

// DB: customers + their subscriptions rows.
const { data: allCusts } = await sb.from("customers").select("id, email");
const custs = (allCusts ?? []).filter((c) => isE2E(c.email));
for (const c of custs) {
  if (!dry) {
    const { count } = await sb.from("subscriptions").delete({ count: "exact" }).eq("customer_id", c.id);
    out.dbSubscriptions += count ?? 0;
    await sb.from("customers").delete().eq("id", c.id);
  }
  out.dbCustomers.push(c.email);
}

// Stored invites for e2e addresses (the Playwright spec's playwright+ ones are cancelled in-test).
const { data: invites } = await sb.from("onboarding_invites").select("id, payload");
for (const i of invites ?? []) {
  const email = i.payload?.email ?? "";
  if (isE2E(email)) {
    if (!dry) await sb.from("onboarding_invites").delete().eq("id", i.id);
    out.invites.push(`${i.id} ${email}`);
  }
}

// Auth users: e2e clients and the e2e admin.
const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 });
for (const u of users.users) {
  if (!isE2E(u.email)) continue;
  if (!dry) await sb.auth.admin.deleteUser(u.id);
  out.authUsers.push(u.email);
}
console.log(JSON.stringify(out, null, 2));
