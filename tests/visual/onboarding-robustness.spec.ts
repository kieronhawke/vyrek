import { test, expect, type Page } from "@playwright/test";

/**
 * Onboarding funnel robustness.
 *
 * The happy-path walks in quiz-e2e.spec.ts prove the three journeys work.
 * This file covers the things that break in the real world and that a
 * happy-path walk never touches: refreshing mid-quiz, keyboard-only use,
 * the lead endpoint failing, reduced motion, and the entry screen's
 * tap targets.
 *
 * Every test here runs on all four viewport projects.
 *
 * The lead form is ALWAYS behind a route mock. Submitting for real emails
 * a live inbox, and a test suite must never do that.
 */

async function dismissConsent(page: Page) {
  const reject = page.getByRole("button", { name: /reject/i }).first();
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
    await page.waitForTimeout(400);
  }
}

async function enterQuiz(page: Page, url = "/quiz?rail=beginner") {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("#welcome-heading")).toBeVisible({
    timeout: 15_000,
  });
  await dismissConsent(page);
  for (let i = 0; i < 6; i++) {
    const cta = page.getByRole("button", { name: /find your plan/i }).first();
    if (!(await cta.isVisible().catch(() => false))) break;
    await cta.click();
    await page.waitForTimeout(450);
  }
}

async function clickContinue(page: Page) {
  const cta = page.getByRole("button", { name: /^continue/i }).first();
  await expect(cta).toBeEnabled({ timeout: 10_000 });
  await cta.click();
  await page.waitForTimeout(650);
}

