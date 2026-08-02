import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { RACES, findRace, formatDates } from "../../lib/hyrox/races";

/**
 * THE RACE CALENDAR
 *
 * These pages emitted SportsEvent JSON-LD built from dates lib/hyrox-events.ts
 * described in its own header as "placeholder approximations". That is a
 * structured-data policy breach and a way to have an athlete plan a season
 * around a date we made up — and it was the reason the whole site is noindex.
 *
 * The gates below are mostly about that: what is published has to match what
 * hyrox.com says, and nothing may quietly go back to being derived.
 */

const UK = ["hyrox-london-excel", "hyrox-manchester", "hyrox-birmingham"];

test.describe("race calendar", () => {
  test("the index lists the real calendar, home races first", async ({ page }) => {
    await page.goto("/hyrox/events");
    await expect(
      page.getByRole("heading", { name: /Find your race/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /UK & Ireland/ }),
    ).toBeVisible();

    // More than the four placeholder events it used to carry.
    const cards = page.locator('a[href^="/hyrox/events/"]');
    expect(await cards.count()).toBeGreaterThan(20);
  });

  for (const slug of UK) {
    test(`${slug}: publishes the date hyrox.com publishes`, async ({ page }) => {
      const race = findRace(slug);
      expect(race, `${slug} missing from the calendar`).toBeTruthy();

      await page.goto(`/hyrox/events/${slug}`);
      await expect(page.getByRole("heading", { name: race!.name })).toBeVisible();

      // The rendered date and the structured data must agree with the source.
      await expect(page.getByText(formatDates(race!))).toBeVisible();

      const ld = await page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll('script[type="application/ld+json"]'),
        );
        for (const n of nodes) {
          const parsed = JSON.parse(n.textContent ?? "{}");
          const list = Array.isArray(parsed) ? parsed : [parsed];
          const ev = list.find((x) => x["@type"] === "SportsEvent");
          if (ev) return ev;
        }
        return null;
      });

      expect(ld).toBeTruthy();
      expect(ld.startDate).toBe(race!.startDate);
      expect(ld.endDate).toBe(race!.endDate);
      // Provenance: the page points back at the page the date came from.
      expect(ld.sameAs).toContain("hyrox.com");
    });
  }

  test("no page still asserts the invented Manchester date", async ({ page }) => {
    // The old slug encoded a date: manchester-central-april-2026. It is
    // 20-31 January 2027.
    const res = await page.goto("/hyrox/events/manchester-central-april-2026");
    expect(res?.status()).toBe(404);

    await page.goto("/hyrox/events/hyrox-manchester");
    await expect(page.getByText(/April 2026/)).toHaveCount(0);
  });

  test("says when a twelve-week build has to start", async ({ page }) => {
    await page.goto("/hyrox/events/hyrox-cardiff-2");
    await expect(page.getByText(/twelve-week build/)).toBeVisible();
  });

  test("a race page never scrolls sideways and passes AA", async ({ page }) => {
    await page.goto("/hyrox/events/hyrox-london-excel");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("every race in the calendar has a date and a venue", () => {
    for (const race of RACES) {
      expect(race.startDate, race.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(race.endDate >= race.startDate, race.slug).toBe(true);
      expect(race.venue, race.slug).toBeTruthy();
      expect(race.country, race.slug).toBeTruthy();
    }
  });
});
