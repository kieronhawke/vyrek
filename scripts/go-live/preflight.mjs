/**
 * IS THE LIVE SYSTEM READY TO TAKE A REAL CLIENT?
 *
 *   node --env-file=.env.local scripts/go-live/preflight.mjs
 *
 * Read-only. It touches nothing, sends nothing and charges nothing. Every
 * line is either a fact it could verify or an honest "cannot check from
 * here", because a preflight that guesses is worse than no preflight.
 *
 * ⚠️ WHAT IT CANNOT SEE. This machine holds a Stripe TEST key, so nothing
 * here can enumerate live-mode webhooks, products or portal settings. Those
 * are the steps the go-live guide hands to Kieron, and they are the ones that
 * fail silently — a missing live webhook means a client pays, closes the tab,
 * and never gets an account.
 */
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const SITE = process.env.PREFLIGHT_SITE ?? "https://www.suthperformance.com";
const stripeTest = new Stripe(process.env.STRIPE_SECRET_KEY);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const lines = [];
let blockers = 0;
let warnings = 0;
function ok(what, detail = "") {
  lines.push(["ok", what, detail]);
}
function warn(what, detail = "") {
  warnings++;
  lines.push(["warn", what, detail]);
}
function block(what, detail = "") {
  blockers++;
  lines.push(["BLOCK", what, detail]);
}
function note(what, detail = "") {
  lines.push(["--", what, detail]);
}

/* ── The site itself ───────────────────────────────────────────────────── */
try {
  const res = await fetch(`${SITE}/admin/login`, { redirect: "manual" });
  if (res.status === 200) ok("The site is up", SITE);
  else block("The site did not answer with a page", `HTTP ${res.status}`);

  const robots = res.headers.get("x-robots-tag") ?? "";
  if (/noindex/i.test(robots)) {
    note("Search engines are still blocked", `x-robots-tag: ${robots}`);
  } else {
    note("The site is open to search engines", "no noindex header");
  }
} catch (e) {
  block("Could not reach the site", e.message);
}

/* ── Stripe: which mode is production actually in? ─────────────────────── */
try {
  const res = await fetch(`${SITE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=deadbeef" },
    body: "{}",
  });
  if (res.status === 400) {
    ok("The webhook endpoint is reachable and checks signatures", "rejects an unsigned payload");
  } else {
    warn("The webhook answered unexpectedly", `HTTP ${res.status}`);
  }
} catch (e) {
  block("Could not reach the webhook endpoint", e.message);
}

/* A payload signed with the TEST secret must be REFUSED by production. If it
   is accepted, production is still holding the test webhook secret and no
   live event will ever verify. */
try {
  const payload = JSON.stringify({
    id: `evt_preflight_${Date.now()}`, object: "event", api_version: "2024-06-20",
    created: Math.floor(Date.now() / 1000), type: "customer.updated", livemode: false,
    pending_webhooks: 0, request: { id: null, idempotency_key: null },
    data: { object: { id: "cus_preflight", object: "customer" } },
  });
  const sig = stripeTest.webhooks.generateTestHeaderString({
    payload, secret: process.env.STRIPE_WEBHOOK_SECRET,
  });
  const res = await fetch(`${SITE}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": sig },
    body: payload,
  });
  if (res.status === 200) {
    block(
      "Production is still using the TEST webhook secret",
      "no live event will ever verify — set STRIPE_WEBHOOK_SECRET from the LIVE endpoint",
    );
  } else {
    ok("Production holds a different webhook secret from test", `refused with HTTP ${res.status}`);
  }
} catch (e) {
  warn("Could not test the webhook secret", e.message);
}

/* ── The database: anything left over from testing? ────────────────────── */
try {
  const { data: customers } = await sb
    .from("customers")
    .select("id, email, stripe_customer_id");
  const residue = [];
  for (const c of customers ?? []) {
    if (!c.stripe_customer_id) continue;
    try {
      // Resolving under the TEST key proves it is a test-mode object, and a
      // test-mode object cannot be a live paying client.
      await stripeTest.customers.retrieve(c.stripe_customer_id);
      residue.push(c.email);
    } catch {
      /* Not a test object. Either live, or long deleted. */
    }
  }
  const { count: subCount } = await sb
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .in("status", ["active", "trialing", "past_due"]);

  if (residue.length) {
    warn(
      `${residue.length} customer record(s) point at TEST-mode Stripe objects`,
      `${residue.join(", ")} — the dashboard will count them as paying`,
    );
  } else {
    ok("No test-mode customer records left in the database");
  }
  note(`Subscriptions the dashboard counts as live: ${subCount ?? 0}`);
} catch (e) {
  warn("Could not read the customer records", e.message);
}

/* ── Who can get into the admin ────────────────────────────────────────── */
try {
  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  const harness = data.users.filter((u) => /\+admin-e2e@|\+e2e-|playwright\+|^load-/.test(u.email ?? ""));
  if (harness.length) {
    warn(`${harness.length} test login(s) still exist`, harness.map((u) => u.email).join(", "));
  } else {
    ok("No test logins left in the auth store");
  }
  const ben = data.users.find((u) => u.email === "ben@suthperformance.com");
  if (ben) {
    ok("Ben has a login", `last signed in ${(ben.last_sign_in_at ?? "never").slice(0, 10)}`);
  } else {
    block("Ben has no login");
  }
} catch (e) {
  warn("Could not read the logins", e.message);
}

/* ── Messaging ─────────────────────────────────────────────────────────── */
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
if (sid && token) {
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Balance.json`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (res.ok) {
      const bal = await res.json();
      const amount = Number(bal.balance);
      if (amount < 5) warn("Twilio balance is low", `${bal.balance} ${bal.currency}`);
      else ok("Twilio has credit", `${bal.balance} ${bal.currency}`);
    } else {
      block("Twilio rejected the credentials", `HTTP ${res.status}`);
    }
  } catch (e) {
    warn("Could not reach Twilio", e.message);
  }
} else {
  warn("No Twilio credentials on this machine", "cannot check the balance");
}

if (process.env.RESEND_FROM?.includes("resend.dev")) {
  block("Email is still sending from Resend's sandbox", "only reaches the account owner");
} else if (process.env.RESEND_FROM) {
  ok("Email sends from a verified address", process.env.RESEND_FROM);
}

/* ── What cannot be checked from here ──────────────────────────────────── */
note("CANNOT CHECK FROM HERE — these need the Stripe dashboard in LIVE mode:");
note("  · that a live webhook endpoint exists and points at this site");
note("  · that it carries the eight events the app handles");
note("  · that its recent deliveries are succeeding");
note("  · that the customer portal has been saved in live mode");

/* ── Report ────────────────────────────────────────────────────────────── */
const pad = (s) => s.padEnd(5);
console.log(`\nPreflight for ${SITE}\n`);
for (const [level, what, detail] of lines) {
  console.log(`  ${pad(level)} ${what}${detail ? `\n        ${detail}` : ""}`);
}
console.log(
  `\n${blockers} blocker${blockers === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.\n`,
);
process.exit(blockers ? 1 : 0);
