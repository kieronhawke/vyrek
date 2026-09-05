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
const isE2E = (email) => /^kieron\.hawke\+(e2e-|admin-e2e)/.test(email ?? "");
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
const { data: custs } = await sb.from("customers").select("id, email").like("email", "kieron.hawke+e2e-%");
for (const c of custs ?? []) {
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
  if (isE2E(email) || /^playwright\+/.test(email)) {
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
