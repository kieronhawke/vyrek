import { test, expect } from "@playwright/test";

/**
 * Click-through tests: every major CTA must navigate to the right place.
 * Catches dead links, wrong hrefs, and broken nav.
 */

test("nav: primary links navigate (desktop)", async ({ page }, testInfo) => {
  // The top nav is hidden under md breakpoint; mobile users go via the
  // hamburger drawer, which is covered in a separate test. Skip on
  // mobile-* projects to avoid false negatives.
  test.skip(testInfo.project.name.startsWith("mobile"), "desktop nav only");

  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("link", { name: "programmes", exact: true }).click();
  await page.waitForURL("**/programmes");
  expect(page.url()).toContain("/programmes");

  await page.goto("/");
  await page.getByRole("link", { name: "how it works", exact: true }).click();
  await page.waitForURL("**/how-it-works");
  expect(page.url()).toContain("/how-it-works");

  await page.goto("/");
  await page.getByRole("link", { name: "journal", exact: true }).click();
  await page.waitForURL("**/blog");
  expect(page.url()).toContain("/blog");
});

test("nav: primary CTA books a call (desktop)", async ({
  page,
}, testInfo) => {
  // The desktop CTA pill in the header is `hidden sm:inline-flex`.
  // Mobile users get the same CTA inside the hamburger drawer (covered
  // separately).
  test.skip(testInfo.project.name.startsWith("mobile"), "desktop CTA only");

  /* The primary path is the free consultation, not the quiz. Both routes
     exist, but only one can be the button in the nav, and they ask for very
     different things: a call costs half an hour and nothing else, the quiz
     starts a fifteen-screen questionnaire that ends in a price. Changed
     deliberately; this test moved with it. */
  await page.goto("/");
  await page.getByRole("link", { name: /book a free call/i }).first().click();
  await page.waitForURL("**/book**");
  expect(page.url()).toContain("/book");
});

test("mobile hamburger: primary CTA reachable", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile only");

  await page.goto("/");
  await page.getByRole("button", { name: /open navigation/i }).click();
  const drawer = page.locator("#mobile-nav-drawer");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: /build my plan/i }).click();
  await page.waitForURL("**/quiz**");
  expect(page.url()).toContain("/quiz");
});

test("footer: legal links work", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();
  await page.waitForURL("**/legal/privacy");

  await page.goto("/");
  await page.getByRole("link", { name: "Terms" }).click();
  await page.waitForURL("**/legal/terms");

  await page.goto("/");
  await page.getByRole("link", { name: "Cookies" }).click();
  await page.waitForURL("**/legal/cookies");

  await page.goto("/");
  await page.getByRole("link", { name: "Refunds" }).click();
  await page.waitForURL("**/legal/refunds");
});

test("partners: apply button reaches the form", async ({ page }) => {
  await page.goto("/partners");
  await page.getByRole("link", { name: /apply to join/i }).first().click();
  await page.waitForURL("**/partners/apply");
  await expect(page.getByRole("heading", { name: /apply to join/i })).toBeVisible();
});

test("partners: dashboard link reaches the magic-link sign-in form", async ({
  page,
}) => {
  await page.goto("/partners");
  await page.getByRole("link", { name: /partner login/i }).click();
  await page.waitForURL("**/partners/dashboard");
  // The dashboard renders the magic-link form for unauthenticated visitors.
  await expect(
    page.getByRole("heading", { name: /open your dashboard/i }),
  ).toBeVisible();
  await expect(page.getByLabel(/partner email/i)).toBeVisible();
});

test("programmes: each programme has a Start CTA going to quiz", async ({
  page,
}) => {
  await page.goto("/programmes");
  const startButtons = page.getByRole("link", { name: /start this programme/i });
  const count = await startButtons.count();
  expect(count).toBeGreaterThanOrEqual(4);

  // Click the first one and verify it routes to /quiz with a program param
  await startButtons.first().click();
  await page.waitForURL(/\/quiz\?program=/);
  expect(page.url()).toMatch(/\/quiz\?program=(first-race|sub-90|doubles|pro)/);
});

