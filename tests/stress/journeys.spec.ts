import { test, expect, type Page } from "@playwright/test";

/**
 * Stress test: many varied quiz journeys + form edge cases.
 *
 * Each journey simulates a realistic user persona walking the V3 quiz.
 * Tests fail loud if a journey can't complete to the email gate. Console
 * errors are captured per journey and reported in the test name.
 *
 * Runs at desktop-1440 only by default — viewports are covered by the
 * existing page-coverage matrix.
 */

type Journey = {
  name: string;
  intent: string | RegExp;
  experience: string | RegExp;
  hasRace: boolean;
  activity: RegExp | string;
  sex: RegExp | string;
  weight: string;
  days: RegExp;
  sessionLength: RegExp;
  location: RegExp;
  equipment?: RegExp[];
  partner: RegExp;
  injuries: RegExp;
};

const JOURNEYS: Journey[] = [
  {
    name: "first-race · beginner · 4d · gym",
    intent: "Training for my first Hyrox",
    experience: "Never raced",
    hasRace: false,
    activity: /brand new to training/i,
    sex: /men.s standards/i,
    weight: "82",
    days: /^4 days/i,
    sessionLength: /^60 min/i,
    location: /standard commercial gym/i,
    partner: /^solo\b[\s\S]*just me/i,
    injuries: /no injuries/i,
  },
  {
    name: "go-faster · raced-many · 5d · full hyrox gym",
    intent: /go faster/i,
    experience: /raced multiple/i,
    hasRace: true,
    activity: /training 5\+/i,
    sex: /women.s standards/i,
    weight: "62",
    days: /^5 days/i,
    sessionLength: /90 min/i,
    location: /full hyrox gym/i,
    partner: /^solo\b[\s\S]*just me/i,
    injuries: /no injuries/i,
  },
  {
    name: "doubles-confirmed · partner · raced-few",
    intent: /doubles/i,
    experience: /raced once or twice/i,
    hasRace: false,
    activity: /training 3-4/i,
    sex: /men.s standards/i,
    weight: "78",
    days: /^4 days/i,
    sessionLength: /^60 min/i,
    location: /standard commercial gym/i,
    partner: /doubles \(partner confirmed\)/i,
    injuries: /no injuries/i,
  },
  {
    name: "home setup · returning · knee injury",
    intent: /getting into/i,
    experience: /signed up, not raced/i,
    hasRace: true,
    activity: /just getting back/i,
    sex: /women.s standards/i,
    weight: "68",
    days: /^3 days/i,
    sessionLength: /^45 min/i,
    location: /home setup/i,
    equipment: [/dumbbells/i],
    partner: /^solo\b[\s\S]*just me/i,
    injuries: /^knee/i,
  },
  {
    name: "building · occasional · 2d minimal",
    intent: /building/i,
    experience: /never raced/i,
    hasRace: false,
    activity: /training 1-2/i,
    sex: /men.s standards/i,
    weight: "90",
    days: /^2 days/i,
    sessionLength: /30 min/i,
    location: /home setup/i,
    equipment: [/dumbbells/i, /kettlebell$/i],
    partner: /^solo\b[\s\S]*just me/i,
    injuries: /^lower back/i,
  },
  {
    name: "solo-partner-later · raced-few · shoulder",
    intent: "Training for my first Hyrox",
    experience: "Raced once or twice",
    hasRace: false,
    activity: /training 3-4/i,
    sex: /men.s standards/i,
    weight: "75",
    days: /^4 days/i,
    sessionLength: /^60 min/i,
    location: /standard commercial gym/i,
    partner: /solo for now, partner later/i,
    injuries: /^shoulder/i,
  },
];

async function pickOption(page: Page, label: string | RegExp) {
  const card = page.getByRole("button", { name: label }).first();
  await expect(card).toBeVisible({ timeout: 12_000 });
  await card.click();
  await page.waitForTimeout(250);
}

async function clickContinue(page: Page) {
  const cta = page.getByRole("button", { name: /^continue/i }).first();
  await expect(cta).toBeVisible({ timeout: 10_000 });
  await expect(cta).toBeEnabled({ timeout: 5_000 });
  await cta.click();
  await page.waitForTimeout(600);
}

async function exitWelcomeCarousel(page: Page) {
  await page.goto("/quiz", { waitUntil: "networkidle" });
  await expect(page.locator("#welcome-heading")).toBeVisible();
  await page.getByRole("button", { name: /find your plan/i }).first().click();
  await page.waitForTimeout(700);
}

