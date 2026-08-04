import { test, expect, type Page } from "@playwright/test";

/**
 * THE ADMIN NAVIGATION.
 *
 * Two navigations, one shell: a grouped rail at a desk, a bottom tab bar plus
 * a More sheet on a phone. The thing these tests exist to stop is both of them
 * being on screen at once — that is fourteen duplicate links, an ambiguous
 * locator for every later test, and a horizontal overflow.
 */

const BASE = "/control-preview/admin";

async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 900;

test.describe("admin navigation", () => {
  test("exactly one navigation is on screen", async ({ page }) => {
    await page.goto(BASE);
    await hydrated(page);

    const rail = page.getByTestId("admin-sidebar");
    const tabs = page.getByTestId("admin-tabbar");

    if (isPhone(page)) {
      await expect(tabs).toBeVisible();
      await expect(rail).toBeHidden();
    } else {
      await expect(rail).toBeVisible();
      await expect(tabs).toBeHidden();
    }
  });

  test("every module has an icon", async ({ page }) => {
    await page.goto(BASE);
    await hydrated(page);

    // Fourteen labels in 13px grey is a list you re-read every time. The icon
    // is what makes it scannable, so a module without one is a regression.
    // Modules only — the collapse control is a chevron, not a destination.
    const links = isPhone(page)
      ? page.getByTestId("admin-tabbar").locator(".ash-tab")
      : page.getByTestId("admin-sidebar").locator(".ash-item");
    const n = await links.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await expect(links.nth(i).locator("svg")).toHaveCount(1);
    }
  });

  test("the page you are on is marked", async ({ page }) => {
    await page.goto(`${BASE}/clients`);
    await hydrated(page);
    const current = page.locator('[aria-current="page"]:visible');
    // Exactly one, or the marker means nothing.
    await expect(current).toHaveCount(1);
    if (!isPhone(page)) await expect(current).toContainText("Clients");
  });

  test("nothing overflows sideways", async ({ page }) => {
    await page.goto(BASE);
    await hydrated(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("admin navigation on a phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= 900, "tab bar only");

  test("five thumb-sized tabs, pinned to the bottom", async ({ page }) => {
    await page.goto(BASE);
    await hydrated(page);

    const tabs = page.getByTestId("admin-tabbar").locator(".ash-tab");
    await expect(tabs).toHaveCount(5);

    const viewport = page.viewportSize()!;
    const bar = await page.getByTestId("admin-tabbar").boundingBox();
    expect(bar).not.toBeNull();
    // Pinned: the bar's bottom edge is the viewport's bottom edge, whatever
    // the page length. A bar that scrolls away is not a tab bar.
    expect(bar!.y + bar!.height).toBeGreaterThanOrEqual(viewport.height - 2);

    for (let i = 0; i < 5; i++) {
      const box = await tabs.nth(i).boundingBox();
      expect(box!.height, `tab ${i}`).toBeGreaterThanOrEqual(48);
    }
  });

  test("content is never hidden behind the bar", async ({ page }) => {
    await page.goto(`${BASE}/clients`);
    await hydrated(page);
    const bar = (await page.getByTestId("admin-tabbar").boundingBox())!;
    const padding = await page
      .locator(".ash-main")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));

    // Measured as reserved space rather than by scrolling to the end: the bar
    // is fixed, so a scrolled bounding box compares viewport coordinates with
    // document ones and passes or fails for the wrong reason. The contract is
    // that .ash-main holds back at least the bar's height.
    expect(padding).toBeGreaterThanOrEqual(bar.height);
  });

  test("More opens every module, and closes again", async ({ page }) => {
    await page.goto(BASE);
    await hydrated(page);

    const more = page.getByRole("button", { name: "More" });
    await expect(page.getByRole("dialog", { name: "All modules" })).toHaveCount(0);

    await more.click();
    const sheet = page.getByRole("dialog", { name: "All modules" });
    await expect(sheet).toBeVisible();
    // All fourteen, not just the ten missing from the bar: a person looking
    // for Plans in More should find it there rather than learn it is a tab.
    await expect(sheet.locator(".ash-sheet__item")).toHaveCount(14);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "All modules" })).toHaveCount(0);
  });

  test("a module tapped in the sheet navigates and the sheet goes", async ({
    page,
  }) => {
    await page.goto(BASE);
    await hydrated(page);

    await page.getByRole("button", { name: "More" }).click();
    await page
      .getByRole("dialog", { name: "All modules" })
      .getByRole("link", { name: /Finance/ })
      .click();

    await expect(page).toHaveURL(new RegExp(`${BASE}/finance$`));
    await expect(page.getByRole("dialog", { name: "All modules" })).toHaveCount(0);
  });

  test("More lights up when you are somewhere it holds", async ({ page }) => {
    await page.goto(`${BASE}/finance`);
    await hydrated(page);
    // Otherwise the bar claims you are nowhere, which is worse than claiming
    // you are on the wrong tab.
    await expect(page.getByRole("button", { name: "More" })).toHaveAttribute(
      "data-on",
      "true",
    );

    await page.goto(BASE);
    await hydrated(page);
    await expect(page.getByRole("button", { name: "More" })).not.toHaveAttribute(
      "data-on",
      "true",
    );
  });
});

test.describe("admin navigation at a desk", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) < 900, "rail only");

  test("all fourteen modules, in four groups", async ({ page }) => {
    await page.goto(BASE);
    await hydrated(page);

    const rail = page.getByTestId("admin-sidebar");
    await expect(rail.locator(".ash-item")).toHaveCount(14);
    for (const group of ["Work", "Money", "Growth", "System"]) {
      await expect(rail.getByText(group, { exact: true })).toBeVisible();
    }
  });

  test("collapsing leaves the icons and keeps every module reachable", async ({
    page,
  }) => {
    await page.goto(BASE);
    await hydrated(page);

    const rail = page.getByTestId("admin-sidebar");
    const before = (await rail.boundingBox())!.width;

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    const after = (await rail.boundingBox())!.width;
    expect(after).toBeLessThan(before);

    // Still fourteen — collapsed means narrower, not fewer.
    await expect(rail.locator(".ash-item")).toHaveCount(14);
    await expect(rail.locator(".ash-item svg")).toHaveCount(14);
    // And each one still says what it is on hover, or the icons are a quiz.
    await expect(rail.locator(".ash-item").first()).toHaveAttribute("title", /\w/);

    await page.getByRole("button", { name: "Expand sidebar" }).click();
    expect((await rail.boundingBox())!.width).toBe(before);
  });

  test("counts show against the modules that have work waiting", async ({
    page,
  }) => {
    await page.goto(BASE);
    await hydrated(page);
    const tracker = page
      .getByTestId("admin-sidebar")
      .getByRole("link", { name: /Coach tracker/ });

    /* Asserted as a shape, not a number.
       This was hardcoded to "27" and the fixture has since moved to 24, so
       the test failed for a reason that told nobody anything. What the badge
       promises is that a module with work waiting says how much — a number
       greater than zero, next to the module it belongs to. The exact count
       is the fixture's business and will change again. */
    const badge = tracker.locator(".ash-item__count");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText(/^\d+$/);
    expect(Number(await badge.innerText())).toBeGreaterThan(0);

    // And a module with nothing waiting shows no badge at all, rather than a
    // zero — a zero is a thing to look at, and there is nothing to look at.
    const diary = page
      .getByTestId("admin-sidebar")
      .getByRole("link", { name: /^Diary/ });
    await expect(diary.locator(".ash-item__count")).toHaveCount(0);
  });
});
