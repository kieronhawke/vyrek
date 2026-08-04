import { test, expect, type Page } from "@playwright/test";

/**
 * Quiz end-to-end walk. Runs as a real user from the welcome carousel
 * through every question screen to the account-creation gate.
 *
 * The account-creation API requires Supabase auth + the 0002/0003
 * migrations to be applied. Without them, the test stops at the gate
 * (which is still a useful smoke test because all 13+ UI screens are
 * exercised).
 */

async function tapWelcomeCarouselThrough(page: Page, url = "/quiz") {
  // The carousel has multiple slides; tap "Find your plan" on the last
  // slide. Each slide auto-advances after a few seconds, but tapping the
  // primary CTA on every slide simply advances to the next one until the
  // final slide, then routes into the question flow.
  await page.goto(url, { waitUntil: "networkidle" });

  // Wait for the welcome carousel headline to render
  await expect(page.locator("#welcome-heading")).toBeVisible();

  // The "Find your plan" CTA is the safe way to advance through every
  // slide. Click it up to 6 times (carousel is 4 slides).
  for (let i = 0; i < 6; i++) {
    const cta = page.getByRole("button", { name: /find your plan/i }).first();
    const stillOnCarousel = await cta.isVisible().catch(() => false);
    if (!stillOnCarousel) break;
    await cta.click();
    await page.waitForTimeout(450);
  }
}

async function pickSingle(page: Page, label: RegExp | string) {
  // Quiz V3 option cards have role="button" with the option label as text.
  const card = page.getByRole("button", { name: label }).first();
  await expect(card).toBeVisible({ timeout: 12_000 });
  await card.click();
  await page.waitForTimeout(300);
}

/** The Meet Ben interstitial, which uses its own CTA label. */
async function clickSeeMyPlan(page: Page) {
  const cta = page.getByRole("button", { name: /see my plan/i }).first();
  await expect(cta).toBeVisible({ timeout: 10_000 });
  await cta.click();
  await page.waitForTimeout(700);
}

/**
 * Press back until a given heading is on screen. Counting individual back
 * presses is brittle now that screens appear and disappear based on the
 * sift, so we navigate by destination instead.
 */