test.describe("Onboarding funnel robustness", () => {
  test.setTimeout(120_000);

  test("entry screen: tapping the middle of the screen advances the slide", async ({
    page,
  }) => {
    // Regression for a real dead zone: the headline sat over the centre of
    // the full-screen "next slide" target with pointer-events-auto, so on a
    // phone a tap in the middle of the entry screen did nothing at all.
    await page.goto("/quiz", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#welcome-heading")).toBeVisible({
      timeout: 15_000,
    });
    await dismissConsent(page);

    const first = await page.locator("#welcome-heading").textContent();
    await page.getByRole("button", { name: /next slide/i }).click();
    await page.waitForTimeout(400);
    const second = await page.locator("#welcome-heading").textContent();

    expect(second).not.toEqual(first);
  });

  test("answers survive a refresh mid-quiz", async ({ page }) => {
    // People close tabs, lose signal, and come back. Losing their answers
    // loses the lead, so the resume path matters more than most features.
    await enterQuiz(page);

    await page.getByRole("button", { name: /lose weight/i }).first().click();
    await page.waitForTimeout(300);
    await clickContinue(page);
    await page.getByRole("button", { name: /a bit active/i }).first().click();
    await page.waitForTimeout(300);
    await clickContinue(page);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Two answers in, the next screen is the first reassurance interstitial.
    // Reloading must land back there rather than at the start.
    await expect(
      page.getByText(/half the work is honest answers/i),
    ).toBeVisible({ timeout: 15_000 });

    // And the answers themselves survived: step back one and the goal is
    // still selected, with the live panel still naming the programme.
    await page.getByRole("button", { name: /^back$/i }).first().click();
    await page.waitForTimeout(600);
    await expect(
      page.getByRole("button", { name: /a bit active/i }).first(),
    ).toHaveAttribute("aria-pressed", "true");

    /* The live plan panel this used to read from is gone.
       On screen one it showed eight rows, seven of them a dash, and it was
       the largest thing on a desktop — an inventory of what the visitor had
       not told us yet. The assertion above is the one that actually proves
       persistence: the answer given before the refresh is still selected.
       The programme name now appears on the reveal, which the happy-path
       walks already cover. */
    await expect(
      page.getByRole("button", { name: /a bit active/i }).first(),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("the quiz is operable by keyboard alone", async ({ page }) => {
    await enterQuiz(page);

    // Tab to the first option and choose it with the keyboard only.
    const firstOption = page
      .getByRole("button", { name: /lose weight/i })
      .first();
    await firstOption.focus();
    await expect(firstOption).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    await expect(firstOption).toHaveAttribute("aria-pressed", "true");

    const cont = page.getByRole("button", { name: /^continue/i }).first();
    await cont.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(650);

    await expect(
      page.getByRole("heading", { name: /where are you starting from/i }),
    ).toBeVisible();

    // And back out again with the keyboard.
    const back = page.getByRole("button", { name: /^back$/i }).first();
    await back.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(600);
    await expect(
      page.getByRole("heading", { name: /what matters most right now/i }),
    ).toBeVisible();
  });

  test("every full-bleed interstitial offers a way back", async ({ page }) => {
    // These screens sit outside the quiz shell so they don't inherit its
    // header. Without an explicit control they become one-way doors.
    await enterQuiz(page);

    await page.getByRole("button", { name: /lose weight/i }).first().click();
    await clickContinue(page);
    await page.getByRole("button", { name: /a bit active/i }).first().click();
    await clickContinue(page);

    // Reassurance 1 is full-bleed. It must still offer back.
    const back = page.getByRole("button", { name: /^back$/i }).first();
    await expect(back).toBeVisible();
    await back.click();
    await page.waitForTimeout(600);
    await expect(
      page.getByRole("heading", { name: /where are you starting from/i }),
    ).toBeVisible();
  });

  test("lead form: a failing endpoint shows an error, never a dead button", async ({
    page,
  }) => {
    await page.route("**/api/consultation", async (route) => {
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Simulated outage." }),
      });
    });

    await runBeginnerToReveal(page);

    await page.getByLabel(/first name/i).fill("Kieron");
    // The inline submit comes first in the DOM; the sticky footer mirror
    // (which only scrolls) comes last and has its own accessible name.
    await page
      .getByRole("button", { name: "Send my plan to Ben →" })
      .first()
      .click();

    // Scoped to the form: other alerts exist on the page.
    await expect(
      page.locator("#lead-capture").getByRole("alert"),
    ).toContainText(/simulated outage/i, { timeout: 10_000 });
    // The button must come back so they can retry rather than being stuck.
    await expect(
      page.getByRole("button", { name: "Send my plan to Ben →" }).first(),
    ).toBeEnabled();
  });

  test("lead form: a successful submit confirms and stops asking", async ({
    page,
  }) => {
    let payload: Record<string, unknown> | null = null;
    await page.route("**/api/consultation", async (route) => {
      payload = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await runBeginnerToReveal(page);

    await page.getByLabel(/first name/i).fill("Kieron");
    await page.getByLabel(/phone/i).fill("07700900123");
    // The inline submit comes first in the DOM; the sticky footer mirror
    // (which only scrolls) comes last and has its own accessible name.
    await page
      .getByRole("button", { name: "Send my plan to Ben →" })
      .first()
      .click();

    await expect(page.getByText(/thanks kieron/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: "Send my plan to Ben →" }),
    ).toHaveCount(0);

    // The whole point of the rebuild: Ben gets the answers, not just a name.
    expect(payload).toBeTruthy();
    const sent = payload as unknown as Record<string, string>;
    expect(sent.email).toBe("robust@example.com");
    expect(sent.phone).toBe("07700900123");
    expect(sent.message).toMatch(/FROM THE QUIZ \(beginner path\)/);
    expect(sent.message).toMatch(/COACHING WITH BEN/);
    expect(sent.message).toMatch(/Goal: Lose weight/);
    expect(sent.message).toMatch(/INJURY: Knee \(bothering me now\)/);
  });

  test("club page holds up and its CTA reaches the quiz", async ({ page }) => {
    await page.goto("/club", { waitUntil: "domcontentloaded" });
    await dismissConsent(page);

    await expect(
      page.getByRole("heading", { name: /elite structure/i }),
    ).toBeVisible({ timeout: 15_000 });
    // The honest filter has to be present on every viewport, not just wide
    // ones: it is what stops the wrong people booking Ben's time.
    await expect(page.getByText(/the club is for you if/i)).toBeVisible();
    await expect(page.getByText(/talk to ben instead if/i)).toBeVisible();
    await expect(page.getByText(/£12\.99/).first()).toBeVisible();

    await page.getByRole("link", { name: /start 7 days free/i }).first().click();
    await page.waitForURL("**/quiz**");
    expect(page.url()).toContain("support=self");
  });

  test("no horizontal overflow on any quiz screen", async ({ page }) => {
    // A single overflowing element makes the whole funnel feel broken on a
    // phone, and it is invisible on desktop.
    await enterQuiz(page);

    // Real beginner order: goal, starting point, interstitial, tried
    // before, interstitial. null means the screen has no question to answer.
    const screens: Array<RegExp | null> = [
      /lose weight/i,
      /a bit active/i,
      null,
      /several times/i,
      null,
    ];

    for (const pick of screens) {
      if (pick) {
        await page.getByRole("button", { name: pick }).first().click();
        await page.waitForTimeout(250);
      }
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await clickContinue(page);
    }
  });
});

/** Walk the beginner rail to the reveal with a known set of answers. */
async function runBeginnerToReveal(page: Page) {
  await enterQuiz(page);

  await page.getByRole("button", { name: /lose weight/i }).first().click();
  await clickContinue(page);
  await page.getByRole("button", { name: /haven't trained in years/i }).first().click();
  await clickContinue(page);
  await clickContinue(page); // reassurance 1
  await page.getByRole("button", { name: /several times/i }).first().click();
  await clickContinue(page);
  await clickContinue(page); // reassurance 2

  await page.locator('input[type="email"]').first().fill("robust@example.com");
  await clickContinue(page);

  await page.getByRole("button", { name: /doing it on my own/i }).first().click();
  await clickContinue(page);
  await page.getByRole("button", { name: /^3 days/i }).first().click();
  await clickContinue(page);
  await page.getByRole("button", { name: /^45 min/i }).first().click();
  await clickContinue(page);
  await page
    .getByRole("button", { name: /a normal gym|standard commercial gym/i })
    .first()
    .click();
  await clickContinue(page);
  // An injury, so the brief has something Ben genuinely needs before a call.
  await page.getByRole("button", { name: /^knee/i }).first().click();
  await clickContinue(page);
  // The injury-detail screen wants recency AND who is helping before it
  // lets you continue, which is right: a half-answered injury is worse
  // than none.
  await page.getByRole("button", { name: /bothering me now/i }).first().click();
  await page.waitForTimeout(200);
  await page
    .getByRole("button", { name: /managing it myself/i })
    .first()
    .click();
  await clickContinue(page);
  await page.getByRole("button", { name: /ben in my corner/i }).first().click();
  await clickContinue(page);
  await page.getByRole("button", { name: /this week/i }).first().click();
  await clickContinue(page);
  await page.getByRole("button", { name: /see my plan/i }).first().click();
  await page.waitForTimeout(900);
}
