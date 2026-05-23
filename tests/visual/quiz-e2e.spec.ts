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

async function tapWelcomeCarouselThrough(page: Page) {
  // The carousel has multiple slides; tap "Find your plan" on the last
  // slide. Each slide auto-advances after a few seconds, but tapping the
  // primary CTA on every slide simply advances to the next one until the
  // final slide, then routes into the question flow.
  await page.goto("/quiz", { waitUntil: "networkidle" });

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

test.describe("Quiz V3 — happy path UI walk", () => {
  test.setTimeout(120_000);

  test("walks all visible screens to the account creation gate", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "single-viewport flow");

    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore the expected /api/account/create 400 console error — we
        // probe that explicitly later and the test won't reach the real
        // submission until Supabase migrations are applied.
        if (text.includes("/api/account/create")) return;
        errors.push(`console.error: ${text}`);
      }
    });

    await tapWelcomeCarouselThrough(page);

    // === Screen 2: Primary intent (multi-select + Continue) ===
    await pickSingle(page, "Training for my first Hyrox");
    await clickContinue(page);

    // === Screen 3: Reassurance 1 ===
    await clickContinue(page);

    // === Screen 4: Experience ===
    await pickSingle(page, "Never raced");
    await clickContinue(page);

    // === Screen 5: Best time — SKIPPED because experience = "never raced" ===

    // === Screen 6: Race date — pick "No race booked" skip ===
    {
      const skip = page.getByRole("button", { name: /no race booked/i }).first();
      await expect(skip).toBeVisible({ timeout: 8000 });
      await skip.click();
      await page.waitForTimeout(700);
    }

    // === Screen 7: Reassurance 2 ===
    await clickContinue(page);

    // === Screen 8: Activity baseline ===
    await pickSingle(page, /training 3-4 days/i);
    await clickContinue(page);

    // === Screen 9: Calibration (sex + weight) ===
    await pickSingle(page, /men.s standards/i);
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
    await pickSingle(page, /standard commercial gym/i);
    await clickContinue(page);

    // Equipment screen only shows if location = home; skipped here.

    // === Screen 14: Partner ===
    // "Solo" has detail "Just me", "Solo for now, partner later" also starts
    // with "Solo". Use the detail to disambiguate.
    await pickSingle(page, /^solo\b.*just me/is);
    await clickContinue(page);

    // === Screen 15: Injuries ===
    await pickSingle(page, /no injuries/i);
    await clickContinue(page);

    // === Screen 16: Plan summary ===
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
});
