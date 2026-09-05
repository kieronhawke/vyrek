// Sign in as a freshly set-up client and prove the account is billing-only.
//   node scripts/e2e/check-account.mjs <email> <password> [base]
import { chromium } from "@playwright/test";
const [email, password, BASE = "http://localhost:3000"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
page.setDefaultTimeout(30_000);
const out = { email };
try {
  await page.goto(`${BASE}/login`);
  await page.getByRole("button", { name: /use a password instead/i }).click();
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/app/, { timeout: 60_000 });
  out.landedOn = page.url();
  await page.goto(`${BASE}/app/account`);
  await page.waitForTimeout(3500);
  const t = await page.locator("body").innerText();
  out.account = {
    billingOnlyNote: /Coming to your account/.test(t),
    noTrainingTabs: !/\bToday\b[\s\S]{0,40}\bPlan\b[\s\S]{0,40}\bProgress\b/.test(t),
    manageBilling: /Manage billing/.test(t),
    requestChange: /Request a change/.test(t),
    cancel: /Cancel/.test(t),
    headline: (t.match(/\b(Active|Ends at the end of this period|Free trial|Payment failed|Not finished setting up|Paused|Cancelled)\b/) ?? [null])[0],
    nextPayment: (t.match(/Next payment\s*\n?\s*([^\n]+)/) ?? [null, null])[1],
    amount: (t.match(/£[\d.]+ a month/) ?? [null])[0],
    card: (t.match(/Visa ending \d{4}[^\n]*/) ?? [null])[0],
    trainingRow: (t.match(/Training\s*\n?\s*([^\n]+)/) ?? [null, null])[1],
  };
  await page.goto(`${BASE}/app/today`);
  await page.waitForTimeout(2000);
  out.todayRedirectsTo = page.url();
  await page.goto(`${BASE}/app/plan`);
  await page.waitForTimeout(2000);
  out.planRedirectsTo = page.url();
} catch (e) {
  out.error = String(e?.message ?? e);
  await page.screenshot({ path: `/private/tmp/claude-501/-Users-kieronhawke/19a44148-747e-430c-afc7-60bf74b2d6dc/scratchpad/account-fail.png`, fullPage: true }).catch(() => {});
} finally { await browser.close(); }
console.log(JSON.stringify(out, null, 2));