async function backUntil(page: Page, heading: RegExp, max = 6) {
  for (let i = 0; i < max; i++) {
    if (await page.getByRole("heading", { name: heading }).isVisible().catch(() => false)) {
      return;
    }
    await page.getByRole("button", { name: /^back$/i }).first().click();
    await page.waitForTimeout(450);
  }
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

async function clickContinue(page: Page) {
  // Continue button is rendered by the quiz shell footer.
  const cta = page.getByRole("button", { name: /^continue/i }).first();
  await expect(cta).toBeVisible({ timeout: 10_000 });
  await expect(cta).toBeEnabled({ timeout: 5_000 });
  await cta.click();
  // Screen transition has a slide + fade animation; wait it out so the
  // next screen's queries don't race the previous screen's leftovers.
  await page.waitForTimeout(700);
}

test.describe("Quiz V3, happy path UI walk", () => {
  test.setTimeout(120_000);

  test("walks all visible screens to the account creation gate", async ({
    page,
  }, testInfo) => {
    // Runs on every viewport project. The funnel is mobile-first in the
    // real world, so a desktop-only walk was testing the minority case.
    void testInfo;

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore the expected /api/account/create 400 console error, we
        // probe that explicitly later and the test won't reach the real
        // submission until Supabase migrations are applied.
        if (text.includes("/api/account/create")) return;
        errors.push(`console.error: ${text}`);
      }
    });

    await tapWelcomeCarouselThrough(page);

    // === Screen 2: Primary intent (multi-select + Continue) ===
    // Screen one was relabelled when it became the rail chooser.
    await pickSingle(page, /my first HYROX race/i);
    await clickContinue(page);

    // === Screen 3: Reassurance 1 ===
    await clickContinue(page);

    // === Screen 4: Experience ===
    await pickSingle(page, "Never raced");
    await clickContinue(page);

    // === Screen 5: Best time, SKIPPED because experience = "never raced" ===

    // === Screen 6: Race date, pick the "No race yet" skip ===
    {
      const skip = page.getByRole("button", { name: /no race yet/i }).first();
      await expect(skip).toBeVisible({ timeout: 8000 });
      await skip.click();
      await page.waitForTimeout(700);
    }

    // === Screen 7: Reassurance 2 ===
    await clickContinue(page);

    // === Screen 8: Mid-flow email capture ===
    // Continue must stay disabled until the address is valid, so the
    // abandonment sequence never gets a junk address.
    {
      const email = page.locator('input[type="email"]').first();
      await expect(email).toBeVisible({ timeout: 8000 });
      await email.fill("not-an-email");
      await expect(
        page.getByRole("button", { name: /^continue/i }).first(),
      ).toBeDisabled();
      await email.fill("walk-test@example.com");
      await clickContinue(page);
    }

    // === Screen 9: Activity baseline ===
    await pickSingle(page, /training 3-4 days/i);
    await clickContinue(page);

    // === Screen 9: Calibration (sex + weight) ===
    await pickSingle(page, /men.s open standards/i);
    const weight = page.locator('input[type="number"]').first();
    await weight.fill("78");
    await clickContinue(page);

    // === Screen 10: Frequency ===
    await pickSingle(page, /^4 days\b/i);
    await clickContinue(page);

    // === Screen 11: Session length ===
    await pickSingle(page, /^60 min\b/i);
    await clickContinue(page);

    // === Screen 12: Location ===
    await pickSingle(page, /a normal gym|standard commercial gym/i);
    await clickContinue(page);

    // Equipment screen only shows if location = home; skipped here.

    // Partner screen is permanently skipped (showIf: () => false); primary
    // intent already captures Doubles.

    // === Screen 14: Injuries ===
    await pickSingle(page, /no injuries/i);
    await clickContinue(page);

    // === Screen 15: The sift ===
    await pickSingle(page, /coached by ben/i);
    await clickContinue(page);

    // === Screen 16: Readiness, shown only on the coached branch ===
    await expect(
      page.getByRole("heading", { name: /when could you realistically start/i }),
    ).toBeVisible({ timeout: 8000 });
    await pickSingle(page, /sometime this month/i);
    await clickContinue(page);

    // === Screen 17: Meet Ben, with the athlete's credentials ===
    await expect(
      page.getByRole("heading", { name: /ben sutherland/i }),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/2 world records/i)).toBeVisible();
    await clickSeeMyPlan(page);

    // === Screen 18: Plan summary, routed by the sift ===
    // An explicit "coached" answer must land on the lead form, not the
    // club, and must not offer the other option.
    await expect(
      page.getByRole("button", { name: /send my plan to ben/i }).first(),
    ).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByRole("link", { name: /start 7 days free/i }),
    ).toHaveCount(0);

    // The sticky footer must not compete with the lead form. On a phone it
    // is the only CTA in view, so if it said "Save my plan" it would walk
    // people straight past the thing we actually want them to do.
    await expect(
      page.getByRole("button", { name: /save my plan/i }),
    ).toHaveCount(0);

    // Flip the sift the other way. Self-serve must route to the club trial,
    // promise that nobody rings them, AND drop the readiness screen, since
    // that question only exists to tell Ben how warm the lead is. Doubles as
    // cover for the back-navigation hard rule.
    {
      await backUntil(page, /how do you want to work/i);
      await pickSingle(page, /give me the programme/i);
      await clickContinue(page);

      // Readiness is skipped on this branch, so Meet Ben comes next.
      await clickSeeMyPlan(page);

      await expect(
        page.getByRole("link", { name: /start 7 days free/i }),
      ).toBeVisible({ timeout: 8000 });
      await expect(page.getByText(/nobody will call you/i)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /send my plan to ben/i }),
      ).toHaveCount(0);

      // Stay on the self-serve route to finish the walk. On the coached
      // route the sticky button deliberately scrolls to the lead form
      // rather than advancing, so the account gate is only reachable this
      // way, which is the intended behaviour rather than a limitation.
    }

    {
      const save = page.getByRole("button", { name: /save my plan/i }).first();
      await expect(save).toBeVisible({ timeout: 8000 });
      await save.click();
      await page.waitForTimeout(400);
    }

    // === Screen 17: Account creation (email + password) ===
    await expect(
      page.getByRole("heading", { name: /save your plan|create your account/i }),
    ).toBeVisible();

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // We've walked every visible screen. No console errors thrown along
    // the way (auth-related errors are filtered above).
    expect(errors).toEqual([]);
  });

  test("club entry skips the sift and lands on the trial", async ({
    page,
  }) => {
    // Someone arriving from the Suth Club CTA has already answered the
    // sift by clicking it. Asking again would be the funnel arguing with
    // the user, and the club route must not dead-end.
    await tapWelcomeCarouselThrough(page, "/quiz?rail=beginner&support=self");

    await pickSingle(page, /lose weight/i);
    await clickContinue(page);
    await pickSingle(page, /a bit active/i);
    await clickContinue(page);
    await clickContinue(page); // reassurance 1
    await pickSingle(page, /once or twice/i);
    await clickContinue(page);
    await clickContinue(page); // reassurance 2

    {
      const email = page.locator('input[type="email"]').first();
      await expect(email).toBeVisible({ timeout: 8000 });
      await email.fill("club-walk@example.com");
      await clickContinue(page);
    }

    await clickContinue(page); // barriers, none selected
    await pickSingle(page, /^2 days/i);
    await clickContinue(page);
    await pickSingle(page, /^30 min/i);
    await clickContinue(page);
    // "At home" on the beginner rail, "Home setup" on the athlete one.
    await pickSingle(page, /^at home|home setup/i);
    await clickContinue(page);
    // Home training opens the equipment screen, which does require an
    // answer: "Bodyweight only" is the honest floor rather than an empty
    // selection we'd have to guess at.
    // The beginner kit list says "Nothing yet" rather than "Bodyweight only",
    // and offers no sled, ski erg or wall ball.
    await pickSingle(page, /nothing yet|bodyweight only/i);
    await clickContinue(page);
    await pickSingle(page, /no injuries/i);
    await clickContinue(page);

    // Straight to Meet Ben: no sift, and no readiness either.
    await clickSeeMyPlan(page);

    const trial = page.getByRole("link", { name: /start 7 days free/i });
    await expect(trial).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/nobody will call you/i)).toBeVisible();

    // And the destination is a real page, not the 404 it used to be.
    await trial.click();
    await expect(
      page.getByRole("heading", { name: /elite structure/i }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/7 days free\. no card needed/i).first()).toBeVisible();
  });

  test("beginner rail never asks a beginner about racing", async ({
    page,
  }, testInfo) => {
    // Runs on every viewport project. The funnel is mobile-first in the
    // real world, so a desktop-only walk was testing the minority case.
    void testInfo;

    await tapWelcomeCarouselThrough(page, "/quiz?rail=beginner");

    // The rail is pre-set by the entry surface, so screen one is the goal
    // question, not "what brings you here".
    await expect(
      page.getByRole("heading", { name: /what matters most right now/i }),
    ).toBeVisible({ timeout: 12_000 });

    await pickSingle(page, /lose weight/i);
    await clickContinue(page);

    await pickSingle(page, /haven't trained in years/i);
    await clickContinue(page);

    // Reassurance 1
    await clickContinue(page);

    await pickSingle(page, /several times/i);
    await clickContinue(page);

    // Reassurance 2. The HYROX experience, best-time, race-date and
    // calibration screens must all have been skipped by now.
    await clickContinue(page);

    {
      const email = page.locator('input[type="email"]').first();
      await expect(email).toBeVisible({ timeout: 8000 });
      await email.fill("beginner-walk@example.com");
      await clickContinue(page);
    }

    // Barriers: multi-select, and it must not auto-advance.
    await pickSingle(page, /doing it on my own/i);
    await expect(
      page.getByRole("heading", { name: /what's got in the way/i }),
    ).toBeVisible();
    await clickContinue(page);

    await pickSingle(page, /^3 days/i);
    await clickContinue(page);
    await pickSingle(page, /^45 min/i);
    await clickContinue(page);
    await pickSingle(page, /a normal gym|standard commercial gym/i);
    await clickContinue(page);
    await pickSingle(page, /no injuries/i);
    await clickContinue(page);

    // The sift, in beginner wording rather than the athlete's.
    await expect(
      page.getByRole("heading", { name: /how do you want to train/i }),
    ).toBeVisible();
    await pickSingle(page, /ben in my corner/i);
    await clickContinue(page);

    // Readiness is coached-only and must appear on this branch.
    await pickSingle(page, /this week/i);
    await clickContinue(page);

    // Meet Ben, in the beginner framing: he coaches beginners, and the
    // record does NOT lead. A wall of world records here makes someone who
    // hasn't trained in years feel further away, not closer.
    await expect(
      page.getByRole("heading", { name: /ben sutherland/i }),
    ).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/coaches total beginners/i)).toBeVisible();
    await expect(page.getByText(/2 world records/i)).toHaveCount(0);
    await clickSeeMyPlan(page);

    // Reveal routes to the lead form, and the recommendation is not shown
    // because the user chose outright.
    // Two buttons carry this label by design: the sticky footer mirrors the
    // inline form and scrolls to it.
    await expect(
      page.getByRole("button", { name: /send my plan to ben/i }).first(),
    ).toBeVisible({ timeout: 8000 });

    // The whole point of the rail: nothing HYROX reached a beginner, on the
    // questions OR on the reveal. The reveal is the easy one to get wrong,
    // because the programme name and the benefit copy both default to the
    // race-facing versions.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/have you raced/i);
    expect(body).not.toMatch(/first race/i);
    expect(body).not.toMatch(/wall ball|sled|farmers carry/i);
    expect(body).not.toMatch(/start line|race-ready|weeks to your race/i);

    // And it is framed around the twelve weeks instead. The block length is
    // measured start to finish, not from today, or a 12-week plan starting
    // next week reads as 13.
    await expect(page.getByText(/twelve weeks, starting/i)).toBeVisible();
    await expect(page.getByText(/12 weeks of training/i)).toBeVisible();
  });
});
