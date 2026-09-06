/**
 * THE AWKWARD JOURNEYS, DRIVEN FOR REAL.
 *
 *   node --env-file=.env.local scripts/e2e/scenarios.mjs [name ...]
 *
 * drive-checkout.mjs walks the happy path for each checkout shape. This walks
 * the ones that go wrong: a client who corrects the email Ben typed, one who
 * pays twice, one who backs out of Stripe and returns, a link Ben cancels, a
 * link that has expired, and Ben rewriting the message before it goes.
 *
 * Every scenario asserts rather than prints. Anything that does not hold is
 * reported as a FAIL line and the process exits non-zero, so this can be run
 * before a deploy and read in one glance.
 *
 * It needs an admin in ADMIN_EMAILS plus E2E_ADMIN_PASSWORD, and a server on
 * E2E_BASE (default http://localhost:3000). Stripe must be in TEST mode: it
 * pays with 4242 and never touches real money.
 */
import { chromium } from "@playwright/test";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "kieron.hawke+admin-e2e@googlemail.com",
  password: process.env.E2E_ADMIN_PASSWORD,
};
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const results = [];
let failures = 0;
function check(scenario, claim, pass, detail = "") {
  results.push({ scenario, claim, pass, detail });
  if (!pass) failures++;
  console.log(`${pass ? "  ok  " : "  FAIL"} ${claim}${detail ? ` — ${detail}` : ""}`);
}

const stamp = () => Date.now().toString(36) + Math.floor(Math.random() * 1e4);
const plusDays = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Sign in once and hand back a browser context that stays signed in. */
async function adminContext(browser) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  await page.goto(`${BASE}/admin/login`);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/);
  await page.close();
  return ctx;
}

/** Create an invite through the real API, as Ben. */
async function invite(ctx, fields) {
  const res = await ctx.request.post(`${BASE}/api/onboarding/invite`, { data: { kind: "payment", ...fields } });
  const body = await res.json();
  return { status: res.status(), body };
}

/** Walk the client's three screens and pay with the test card. */
async function payAs(browser, link, { email, password = "Scenario-Pass-2026!", editEmailTo = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  await page.goto(`${BASE}${new URL(link).pathname}`);
  await page.getByRole("button", { name: /continue/i }).click();
  if (editEmailTo) {
    const field = page.locator('input[type="email"]').first();
    await field.fill(editEmailTo);
  }
  await page.getByLabel(/choose a password/i).fill(password);
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByText("The rate you agreed with Ben").waitFor();
  await page.getByRole("button", { name: /secure checkout/i }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { waitUntil: "commit" });
  await page.locator("#cardNumber").waitFor({ timeout: 90_000 });
  const emailField = page.locator("#email");
  if ((await emailField.count()) && !(await emailField.inputValue())) {
    await emailField.fill(editEmailTo ?? email);
  }
  await page.locator("#cardNumber").fill("4242424242424242");
  await page.locator("#cardExpiry").fill("12/34");
  await page.locator("#cardCvc").fill("123");
  if (await page.locator("#billingName").count()) await page.locator("#billingName").fill("Scenario Client");
  if (await page.locator("#billingPostalCode").count()) await page.locator("#billingPostalCode").fill("SW1A 1AA");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/onboarding\/welcome\?session_id=cs_/, { timeout: 120_000, waitUntil: "commit" });
  const sessionId = new URL(page.url()).searchParams.get("session_id");
  await page.waitForTimeout(5000); // let the fast-path activation land
  const welcomeText = await page.locator("main").innerText();
  return { ctx, page, sessionId, welcomeText };
}

const dbCustomer = (email) =>
  sb.from("customers").select("id, email, stripe_customer_id, auth_user_id").eq("email", email).maybeSingle();

/**
 * Wait for activation to finish rather than guessing at it.
 *
 * Activation runs twice per checkout — from the welcome page and from the
 * webhook — and how long it takes depends on what else is hitting the server.
 * A fixed five-second sleep passed on a quiet machine and failed straight
 * after a ten-project browser run, reporting a linkage fault that did not
 * exist. Poll for the state the test is actually about.
 */