test("how-it-works: Find your plan CTA reaches quiz", async ({ page }) => {
  await page.goto("/how-it-works");
  const cta = page.getByRole("link", { name: /find your plan/i }).first();
  await cta.click();
  await page.waitForURL("**/quiz**");
});

test("about: Find your plan CTA reaches quiz", async ({ page }) => {
  await page.goto("/about");
  await page.getByRole("link", { name: /find your plan/i }).first().click();
  await page.waitForURL("**/quiz**");
});

test("contact: each mailto link is well-formed", async ({ page }) => {
  await page.goto("/contact");
  const emails = ["hello@suthperformance.com", "support@suthperformance.com", "press@suthperformance.com"];
  for (const email of emails) {
    // `.first()`: hello@ legitimately appears in the page body *and* the
    // footer, and strict mode fails on two matches. What is being asserted
    // is that the address is present and well-formed, not that it is unique.
    const link = page.locator(`a[href="mailto:${email}"]`).first();
    await expect(link).toBeVisible();
  }
});

test("press: brand-guidelines + brand asset downloads exist", async ({
  page,
}) => {
  await page.goto("/press");
  const guidelines = page.getByRole("link", { name: /brand guidelines/i });
  await expect(guidelines).toBeVisible();
  const href = await guidelines.getAttribute("href");
  expect(href).toBe("/press/brand-guidelines");

  // The asset download links should all have href attributes pointing to
  // assets in /public.
  for (const path of ["/logo-primary.svg", "/logo-monogram.svg", "/icon-512.png"]) {
    const link = page.locator(`a[href="${path}"]`);
    await expect(link.first()).toBeVisible();
  }
});

test("hamburger drawer opens on mobile and contains all primary links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /open navigation/i });
  await toggle.click();

  /* Found through aria-controls rather than a hardcoded id.
     The drawer id is generated with useId() — it had to be, because the nav
     renders more than once per document (a page and its loading skeleton),
     and a fixed id appeared two or three times on every blog route. This
     test still looked for "#mobile-nav-drawer" and so found nothing.
     Following aria-controls also checks the wiring the fix was for. */
  const drawerId = await toggle.getAttribute("aria-controls");
  expect(drawerId, "the toggle must point at a drawer").toBeTruthy();
  // An attribute selector, because useId() ids contain characters
  // (colons) that are not valid unescaped in a CSS id selector.
  const drawer = page.locator(`[id="${drawerId}"]`);
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "programmes" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "how it works" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "journal" })).toBeVisible();
});

test("partner application: an empty step cannot be advanced", async ({
  page,
}) => {
  await page.goto("/partners/apply");

  // The form became a multi-screen flow, so the old assertion — click
  // "Submit application", expect the browser to mark a text input invalid —
  // described a page that no longer exists. The guarantee it was protecting
  // still holds, and is now enforced a better way: `canAdvance()` gates the
  // button, so an unanswered screen cannot be got past at all rather than
  // being submitted and bounced.
  const advance = page.getByRole("button", { name: /continue|submit/i }).last();
  await expect(advance).toBeVisible();

  // Screen 1 is an intro with nothing to answer, so it is meant to be
  // advanceable. Screen 2 asks for a name, and is the first screen where an
  // empty answer must block progress.
  await advance.click();
  await expect(page.getByLabel(/name/i).first()).toBeVisible();
  await expect(
    advance,
    "an empty name was allowed through to the next screen",
  ).toBeDisabled();
});

test("quiz welcome: tapping next slide advances the carousel", async ({
  page,
}) => {
  await page.goto("/quiz");
  // The carousel renders a heading per slide. After tapping the
  // background-overlay button, the headline should change.
  const firstHeadline = await page
    .locator("h1#welcome-heading")
    .textContent();

  await page.getByRole("button", { name: /next slide/i }).click();
  await page.waitForTimeout(400);

  const secondHeadline = await page
    .locator("h1#welcome-heading")
    .textContent();
  expect(secondHeadline).not.toEqual(firstHeadline);
});
