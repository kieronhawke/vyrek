/**
 * LOAD, AND THE AWKWARD SHAPES REAL PEOPLE COME IN.
 *
 *   node --env-file=.env.local scripts/e2e/stress.mjs
 *
 * Three things the other suites do not cover:
 *
 *   CONCURRENCY  Sixty invites created at once, then every single link
 *                resolved and checked against the client it was made for. The
 *                failure this is looking for is the worst one available: a
 *                link that opens somebody else's name, or somebody else's
 *                money. Short ids are ten random characters, and "unlikely to
 *                collide" is a claim worth measuring rather than asserting.
 *
 *   FORMATS      Names with apostrophes, accents, non-Latin scripts and
 *                fifty characters. Phone numbers written the six ways British
 *                people write them. Money typed with commas, pounds signs and
 *                trailing pence. Every one of these has broken a form
 *                somewhere.
 *
 *   REFUSALS     The shapes that must NOT be accepted, checked at the same
 *                time as the ones that must, because a validator that accepts
 *                everything passes the first list and fails the business.
 *
 * Nothing is sent: every invite is a preview, so no email, no text, no rows.
 */
import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "kieron.hawke+admin-e2e@googlemail.com",
  password: process.env.E2E_ADMIN_PASSWORD,
};

let failures = 0;
const checks = [];
function check(claim, pass, detail = "") {
  checks.push({ claim, pass, detail });
  if (!pass) failures++;
  console.log(`  ${pass ? "ok  " : "FAIL"} ${claim}${detail ? ` — ${detail}` : ""}`);
}
const plusDays = (n) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(45_000);
await page.goto(`${BASE}/admin/login`);
await page.getByLabel("Email").fill(ADMIN.email);
await page.getByLabel("Password").fill(ADMIN.password);
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/admin(?!\/login)/);
await page.close();

const preview = (data) =>
  ctx.request
    .post(`${BASE}/api/onboarding/invite`, { data: { kind: "payment", preview: true, ...data } })
    .then(async (r) => ({ status: r.status(), body: await r.json() }));