async function settled(email, ms = 45_000) {
  const until = Date.now() + ms;
  for (;;) {
    const { data } = await dbCustomer(email);
    if (data?.id && data.auth_user_id) {
      const { data: subs } = await sb
        .from("subscriptions")
        .select("id")
        .eq("customer_id", data.id);
      if ((subs ?? []).length > 0) return data;
    }
    if (Date.now() > until) return data ?? null;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

async function authUser(email) {
  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  return data.users.find((u) => u.email === email) ?? null;
}

/* ── 1 · Ben rewrites the message, and the client gets HIS words ─────────── */
async function scenarioEditedCopy(browser) {
  const name = "Scenario Edited";
  const ctx = await adminContext(browser);
  const custom = "Morning! Here is that link we spoke about on Tuesday:";
  const subject = "The link from our chat";
  const bodyText = "Here you go, as promised.\n\nAnything at all, give me a shout.";

  const pv = await invite(ctx, {
    name, email: `kieron.hawke+sc-edit-${stamp()}@googlemail.com`, phone: "07398790378",
    agreedPrice: "60", dueToday: "100", startDate: plusDays(9),
    smsMessage: custom, emailSubject: subject, emailBody: bodyText, preview: true,
  });
  check("edited copy", "preview accepts Ben's wording", pv.status === 200 && pv.body.preview === true, pv.body.error ?? "");
  check("edited copy", "the text is his words plus the link",
    pv.body.sms?.text?.startsWith(custom) && pv.body.sms?.text?.includes("/o/"),
    pv.body.sms?.text);
  check("edited copy", "his subject is used", pv.body.email?.subject === subject, pv.body.email?.subject);
  check("edited copy", "his paragraphs are in the rendered email",
    pv.body.email?.html?.includes("Here you go, as promised.") &&
    pv.body.email?.html?.includes("Anything at all, give me a shout."));
  check("edited copy", "the parts he cannot edit are still there",
    pv.body.email?.html?.includes("Set up my payments") &&
    pv.body.email?.html?.includes("outstanding balance"));
  check("edited copy", "it reports the wording as edited",
    pv.body.copy?.edited?.sms === true && pv.body.copy?.edited?.email === true);
  check("edited copy", "and still offers the standard wording back",
    typeof pv.body.copy?.smsDefault === "string" && pv.body.copy.smsDefault.includes("as we discussed"));

  /* Blank wording falls back to the standard message rather than sending an
     empty text. The composer will not let Ben save one, so this only happens
     if something reaches the route directly — and a blank text would still
     cost money to send and say nothing. */
  const blank = await invite(ctx, {
    name, email: "kieron.hawke+sc-blank@googlemail.com", phone: "07398790378",
    agreedPrice: "60", smsMessage: "   ", emailSubject: "  ", emailBody: "\n\n", preview: true,
  });
  check("edited copy", "blank wording falls back to the standard text, never sends empty",
    blank.status === 200 && blank.body.copy?.edited?.sms === false &&
    blank.body.sms?.text?.includes("as we discussed"),
    blank.body.sms?.text ?? blank.body.error);
  check("edited copy", "and to the standard email",
    blank.body.copy?.edited?.email === false && blank.body.email?.subject?.includes("payment link"),
    blank.body.email?.subject ?? "");

  /* A message so long the phone network would drop it is refused outright,
     rather than reported as sent. */
  const huge = await invite(ctx, {
    name, email: "kieron.hawke+sc-huge@googlemail.com", phone: "07398790378",
    agreedPrice: "60", smsMessage: "x".repeat(700), preview: true,
  });
  check("edited copy", "a text too long for the network is refused",
    huge.status === 400 && huge.body.error === "SMS_COPY_INVALID",
    `${huge.status} ${huge.body.error ?? ""}`);
  await ctx.close();
}

/* ── 2 · The client corrects the email Ben typed ─────────────────────────── */
async function scenarioCorrectedEmail(browser) {
  const ctx = await adminContext(browser);
  const id = stamp();
  const typo = `kieron.hawke+sc-typo-${id}@googlemail.com`;
  const real = `kieron.hawke+sc-real-${id}@googlemail.com`;
  const { body } = await invite(ctx, {
    name: "Scenario Typo", email: typo, agreedPrice: "60",
  });
  const paid = await payAs(browser, body.link, { email: typo, editEmailTo: real });

  await settled(real);
  const { data: onReal } = await dbCustomer(real);
  const { data: onTypo } = await dbCustomer(typo);
  check("corrected email", "the customer record is under the address they confirmed", Boolean(onReal?.id),
    onReal ? "" : `only found ${onTypo?.email ?? "nothing"}`);
  check("corrected email", "no second record under the address Ben mistyped", !onTypo?.id,
    onTypo?.email ?? "");

  const user = await authUser(real);
  check("corrected email", "their login and their subscription are the same account",
    Boolean(user && onReal && onReal.auth_user_id === user.id));
  if (onReal?.id) {
    const { data: subs } = await sb.from("subscriptions").select("status").eq("customer_id", onReal.id);
    check("corrected email", "the subscription is on that record", (subs ?? []).length === 1 && subs[0].status === "active",
      JSON.stringify(subs));
  }
  check("corrected email", "the welcome page states what was taken",
    /has been taken today|card is saved/i.test(paid.welcomeText));
  await paid.ctx.close();
  await ctx.close();
  return { email: real, link: body.link };
}

/* ── 3 · They re-open the link and try to pay again ──────────────────────── */
async function scenarioDoublePay(browser, prior) {
  /* A FRESH CONTEXT ON PURPOSE. This is the client re-opening the text on a
     different phone, so the browser holds none of their earlier typing and
     the email guard has nothing to work with. Before the invite itself was
     stamped, this got all the way to Stripe and only its idempotency key —
     which expires after a day — stopped a second subscription. */
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);

  const token = new URL(prior.link).pathname.split("/o/")[1];
  const direct = await ctx.request.post(`${BASE}/api/onboarding/checkout`, { data: { token } });
  const directBody = await direct.json();
  check("paying twice", "refused on a device that knows nothing about them",
    direct.status() === 409 && directBody.error === "ALREADY_SUBSCRIBED",
    `${direct.status()} ${directBody.error ?? ""}`);

  await page.goto(`${BASE}${new URL(prior.link).pathname}?step=pay`);
  await page.getByRole("button", { name: /secure checkout/i }).click();
  await page.waitForTimeout(4000);
  const text = await page.locator("main").innerText();
  check("paying twice", "and told plainly, not shown an error",
    /already set up and paying/i.test(text), text.replace(/\s+/g, " ").slice(0, 160));

  const { data: cust } = await dbCustomer(prior.email);
  const { data: subs } = await sb.from("subscriptions").select("id").eq("customer_id", cust.id);
  check("paying twice", "still exactly one subscription", (subs ?? []).length === 1, `${(subs ?? []).length}`);

  const invoices = await stripe.invoices.list({ customer: cust.stripe_customer_id, limit: 10 });
  check("paying twice", "and exactly one invoice was raised", invoices.data.length === 1,
    invoices.data.map((i) => i.amount_paid).join(","));
  await ctx.close();
}

/* ── 4 · Ben cancels a link he has already sent ──────────────────────────── */
async function scenarioCancelledLink(browser) {
  const ctx = await adminContext(browser);
  const { body } = await invite(ctx, {
    name: "Scenario Cancel", email: `kieron.hawke+sc-cancel-${stamp()}@googlemail.com`, agreedPrice: "60",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${new URL(body.link).pathname}`);
  check("cancelled link", "it works before it is cancelled",
    /payments/i.test(await page.locator("h1").first().innerText()));

  const del = await ctx.request.delete(`${BASE}/api/onboarding/invite/${body.inviteId}`);
  check("cancelled link", "Ben can cancel it", del.status() === 200);

  await page.goto(`${BASE}${new URL(body.link).pathname}`);
  const after = await page.locator("main").innerText();
  check("cancelled link", "and it stops working, with a message that helps",
    /expired/i.test(after) && /ask ben/i.test(after), after.replace(/\s+/g, " ").slice(0, 120));

  // Nothing can be bought through it either.
  const co = await ctx.request.post(`${BASE}/api/onboarding/checkout`, {
    data: { token: new URL(body.link).pathname.split("/o/")[1] },
  });
  check("cancelled link", "checkout refuses it outright", co.status() === 403, `status ${co.status()}`);
  await ctx.close();
}

/* ── 5 · Guards that should refuse before any money moves ────────────────── */
async function scenarioGuards(browser) {
  const ctx = await adminContext(browser);
  const cases = [
    ["a rate above the band", { name: "X", email: "a@b.co", agreedPrice: "15000" }, "PRICE_INVALID"],
    ["a rate of zero", { name: "X", email: "a@b.co", agreedPrice: "0" }, "PRICE_INVALID"],
    ["a balance with no rate", { name: "X", email: "a@b.co", dueToday: "100" }, "DUE_TODAY_NEEDS_RATE"],
    ["a balance above the band", { name: "X", email: "a@b.co", agreedPrice: "60", dueToday: "20000" }, "DUE_TODAY_INVALID"],
    ["a start date too far out", { name: "X", email: "a@b.co", agreedPrice: "60", startDate: plusDays(60) }, "START_DATE_OUT_OF_RANGE"],
    ["a start date in the past", { name: "X", email: "a@b.co", agreedPrice: "60", startDate: plusDays(-2) }, "START_DATE_OUT_OF_RANGE"],
    ["a mangled mobile", { name: "X", email: "a@b.co", agreedPrice: "60", phone: "12345" }, "PHONE_INVALID"],
    ["a mangled email", { name: "X", email: "not-an-email", agreedPrice: "60" }, "EMAIL_INVALID"],
    ["nowhere to send it", { name: "X", agreedPrice: "60" }, "CONTACT_REQUIRED"],
    ["no name", { email: "a@b.co", agreedPrice: "60" }, "NAME_REQUIRED"],
  ];
  for (const [label, data, expected] of cases) {
    const r = await invite(ctx, { ...data, preview: true });
    check("guards", `refuses ${label}`, r.status === 400 && r.body.error === expected,
      `got ${r.status} ${r.body.error ?? "ok"}`);
  }

  // And the same refusals on the real send, not only the preview.
  const live = await invite(ctx, { name: "X", email: "a@b.co", agreedPrice: "15000" });
  check("guards", "the send path refuses too, not just the preview",
    live.status === 400 && live.body.error === "PRICE_INVALID", `${live.status} ${live.body.error}`);
  await ctx.close();
}

/* ── 6 · Nobody without a login can do any of it ─────────────────────────── */
async function scenarioUnauthed(browser) {
  const ctx = await browser.newContext();
  const post = await ctx.request.post(`${BASE}/api/onboarding/invite`, {
    data: { name: "Intruder", email: "a@b.co", agreedPrice: "60", preview: true },
  });
  check("no login", "cannot preview an invite", post.status() === 401, `status ${post.status()}`);
  const send = await ctx.request.post(`${BASE}/api/onboarding/invite`, {
    data: { name: "Intruder", email: "a@b.co", agreedPrice: "60" },
  });
  check("no login", "cannot send one", send.status() === 401, `status ${send.status()}`);
  const del = await ctx.request.delete(`${BASE}/api/onboarding/invite/abcdefghjk`);
  check("no login", "cannot cancel one", del.status() === 401, `status ${del.status()}`);
  const co = await ctx.request.post(`${BASE}/api/onboarding/checkout`, { data: { token: "abcdefghjk" } });
  check("no login", "a made-up token buys nothing", co.status() === 403, `status ${co.status()}`);
  await ctx.close();
}

/* ── 7 · The client backs out of Stripe and comes back ───────────────────── */
async function scenarioAbandon(browser) {
  const ctx = await adminContext(browser);
  const email = `kieron.hawke+sc-abandon-${stamp()}@googlemail.com`;
  const { body } = await invite(ctx, { name: "Scenario Abandon", email, agreedPrice: "60", dueToday: "100" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  await page.goto(`${BASE}${new URL(body.link).pathname}?step=pay&cancelled=1`);
  const text = await page.locator("main").innerText();
  check("came back", "returning from a cancelled checkout is reassuring, not an error",
    /nothing was charged/i.test(text), text.replace(/\s+/g, " ").slice(0, 120));
  check("came back", "and the figures are still on the screen",
    /£160 today/.test(text) && /£100 outstanding balance/.test(text) && /£60/.test(text),
    text.replace(/\s+/g, " ").slice(0, 160));
  check("came back", "the checkout button still works", await page.getByRole("button", { name: /secure checkout/i }).isEnabled());
  await ctx.close();
}

/* ── 8 · Ben's control over a client who is already paying ───────────────── */
async function scenarioAdminControls(browser) {
  const ctx = await adminContext(browser);
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);

  /* Whoever the scenarios just set up. Reading the roster rather than
     creating another paying client: these controls act on real money in
     Stripe and the point is that they work on a real subscription. */
  const { data: rows } = await sb
    .from("customers")
    .select("id, email")
    .like("email", "kieron.hawke+sc-%")
    .order("created_at", { ascending: false })
    .limit(5);
  const withSub = [];
  for (const r of rows ?? []) {
    const { data: subs } = await sb
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("customer_id", r.id)
      .eq("status", "active");
    if ((subs ?? []).length) withSub.push({ ...r, sub: subs[0].stripe_subscription_id });
  }
  if (!withSub.length) {
    check("Ben's controls", "found a paying client to act on", false, "run corrected-email first");
    await ctx.close();
    return;
  }
  const target = withSub[0];
  await page.goto(`${BASE}/admin/customers/${target.id}`);
  const before = await stripe.subscriptions.retrieve(target.sub);
  const beforeAmount = before.items.data[0]?.price?.unit_amount;

  check("Ben's controls", "every money control is on the client's page",
    (await page.getByRole("button", { name: /change rate/i }).count()) > 0 &&
    (await page.getByRole("button", { name: /pause collection/i }).count()) > 0 &&
    (await page.getByRole("button", { name: /refund last payment/i }).count()) > 0 &&
    (await page.getByRole("button", { name: /cancel at period end/i }).count()) > 0 &&
    (await page.getByRole("button", { name: /cancel now/i }).count()) > 0);

  /* Change the rate. The new figure must reach Stripe, and must not be
     charged today — a rate change is not a payment. */
  /* A figure that differs from whatever it is now, so a repeat run is a
     genuine change rather than an assertion that passes by standing still. */
  const newPence = beforeAmount === 7150 ? 8325 : 7150;
  const newPounds = (newPence / 100).toFixed(2);
  const modal = page.getByRole("dialog");
  await page.getByRole("button", { name: /change rate/i }).click();
  await modal.getByLabel(/new monthly rate in pounds/i).fill(newPounds);
  await modal.getByRole("button", { name: new RegExp(`set rate to £${newPounds}`, "i") }).click();
  await page.waitForTimeout(6000);
  const afterRate = await stripe.subscriptions.retrieve(target.sub);
  check("Ben's controls", "a rate change reaches Stripe",
    afterRate.items.data[0]?.price?.unit_amount === newPence,
    `was ${beforeAmount}, asked for ${newPence}, now ${afterRate.items.data[0]?.price?.unit_amount}`);
  const invoicesAfterRate = await stripe.invoices.list({ subscription: target.sub, limit: 10 });
  check("Ben's controls", "and takes no money today",
    !invoicesAfterRate.data.some((i) => i.amount_paid === newPence),
    invoicesAfterRate.data.map((i) => i.amount_paid).join(","));

  /* Pause, then resume. */
  await page.getByRole("button", { name: /pause collection/i }).click();
  await modal.getByRole("button", { name: /money is tight/i }).click();
  await modal.getByRole("button", { name: /^1 month$/i }).click();
  await modal.getByRole("button", { name: /pause payments/i }).click();
  await page.waitForTimeout(6000);
  const paused = await stripe.subscriptions.retrieve(target.sub);
  check("Ben's controls", "pausing stops collection without ending anything",
    Boolean(paused.pause_collection) && paused.status !== "canceled",
    JSON.stringify(paused.pause_collection));

  await page.reload();
  await page.getByRole("button", { name: /resume collection/i }).click();
  await page.waitForTimeout(6000);
  const resumed = await stripe.subscriptions.retrieve(target.sub);
  check("Ben's controls", "and resuming starts it again", !resumed.pause_collection);

  /* Cancel at period end: reversible, and access continues. */
  await page.reload();
  await page.getByRole("button", { name: /cancel at period end/i }).click();
  await modal.getByRole("button", { name: /^cancel (on|at period end)/i }).click();
  await page.waitForTimeout(6000);
  const ending = await stripe.subscriptions.retrieve(target.sub);
  check("Ben's controls", "cancelling at period end schedules it rather than cutting them off",
    ending.cancel_at_period_end === true && ending.status === "active",
    `${ending.status} / cancel_at_period_end ${ending.cancel_at_period_end}`);

  await ctx.close();
}

const ALL = {
  "edited-copy": scenarioEditedCopy,
  "corrected-email": scenarioCorrectedEmail,
  "cancelled-link": scenarioCancelledLink,
  guards: scenarioGuards,
  unauthed: scenarioUnauthed,
  abandon: scenarioAbandon,
  "admin-controls": scenarioAdminControls,
};

const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const browser = await chromium.launch();
try {
  const names = wanted.length ? wanted : Object.keys(ALL);
  let prior = null;
  for (const name of names) {
    console.log(`\n── ${name} ${"─".repeat(Math.max(0, 60 - name.length))}`);
    try {
      const out = await ALL[name](browser, prior);
      if (name === "corrected-email") prior = out;
      // The double-pay check only makes sense straight after a real payment.
      if (name === "corrected-email" && (wanted.length === 0 || wanted.includes("double-pay"))) {
        console.log(`\n── double-pay ${"─".repeat(48)}`);
        await scenarioDoublePay(browser, prior);
      }
    } catch (e) {
      check(name, "scenario ran to completion", false, String(e.message).split("\n")[0]);
    }
  }
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed`);
if (failures) {
  console.log("\nFailures:");
  for (const r of results.filter((x) => !x.pass)) console.log(`  ${r.scenario}: ${r.claim} — ${r.detail}`);
}
process.exit(failures ? 1 : 0);
