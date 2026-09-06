/**
 * THE WHOLE THING, ONE CLIENT AT A TIME.
 *
 *   node --env-file=.env.local scripts/e2e/full-journey.mjs [--live] [--desktop]
 *
 * Ben sends the link, it arrives by email and by text, the client walks the
 * three screens, pays on Stripe's real hosted page with the test card, lands
 * on the congratulations page, and is carried to their account.
 *
 * `--live` sends a genuine email and text to Kieron's own address and phone
 * and asserts the delivery result. Without it the invite still goes through
 * the real route; only the transports are quiet.
 *
 * Everything is asserted, so a run reads as ok/FAIL lines and exits non-zero
 * on any failure. It cleans up after itself unless `--keep` is passed.
 */
import { chromium, devices } from "@playwright/test";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const LIVE = process.argv.includes("--live");
const DESKTOP = process.argv.includes("--desktop");
const KEEP = process.argv.includes("--keep");
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

let failures = 0;
const checks = [];
function check(claim, pass, detail = "") {
  checks.push({ claim, pass, detail });
  if (!pass) failures++;
  console.log(`  ${pass ? "ok  " : "FAIL"} ${claim}${detail ? ` — ${detail}` : ""}`);
}

const id = Date.now().toString(36);
const CLIENT = {
  name: "Journey Client",
  email: LIVE ? "kieron.hawke+journey@googlemail.com" : `kieron.hawke+j-${id}@googlemail.com`,
  /* Kieron's own handset when live; Ofcom's reserved drama range otherwise,
     which lib/sms/send.ts refuses before it ever reaches Twilio. */
  phone: LIVE ? (process.env.E2E_CLIENT_MOBILE ?? "07398790378") : "07700900123",
  password: "harbour lantern tuesday",
};
const plusDays = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const profile = DESKTOP
  ? { viewport: { width: 1440, height: 900 } }
  : { ...devices["iPhone 15 Pro"], viewport: { width: 393, height: 852 } };

console.log(`\n── ${DESKTOP ? "desktop" : "phone"}${LIVE ? ", live email + text" : ""} ──`);

/*
 * ⚠️ NEVER AGAINST PRODUCTION.
 *
 * This script pays. It was pointed at suthperformance.com once and Stripe
 * handed back a `cs_live_` session — production is on LIVE keys, so the run
 * was attempting a real charge on a real account. The 4242 card is refused in
 * live mode so nothing happened, but nothing is the wrong thing to rely on.
 * Run it against a locally served build, where .env.local supplies the test
 * key. Pass --i-know to override, and be certain first.
 */
if (/suthperformance\.com|vercel\.app/.test(BASE) && !process.argv.includes("--i-know")) {
  console.error(
    `\nRefusing to run against ${BASE}.\n` +
      "This script completes a real checkout. Point E2E_BASE at a local build.\n",
  );
  process.exit(2);
}