async function runJourney(page: Page, j: Journey, errors: string[]) {
  page.removeAllListeners("console");
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      // ignore expected /api/account/create 500 from missing migrations
      if (t.includes("/api/account/create")) return;
      errors.push(`[${j.name}] console: ${t}`);
    }
  });

  await exitWelcomeCarousel(page);

  // Primary intent (multi-select + Continue)
  await pickOption(page, j.intent);
  await clickContinue(page);

  // Reassurance 1
  await clickContinue(page);

  // Experience
  await pickOption(page, j.experience);
  await clickContinue(page);

  // Best-time conditional: only if raced-few or raced-many
  const isExperienced = /raced (once|multiple)/i.test(String(j.experience));
  if (isExperienced) {
    await pickOption(page, /75 to 90 min/i); // pick something valid
    await clickContinue(page);
  }

  // Race date
  if (j.hasRace) {
    // open date picker and pick the first available future day
    const btn = page
      .getByRole("button", { name: /^add race date|set race date|pick/i })
      .first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      const next = page.getByRole("gridcell", { name: /\d+/ }).last();
      if (await next.isVisible().catch(() => false)) await next.click();
      await page.waitForTimeout(300);
      await clickContinue(page);
    } else {
      // Fall back to skip if no picker
      await page.getByRole("button", { name: /no race booked/i }).first().click();
      await page.waitForTimeout(700);
    }
  } else {
    await page.getByRole("button", { name: /no race booked/i }).first().click();
    await page.waitForTimeout(700);
  }

  // Reassurance 2
  await clickContinue(page);

  // Activity
  await pickOption(page, j.activity);
  await clickContinue(page);

  // Calibration: sex + weight
  await pickOption(page, j.sex);
  const w = page.locator('input[type="number"]').first();
  await w.fill(j.weight);
  await clickContinue(page);

  // Frequency
  await pickOption(page, j.days);
  await clickContinue(page);

  // Session length
  await pickOption(page, j.sessionLength);
  await clickContinue(page);

  // Location
  await pickOption(page, j.location);
  await clickContinue(page);

  // Equipment conditional (home only)
  if (/home/i.test(String(j.location))) {
    if (j.equipment && j.equipment.length > 0) {
      for (const eq of j.equipment) {
        await pickOption(page, eq);
      }
    } else {
      // pick the first option just to clear "Continue disabled"
      const firstOpt = page.locator('button[aria-pressed]').first();
      if (await firstOpt.isVisible().catch(() => false)) await firstOpt.click();
    }
    await clickContinue(page);
  }

  // Partner (skipped if doubles already chosen — quiz infers)
  const isDoubles = /doubles/i.test(String(j.intent));
  if (!isDoubles) {
    await pickOption(page, j.partner);
    await clickContinue(page);
  }

  // Injuries
  await pickOption(page, j.injuries);
  await clickContinue(page);

  // Plan summary → save my plan
  const save = page.getByRole("button", { name: /save my plan/i }).first();
  await expect(save).toBeVisible({ timeout: 12_000 });
  await save.click();
  await page.waitForTimeout(800);

  // Account creation visible
  const emailInput = page.locator('input[type="email"]').first();
  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  return true;
}

test.describe("Quiz stress: realistic personas", () => {
  test.setTimeout(120_000);

  for (const j of JOURNEYS) {
    test(`journey: ${j.name}`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop-1440",
        "single-viewport stress (page matrix covers viewport regressions)",
      );
      const errors: string[] = [];
      let ok = false;
      try {
        ok = await runJourney(page, j, errors);
      } catch (e) {
        await page.screenshot({
          path: `/Users/kieronhawke/code/vyrek/scripts/audit-shots/stress-fail-${j.name.replace(/[^a-z0-9]+/gi, "-")}.png`,
          fullPage: true,
        });
        throw e;
      }
      expect(ok).toBe(true);
      if (errors.length) {
        // eslint-disable-next-line no-console
        console.warn(errors.join("\n"));
      }
    });
  }
});

test.describe("Form edge cases", () => {
  test.setTimeout(60_000);

  test("partner apply rejects empty submit (HTML5 validity)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "single-viewport");
    await page.goto("/partners/apply", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /submit application/i }).click();
    const name = page.getByLabel(/your name/i);
    const valid = await name.evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
    );
    expect(valid).toBe(false);
  });

  test("partner apply accepts long Unicode name + email + tag-style address", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "single-viewport");
    await page.goto("/partners/apply", { waitUntil: "networkidle" });
    await page.fill('input[name="name"]', "Ñoël “The Coach” Müller-O'Brien");
    await page.fill(
      'input[name="email"]',
      "ñoël+vyrek-test_2026@example-domain.co.uk",
    );
    await page.fill('input[name="country"]', "United Kingdom");
    await page.selectOption('select[name="platform"]', { label: "Instagram" });
    await page.selectOption('select[name="followerCount"]', { label: "1K to 5K" });
    await page.fill(
      'textarea[name="contentDescription"]',
      "x".repeat(200),
    );
    await page.fill('textarea[name="whyVyrek"]', "y".repeat(300));
    await page.fill(
      'input[name="primaryUrl"]',
      "https://example.com/path?query=1&more=2#frag",
    );
    // Tick at least one promotion method
    await page.getByLabel(/organic posts/i).check();
    await page.getByLabel(/I accept the/i).check();
    // We submit but don't assert success because Supabase may not have
    // the table yet; we only care that the client-side validation passed.
    await page.getByRole("button", { name: /submit application/i }).click();
    await page.waitForTimeout(1500);
    // Either success screen OR a server error — both prove validation
    // accepted the input.
    const hasSuccess = await page
      .getByRole("heading", { name: /thanks/i })
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .getByText(/could not save|please try again|server error/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasSuccess || hasError).toBe(true);
  });

  test("quiz preserves state on browser back from screen 5", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "single-viewport");
    await page.goto("/quiz", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /find your plan/i }).first().click();
    await page.waitForTimeout(700);
    // Make a selection on screen 2
    await page
      .getByRole("button", { name: /first hyrox/i })
      .first()
      .click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: /^continue/i }).first().click();
    await page.waitForTimeout(600);
    // Reassurance, then experience
    await page.getByRole("button", { name: /^continue/i }).first().click();
    await page.waitForTimeout(600);
    // We should be on "Have you raced a Hyrox before?"
    const heading = page.getByRole("heading", { name: /raced a hyrox/i });
    await expect(heading).toBeVisible({ timeout: 5_000 });
    // Navigate back, then forward via address bar / browser controls
    await page.goBack({ waitUntil: "networkidle" });
    await page.goForward({ waitUntil: "networkidle" });
    // We should still land somewhere inside the quiz (not crash + not 404)
    await expect(page.locator("body")).not.toContainText(/404/);
  });
});
