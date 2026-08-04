import { test, expect } from "@playwright/test";

/**
 * THE TOOLS DIRECTORY.
 *
 * The page was an accurate inventory and a bad shop window: nine near-identical
 * cards, with the flagship — a twelve-section race report, free — sitting in
 * the grid looking exactly like "Race calendar".
 */

const PAGE = "/results/tools";

test.beforeEach(async ({ page }) => { await page.goto(PAGE); });

test("leads with the race report, sold rather than listed", async ({ page }) => {
  const hero = page.locator("section[aria-labelledby='flagship-heading']");
  await expect(hero).toBeVisible();
  // Naming what is inside is the evidence; "twelve sections" alone is a claim.
  await expect(hero).toContainText(/against your own standard/i);
  await expect(hero).toContainText(/pacing/i);
  await expect(hero.getByRole("link", { name: /find your race/i })).toBeVisible();
});

test("does not sell the same tool twice", async ({ page }) => {
  // The flagship is filtered out of the grid below by href. A typo in that
  // constant fails by rendering the report in both places, which looks
  // deliberate rather than broken.
  const gridCards = page.locator("main a, a").filter({ hasText: "Full race report" });
  await expect(gridCards).toHaveCount(0);
});

test("keeps the record book in the grid", async ({ page }) => {
  /*
   * Two tools carry the `featured` flag. Filtering the grid on that flag —
   * the obvious implementation — silently dropped the record book off the page
   * entirely. It is a good tool; it is just not the flagship.
   */
  await expect(page.getByRole("link", { name: /record book/i }).first()).toBeVisible();
});

test("has no dead anchors in the hero", async ({ page }) => {
  // A "What is in it" button pointed at `#example`, which does not exist, so it
  // did nothing. A dead link beside a live one devalues the live one.
  const hrefs = await page
    .locator("section[aria-labelledby='flagship-heading'] a")
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));

  for (const href of hrefs) {
    if (!href.startsWith("#")) continue;
    await expect(page.locator(href), `${href} is a dead anchor`).toHaveCount(1);
  }
});

test("answers enough of the real questions", async ({ page }) => {
  const faq = page.getByRole("heading", { name: /using these/i });
  await expect(faq).toBeVisible();
  // Three entries did not cover missing splits, wrong data, removal, or whether
  // this is an official HYROX product — all things people actually ask.
  const questions = page.locator("summary, [data-slot='accordion-trigger'], button").filter({ hasText: "?" });
  expect(await questions.count()).toBeGreaterThanOrEqual(8);
});

test("says plainly that it is not affiliated with HYROX", async ({ page }) => {
  // Publishing somebody else's race results under your own brand makes this a
  // question worth answering before anyone has to ask it.
  await expect(page.getByText(/not an official HYROX product/i)).toHaveCount(1);
});

test("does not overflow horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(PAGE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
