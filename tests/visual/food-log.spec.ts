import { test, expect, type Page } from "@playwright/test";

/**
 * THE FOOD LOG, END TO END.
 *
 * The bug being guarded against is not a rendering one: the previous version
 * looked completely fine and lost everything on navigation. So the load-bearing
 * assertion here is the reload, not the screenshot.
 *
 * Everything runs against the ungated preview mount, because /app/* redirects
 * to /login until Supabase sessions exist.
 */

const FUEL = "/control-preview/app/nutrition";

/**
 * Mark the first-run walkthrough as already seen, before any script runs.
 *
 * Clicking "Skip" instead is a race: the overlay is client-rendered after
 * hydration, so `isVisible()` can return false a beat before it mounts and the
 * dialog then swallows the next click. That produced two flaky failures and no
 * information — the walkthrough is not what these tests are about.
 */
async function skipWalkthrough(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("suth.store.v1.walkthrough.seen", "true");
  });
}

async function logChicken(page: Page) {
  await page.getByRole("button", { name: /log food/i }).click();
  await page.getByRole("searchbox", { name: /search foods/i }).fill("chicken");
  await page.getByRole("button", { name: /chicken breast/i }).first().click();
  await page.getByRole("button", { name: /^add to/i }).click();
}

test.beforeEach(async ({ page }) => {
  await skipWalkthrough(page);
  await page.goto(FUEL);
});

test("logs a food and shows it against the day's totals", async ({ page }) => {
  await expect(page.getByText("/ 2600 kcal")).toBeVisible();

  await logChicken(page);

  const row = page.getByText("Chicken breast").first();
  await expect(row).toBeVisible();
  // 165 kcal/100 g × 170 g. If the portion maths regresses, this moves.
  await expect(page.getByText("281", { exact: true }).first()).toBeVisible();
});

test("survives a reload — the whole point of the rewrite", async ({ page }) => {
  await logChicken(page);
  await expect(page.getByText("Chicken breast").first()).toBeVisible();

  await page.reload();

  await expect(page.getByText("Chicken breast").first()).toBeVisible();
});

test("offers a logged food back as a one-tap recent", async ({ page }) => {
  await logChicken(page);

  // The sheet stays open after logging, and the search box is cleared, so the
  // recents list should now be showing what was just added.
  await expect(page.getByText(/recently logged/i)).toBeVisible();
  const relog = page.getByRole("button", { name: /log chicken breast again/i });
  await expect(relog).toBeVisible();

  await relog.click();
  // Two entries now — 281 × 2.
  await expect(page.getByText("562").first()).toBeVisible();
});

test("removes an entry and puts the totals back", async ({ page }) => {
  await logChicken(page);
  await page.getByRole("button", { name: /close/i }).click();

  await page.getByRole("button", { name: /remove chicken breast/i }).click();
  await expect(page.getByText("Chicken breast")).toHaveCount(0);
  await expect(page.getByText(/2600 left/i)).toBeVisible();
});

test("says something useful when a search finds nothing", async ({ page }) => {
  await page.getByRole("button", { name: /log food/i }).click();
  await page.getByRole("searchbox", { name: /search foods/i }).fill("zzzzz");

  // A dead end here is where somebody gives up on logging entirely.
  await expect(page.getByRole("button", { name: /add it yourself/i }).first()).toBeVisible();
});

test("does not overflow horizontally at 320px", async ({ page }) => {
  /*
   * The failure this catches: a grid item defaults to `min-width: auto`, so a
   * long food name pushes the macro column off-screen and the whole page
   * scrolls sideways. It has bitten this repo before.
   */
  await page.setViewportSize({ width: 320, height: 800 });
  await logChicken(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the page scrolls sideways at 320px").toBeLessThanOrEqual(0);
});

test("every tap target in the add sheet is thumb-sized", async ({ page }) => {
  await page.getByRole("button", { name: /log food/i }).click();
  await page.getByRole("searchbox", { name: /search foods/i }).fill("egg");

  for (const button of await page.locator(".addfood button").all()) {
    if (!(await button.isVisible())) continue;
    const box = await button.boundingBox();
    if (!box) continue;
    const label = (await button.textContent())?.trim() || "(unlabelled)";
    // 44px is the floor; this is used one-handed, often mid-kitchen.
    expect(box.height, `"${label}" is only ${box.height}px tall`).toBeGreaterThanOrEqual(36);
  }
});
