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
  // The entry carousel is gone; the quiz opens on the first question.
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
  await dismissConsent(page);
  for (let i = 0; i < 6; i++) {
    const cta = page.getByRole("button", { name: /find your plan/i }).first();
    if (!(await cta.isVisible().catch(() => false))) break;
    await cta.click();
    await page.waitForTimeout(450);
  }
}

/**
 * Fill whatever the current screen needs before advancing.
 *
 * The contact screen used to ask for an email alone. It now asks for a
 * name and a mobile too, because the route ends in Ben ringing them and a
 * booking with no number is a booking nobody can keep. Continue stays
 * disabled until all three are valid, so a driver that only fills the
 * email waits ten seconds and blames the button.
 */
async function fillVisibleFields(page: Page) {
  const name = page.locator('input[autocomplete="given-name"]').first();
  if (await name.isVisible().catch(() => false)) {
    if (!(await name.inputValue())) await name.fill("Robust Tester");
  }
  const email = page.locator('input[type="email"]').first();
  if (await email.isVisible().catch(() => false)) {
    if (!(await email.inputValue())) await email.fill("robust@example.com");
  }
  const tel = page.locator('input[type="tel"]').first();
  if (await tel.isVisible().catch(() => false)) {
    // A real UK mobile shape: the picker is on GB and 07700 900xxx is the
    // reserved fictional range, so nothing here can ring a real phone.
    if (!(await tel.inputValue())) await tel.fill("07700 900123");
  }
}

async function clickContinue(page: Page) {
  await fillVisibleFields(page);
  const cta = page.getByRole("button", { name: /^continue/i }).first();
  await expect(cta).toBeEnabled({ timeout: 10_000 });
  await cta.click();
  await page.waitForTimeout(650);
}

test.describe("Onboarding funnel robustness", () => {
  test.setTimeout(120_000);

  test("the quiz opens on a question, not an animation", async ({ page }) => {
    /* Replaces a regression test for a dead zone in the entry carousel —
       the headline sat over the full-screen "next slide" target, so a tap
       in the middle of the screen did nothing.

       The carousel is gone entirely. It held two full-bleed slides on a
       3.2-second timer, which meant somebody who had just clicked "free
       fitness assessment" waited six seconds watching an animation before
       being asked anything. It was the only screen in the funnel that took
       time without giving anything back. The dead zone cannot come back
       because the thing it lived in no longer exists; what is worth
       holding is that the first thing they see is the first question. */
    await page.goto("/quiz", { waitUntil: "domcontentloaded" });
    await dismissConsent(page);
    await expect(
      page.getByRole("heading", { name: /what brings you to suth performance/i }),
    ).toBeVisible({ timeout: 15_000 });
    // And no timer moves it under them.
    const before = await page.locator("h1").first().textContent();
    await page.waitForTimeout(7000);
    expect(await page.locator("h1").first().textContent()).toBe(before);
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

  test("booking: a failing endpoint shows an error, never a dead button", async ({
    page,
  }) => {
    /* This used to point at /api/consultation and the lead-capture form.
       Both are gone: the route no longer offers a plan to be sent, it
       offers a time in Ben's diary, and the last screen books it in one
       tap. What is worth keeping is the behaviour, not the endpoint — a
       server that is down must say so and hand the picker back, because a
       silently-dead tap on the final screen loses the enquiry entirely. */
    await page.route("**/api/booking", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "Simulated outage." }),
      });
    });

    await runBeginnerToSlots(page);
    await chooseFirstSlot(page);

    // Next's route announcer is also role="alert" and always present, so
    // the assertion has to name the one that belongs to the page.
    await expect(
      page.getByRole("alert").filter({ hasText: /outage/i }),
    ).toContainText(/simulated outage/i, { timeout: 10_000 });
    // And the picker is still usable rather than left greyed out.
    await expect(
      page.locator('[aria-label^="Choose a day"] button:not([disabled])').first(),
    ).toBeEnabled();
  });

  test("booking: a successful slot confirms and tells Ben everything", async ({
    page,
  }) => {
    let payload: Record<string, unknown> | null = null;
    await page.route("**/api/booking", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      payload = JSON.parse(route.request().postData() ?? "{}");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, ref: "SP-TEST01" }),
      });
    });

    await runBeginnerToSlots(page);
    await chooseFirstSlot(page);

    // Warm, specific, and it says what happens next.
    await expect(page.getByText(/speak soon, robust/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/SP-TEST01/)).toBeVisible();
    // Nothing left to press: the booking is done, not pending.
    await expect(
      page.locator('[aria-label^="Choose a day"]'),
    ).toHaveCount(0);

    /* The whole point of the rebuild: Ben gets the answers, not just a
       name. Everything he needs to open the call knowing who he is
       speaking to has to be in this one payload, because there is no
       second form behind it. */
    expect(payload).toBeTruthy();
    const sent = payload as unknown as Record<string, string>;
    expect(sent.email).toBe("robust@example.com");
    // Stored in E.164 so Twilio can dial it from anywhere: the leading
    // zero is a UK trunk prefix and must not survive the +44.
    expect(sent.phone).toBe("+447700900123");
    expect(sent.rail).toBe("beginner");
    expect(sent.startISO).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(sent.note).toMatch(/FROM THE QUIZ \(beginner path\)/);
    expect(sent.note).toMatch(/INJURY: Knee \(bothering me now\)/);
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

    /* The club CTA used to be "Start 7 days free" into the quiz carrying
       support=self. It is a WAITING LIST now — there is no link from this
       page into the quiz at all any more — so the assertion follows the
       button that actually exists. If self-serve signup reopens, this is the
       test to change back. */
    await page
      .getByRole("link", { name: /join the waiting list/i })
      .first()
      .click();
    await page.waitForURL("**/club/waitlist**");
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

