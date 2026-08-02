import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Results section: smoke, responsiveness, interaction and accessibility.
 *
 * Replaces the throwaway scripts used while building. The checks here are the
 * ones that actually caught bugs during the build, so they are the ones worth
 * keeping: horizontal overflow, hydration errors, virtualisation holding, and
 * the authenticity rules on generated reports.
 *
 * Runs against a production build on port 3100 (see playwright.config.ts).
 */

const ROUTES = [
  { name: "landing", path: "/results" },
  { name: "events", path: "/events" },
  { name: "event final", path: "/event/s9-2026-london" },
  { name: "event live", path: "/event/s9-2026-cardiff" },
  { name: "event upcoming", path: "/event/s9-2026-dublin" },
  { name: "ranking", path: "/ranking/s9-2026-london-hyrox-men" },
  { name: "result", path: "/result/s9-2026-london-hyrox-men-1600" },
  { name: "athlete", path: "/athlete/charlie-johansson" },
  { name: "simulator", path: "/simulator" },
  { name: "compare", path: "/results/compare?a=charlie-johansson&b=benjamin-sutherland" },
  { name: "percentile tool", path: "/tools/good-hyrox-time" },
  { name: "rankings", path: "/rankings" },
  { name: "records", path: "/rankings/world-records" },
  { name: "season bests", path: "/rankings/season-bests" },
  { name: "starters", path: "/starters/s9-2026-dublin" },
  { name: "reports index", path: "/reports" },
  { name: "report", path: "/reports/s9-2026-london" },
];

/** Fails the test if the page logged an error or threw during hydration. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

/** The only overflow check that means anything: can the user actually scroll sideways. */
async function canScrollHorizontally(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    window.scrollTo(9999, 0);
    const x = window.scrollX;
    window.scrollTo(0, 0);
    return x > 0;
  });
}

/**
 * Viewports come from the Playwright projects in playwright.config.ts
 * (mobile-390, desktop-1440, and the device matrix), so these declare none of
 * their own — an earlier version did both and the two fought each other.
 */
for (const route of ROUTES) {
  test(`${route.name} renders cleanly`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await page.goto(route.path, { waitUntil: "networkidle" });

    expect(response?.status(), `${route.path} status`).toBe(200);
    expect(await canScrollHorizontally(page), `${route.path} scrolls sideways`).toBe(false);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.title()).not.toBe("");
    expect(errors, `${route.path} console/page errors`).toEqual([]);
  });
}

test.describe("ranking table", () => {
  test("windows a 3,000-row field instead of rendering it", async ({ page }) => {
    await page.goto("/ranking/s9-2026-london-hyrox-men", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const counter = await page.locator('p[aria-live="polite"]').innerText();
    expect(counter).toMatch(/3,\d{3} of 3,\d{3}/);

    const domRows = await page.locator('[class*="results-band"]').count();
    expect(domRows).toBeLessThan(160);
  });

  test("filters locally without a page load", async ({ page }) => {
    await page.goto("/ranking/s9-2026-london-hyrox-men", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    await page.getByPlaceholder("Find an athlete").fill("patel");
    await page.waitForTimeout(400);
    const counter = await page.locator('p[aria-live="polite"]').innerText();
    expect(counter).toMatch(/^\d+ of 3,\d{3}$/);
  });

  test("expands splits in place", async ({ page }) => {
    await page.goto("/ranking/s9-2026-london-hyrox-men", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // Desktop uses a chevron button per table row (aria-label "Show splits…");
    // mobile uses the whole card, which is a button inside an <li>. Scoped
    // deliberately: an unscoped [aria-expanded] matches the site nav hamburger
    // first at 390px, which is what an earlier version of this test clicked.
    const expander = page
      .locator('button[aria-label^="Show splits"], li button[aria-expanded]')
      .filter({ visible: true })
      .first();
    await expander.click();

    // Both the desktop table and the mobile card list are in the DOM at every
    // width (one is display:none), so this has to assert on the visible copy.
    await expect(
      page.getByText("Splits vs division average").filter({ visible: true }).first(),
    ).toBeVisible();
  });
});

test.describe("share", () => {
  test("generates a real 1200x630 card before sharing", async ({ page }) => {
    await page.goto("/result/s9-2026-london-hyrox-men-1600", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Share", exact: true }).first().click();

    const card = page.locator('img[alt^="Share card"]');
    await expect(card).toBeVisible();
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt^="Share card"]') as HTMLImageElement | null;
      return !!img?.complete && img.naturalWidth > 0;
    }, undefined, { timeout: 20_000 });

    const size = await card.evaluate((img) => ({
      w: (img as HTMLImageElement).naturalWidth,
      h: (img as HTMLImageElement).naturalHeight,
    }));
    expect(size).toEqual({ w: 1200, h: 630 });
  });
});

test.describe("automated reports honour the authenticity rules", () => {
  test("carry the label and never simulate a human voice", async ({ page }) => {
    await page.goto("/reports/s9-2026-london", { waitUntil: "networkidle" });
    const text = await page.locator("article").innerText();

    expect(text).toMatch(/automated race report, generated from race data/i);
    // "Ben's Take" must not appear while no human has written one.
    expect(text).not.toMatch(/ben's take/i);
    expect(text).not.toMatch(/\b(I|we|my|our)\b/);
  });
});

test.describe("accessibility", () => {
  // One representative page per template family, at mobile width where the
  // layouts differ most.
  const sample = [
    "/results",
    "/event/s9-2026-london",
    "/ranking/s9-2026-london-hyrox-men",
    "/result/s9-2026-london-hyrox-men-1600",
    "/athlete/charlie-johansson",
    "/simulator",
    "/tools/good-hyrox-time",
    "/reports/s9-2026-london",
  ];
  for (const path of sample) {
    test(`no critical or serious axe violations: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        blocking.map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} node(s)`),
      ).toEqual([]);
    });
  }
});
