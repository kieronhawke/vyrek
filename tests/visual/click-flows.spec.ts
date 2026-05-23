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

test("nav: Start training CTA goes to quiz (desktop)", async ({
  page,
}, testInfo) => {
  // The desktop Start training pill in the header is `hidden sm:inline-flex`.
  // Mobile users get the same CTA inside the hamburger drawer (covered
  // separately).
  test.skip(testInfo.project.name.startsWith("mobile"), "desktop CTA only");

  await page.goto("/");
  await page.getByRole("link", { name: /start training/i }).first().click();
  await page.waitForURL("**/quiz**");
  expect(page.url()).toContain("/quiz");
});

test("mobile hamburger: Start training CTA reachable", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile only");

  await page.goto("/");
  await page.getByRole("button", { name: /open navigation/i }).click();
  const drawer = page.locator("#mobile-nav-drawer");
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: /start training/i }).click();
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

test("partners: dashboard link reaches the sign-in placeholder", async ({
  page,
}) => {
  await page.goto("/partners");
  await page.getByRole("link", { name: /partner login/i }).click();
  await page.waitForURL("**/partners/dashboard");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
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
  const emails = ["hello@vyrek.com", "support@vyrek.com", "press@vyrek.com"];
  for (const email of emails) {
    const link = page.locator(`a[href="mailto:${email}"]`);
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
  await page.getByRole("button", { name: /open navigation/i }).click();
  const drawer = page.locator("#mobile-nav-drawer");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "programmes" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "how it works" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "journal" })).toBeVisible();
});

test("partner application: client validation rejects empty submit", async ({
  page,
}) => {
  await page.goto("/partners/apply");
  await page.getByRole("button", { name: /submit application/i }).click();
  // The first required input should report invalid via the browser
  const nameInput = page.getByLabel(/your name/i);
  const validity = await nameInput.evaluate(
    (el) => (el as HTMLInputElement).validity.valid,
  );
  expect(validity).toBe(false);
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
