import { test, expect } from "@playwright/test";

/**
 * THE RECORD BOOK.
 *
 * The complaint was that it did not show the significance of anything: sixteen
 * identical cards, ordered alphabetically, so the page opened on Adaptive Men
 * and the fastest HYROX ever run sat in the middle looking like everything
 * around it.
 */

const PAGE = "/rankings/records";

test("leads with the outright world bests, not the alphabet", async ({ page }) => {
  await page.goto(PAGE);

  const hero = page.locator("section[aria-labelledby='outright-heading']");
  await expect(hero).toBeVisible();

  const cards = hero.locator("article");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText(/elite men/i);
  await expect(cards.nth(1)).toContainText(/elite women/i);
});

test("promotes exactly two records, not six", async ({ page }) => {
  // "Everything is a headline" is the state this replaced. Something has to be
  // ordinary for something else to read as exceptional.
  await page.goto(PAGE);
  await expect(page.locator("section[aria-labelledby='outright-heading'] article")).toHaveCount(2);
});

test("orders the remaining divisions by significance", async ({ page }) => {
  await page.goto(PAGE);

  const labels = await page
    .locator("section[aria-labelledby='world-heading']")
    .locator("article, li")
    .allTextContents();
  const joined = labels.join(" | ").toLowerCase();

  const pro = joined.indexOf("pro men");
  const adaptive = joined.indexOf("adaptive");
  expect(pro).toBeGreaterThan(-1);
  // Adaptive is not lesser, but it is not what "the HYROX world record" means
  // unqualified — and it used to come first purely because of the letter A.
  if (adaptive > -1) expect(pro).toBeLessThan(adaptive);
});

test("does not clip a record time at any width", async ({ page }) => {
  /*
   * `54:05` is five characters and `1:01:00` is seven. At one fixed font size
   * the hour-plus time overran its card and rendered as "1:01:0" — the clipped
   * character is the last one, so the number stayed plausible while being
   * wrong. That is the worst possible way for a record to fail.
   */
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(PAGE);

    const overflows = await page
      .locator("section[aria-labelledby='outright-heading'] .results-num")
      .evaluateAll((els) =>
        els.map((el) => ({
          text: el.textContent?.trim() ?? "",
          over: el.scrollWidth - el.clientWidth,
        })),
      );

    for (const o of overflows) {
      expect(o.over, `"${o.text}" is clipped at ${width}px`).toBeLessThanOrEqual(1);
    }

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(pageOverflow, `the record book scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("tells you how long each headline record has stood", async ({ page }) => {
  // "Set 2025-02-14" makes the reader do arithmetic to answer the only
  // question they have: is this old news, or this weekend's?
  await page.goto(PAGE);
  const hero = page.locator("section[aria-labelledby='outright-heading'] article").first();
  await expect(hero).toContainText(/has stood|set \d+ day|set today|months/i);
});

test("links each headline record to its race report", async ({ page }) => {
  await page.goto(PAGE);
  const link = page
    .locator("section[aria-labelledby='outright-heading'] article")
    .first()
    .getByRole("link", { name: /race report/i });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", /^\/report\//);
});