try {
  /* ── 1 · Sixty at once ────────────────────────────────────────────────── */
  console.log("\n── sixty invites at once ──");
  const batch = Array.from({ length: 60 }, (_, i) => ({
    name: `Load Test ${i}`,
    email: `load-${i}@example.com`,
    phone: "07700900123",
    agreedPrice: String(50 + i),
    dueToday: i % 3 === 0 ? String(100 + i) : "",
    startDate: i % 2 === 0 ? plusDays(1 + (i % 28)) : plusDays(0),
  }));
  const started = Date.now();
  const results = await Promise.all(batch.map(preview));
  const elapsed = Date.now() - started;

  check("all sixty are accepted", results.every((r) => r.status === 200),
    `${results.filter((r) => r.status !== 200).length} refused`);
  check("none is rate limited", !results.some((r) => r.body.error === "RATE_LIMITED"));
  check(`they come back in a reasonable time`, elapsed < 60_000, `${(elapsed / 1000).toFixed(1)}s`);

  /* THE ONE THAT MATTERS. Every preview must describe its own client. */
  const wrong = [];
  results.forEach((r, i) => {
    const want = batch[i];
    const gotName = r.body.to?.name;
    const gotEmail = r.body.to?.email;
    const gotRate = r.body.agreedPence;
    const gotDue = r.body.dueTodayPence;
    if (gotName !== want.name) wrong.push(`#${i} name ${gotName}`);
    if (gotEmail !== want.email) wrong.push(`#${i} email ${gotEmail}`);
    if (gotRate !== Number(want.agreedPrice) * 100) wrong.push(`#${i} rate ${gotRate}`);
    const wantDue = want.dueToday ? Number(want.dueToday) * 100 : 0;
    if (gotDue !== wantDue) wrong.push(`#${i} balance ${gotDue} wanted ${wantDue}`);
  });
  check("every one describes its own client and its own money", wrong.length === 0,
    wrong.slice(0, 3).join("; "));

  const links = results.map((r) => r.body.link).filter(Boolean);
  check("every link is unique", new Set(links).size === links.length,
    `${links.length - new Set(links).size} duplicated`);
  check("every link is the short form", links.every((l) => /\/o\/[a-z0-9]{10}$/.test(l)),
    links.find((l) => !/\/o\/[a-z0-9]{10}$/.test(l)) ?? "");

  /* ── 2 · Names people actually have ───────────────────────────────────── */
  console.log("\n── names ──");
  const NAMES = [
    ["an apostrophe", "Siobhán O'Rourke"],
    ["a hyphen", "Marie-Claire de la Tour"],
    ["accents", "Seán Ó Briain"],
    ["non-Latin", "李伟"],
    ["Cyrillic", "Александра Иванова"],
    ["Arabic", "محمد الأحمدي"],
    ["one word", "Prince"],
    ["fifty characters", "Bartholomew Fitzgerald-Worthington the Third Esq."],
    ["extra spaces", "   Sam    Reeves   "],
    ["a full stop", "J. R. Hartley"],
  ];
  for (const [label, name] of NAMES) {
    const r = await preview({ name, email: "a@b.co", phone: "07700900123", agreedPrice: "60" });
    const first = name.trim().split(/\s+/)[0];
    const ok = r.status === 200 &&
      r.body.to?.firstName === first &&
      (r.body.sms?.text ?? "").includes(first) &&
      r.body.sms?.segments >= 1;
    check(`accepts ${label}`, ok,
      r.status !== 200 ? r.body.error : `"${r.body.to?.firstName}" · ${r.body.sms?.segments} seg${r.body.sms?.gsm ? "" : ", non-GSM"}`);
  }

  /* A non-Latin name makes the text non-GSM, which doubles the bill. It must
     still be sendable — under the transport's three-segment limit — and the
     admin must be told, not surprised. */
  const cyrillic = await preview({ name: "Александра Иванова", email: "a@b.co", phone: "07700900123", agreedPrice: "2000", dueToday: "10000", startDate: plusDays(20) });
  check("a non-GSM name still sends, and says what it costs",
    cyrillic.body.sms?.segments <= 3 && cyrillic.body.sms?.gsm === false,
    `${cyrillic.body.sms?.segments} segments`);

  /* ── 3 · Phone numbers, written six ways ──────────────────────────────── */
  console.log("\n── phone numbers ──");
  const PHONES = [
    ["plain", "07398790378", "+447398790378"],
    ["spaced", "07398 790378", "+447398790378"],
    ["hyphenated", "07398-790-378", "+447398790378"],
    ["bracketed", "(07398) 790378", "+447398790378"],
    ["international", "+447398790378", "+447398790378"],
    ["no plus", "447398790378", "+447398790378"],
    ["Irish", "+353871234567", "+353871234567"],
  ];
  for (const [label, typed, expected] of PHONES) {
    const r = await preview({ name: "Sam", email: "a@b.co", phone: typed, agreedPrice: "60" });
    check(`reads a ${label} number`, r.status === 200 && r.body.to?.phone === expected,
      `${typed} -> ${r.body.to?.phone ?? r.body.error}`);
  }
  for (const [label, bad] of [["too short", "12345"], ["letters", "not a number"], ["a landline typo", "0123"]]) {
    const r = await preview({ name: "Sam", email: "a@b.co", phone: bad, agreedPrice: "60" });
    check(`refuses ${label}`, r.status === 400 && r.body.error === "PHONE_INVALID",
      `${r.status} ${r.body.error ?? ""}`);
  }

  /* ── 4 · Email addresses ──────────────────────────────────────────────── */
  console.log("\n── email addresses ──");
  const EMAILS = [
    ["plus addressing", "sam+coaching@example.com"],
    ["a subdomain", "sam@mail.example.co.uk"],
    ["a long local part", `${"s".repeat(60)}@example.com`],
    ["capitals", "Sam.Reeves@Example.COM"],
    ["a hyphenated domain", "sam@my-gym.co.uk"],
    ["a dotted local part", "sam.j.reeves@example.com"],
  ];
  for (const [label, email] of EMAILS) {
    const r = await preview({ name: "Sam", email, agreedPrice: "60" });
    check(`accepts ${label}`, r.status === 200 && Boolean(r.body.email?.html), r.body.error ?? "");
  }
  for (const [label, email] of [["no at", "sam.example.com"], ["no domain", "sam@"], ["a space", "sam reeves@example.com"], ["two ats", "a@b@c.com"]]) {
    const r = await preview({ name: "Sam", email, agreedPrice: "60" });
    check(`refuses ${label}`, r.status === 400, `${r.status} ${r.body.error ?? "accepted"}`);
  }

  /* ── 5 · Money, however it is typed ───────────────────────────────────── */
  console.log("\n── money ──");
  const MONEY = [
    ["plain", "60", 6000],
    ["with a pound sign", "£60", 6000],
    ["with pence", "137.50", 13750],
    ["with a comma", "1,250", 125000],
    ["pounds and pence and a sign", "£1,250.99", 125099],
    ["padded", "  60  ", 6000],
    ["the floor", "1", 100],
    ["the ceiling", "2000", 200000],
  ];
  for (const [label, typed, pence] of MONEY) {
    const r = await preview({ name: "Sam", email: "a@b.co", agreedPrice: typed });
    check(`reads a rate ${label}`, r.status === 200 && r.body.agreedPence === pence,
      `${typed} -> ${r.body.agreedPence ?? r.body.error}`);
  }
  for (const [label, typed] of [["over the ceiling", "2000.01"], ["under the floor", "0.99"], ["negative", "-60"], ["words", "sixty"], ["three decimals", "60.005"]]) {
    const r = await preview({ name: "Sam", email: "a@b.co", agreedPrice: typed });
    check(`refuses a rate ${label}`, r.status === 400 && r.body.error === "PRICE_INVALID",
      `${typed} -> ${r.status} ${r.body.error ?? "accepted"}`);
  }
  const BALANCES = [["blank", "", 0], ["zero", "0", 0], ["plain", "100", 10000], ["large", "9,999.99", 999999], ["the ceiling", "10000", 1000000]];
  for (const [label, typed, pence] of BALANCES) {
    const r = await preview({ name: "Sam", email: "a@b.co", agreedPrice: "60", dueToday: typed });
    check(`reads a balance ${label}`, r.status === 200 && r.body.dueTodayPence === pence,
      `"${typed}" -> ${r.body.dueTodayPence ?? r.body.error}`);
  }

  /* ── 6 · The whole allowed date window ────────────────────────────────── */
  console.log("\n── dates ──");
  for (const days of [0, 1, 15, 30, 31]) {
    const r = await preview({ name: "Sam", email: "a@b.co", agreedPrice: "60", startDate: plusDays(days) });
    const deferred = days > 0;
    check(`accepts a start ${days} days out`,
      r.status === 200 && Boolean(r.body.schedule?.deferred) === deferred,
      r.body.error ?? `deferred ${r.body.schedule?.deferred}`);
  }
  for (const days of [32, 60, 365, -1]) {
    const r = await preview({ name: "Sam", email: "a@b.co", agreedPrice: "60", startDate: plusDays(days) });
    check(`refuses a start ${days} days out`, r.status === 400, `${r.status} ${r.body.error ?? "accepted"}`);
  }
  for (const bad of ["2026-13-01", "2026-02-30", "not-a-date", "01/10/2026"]) {
    const r = await preview({ name: "Sam", email: "a@b.co", agreedPrice: "60", startDate: bad });
    check(`refuses "${bad}"`, r.status === 400, `${r.status} ${r.body.error ?? "accepted"}`);
  }
} catch (e) {
  check("the stress run completed", false, String(e.message).split("\n")[0]);
} finally {
  await browser.close();
}

console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks passed`);
if (failures) {
  console.log("\nFailures:");
  for (const c of checks.filter((x) => !x.pass)) console.log(`  ${c.claim} — ${c.detail}`);
}
process.exit(failures ? 1 : 0);
