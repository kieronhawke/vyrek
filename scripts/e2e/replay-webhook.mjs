/**
 * Replay checkout.session.completed for the most recent completed session
 * belonging to <email>, signed with the local webhook secret — the path a
 * client takes when they pay and close the tab on Stripe's receipt page.
 *
 *   node --env-file=.env.local scripts/e2e/replay-webhook.mjs <email> [base]
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
const [email, BASE = "http://localhost:3000"] = process.argv.slice(2);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sessions = await stripe.checkout.sessions.list({ limit: 20 });
const session = sessions.data.find((s) => s.customer_details?.email === email && s.status === "complete");
if (!session) { console.log(JSON.stringify({ error: `no completed session for ${email}` })); process.exit(1); }
const out = { sessionId: session.id, mode: session.mode, payment_status: session.payment_status, metadata: session.metadata };
const post = async (tag) => {
  const payload = JSON.stringify({ id: `evt_replay_${tag}_${Date.now()}`, object: "event", api_version: "2024-06-20", created: Math.floor(Date.now() / 1000), type: "checkout.session.completed", livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, data: { object: session } });
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const res = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": sig }, body: payload });
  return { status: res.status, body: (await res.text()).slice(0, 160) };
};
out.first = await post("a");
out.second = await post("b"); // redelivery: must be a no-op, not a second subscription
const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
out.stripeSubscriptions = subs.data.map((s) => ({ id: s.id, status: s.status, anchor: new Date(s.billing_cycle_anchor * 1000).toISOString().slice(0, 16), amount: s.items.data[0]?.price?.unit_amount, checkout_session: s.metadata?.checkout_session ?? null }));
const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
out.invoices = invoices.data.map((i) => ({ amount_paid: i.amount_paid, status: i.status, lines: i.lines.data.map((l) => `${l.amount} ${l.description}`) }));
const { data: cust } = await sb.from("customers").select("id, email, full_name, stripe_customer_id, auth_user_id").eq("email", email).maybeSingle();
const { data: rows } = cust ? await sb.from("subscriptions").select("status, stripe_subscription_id").eq("customer_id", cust.id) : { data: null };
const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 });
const u = users.users.find((x) => x.email === email);
out.db = { customer: cust, subscriptions: rows, authUser: u ? { member_mode: u.user_metadata?.member_mode, created: u.created_at } : null };
console.log(JSON.stringify(out, null, 2));
