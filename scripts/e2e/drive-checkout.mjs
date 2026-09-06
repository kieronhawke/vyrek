/**
 * Drive one existing-client journey through REAL Stripe test-mode checkout.
 *
 *   node --env-file=.env.local scripts/e2e/drive-checkout.mjs <shape> [--sms]
 *
 *   shape: plain | balance-today | balance-later
 *
 * Admin logs in, creates the invite through the API, the "client" opens the
 * link, sets a password, pays on Stripe's hosted page with 4242, lands on the
 * welcome page (fast-path activation), then the script replays the
 * checkout.session.completed webhook (signed with the local secret) to prove
 * the second activation is idempotent. Finally it reads Stripe and the DB.
 */
import { chromium } from "@playwright/test";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const ADMIN = { email: "kieron.hawke+admin-e2e@googlemail.com", password: process.env.E2E_ADMIN_PASSWORD };
const shape = process.argv[2] ?? "plain";
const withSms = process.argv.includes("--sms");
const stamp = Date.now().toString(36);
const client = {
  name: `E2E ${shape.replace(/-/g, " ")} ${stamp}`,
  email: `kieron.hawke+e2e-${shape}-${stamp}@googlemail.com`,
  phone: withSms ? process.env.E2E_CLIENT_MOBILE ?? "" : "",
  password: "ClientPass-2026!",
};
const plusDays = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const form = {
  plain: { rate: "60", dueToday: "", startDate: plusDays(10) },
  "balance-today": { rate: "60", dueToday: "100", startDate: plusDays(0) },
  "balance-later": { rate: "60", dueToday: "100", startDate: plusDays(10) },
}[shape];
if (!form) throw new Error(`unknown shape ${shape}`);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const out = { shape, client: client.email, steps: [] };
const step = (s, extra) => { out.steps.push({ s, ...(extra ?? {}) }); console.error(`· ${s}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
const page = await ctx.newPage();
page.setDefaultTimeout(45_000);
try {
  // ── Ben ────────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/);
  step("admin signed in");

  const preview = await ctx.request.post(`${BASE}/api/onboarding/invite`, {
    data: { name: client.name, email: client.email, phone: client.phone, kind: "payment", agreedPrice: form.rate, dueToday: form.dueToday, startDate: form.startDate, preview: true },
  });
  const pv = await preview.json();
  if (!preview.ok()) throw new Error(`preview refused: ${JSON.stringify(pv)}`);
  step("preview", { schedule: pv.schedule?.lines, sms: pv.sms?.text, shape: pv.schedule?.shape });

  const sent = await ctx.request.post(`${BASE}/api/onboarding/invite`, {
    data: { name: client.name, email: client.email, phone: client.phone, kind: "payment", agreedPrice: form.rate, dueToday: form.dueToday, startDate: form.startDate },
  });
  const inv = await sent.json();
  if (!sent.ok() || !inv.link) throw new Error(`invite refused: ${JSON.stringify(inv)}`);
  step("invite sent", { link: inv.link, inviteId: inv.inviteId, email: inv.email, sms: inv.sms });
  out.invite = inv;

  // ── the client ─────────────────────────────────────────────────────────
  const path = new URL(inv.link).pathname;
  await page.goto(`${BASE}${path}`);
  const welcomeText = await page.locator("main").innerText();
  step("welcome screen", { text: welcomeText.replace(/\s+/g, " ").slice(0, 400) });
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/choose a password/i).fill(client.password);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByText("The rate you agreed with Ben").waitFor();
  const payText = await page.locator("main").innerText();
  step("card screen", { text: payText.replace(/\s+/g, " ").slice(0, 400) });
  await page.getByRole("button", { name: /secure checkout/i }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { waitUntil: "commit" });
  step("on stripe", { url: page.url().slice(0, 60) });

  // Stripe's hosted page, test mode.
  const cardFrameOrPage = page;
  await cardFrameOrPage.locator("#cardNumber").waitFor({ timeout: 60_000 });
  const stripeText = await page.locator("body").innerText();
  out.stripePage = { amounts: [...new Set(stripeText.match(/[^\n]*£[\d,.]+[^\n]*/g) ?? [])].slice(0, 8), submitNote: (stripeText.match(/Then £[^\n]+/) ?? [null])[0], button: (stripeText.match(/\n(Subscribe|Pay|Pay £[\d.,]+|Start trial)\n/) ?? [null, null])[1] };
  const emailField = page.locator("#email");
  if (await emailField.count()) { if (!(await emailField.inputValue())) await emailField.fill(client.email); }
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12/34");
  await page.locator("#cardCvc").fill("123");
  if (await page.locator("#billingName").count()) await page.locator("#billingName").fill(client.name);
  const country = page.locator("#billingCountry");
  if (await country.count()) await country.selectOption("GB").catch(() => {});
  if (await page.locator("#billingPostalCode").count()) await page.locator("#billingPostalCode").fill("SW1A 1AA");
  // Decline Link's "save my info" if it is a required-looking checkbox; leave unticked.
  const submit = page.locator('button[type="submit"].SubmitButton, button[type="submit"]').first();
  await submit.click();
  await page.waitForURL(/\/onboarding\/welcome\?session_id=cs_/, { timeout: 90_000, waitUntil: "commit" });
  const sessionId = new URL(page.url()).searchParams.get("session_id");
  step("paid, back on welcome", { sessionId });
  // Give the fast-path activation a moment, then read the page.
  await page.waitForTimeout(4000);
  const afterText = await page.locator("main").innerText();
  step("welcome page after", { text: afterText.replace(/\s+/g, " ").slice(0, 500) });

  // ── the webhook, replayed and signed ───────────────────────────────────
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const payload = JSON.stringify({ id: `evt_e2e_${stamp}`, object: "event", api_version: "2024-06-20", created: Math.floor(Date.now() / 1000), type: "checkout.session.completed", livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, data: { object: session } });
  const sig = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
  const wh = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": sig }, body: payload });
  step("webhook replayed", { status: wh.status, body: (await wh.text()).slice(0, 200) });

  // ── what Stripe now holds ──────────────────────────────────────────────
  const full = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription", "payment_intent"] });
  const customerId = typeof full.customer === "string" ? full.customer : full.customer?.id;
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 10, expand: ["data.latest_invoice"] });
  const invoices = await stripe.invoices.list({ customer: customerId, limit: 10 });
  out.stripe = {
    mode: full.mode, payment_status: full.payment_status, amount_total: full.amount_total, metadata: full.metadata,
    subscriptions: subs.data.map((s) => ({ id: s.id, status: s.status, anchor: new Date(s.billing_cycle_anchor * 1000).toISOString().slice(0, 16), amount: s.items.data[0]?.price?.unit_amount, checkout_session: s.metadata?.checkout_session ?? null, due_today: s.metadata?.due_today_pence ?? null })),
    invoices: invoices.data.map((i) => ({ amount_paid: i.amount_paid, status: i.status, lines: i.lines.data.map((l) => `${l.amount} ${l.description}`) })),
    paymentIntent: full.payment_intent ? { amount: full.payment_intent.amount, status: full.payment_intent.status } : null,
  };
  const upcoming = subs.data[0] ? await stripe.invoices.createPreview({ customer: customerId, subscription: subs.data[0].id }).catch((e) => ({ error: e.message })) : null;
  out.upcoming = upcoming?.error ? upcoming : upcoming ? { amount_due: upcoming.amount_due, next_attempt: upcoming.next_payment_attempt ? new Date(upcoming.next_payment_attempt * 1000).toISOString().slice(0, 16) : null } : null;

  // ── what the DB now holds ─────────────────────────────────────────────
  const { data: cust } = await sb.from("customers").select("id, email, full_name, stripe_customer_id, auth_user_id").eq("email", client.email).maybeSingle();
  const { data: subRows } = cust ? await sb.from("subscriptions").select("status, stripe_subscription_id").eq("customer_id", cust.id) : { data: null };
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 });
  const u = users.users.find((x) => x.email === client.email);
  out.db = { customer: cust, subscriptions: subRows, authUser: u ? { member_mode: u.user_metadata?.member_mode, full_name: u.user_metadata?.full_name } : null };

  // ── the client signs in and sees billing only ─────────────────────────
  await ctx.clearCookies();
  await page.goto(`${BASE}/login`);
  // The member login leads with the emailed sign-in link; the password form
  // is behind this control.
  await page.getByRole("button", { name: /use a password instead/i }).click();
  await page.locator('input[type="email"]').first().fill(client.email);
  await page.locator('input[type="password"]').first().fill(client.password);
  await page.locator('button[type="submit"]').last().click();
  await page.waitForURL(/\/app/, { timeout: 60_000 });
  await page.goto(`${BASE}/app/account`);
  await page.waitForTimeout(3000);
  const acct = await page.locator("body").innerText();
  out.account = {
    url: page.url(),
    billingOnly: /Coming to your account/.test(acct),
    railHidden: !/Today\s+Plan\s+Progress/.test(acct),
    headline: (acct.match(/(Active|Ends at the end|Free trial|Payment failed|Not finished|Paused|Cancelled)/) ?? [null])[0],
    nextPayment: (acct.match(/Next payment[^\n]*\n?[^\n]*/) ?? [null])[0],
    amount: (acct.match(/£[\d.]+ a month/) ?? [null])[0],
    text: acct.replace(/\s+/g, " ").slice(0, 600),
  };
  // Training routes must bounce billing-only clients to the account page.
  await page.goto(`${BASE}/app/today`);
  await page.waitForTimeout(1500);
  out.account.todayRedirectsTo = page.url();
} catch (e) {
  out.error = String(e?.message ?? e);
  try { await page.screenshot({ path: `/private/tmp/claude-501/-Users-kieronhawke/19a44148-747e-430c-afc7-60bf74b2d6dc/scratchpad/drive-${shape}-fail.png`, fullPage: true }); } catch {}
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 2));
