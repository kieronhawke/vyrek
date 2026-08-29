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

test.describe("moving a booking", () => {
  const REF = "SP-MOVE01";
  /* Far enough ahead that it is always in a future month and never clashes
     with "today" styling. The picker only offers days the server says are
     open, so the fixture only has to be internally consistent. */
  const CURRENT = new Date(Date.UTC(2026, 10, 3, 10, 0)).toISOString();

  async function mockManage(page: Page, onPost?: (body: unknown) => void) {
    await page.route(`**/api/booking/${REF}`, async (route) => {
      if (route.request().method() === "POST") {
        onPost?.(JSON.parse(route.request().postData() ?? "{}"));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          booking: { ref: REF, name: "Robust Tester", startISO: CURRENT, status: "confirmed" },
        }),
      });
    });
  }

  test("choosing a new time does not move the booking on its own", async ({
    page,
  }) => {
    /* The reported behaviour, and the most damaging version of it: this
       screen overwrites a time somebody has already arranged their day
       around and texts them to say so. A tap must not be able to do that. */
    let posts = 0;
    await mockManage(page, () => posts++);
    await page.goto(`/book/manage/${REF}`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /move|reschedul|change/i }).first().click();
    await pickFirstDayAndTime(page);

    await expect(
      page.getByRole("button", { name: /confirm the new time/i }),
    ).toBeVisible({ timeout: 10_000 });
    expect(posts, "picking a time moved the booking").toBe(0);
  });

  test("confirming sends the move, and the old time is named first", async ({
    page,
  }) => {
    let sent: Record<string, unknown> | null = null;
    await mockManage(page, (b) => { sent = b as Record<string, unknown>; });
    await page.goto(`/book/manage/${REF}`, { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: /move|reschedul|change/i }).first().click();
    await pickFirstDayAndTime(page);

    // Naming what it replaces is the point of the step — otherwise the panel
    // is a confirm button with no information on it.
    await expect(page.getByText(/moving from/i)).toBeVisible();

    await page.getByRole("button", { name: /confirm the new time/i }).click();
    await page.waitForTimeout(800);

    expect(sent).toBeTruthy();
    const body = sent as unknown as Record<string, string>;
    expect(body.action).toBe("reschedule");
    expect(body.startISO).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(body.startISO).not.toBe(CURRENT);
  });
});

test.describe("things that go wrong", () => {
  test("a slot taken while you were typing sends you back to the grid", async ({
    page,
  }) => {
    /* Two people can want the same time. The server refuses the second with
       TAKEN, and the screen must not leave a confirm button sitting under an
       error above a time that no longer exists. */
    await page.route("**/api/booking", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "TAKEN",
          error: "Somebody just took that time.",
        }),
      });
    });
    await page.goto("/book", { waitUntil: "domcontentloaded" });
    await pickFirstDayAndTime(page);

    const form = page.locator("form");
    await form.getByLabel(/your name/i).fill("Robust Tester");
    await form.getByLabel(/email/i).fill("robust@example.com");
    await form.getByLabel(/mobile/i).fill("07700900123");
    await page.getByRole("button", { name: /confirm my call/i }).click();

    await expect(page.getByRole("alert").filter({ hasText: /took that time/i }))
      .toBeVisible({ timeout: 10_000 });
    // Back to choosing, not stranded on a dead time.
    await expect(
      page.getByRole("heading", { name: /where should ben call you/i }),
    ).toHaveCount(0);
    await expect(
      page.locator('[aria-label^="Choose a day"] button:not([disabled])').first(),
    ).toBeVisible();
  });

  test("the calendar is a handful of tab stops from the top", async ({
    page,
  }) => {
    /* THIS TEST WAS WRONG BEFORE IT WAS RIGHT, AND THE WRONG VERSION LOOKED
       LIKE A SERIOUS BUG.

       It tabbed from page load and reported that a bookable day took 177
       presses to reach — which reads as "the primary action on the booking
       page is unreachable". It is not. The days are `disabled` until the
       availability fetch resolves, and disabled buttons are skipped, so an
       early Tab run walks straight past the calendar into a 74-link footer
       and wraps around.

       Waiting for a bookable day first is the whole fix, and what it shows
       is fine: the calendar sits immediately after the header. The assertion
       is on position in the focus order rather than on Tab presses, because
       that is the thing that would actually regress if somebody added a
       banner or a toolbar above the page. */
    await page.goto("/book", { waitUntil: "domcontentloaded" });
    await expect(page.locator(DAY).first()).toBeVisible({ timeout: 20_000 });

    const position = await page.evaluate(() => {
      const sel =
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
      const all = [...document.querySelectorAll(sel)];
      const first = document.querySelector(
        '[aria-label^="Choose a day"] button:not([disabled])',
      );
      return first ? all.indexOf(first) : -1;
    });

    expect(position, "no bookable day in the focus order").toBeGreaterThan(-1);
    expect(
      position,
      "the calendar has drifted a long way down the tab order",
    ).toBeLessThan(30);

    // And it can actually be operated from the keyboard once focused.
    await page.locator(DAY).first().focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("button", { name: /\d{1,2}[:.]\d{2}/ }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