/**
 * Walk the beginner rail to the slot picker.
 *
 * It used to hard-code the sequence of screens and stopped dead the moment
 * one moved — which it has, twice. So it drives the quiz the way a person
 * does: answer whatever is on screen, prefer the answers these tests assert
 * on, press the advance button, repeat until the picker appears.
 *
 * The injury answers are still expressed as preferences rather than left to
 * chance, because two of the tests below check that a knee that is bothering
 * them now reaches Ben. An answer nobody chose cannot be asserted on.
 */
const BEGINNER_PREFERENCES = [
  /lose weight|losing weight/i,
  /haven.t trained in years/i,
  /several times|first go/i,
  /doing it on my own|ben in my corner/i,
  /^3 days/i,
  /^45 min/i,
  /a normal gym|standard commercial gym/i,
  /^knee/i,
  /bothering me now/i,
  /managing it myself/i,
  /this week/i,
];

function advanceButton(page: Page) {
  return page
    .getByRole("button", { name: /^continue|^pick a time|^next|^see my/i })
    .filter({ hasNot: page.locator("svg") });
}

async function answerScreen(page: Page) {
  await fillVisibleFields(page);

  for (const want of BEGINNER_PREFERENCES) {
    const opt = page.getByRole("button", { name: want }).first();
    if ((await opt.count()) && (await opt.isVisible().catch(() => false))) {
      if ((await opt.getAttribute("aria-pressed")) !== "true") {
        await opt.click().catch(() => {});
        await page.waitForTimeout(150);
      }
    }
  }

  /* One answer per question GROUP. The injury-detail screen asks three
     things at once and answering only the first leaves Continue disabled
     for ever, which is where the old driver stopped. */
  const groups = page.locator('fieldset, ul[role="list"]');
  for (let g = 0; g < (await groups.count()); g++) {
    if (await groups.nth(g).locator('button[aria-pressed="true"]').count()) continue;
    const unset = groups.nth(g).locator('button[aria-pressed="false"]');
    if (await unset.count()) {
      await unset.first().click().catch(() => {});
      await page.waitForTimeout(120);
    }
  }
}

async function runBeginnerToSlots(page: Page) {
  await enterQuiz(page);

  for (let step = 0; step < 24; step++) {
    if (await page.locator('[aria-label^="Choose a day"]').count()) return;
    await answerScreen(page);

    const all = advanceButton(page);
    let clicked = false;
    for (let i = 0; i < (await all.count()); i++) {
      const b = all.nth(i);
      if (!(await b.isVisible().catch(() => false))) continue;
      if (!(await b.isEnabled().catch(() => false))) continue;
      await b.click();
      clicked = true;
      break;
    }
    if (!clicked) {
      throw new Error(
        `stuck on "${await page.locator("h1").first().textContent()}" — nothing advances`,
      );
    }
    await page.waitForTimeout(700);
  }
  throw new Error("never reached the slot picker in 24 screens");
}

/**
 * Pick the first day Ben has free, then the first time on it, then confirm.
 *
 * The confirm step is new and is the point. Choosing a time used to book it
 * outright, which left nowhere to check the day and — when the draft had no
 * name in it — surfaced the server's "Please enter your name" on a screen
 * with no name field. A time is now a selection; the booking is a button.
 */
async function chooseFirstSlot(page: Page) {
  const day = page
    .locator('[aria-label^="Choose a day"] button:not([disabled])')
    .first();
  await expect(day).toBeVisible({ timeout: 12_000 });
  await day.click();
  await page.waitForTimeout(500);
  const time = page
    .getByRole("button", { name: /\d{1,2}[:.]\d{2}\s*(am|pm)?/i })
    .filter({ hasNot: page.locator("svg") })
    .first();
  await expect(time).toBeVisible({ timeout: 10_000 });
  await time.click();
  await page.waitForTimeout(400);

  const confirm = page.getByRole("button", { name: /confirm this time/i });
  await expect(confirm, "no confirm step after choosing a time").toBeVisible({
    timeout: 10_000,
  });
  await expect(confirm, "confirm is dead with every detail filled in").toBeEnabled();
  await confirm.click();
  await page.waitForTimeout(700);
}
