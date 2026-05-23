import { test, expect } from "@playwright/test";

/**
 * Quiz smoke test (brief 13.2.2 Test 1, partial).
 *
 * Walks the public quiz entry, asserts the first screen renders, and
 * confirms a Start button is reachable. The full 15-screen happy path is
 * deferred to a focused testing session (requires test-mode account
 * provisioning + email gate handling).
 */

test("quiz entry: welcome carousel renders + Find your plan CTA is reachable", async ({
  page,
}) => {
  await page.goto("/quiz", { waitUntil: "networkidle" });

  // The quiz is a client component that mounts the welcome carousel
  // immediately. The primary CTA is a <button>Find your plan</button>.
  const findYourPlan = page
    .getByRole("button", { name: /find your plan/i })
    .first();
  await expect(findYourPlan).toBeVisible();
});

test("partners apply: form renders + required fields present", async ({
  page,
}) => {
  await page.goto("/partners/apply", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: /apply to join/i })).toBeVisible();
  await expect(page.getByLabel(/your name/i)).toBeVisible();
  await expect(page.getByLabel(/^email$/i)).toBeVisible();
  await expect(page.getByLabel(/country/i)).toBeVisible();
});
