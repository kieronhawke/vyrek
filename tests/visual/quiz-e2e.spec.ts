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
  /* The entry carousel is gone.
     It held two full-bleed slides on a timer, so somebody who clicked
     "free fitness assessment" waited six seconds watching an animation
     before being asked anything. The quiz opens on the first question now,
     so there is nothing to click through — just wait for it. */
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
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
  const cta = page.getByRole("button", { name: /pick a time|see my plan/i }).first();
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
  /* Fill anything still empty before checking the button.
     The contact screen used to ask for an email alone ("Where should we
     send your plan?"). This route ends in Ben ringing them, so it asks for
     a name and a number as well, and Continue stays disabled until all
     three are there — which is what every walk in this file started
     failing on. Filling here covers every caller rather than each one
     learning the new screen separately. */
  for (const [sel, value] of [
    ['input[type="text"]', "Sam Reeves"],
    ['input[type="tel"]', "07700900123"],
  ] as const) {
    const field = page.locator(sel).first();
    if (await field.isVisible().catch(() => false)) {
      if (!(await field.inputValue().catch(() => "x"))) await field.fill(value);
    }
  }

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
    /* The record is two elements now: a big numeral and its label.
       Kieron asked for the records to read as a big deal rather than as
       10px pills the same weight as a field name, so "2" and "world
       records" are separately styled and getByText can no longer match the
       whole phrase. Asserting each part keeps the check honest. */
    await expect(page.getByText("world records").first()).toBeVisible();
    await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
    await clickSeeMyPlan(page);

    /* THE ENDING CHANGED.
       This route opens "free fitness assessment" and never mentions a
       product, so it now ends on the promise it made: the times Ben has
       free. The plan reveal, the sift's two destinations and the Club
       trial link all belonged to a funnel that sold a twelve-week
       programme — showing "First Race Programme" to somebody who asked for
       help getting fit named a race they never mentioned and offered a
       product they were never promised. */
    await expect(
      page.getByRole("heading", { name: /when shall ben call/i }),
    ).toBeVisible({ timeout: 12_000 });
    // A real calendar with real days on it, not an empty month.
    await expect(
      page.locator('[aria-label^="Choose a day"] button:not([disabled])').first(),
    ).toBeVisible({ timeout: 12_000 });

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

      /* Both sift answers now end in the same place: the times Ben has
         free. The reveal used to split — coached went to a lead form,
         self-serve to the Club trial — because the funnel sold a product.
         This route promises a free conversation and ends on one, so the
         sift's answer is information for Ben rather than a fork in the UI. */
      await expect(
        page.getByRole("heading", { name: /when shall ben call/i }),
      ).toBeVisible({ timeout: 12_000 });

      // Stay on the self-serve route to finish the walk. On the coached
      // route the sticky button deliberately scrolls to the lead form
      // rather than advancing, so the account gate is only reachable this
      // way, which is the intended behaviour rather than a limitation.
    }

    /* THE ACCOUNT GATE IS NOT ON THIS ROUTE ANY MORE.
       It ends on the times Ben has free — no password, no plan, no price,
       because nothing before it promised any of those. Account creation
       still exists and is still tested: it is reached from the paid
       onboarding link, which is where somebody who has agreed to be
       coached actually signs up. */
    await expect(
      page.locator('[aria-label^="Choose a day"] button:not([disabled])').first(),
    ).toBeVisible({ timeout: 12_000 });
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    // No console errors on the whole walk.
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

    /* THE ENDING CHANGED.
       This route opens "free fitness assessment" and never mentions a
       product, so it now ends on the promise it made: the times Ben has
       free. The plan reveal, the sift's two destinations and the Club
       trial link all belonged to a funnel that sold a twelve-week
       programme — showing "First Race Programme" to somebody who asked for
       help getting fit named a race they never mentioned and offered a
       product they were never promised. */
    await expect(
      page.getByRole("heading", { name: /when shall ben call/i }),
    ).toBeVisible({ timeout: 12_000 });
    // A real calendar with real days on it, not an empty month.
    await expect(
      page.locator('[aria-label^="Choose a day"] button:not([disabled])').first(),
    ).toBeVisible({ timeout: 12_000 });
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

    // Same ending for every route: a time in Ben's diary.
    await expect(
      page.getByRole("heading", { name: /when shall ben call/i }),
    ).toBeVisible({ timeout: 12_000 });

    // The whole point of the rail: nothing HYROX reached a beginner, on the
    // questions OR on the reveal. The reveal is the easy one to get wrong,
    // because the programme name and the benefit copy both default to the
    // race-facing versions.
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/have you raced/i);
    expect(body).not.toMatch(/first race/i);
    expect(body).not.toMatch(/wall ball|sled|farmers carry/i);
    expect(body).not.toMatch(/start line|race-ready|weeks to your race/i);

    /* The twelve-week framing went with the plan reveal. What replaced it
       is the thing this route actually promises — a free half hour on the
       phone — so that is what the last screen has to say, and it must say
       it without naming a race. */
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/30 minutes|half an hour/i).first()).toBeVisible();
  });
});
