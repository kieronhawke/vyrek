import { test, expect } from "@playwright/test";

/**
 * STATION GUIDES ON DESKTOP.
 *
 * These pages were a 768px column repeated eleven times, centred in whatever
 * screen you opened them on. The rail is the fix; these tests are mostly about
 * the ways it can rot.
 */

const PAGE = "/hyrox/stations/sled-push";

test("shows the reference rail on a desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PAGE);

  const rail = page.getByRole("complementary", { name: /station reference/i });
  await expect(rail).toBeVisible();

  // The spec is the single most common reason anybody opens one of these.
  await expect(rail).toContainText("152 kg");
  await expect(rail).toContainText("102 kg");
});

test("hides the rail on a phone rather than stacking it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  // Below `lg` the page keeps its original single-column order; a sticky rail
  // there would just eat the screen.
  await expect(page.getByRole("complementary", { name: /station reference/i })).toBeHidden();
});

test("every contents link points at a section that exists", async ({ page }) => {
  /*
   * THE ONE THAT MATTERS. The rail's list and the `id` attributes on the
   * sections are two lists that have to agree, and when they drift the failure
   * is silent — you tap a link and the page simply does not move. Nothing else
   * catches that.
   */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PAGE);

  const nav = page.getByRole("navigation", { name: /on this page/i });
  const hrefs = await nav.locator("a").evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
  );

  expect(hrefs.length).toBeGreaterThan(5);
  for (const href of hrefs) {
    expect(href.startsWith("#"), `"${href}" is not an anchor`).toBe(true);
    await expect(
      page.locator(href),
      `contents links to ${href}, which is not on the page`,
    ).toHaveCount(1);
  }
});

test("jump links actually move the page, clear of the fixed header", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PAGE);

  await page.getByRole("navigation", { name: /on this page/i })
    .getByRole("link", { name: "Common faults" }).click();

  const target = page.locator("#common-faults");
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  // `scroll-mt-28` exists so the heading is not tucked under the fixed nav,
  // which makes the link look like it went somewhere wrong.
  expect(box!.y).toBeGreaterThan(40);
});

test("does not link the station you are already on", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PAGE);

  const list = page.getByRole("navigation", { name: /all stations/i });
  await expect(list.getByRole("link", { name: /sled push/i })).toHaveCount(0);
  await expect(list.locator("[aria-current='page']")).toContainText("Sled Push");
  // The other seven are still reachable — this was previously only possible
  // from the very bottom of the page.
  expect(await list.getByRole("link").count()).toBe(7);
});

test("keeps the contents list compact rather than 48px per row", async ({ page }) => {
  /*
   * The global tap-target floor in globals.css makes every anchor 48px tall.
   * Applied to a ten-item sidebar index that is 480px of mostly empty column —
   * a contents list taller than a screen. The rail opts out via the repo's
   * existing `data-inline-tap` attribute.
   */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PAGE);

  const first = page.getByRole("navigation", { name: /on this page/i }).locator("a").first();
  const box = await first.boundingBox();
  expect(box!.height).toBeLessThan(40);
  // Still comfortably clickable.
  expect(box!.height).toBeGreaterThanOrEqual(28);
});

test("does not overflow horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto(PAGE);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the station guide scrolls sideways at 320px").toBeLessThanOrEqual(0);
});

test("uses the width it has instead of a centred ribbon", async ({ page }) => {
  /*
   * The regression this guards: somebody reinstating `mx-auto max-w-3xl` on the
   * sections. At 1440 the reading column should be meaningfully wider than the
   * old fixed 768px block and should start at the container edge, not floating
   * in the middle of the page.
   */
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(PAGE);

  const section = page.locator("#goal-splits");
  const box = await section.boundingBox();
  expect(box!.width).toBeGreaterThan(780);

  const rail = await page.getByRole("complementary", { name: /station reference/i }).boundingBox();
  // Content sits left of the rail, not centred underneath it.
  expect(box!.x + box!.width).toBeLessThanOrEqual(rail!.x + 1);
});
