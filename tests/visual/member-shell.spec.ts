import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * MEMBER SHELL GATES
 *
 * These exist because of four defects that all shipped, and all of which a
 * gate this cheap would have caught:
 *
 *  1. The tab bar had no breakpoint at all, so a mobile bar stretched the
 *     full width of a desktop monitor.
 *  2. Four of the seven member pages set no max-width, so Account rendered
 *     its label hard-left and its value hard-right across the whole screen.
 *  3. /app/nutrition and /app/analysis were in no navigation anywhere — two
 *     working sections reachable only by typing the URL.
 *  4. The preview mount re-exported auth-gated pages, so the ungated preview
 *     redirected to /login and could not preview anything.
 *
 * The preview mount is used rather than /app because /app needs Supabase.
 * Same shell, same screens, no auth boundary.
 */

const SCREENS = [
  { path: "/control-preview/app/today", name: "today" },
  { path: "/control-preview/app/account", name: "account" },
  { path: "/control-preview/app/plan", name: "plan" },
  { path: "/control-preview/app/progress", name: "progress" },
];

/** Every destination the member navigation must offer. */
const REQUIRED_TABS = ["Today", "Plan", "Fuel", "Progress", "Account"];

test.describe("member shell", () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: exactly one navigation is visible`, async ({
      page,
      viewport,
    }) => {
      await page.goto(screen.path);
      const tabbar = page.locator(".member-tabbar");
      const rail = page.locator(".member-rail");

      const wide = (viewport?.width ?? 0) >= 768;
      // Not "at least one" — exactly one. The admin shipped a bug where the
      // mobile card stack rendered underneath every desktop table because an
      // inline style beat a non-!important display:none, and nobody saw it.
      await expect(tabbar).toBeVisible({ visible: !wide });
      await expect(rail).toBeVisible({ visible: wide });
    });

    test(`${screen.name}: page never scrolls sideways`, async ({ page }) => {
      await page.goto(screen.path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`${screen.name}: content column is bounded`, async ({ page }) => {
      await page.goto(screen.path);
      const width = await page
        .locator(".member-main")
        .evaluate((el) => el.getBoundingClientRect().width);
      // 760px is --member-max; the allowance is the horizontal padding.
      expect(width).toBeLessThanOrEqual(760 + 80);
    });

    test(`${screen.name}: reaches every section of the app`, async ({ page }) => {
      await page.goto(screen.path);
      for (const label of REQUIRED_TABS) {
        await expect(
          page.getByRole("link", { name: label, exact: true }).first(),
        ).toBeAttached();
      }
    });

    test(`${screen.name}: no text below 12px`, async ({ page }) => {
      await page.goto(screen.path);
      const tooSmall = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const text = (el.textContent ?? "").trim();
          if (!text || el.children.length > 0) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size && size < 12) bad.push(`${size}px "${text.slice(0, 30)}"`);
        }
        return bad;
      });
      expect(tooSmall).toEqual([]);
    });

    test(`${screen.name}: no accessibility violations`, async ({ page }) => {
      await page.goto(screen.path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test("the preview mount renders rather than redirecting to login", async ({
    page,
  }) => {
    const res = await page.goto("/control-preview/app/today");
    expect(res?.status()).toBe(200);
    expect(page.url()).toContain("/control-preview/app/today");
  });

  test("/app is a redirect, not a second home page", async ({ request }) => {
    const res = await request.get("/app", { maxRedirects: 0 });
    expect([307, 308]).toContain(res.status());
    // Signed out, middleware gets there first and sends you to sign in; signed
    // in, the page itself forwards to /app/today. Either way /app never renders
    // a screen of its own, which is the thing being asserted — there were two
    // home pages before this, on different fixtures and different tokens.
    const location = res.headers()["location"] ?? "";
    expect(location).toMatch(/\/login|\/app\/today/);
  });
});
