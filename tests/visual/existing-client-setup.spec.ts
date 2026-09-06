import { test, expect, type Page } from "@playwright/test";

/**
 * SETTING UP AN EXISTING CLIENT, END TO END, ON A PHONE.
 *
 * Ben does this on his phone between sessions and the client opens the link on
 * theirs. So the whole journey is walked at phone width: type the fields,
 * REVIEW what the client will receive, send, follow the link, give details,
 * and land on the card screen.
 *
 * WHAT IT IS REALLY GUARDING. Things that would be invisible to a type
 * checker:
 *
 *   1. A PACKAGE THE CLIENT NEVER AGREED TO. The plan menu is gone and the
 *      feature bullets under the price are gone. If either comes back, a
 *      bespoke client is shown "1:1 Coaching" and five promises nobody made
 *      them, on the screen where they hand over a card.
 *   2. THE MONEY, IN WORDS, EVERYWHERE. The balance owed today and the date of
 *      the first monthly payment must appear on every screen that mentions
 *      money — Ben's review, the text, the email, the client's welcome, the
 *      card screen — and must never be replaced by "collects today".
 *   3. THE REVIEW STEP IS REAL. Nothing is sent until Ben has seen the actual
 *      text and the actual email. A reserved test number is refused at
 *      review, before the email has gone.
 *   4. iOS ZOOM. An input under 16px makes Safari zoom the page on focus. It
 *      is the difference between a form that feels like an app and one that
 *      feels broken, and it is one CSS class away at all times.
 *
 * It needs a real admin login. Without ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD
 * it skips rather than failing, because a missing credential is a missing
 * credential and not a broken product.
 *
 * IT SENDS NOTHING REAL. The mobile is in Ofcom's reserved drama range, which
 * the transport refuses; the email goes to a playwright+ address at
 * example.com. The link it creates is cancelled at the end.
 */

const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

/** Figures nobody would pick by accident, so a stray match is obvious. */
const RATE = "137.50";
const RATE_SHOWN = "£137.50";
const OWED = "100";
const OWED_SHOWN = "£100";
/** Ofcom-reserved: never routed, and lib/sms/send.ts refuses it before Twilio. */
const RESERVED_MOBILE = "07700 900123";

/** Package copy that must never appear on an agreed-rate journey. */
const PACKAGE_LEAKS = [
  "1:1 Coaching",
  "Programming",
  "Suth Club",
  "Most popular",
  "Choose your plan",
  "Video form checks",
  "A dated week, every week",
  "days free",
];

function futureISO(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

async function noHorizontalScroll(page: Page, where: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow, `${where} scrolls sideways`).toBe(false);
}

/**
 * Every visible input must be thumb-sized and at least 16px.
 *
 * Both numbers are load-bearing rather than taste: under 16px iOS zooms the
 * page on focus, and under ~44px a control is genuinely hard to hit.
 */
async function inputsAreThumbSized(page: Page, where: string) {
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll("input:not([type=hidden])")]
      .filter((el) => (el as HTMLElement).offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const fs = parseFloat(getComputedStyle(el).fontSize);
        return {
          name: (el as HTMLInputElement).name || (el as HTMLInputElement).type,
          h: Math.round(r.height),
          fontPx: fs,
        };
      })
      .filter((f) => f.h < 44 || f.fontPx < 16),
  );
  expect(bad, `${where}: inputs too small or below 16px`).toEqual([]);
}

async function signInAsAdmin(page: Page) {
  await page.goto("/admin/login");

  /* The business, not just the tool. This screen carried the words
     "[ MISSION CONTROL ]" and no mark at all. */
  await expect(page.getByRole("img", { name: "Suth Performance" })).toBeVisible();

  /* Filled, then CHECKED, then filled again if it did not stick.
     The form is a client component and hydration lands after the first
     paint: type into it too early and React's own state wins on hydrate,
     silently blanking the field. It failed intermittently as "missing email
     or phone" with the password present and the email box empty — which
     looks like a broken login form and is really a race. */
  const email = page.getByLabel("Email");
  const pw = page.getByLabel("Password");
  await expect(email).toBeVisible();
  await email.fill(EMAIL!);
  await pw.fill(PASSWORD!);
  if ((await email.inputValue()) !== EMAIL!) await email.fill(EMAIL!);
  if ((await pw.inputValue()) !== PASSWORD!) await pw.fill(PASSWORD!);
  await expect(email).toHaveValue(EMAIL!);
  await expect(pw).toHaveValue(PASSWORD!);

  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/, { timeout: 30_000 });
}

