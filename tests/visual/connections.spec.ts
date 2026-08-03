import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * CONNECTIONS — the invariant is "no dead buttons".
 *
 * The failure mode this page exists to avoid is six identical "Connect"
 * buttons, three of which can never work. A future edit that adds a provider
 * without checking whether it is actually reachable would reintroduce exactly
 * that, and it would look fine in a screenshot. So the test asserts the rule
 * rather than the appearance.
 */

const PAGE = "/control-preview/app/connections";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("suth.store.v1.walkthrough.seen", "true");
  });
  await page.goto(PAGE);
});

test("shows every provider with a status", async ({ page }) => {
  for (const name of ["Strava", "Apple Health", "MyFitnessPal", "Garmin"]) {
    await expect(page.getByRole("heading", { name, exact: false })).toBeVisible();
  }
});

test("offers no connect control for a provider that cannot connect", async ({ page }) => {
  /*
   * Apple Health and Google Fit have no web API at all. If either ever grows a
   * button, somebody will tap it and conclude the app is broken.
   */
  for (const name of ["Apple Health", "Google Fit"]) {
    const card = page.locator(".conn__card").filter({ hasText: name });
    await expect(card.getByRole("link", { name: /connect/i })).toHaveCount(0);
    await expect(card.getByRole("button", { name: /connect/i })).toHaveCount(0);
  }
});

test("explains why MyFitnessPal is absent instead of silently omitting it", async ({ page }) => {
  // Somebody who uses MFP will look for it. Leaving it out entirely reads as
  // an oversight; saying "their API is closed" is an answer.
  const card = page.locator(".conn__card").filter({ hasText: "MyFitnessPal" });
  await expect(card).toContainText(/partner-only/i);
  await expect(card).toContainText(/log your food here/i);
});

test("does not overflow horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("has no accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