const browser = await chromium.launch();
let invite = null;
try {
  /* ── 1 · Ben sends it ─────────────────────────────────────────────────── */
  const admin = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const ap = await admin.newPage();
  ap.setDefaultTimeout(45_000);
  await ap.goto(`${BASE}/admin/login`);
  await ap.getByLabel("Email").fill(ADMIN.email);
  await ap.getByLabel("Password").fill(ADMIN.password);
  await ap.getByRole("button", { name: /sign in/i }).click();
  await ap.waitForURL(/\/admin(?!\/login)/);

  const res = await admin.request.post(`${BASE}/api/onboarding/invite`, {
    data: {
      name: CLIENT.name, email: CLIENT.email, phone: CLIENT.phone, kind: "payment",
      agreedPrice: "60", dueToday: "100", startDate: plusDays(9),
    },
  });
  invite = await res.json();
  check("the invite is created", res.status() === 200 && Boolean(invite.link), invite.error ?? "");
  check("it goes out by email", invite.email?.attempted === true &&
    (LIVE ? invite.email?.ok === true : true), invite.email?.reason ?? "sent");
  check("and by text", invite.sms?.attempted === true &&
    (LIVE ? invite.sms?.ok === true : true), invite.sms?.reason ?? `sent as ${invite.sms?.sentAs}`);
  check("the text is one message", invite.sms?.segments === 1, String(invite.sms?.segments));
  check("the text names the figures and carries the link",
    /£100 today/.test(invite.sms?.text ?? "") && /£60\/mo/.test(invite.sms?.text ?? "") &&
    (invite.sms?.text ?? "").includes("/o/"), invite.sms?.text ?? "");
  await admin.close();

  /* ── 2 · The client walks it ──────────────────────────────────────────── */
  const ctx = await browser.newContext(profile);
  const p = await ctx.newPage();
  p.setDefaultTimeout(60_000);
  const path = new URL(invite.link).pathname;

  await p.goto(`${BASE}${path}`);
  const first = await p.locator("main").innerText();
  check("the first screen greets them and states the money",
    /Journey/.test(first) && /£100 today/.test(first) && /£60 a month/.test(first));
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("nothing scrolls sideways", overflow === false);

  await p.getByRole("button", { name: /continue/i }).click();
  await p.waitForFunction(() =>
    [document, document.body].some((n) => Object.keys(n).some((k) => k.startsWith("__reactContainer"))));
  await p.getByLabel(/choose a password/i).fill(CLIENT.password);
  check("the strength meter reads the password",
    await p.getByText(/Strong|Good/).first().isVisible());
  await p.getByRole("button", { name: /continue/i }).click();

  await p.getByText("The rate you agreed with Ben").waitFor();
  const payText = await p.locator("main").innerText();
  check("the card screen repeats the same figures",
    /£100 today/.test(payText) && /£60/.test(payText));

  /* Signed in before the card, which is what makes the redirect land. */
  const cookiesBefore = await ctx.cookies();
  check("they are signed in before they pay",
    cookiesBefore.some((c) => /^sb-.*-auth-token/.test(c.name)),
    cookiesBefore.map((c) => c.name).join(",").slice(0, 80));

  /* ── 3 · Stripe ───────────────────────────────────────────────────────── */
  await p.getByRole("button", { name: /secure checkout/i }).click();
  await p.waitForURL(/checkout\.stripe\.com/, { waitUntil: "commit" });
  await p.locator("#cardNumber").waitFor({ timeout: 90_000 });
  const stripeText = await p.locator("body").innerText();
  check("Stripe asks for the balance and states the monthly arrangement",
    /£100\.00/.test(stripeText) && /Then £60 a month from/.test(stripeText),
    (stripeText.match(/Then £[^\n]+/) ?? ["no submit note"])[0]);

  const emailField = p.locator("#email");
  if ((await emailField.count()) && !(await emailField.inputValue())) {
    await emailField.fill(CLIENT.email);
  }
  await p.locator("#cardNumber").fill("4242424242424242");
  await p.locator("#cardExpiry").fill("12/34");
  await p.locator("#cardCvc").fill("123");
  if (await p.locator("#billingName").count()) await p.locator("#billingName").fill(CLIENT.name);
  if (await p.locator("#billingPostalCode").count()) await p.locator("#billingPostalCode").fill("SW1A 1AA");
  await p.locator('button[type="submit"]').first().click();

  /* ── 4 · The congratulations page ─────────────────────────────────────── */
  await p.waitForURL(/\/onboarding\/welcome\?session_id=cs_/, { timeout: 120_000, waitUntil: "commit" });
  await p.waitForLoadState("domcontentloaded");

  /* Caught early on purpose: the burst runs for 2.6 seconds and every check
     below it costs time, so a screenshot taken after them lands on the fade.
     This is the frame a person actually sees. */
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${process.env.SHOT_DIR ?? "/tmp"}/confetti-${DESKTOP ? "desktop" : "phone"}.png` });

  // The confetti canvas is only there while it is running.
  const canvasEarly = await p.locator("canvas").count();
  check("confetti fires on arrival", canvasEarly > 0, `${canvasEarly} canvas`);
  /* Polled, not sampled once: a single read lands either before the first
     animation frame or in the gap between clearRect and the draws, and calls
     a working burst broken. */
  const painted = await p
    .waitForFunction(() => {
      const c = document.querySelector("canvas");
      if (!c || c.width < 100) return false;
      const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    }, null, { timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  check("and it actually draws something", painted === true);
  check("it cannot swallow a tap on the buttons underneath",
    (await p.evaluate(() => getComputedStyle(document.querySelector("canvas")).pointerEvents)) === "none");

  const welcome = await p.locator("main").innerText();
  check("it says what was taken, in the past tense",
    /£100 has been taken today/.test(welcome), welcome.replace(/\s+/g, " ").slice(0, 120));
  check("and when the monthly payment starts",
    /£60 a month comes out from/.test(welcome));
  check("the countdown is on screen", /Taking you to your account in/.test(welcome),
    (welcome.match(/Taking you[^.]*\./) ?? ["missing"])[0]);
  check("with a way to stop it",
    await p.getByRole("button", { name: /stay on this page/i }).isVisible());
  const noSideways = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("the page does not scroll sideways", noSideways === false);

  /* ── 5 · It carries them to their account ─────────────────────────────── */
  const welcomeUrl = p.url();
  await p.waitForURL(/\/app\/account/, { timeout: 40_000 });
  check("it lands them in their account by itself", /\/app\/account/.test(p.url()), p.url());
  await p.waitForTimeout(3500);
  const account = await p.locator("body").innerText();
  check("signed in, not bounced to a login screen", !/sign in/i.test(await p.title()));
  check("the account shows the live subscription",
    /Active/.test(account) && /£60 a month/.test(account),
    (account.match(/£[\d.]+ a month/) ?? ["no amount"])[0]);
  check("it says the next payment date", /Next payment/.test(account),
    (account.match(/Next payment\s*\n?\s*([^\n]+)/) ?? [null, "missing"])[1]);
  check("and it is the billing-only view", /Coming to your account/.test(account));

  /* ── 6 · What Stripe and the database hold ────────────────────────────── */
  const { data: cust } = await sb.from("customers")
    .select("id, email, stripe_customer_id").eq("email", CLIENT.email).maybeSingle();
  check("one customer record, under the right address", Boolean(cust?.id), cust?.email ?? "none");
  if (cust?.id) {
    const { data: subs } = await sb.from("subscriptions").select("status").eq("customer_id", cust.id);
    check("exactly one subscription, active",
      (subs ?? []).length === 1 && subs[0].status === "active", JSON.stringify(subs));
    const stripeSubs = await stripe.subscriptions.list({ customer: cust.stripe_customer_id, limit: 5 });
    const sub = stripeSubs.data[0];
    check("Stripe holds the agreed rate", sub?.items.data[0]?.price?.unit_amount === 6000,
      String(sub?.items.data[0]?.price?.unit_amount));
    check("anchored to the date Ben chose, not today",
      new Date(sub.billing_cycle_anchor * 1000).toISOString().slice(0, 10) === plusDays(9),
      new Date(sub.billing_cycle_anchor * 1000).toISOString().slice(0, 16));
    const invoices = await stripe.invoices.list({ customer: cust.stripe_customer_id, limit: 5 });
    check("the balance was taken and nothing else",
      invoices.data.every((i) => i.amount_paid === 0) || invoices.data.length === 0,
      invoices.data.map((i) => i.amount_paid).join(",") || "no invoice, as expected");
    const pi = await stripe.paymentIntents.list({ customer: cust.stripe_customer_id, limit: 3 });
    check("the £100 balance is a succeeded payment",
      pi.data.some((x) => x.amount === 10000 && x.status === "succeeded"),
      pi.data.map((x) => `${x.amount}/${x.status}`).join(" "));
  }

  /* ── Reduced motion gets none of it ──────────────────────────────────
     Not a preference to be overridden: for somebody with a vestibular
     disorder a screenful of moving particles is not a celebration. Checked
     on the same page, in a context that asks for less motion. */
  const calm = await browser.newContext({ ...profile, reducedMotion: "reduce" });
  const cp = await calm.newPage();
  await cp.goto(welcomeUrl);
  await cp.waitForTimeout(1500);
  const calmPainted = await cp.evaluate(() => {
    const c = document.querySelector("canvas");
    if (!c || c.width < 100) return false;
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  });
  check("reduced motion gets no confetti at all", calmPainted === false);
  await calm.close();

  /* The invite is spent, so the link cannot buy anything twice. */
  if (invite.inviteId) {
    const again = await ctx.request.post(`${BASE}/api/onboarding/checkout`, {
      data: { token: invite.inviteId },
    });
    check("the link cannot be paid a second time", again.status() === 409, `status ${again.status()}`);
  }

  await ctx.close();
} catch (e) {
  check("the journey ran to completion", false, String(e.message).split("\n")[0]);
  /* Where it actually stopped, which is the only thing worth having when a
     run against production fails. */
  try {
    const pages = browser.contexts().flatMap((c) => c.pages());
    for (const [i, pg] of pages.entries()) {
      console.log(`       page ${i}: ${pg.url().slice(0, 110)}`);
      await pg.screenshot({ path: `${process.env.SHOT_DIR ?? "/tmp"}/journey-fail-${i}.png` }).catch(() => {});
    }
  } catch {}
} finally {
  await browser.close();
}

if (!KEEP) {
  const { data: c } = await sb.from("customers").select("id, stripe_customer_id").eq("email", CLIENT.email).maybeSingle();
  if (c?.id) {
    if (c.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({ customer: c.stripe_customer_id, limit: 10 });
      for (const s of subs.data) if (s.status !== "canceled") await stripe.subscriptions.cancel(s.id);
      await stripe.customers.del(c.stripe_customer_id).catch(() => {});
    }
    await sb.from("subscriptions").delete().eq("customer_id", c.id);
    await sb.from("customers").delete().eq("id", c.id);
  }
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 200 });
  const u = users.users.find((x) => x.email === CLIENT.email);
  if (u) await sb.auth.admin.deleteUser(u.id);
  if (invite?.inviteId) await sb.from("onboarding_invites").delete().eq("id", invite.inviteId);
  console.log("  ·    cleaned up");
}

console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks passed`);
process.exit(failures ? 1 : 0);
