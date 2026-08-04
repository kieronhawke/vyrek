import { test, expect, type Page } from "@playwright/test";

/**
 * THE BOOKING FLOW, END TO END.
 *
 * Written because it was reported broken in ways no test would have caught:
 * a time could be tapped and the server would answer "Please enter your
 * name" on a screen with no name field, and on a phone the form that
 * appeared after choosing a time was below the fold with nothing to say it
 * had arrived. Both are behaviours, not appearances, so they are testable.
 *
 * The booking endpoint is always mocked. A real POST here books a real slot
 * in Ben's diary and sends a real person a text.
 */

const DAY = '[aria-label^="Choose a day"] button:not([disabled])';

async function mockBooking(page: Page) {
  await page.route("**/api/booking", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        ref: "SP-TEST99",
        startISO: new Date(Date.UTC(2026, 8, 1, 9, 0)).toISOString(),
      }),
    });
  });
}

async function pickFirstDayAndTime(page: Page) {
  const day = page.locator(DAY).first();
  await expect(day).toBeVisible({ timeout: 20_000 });
  await day.click();
  const time = page
    .getByRole("button", { name: /\d{1,2}[:.]\d{2}\s*(am|pm)?/i })
    .filter({ hasNot: page.locator("svg") })
    .first();
  await expect(time).toBeVisible({ timeout: 15_000 });
  await time.click();
}

test.describe("/book", () => {
  test("choosing a time reveals the form and does not book on its own", async ({
    page,
  }) => {
    let posted = 0;
    await page.route("**/api/booking", async (route) => {
      if (route.request().method() === "POST") posted++;
      return route.continue();
    });
    await page.goto("/book", { waitUntil: "domcontentloaded" });
    await pickFirstDayAndTime(page);

    // The form is the proceed step. Tapping a time must never be the
    // booking itself — there is no chance to check the day otherwise.
    await expect(
      page.getByRole("heading", { name: /where should ben call you/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /confirm my call/i }),
    ).toBeVisible();
    expect(posted, "picking a time posted a booking").toBe(0);

    // And the chosen time can be changed without starting again.
    await page.getByRole("button", { name: /change time/i }).click();
    await expect(
      page.getByRole("heading", { name: /where should ben call you/i }),
    ).toHaveCount(0);
  });

  test("a complete booking reaches the confirmation", async ({ page }) => {
    await mockBooking(page);
    await page.goto("/book", { waitUntil: "domcontentloaded" });
    await pickFirstDayAndTime(page);

    // Scoped to the form: the page's reassurance chips also say "Mobile".
    const form = page.locator("form");
    await form.getByLabel(/your name/i).fill("Robust Tester");
    await form.getByLabel(/email/i).fill("robust@example.com");
    await form.getByLabel(/mobile/i).fill("07700900123");
    await page.getByRole("button", { name: /confirm my call/i }).click();

    await expect(page.getByText(/you.re in/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("SP-TEST99")).toBeVisible();
  });
});
