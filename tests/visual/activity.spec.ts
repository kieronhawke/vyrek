import { test, expect, type Page } from "@playwright/test";

/**
 * ACTIVITY.
 *
 * The arithmetic — ranges, intent, funnel, exclusion — is unit-tested in
 * lib/control/activity.test.ts. These cover what only a browser answers, and
 * the first one is the one that matters most: the page must say the numbers
 * are not real, because nothing is being collected and an analytics screen is
 * exactly where somebody would act on a figure without questioning it.
 */

const URL = "/control-preview/admin/activity";

async function fresh(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!window.localStorage.getItem("__wiped")) {
        window.localStorage.clear();
        window.localStorage.setItem("__wiped", "1");
      }
    } catch {
      /* storage blocked; the tests then measure the seed */
    }
  });
}

async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

async function open(page: Page) {
  await page.goto(URL);
  await hydrated(page);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test.describe("activity", () => {
  test("says the numbers are sample data, above them", async ({ page }) => {
    await open(page);
    // HARD-RULES §1. Not decoration — a founder would make decisions on these.
    const banner = page.locator(".ac-sample");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Sample data");
    await expect(banner).toContainText("nothing is being collected");

    // Above the figures, not below them.
    const bannerBox = (await banner.boundingBox())!;
    const statsBox = (await page.locator(".ac-stats").boundingBox())!;
    expect(bannerBox.y).toBeLessThan(statsBox.y);
  });

  test("shows the four headline figures", async ({ page }) => {
    await open(page);
    const stats = page.locator(".ac-stat");
    await expect(stats).toHaveCount(4);
    await expect(stats.nth(0)).toContainText("Sessions");
    await expect(stats.nth(2)).toContainText("Enquiries");
  });

  test("names where the quiz leaks worst", async ({ page }) => {
    await open(page);
    const quiz = page.locator(".ac-panel", { hasText: "The quiz" });
    await expect(quiz).toContainText("biggest drop-off");
    // The worst step is the only bar worth acting on, so it is the only one
    // that is not the accent colour.
    await expect(quiz.locator(".ac-step__fill[data-worst]")).toHaveCount(1);
  });

  test("changing the range changes the figures", async ({ page }) => {
    await open(page);
    const sessions = page.locator(".ac-stat").first().locator(".ac-stat__v");
    const thirty = await sessions.innerText();

    await page.getByRole("button", { name: "Today", exact: true }).click();
    const todayCount = await sessions.innerText();
    expect(Number(todayCount)).toBeLessThan(Number(thirty));

    await page.getByRole("button", { name: "All time" }).click();
    expect(Number(await sessions.innerText())).toBeGreaterThanOrEqual(Number(thirty));
  });

  test("a custom range is accepted typed backwards", async ({ page }) => {
    await open(page);
    // Otherwise it silently shows nothing, which reads as "no traffic".
    await page.getByLabel("Custom range from").fill("2026-08-03");
    await page.getByLabel("Custom range to").fill("2026-07-01");
    await expect(page.locator(".ac-stat").first().locator(".ac-stat__v")).not.toHaveText("0");
  });

  test("filters narrow the table", async ({ page }) => {
    await open(page);
    const rows = page.locator(".ac-table tbody tr");
    const all = await rows.count();

    await page.getByRole("button", { name: "Enquired" }).click();
    const enquired = await rows.count();
    expect(enquired).toBeGreaterThan(0);
    expect(enquired).toBeLessThan(all);
    await expect(page.locator('.ac-intent[data-level="anonymous"]')).toHaveCount(0);

    await page.getByRole("button", { name: "Everyone" }).click();
    await expect(rows).toHaveCount(all);
  });

  test("sorting reorders the table", async ({ page }) => {
    await open(page);
    const first = page.locator(".ac-table tbody tr").first();
    const byLastSeen = await first.innerText();

    await page.getByLabel("Sort").selectOption("longest");
    const byLongest = await page.locator(".ac-table tbody tr").first().innerText();
    expect(byLongest).not.toBe(byLastSeen);
  });

  test("a country filters the table both ways", async ({ page }) => {
    await open(page);
    const rows = page.locator(".ac-table tbody tr");
    const all = await rows.count();

    await page.locator(".ac-country", { hasText: "Ireland" }).click();
    await expect(rows).toHaveCount(1);
    // Pressing it again clears it, rather than needing a separate reset.
    await page.locator(".ac-country", { hasText: "Ireland" }).click();
    await expect(rows).toHaveCount(all);
  });

  test("a session opens its full detail", async ({ page }) => {
    await open(page);
    await page.locator(".ac-rowbtn").first().click();

    const detail = page.getByRole("dialog", { name: "Session detail" });
    await expect(detail).toBeVisible();
    for (const label of ["IP address", "Time zone", "Landed on", "Came from", "Intent"]) {
      await expect(detail).toContainText(label);
    }
    // Every page, in order, with a time against each.
    const trail = detail.locator(".ac-trail li");
    expect(await trail.count()).toBeGreaterThan(0);
    await expect(trail.first().locator(".ac-trail__t")).not.toBeEmpty();
  });

  test("excluding an address removes it from the totals, not just the table", async ({
    page,
  }) => {
    await open(page);
    const sessions = page.locator(".ac-stat").first().locator(".ac-stat__v");
    const before = Number(await sessions.innerText());

    await page.locator(".ac-rowbtn").first().click();
    await page.getByRole("button", { name: /^This is me/ }).click();

    // The headline figure must move. Filtering the table alone leaves every
    // number counting Ben's own visits while the list claims they are gone.
    await expect(sessions).toHaveText(String(before - 1));
    await expect(page.locator(".ac-excluded li")).toHaveCount(1);
  });

  test("an exclusion can be undone", async ({ page }) => {
    await open(page);
    const sessions = page.locator(".ac-stat").first().locator(".ac-stat__v");
    const before = Number(await sessions.innerText());

    await page.locator(".ac-rowbtn").first().click();
    await page.getByRole("button", { name: /^This is me/ }).click();
    await page.getByRole("button", { name: /Stop excluding/ }).click();

    await expect(sessions).toHaveText(String(before));
  });

  test("the exclusion survives a reload", async ({ page }) => {
    await open(page);
    await page.locator(".ac-rowbtn").first().click();
    await page.getByRole("button", { name: /^This is me/ }).click();

    await page.reload();
    await hydrated(page);
    await expect(page.locator(".ac-excluded li")).toHaveCount(1);
  });

  test("the map plots a pin per location", async ({ page }) => {
    await open(page);
    const pins = page.locator(".ac-map__pin");
    expect(await pins.count()).toBeGreaterThan(3);
    // Enquiries are the ones worth seeing, so they are the accent pins.
    expect(await page.locator(".ac-map__pin[data-enquiry]").count()).toBeGreaterThan(0);
  });

  test("nothing overflows the page sideways", async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // The visitor table scrolls inside itself on a phone; the page does not.
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("no session shows an IP that could belong to a real person", async ({ page }) => {
    await open(page);
    await page.locator(".ac-rowbtn").first().click();
    const ip = await page
      .getByRole("dialog", { name: "Session detail" })
      .locator(".ac-fact")
      .first()
      .innerText();
    // RFC 5737 documentation ranges only. This repository is public.
    expect(ip).toMatch(/(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/);
  });
});

test.describe("activity on a phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= 900, "phone only");

  test("every control clears the touch target", async ({ page }) => {
    await open(page);
    const controls = page.locator(".ac-chip, .ac-country, .ac-rowbtn");
    const n = await controls.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < Math.min(n, 25); i++) {
      const box = await controls.nth(i).boundingBox();
      if (box) expect(box.height, `control ${i}`).toBeGreaterThanOrEqual(36);
    }
  });
});