test.describe("Ben sets up an existing client", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "needs ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD",
  );
  /* Two logins, two server-rendered previews, a send, three client screens,
     a cancel and an expiry check: a real journey, not a screenshot. Under the
     default 30s it passed at 27–29s on one device and timed out once when six
     ran at the same time against one server. */
  test.setTimeout(90_000);

  test("balance today, rate from a date: reviewed, sent, and carried to the card screen", async ({
    page,
  }) => {
    await signInAsAdmin(page);

    // The lockup follows into the admin itself, above the console's own name.
    await expect(page.getByRole("img", { name: "Suth Performance" }).first()).toBeVisible();

    await page.goto("/admin/clients");
    await expect(
      page.getByText("Set up an existing client", { exact: false }),
    ).toBeVisible();

    // No package menu on Ben's side either — the rate is the only money control.
    for (const leak of ["1:1 Coaching · £220", "Programming · £80", "Their rate…"]) {
      await expect(
        page.getByText(leak, { exact: false }),
        `Ben's form still offers "${leak}"`,
      ).toHaveCount(0);
    }

    await noHorizontalScroll(page, "admin clients");
    await inputsAreThumbSized(page, "admin clients");

    const stamp = Date.now();
    const clientEmail = `playwright+${stamp}@example.com`;
    const startISO = futureISO(10);

    await page.getByPlaceholder("Sam Reeves").fill("Playwright Client");
    await page.getByPlaceholder("sam@example.com").fill(clientEmail);
    await page.getByPlaceholder("07700 900123").fill(RESERVED_MOBILE);
    await page.getByLabel("Amount owed today in pounds").fill(OWED);
    await page.getByLabel("Monthly rate in pounds").fill(RATE);
    await page.locator('input[type="date"]').fill(startISO);

    // Ben sees the client's own sentences while he types.
    await expect(
      page.getByText(`${OWED_SHOWN} today, for your outstanding balance.`, { exact: false }),
    ).toBeVisible();
    await expect(page.getByText(new RegExp(`Then ${RATE_SHOWN.replace(".", "\\.")} a month from`))).toBeVisible();

    /* ── the review step ─────────────────────────────────────────────── */
    await page.getByRole("button", { name: /review before sending/i }).click();
    await expect(page.getByText("Check before it goes")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Playwright Client will receive this")).toBeVisible();

    // Who, on which channels.
    await expect(page.getByText(clientEmail)).toBeVisible();
    await expect(page.getByText("+447700900123")).toBeVisible();

    // The money as a table, in the same words the client will read.
    await expect(page.getByText(`${OWED_SHOWN} (outstanding balance)`)).toBeVisible();
    await expect(page.getByText(`${RATE_SHOWN} a month`, { exact: true })).toBeVisible();

    // The text, word for word — and the reserved number called out BEFORE send.
    await expect(
      page.getByText(
        new RegExp(
          `Hi Playwright, it's Ben\\. Here's your payment link as we discussed - ${OWED_SHOWN} today, then ${RATE_SHOWN.replace(".", "\\.")}/mo from`,
        ),
      ),
    ).toBeVisible();
    await expect(page.getByText(/reserved test number/i)).toBeVisible();

    // The email, actually rendered: subject line here, body in the frame.
    await expect(page.getByText("Playwright, your payment link")).toBeVisible();
    const frame = page.frameLocator('iframe[title="Email preview"]');
    await expect(frame.getByText("Let's get you on card, Playwright.")).toBeVisible();
    await expect(frame.getByText(`${OWED_SHOWN} (outstanding balance)`)).toBeVisible();
    await expect(frame.getByText("Set up my payments")).toBeVisible();
    await noHorizontalScroll(page, "admin review");

    // Back to edit keeps everything typed.
    await page.getByRole("button", { name: /back to edit/i }).click();
    await expect(page.getByLabel("Monthly rate in pounds")).toHaveValue(RATE);
    await expect(page.getByLabel("Amount owed today in pounds")).toHaveValue(OWED);
    await page.getByRole("button", { name: /review before sending/i }).click();
    await expect(page.getByText("Check before it goes")).toBeVisible({ timeout: 30_000 });

    /* ── send ─────────────────────────────────────────────────────────── */
    await page.getByRole("button", { name: /^send to playwright$/i }).click();
    await expect(page.getByText("Sent to Playwright")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/no text was attempted|text not sent/i)).toBeVisible();

    const link = await page.locator("p.font-mono.break-all").first().innerText();
    expect(link, "no invite link came back").toMatch(/\/o\/[a-z0-9.]+/i);

    // The sent list shows the balance beside the rate, and offers a way back.
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(`+ ${OWED_SHOWN} owed today`).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel link/i }).first()).toBeVisible();

    /* ── now the client's phone ───────────────────────────────────────── */
    const path = new URL(link.trim()).pathname;

    await page.goto(path, { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /payments/i,
    );
    // Both money lines on the very first screen.
    await expect(
      page.getByText(`${OWED_SHOWN} today, for your outstanding balance.`, { exact: false }),
    ).toBeVisible();
    await expect(page.getByText(new RegExp(`Then ${RATE_SHOWN.replace(".", "\\.")} a month from`))).toBeVisible();
    await noHorizontalScroll(page, "onboarding welcome");

    await page.getByRole("button", { name: /continue/i }).click();

    // The sign-up screen: their details AND a way back in.
    await expect(page.getByText("Your details")).toBeVisible();
    await expect(page.getByLabel(/choose a password/i)).toBeVisible();
    await noHorizontalScroll(page, "onboarding account");
    await inputsAreThumbSized(page, "onboarding account");

    // It must not let them past without one.
    await expect(
      page.getByText(/choose a password, so you can get back/i),
    ).toBeVisible();

    /* ── the strength meter ────────────────────────────────────────────
       Advisory, not a gate: a weak password still gets through, and the
       meter says the one thing that would improve it rather than listing
       rules. What must never happen is the reverse — a client blocked at
       the moment they are about to hand over a card. */
    const pw = page.getByLabel(/choose a password/i);
    /* Wait for React to attach before driving a controlled input. The field
       itself now survives being typed into early, but a test that races
       hydration measures the network rather than the meter. */
    await page.waitForFunction(() =>
      [document, document.body].some((n) =>
        Object.keys(n).some((k) => k.startsWith("__reactContainer")),
      ),
    );
    await pw.fill("pass");
    await expect(page.getByText("Too short")).toBeVisible();
    await expect(page.getByText(/4 more characters to go/)).toBeVisible();

    await pw.fill("password");
    await expect(page.getByText("Too easy to guess")).toBeVisible();
    await expect(page.getByText(/every guessing list/i)).toBeVisible();

    await pw.fill("Playwright Client");
    // It knows their own name, which is the first thing anybody would try.
    await expect(page.getByText(/name or email/i)).toBeVisible();

    await pw.fill("copper kettle window latch");
    await expect(page.getByText("Strong")).toBeVisible();
    await expect(page.getByText("That will do nicely.")).toBeVisible();

    // Show reveals it, so nobody is fighting an autocorrect they cannot see.
    await page.getByRole("button", { name: /^show$/i }).click();
    await expect(pw).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: /^hide$/i }).click();
    await expect(pw).toHaveAttribute("type", "password");

    await pw.fill("PlaywrightPass2026");
    await page.getByRole("button", { name: /continue/i }).click();

    // The card screen: the rate, the balance, the date, and nothing invented.
    await expect(page.getByText("The rate you agreed with Ben")).toBeVisible();
    await expect(page.getByText(RATE_SHOWN, { exact: false }).first()).toBeVisible();
    await expect(
      page.getByText(`${OWED_SHOWN} today, for your outstanding balance.`, { exact: false }),
    ).toBeVisible();
    await expect(page.getByText(new RegExp(`Then ${RATE_SHOWN.replace(".", "\\.")} a month from`))).toBeVisible();
    await expect(
      page.getByRole("button", { name: /secure checkout/i }),
    ).toBeEnabled();
    await noHorizontalScroll(page, "onboarding pay");

    // And no package copy anywhere in the whole journey.
    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const leak of PACKAGE_LEAKS) {
      expect(
        body.includes(leak.toLowerCase()),
        `the pay screen mentions "${leak}", which this client never agreed to`,
      ).toBe(false);
    }
    // The stale "choose a plan first" line, on a journey with no plans.
    expect(body.includes("choose a plan")).toBe(false);

    /* ── Ben cancels it, and the link stops working ───────────────────── */
    /* Signed back in first. Walking the client's journey signs THIS browser
       in as the client — that is what makes the welcome page able to carry
       them to their account — so the admin session it started with is gone
       by now. Without this the next line loads a redirect, not the list. */
    await signInAsAdmin(page);
    await page.goto("/admin/clients");
    const row = page.locator("li", { hasText: clientEmail }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: /cancel link/i }).click();
    await row.getByRole("button", { name: /yes, cancel it/i }).click();
    /* Ben is told at once. The row itself is server-rendered, so it goes when
       the refresh lands — which under load is a second or two later, and is
       exactly why the confirmation does not wait for it. */
    await expect(row.getByText(/link cancelled/i)).toBeVisible();
    await expect(page.locator("li", { hasText: clientEmail })).toHaveCount(0, {
      timeout: 45_000,
    });

    await page.goto(path, { waitUntil: "load" });
    await expect(page.getByText(/expired|ask ben/i).first()).toBeVisible();
  });

  test("Ben rewrites the text and the email before it goes", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/clients");

    const stamp = Date.now();
    await page.getByPlaceholder("Sam Reeves").fill("Playwright Edit");
    await page.getByPlaceholder("sam@example.com").fill(`playwright+edit${stamp}@example.com`);
    await page.getByPlaceholder("07700 900123").fill(RESERVED_MOBILE);
    await page.getByLabel("Monthly rate in pounds").fill(RATE);
    await page.getByRole("button", { name: /review before sending/i }).click();
    await expect(page.getByText("Check before it goes")).toBeVisible({ timeout: 30_000 });

    /* The standard wording reads like Ben, not like an instruction. The old
       text opened "Set your card up for £137.50" — a demand, from a machine,
       to somebody doing him a favour by moving onto a card at all. */
    await expect(page.getByText(/Here's your payment link as we discussed/)).toBeVisible();
    await expect(page.getByText(/set your card up/i)).toHaveCount(0);

    /* ── the text ─────────────────────────────────────────────────────── */
    await page.getByRole("button", { name: /edit the wording/i }).first().click();
    const smsBox = page.getByLabel("Your message").first();
    await expect(smsBox).toBeVisible();
    // The link is attached and is not his to delete.
    await expect(page.getByText(/The link is added automatically on the end/)).toBeVisible();

    await smsBox.fill("Morning Sam, here's that link we talked about:");
    await expect(page.getByText(/^1 text ·/)).toBeVisible();

    // Over the line, and it says so rather than failing at send.
    await smsBox.fill("x".repeat(400));
    await expect(page.getByRole("button", { name: /use this message/i })).toBeDisabled();
    await expect(page.getByText(/Keep it under/)).toBeVisible();

    await smsBox.fill("Morning Sam, here's that link we talked about:");
    await page.getByRole("button", { name: /use this message/i }).click();

    await expect(page.getByText("your wording").first()).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByTestId("invite-review").getByText("Morning Sam, here's that link we talked about:", { exact: false }),
    ).toBeVisible();

    /* ── the email ────────────────────────────────────────────────────── */
    await page.getByRole("button", { name: /edit the wording/i }).last().click();
    const subject = page.getByLabel("Subject");
    await expect(subject).toBeVisible();
    await subject.fill("Sam, the link we talked about");
    await page.getByLabel("Your message").last().fill(
      "Here you go, as promised.\n\nAnything at all, give me a shout.",
    );
    await page.getByRole("button", { name: /use this email/i }).click();

    await expect(page.getByText("Sam, the link we talked about")).toBeVisible({ timeout: 30_000 });
    const frame = page.frameLocator('iframe[title="Email preview"]');
    /* Exact, because his opening line now appears twice on purpose: once in
       the hidden preview text an inbox shows beside the subject, and once in
       the body. That is the point of it, so the test names which one. */
    await expect(frame.getByText("Here you go, as promised.", { exact: true })).toBeVisible();
    await expect(frame.getByText("Anything at all, give me a shout.", { exact: true })).toBeVisible();
    // The parts that are not his to edit are still there.
    await expect(frame.getByText("Set up my payments")).toBeVisible();

    /* Back to the standard wording, in one press. */
    await page.getByRole("button", { name: /edit the wording/i }).last().click();
    await page.getByRole("button", { name: /back to the standard wording/i }).click();
    await expect(subject).toHaveValue("Playwright, your payment link");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();

    /* ── the wording cannot outlive the figures it names ──────────────
       Ben reviews at one rate, rewrites the message around it, then goes
       back and changes the rate. Without the guard his sentence still names
       the old number while the link charges the new one, which is the exact
       failure this whole flow exists to prevent. */
    await page.getByRole("button", { name: /back to edit/i }).click();
    await page.getByLabel("Monthly rate in pounds").fill("99");
    await expect(page.getByText(/your own wording has gone back to the standard message/i)).toBeVisible();

    await page.getByRole("button", { name: /review before sending/i }).click();
    await expect(page.getByText("Check before it goes")).toBeVisible({ timeout: 30_000 });
    /* Scoped to the panel. The "Links sent" list underneath carries rows from
       every other device project running at the same time, so a page-wide
       search for a rate matches somebody else's invite. */
    const review = page.getByTestId("invite-review");
    await expect(review.getByText("your wording")).toHaveCount(0);
    await expect(review.getByText(/Here's your payment link as we discussed/)).toBeVisible();
    await expect(review.getByText("Morning Sam, here's that link we talked about:", { exact: false })).toHaveCount(0);
    // And the standard message names the NEW rate, not the old one.
    await expect(review.getByText(/£99\/mo/)).toBeVisible();
    await expect(review.getByText(new RegExp(RATE_SHOWN.replace(".", "\\.") + "/mo"))).toHaveCount(0);

    // Nothing was sent by any of that.
    await expect(page.getByRole("button", { name: /^send to playwright$/i })).toBeVisible();
  });

  test("nothing owed: the review says so plainly and names the first payment date", async ({
    page,
  }) => {
    await signInAsAdmin(page);
    await page.goto("/admin/clients");

    const stamp = Date.now();
    await page.getByPlaceholder("Sam Reeves").fill("Playwright Plain");
    await page.getByPlaceholder("sam@example.com").fill(`playwright+plain${stamp}@example.com`);
    await page.getByLabel("Monthly rate in pounds").fill(RATE);
    await page.locator('input[type="date"]').fill(futureISO(7));

    await expect(page.getByText("Nothing today.", { exact: false })).toBeVisible();
    await expect(page.getByText(new RegExp(`Your first payment of ${RATE_SHOWN.replace(".", "\\.")} is on`))).toBeVisible();

    await page.getByRole("button", { name: /review before sending/i }).click();
    await expect(page.getByText("Check before it goes")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Nothing", { exact: true })).toBeVisible();
    await expect(page.getByText(`${RATE_SHOWN} a month`, { exact: true })).toBeVisible();
    await expect(page.getByText(/None given — no text/)).toBeVisible();
    // Nothing was created: back out without sending.
    await page.getByRole("button", { name: /back to edit/i }).click();
    await expect(page.getByRole("button", { name: /review before sending/i })).toBeVisible();
  });
});
