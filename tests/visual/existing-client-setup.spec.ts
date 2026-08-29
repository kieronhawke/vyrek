import { test, expect, type Page } from "@playwright/test";

/**
 * SETTING UP AN EXISTING CLIENT, END TO END, ON A PHONE.
 *
 * Ben does this on his phone between sessions and the client opens the link on
 * theirs. So the whole journey is walked at phone width: type five fields,
 * send, follow the link, give details, and land on the card screen.
 *
 * WHAT IT IS REALLY GUARDING. Three things that were wrong before and would be
 * invisible to a type checker:
 *
 *   1. A PACKAGE THE CLIENT NEVER AGREED TO. The plan menu is gone and the
 *      feature bullets under the price are gone. If either comes back, a
 *      bespoke client is shown "1:1 Coaching" and five promises nobody made
 *      them, on the screen where they hand over a card.
 *   2. THE FIRST-PAYMENT DATE. It must appear, in words, on every screen that
 *      mentions money — and must never be replaced by "collects today".
 *   3. iOS ZOOM. An input under 16px makes Safari zoom the page on focus. It
 *      is the difference between a form that feels like an app and one that
 *      feels broken, and it is one CSS class away at all times.
 *
 * It needs a real admin login. Without ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD
 * it skips rather than failing, because a missing credential is a missing
 * credential and not a broken product.
 */

const EMAIL = process.env.ADMIN_TEST_EMAIL;
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;

/** A rate and a date nobody would pick by accident, so a stray match is obvious. */
const RATE = "137.50";
const RATE_SHOWN = "£137.50";

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

test.describe("Ben sets up an existing client", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "needs ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD",
  );

  test("five fields, no package menu, and the link carries the rate and the date", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(EMAIL!);
    await page.getByLabel("Password").fill(PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/admin(?!\/login)/, { timeout: 20_000 });

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
    await page.getByLabel("Monthly rate in pounds").fill(RATE);
    await page.locator('input[type="date"]').fill(startISO);

    // Ben sees what he is about to send before he sends it.
    await expect(page.getByText(`${RATE_SHOWN} a month`, { exact: false })).toBeVisible();
    await expect(page.getByText(/first payment on/i)).toBeVisible();

    await page.getByRole("button", { name: /send the link/i }).click();
    await expect(page.getByText("Link created")).toBeVisible({ timeout: 30_000 });

    const link = await page.locator("p.font-mono.break-all").first().innerText();
    expect(link, "no invite link came back").toMatch(/\/o\/[a-z0-9.]+/i);

    /* ── now the client's phone ───────────────────────────────────────── */
    const path = new URL(link.trim()).pathname;

    /* Sending calls router.refresh() so the "links sent" list below picks up
       the new row. That refresh is still in flight here, and navigating into
       it aborts the goto — so let it land first. */
    await page.waitForLoadState("networkidle");

    await page.goto(path, { waitUntil: "load" });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /payments/i,
    );
    // The figure and the date, on the very first screen.
    await expect(page.getByText(RATE_SHOWN, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/first payment is on/i)).toBeVisible();
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

    await page.getByLabel(/choose a password/i).fill("PlaywrightPass2026");
    await page.getByRole("button", { name: /continue/i }).click();

    // The card screen: the rate, the date, and nothing invented.
    await expect(page.getByText("The rate you agreed with Ben")).toBeVisible();
    await expect(page.getByText(RATE_SHOWN, { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/first payment is on/i)).toBeVisible();
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
  });
});
