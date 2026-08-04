import { test, expect } from "@playwright/test";

/**
 * Quiz smoke test (brief 13.2.2 Test 1, partial).
 *
 * Walks the public quiz entry, asserts the first screen renders, and
 * confirms a Start button is reachable. The full 15-screen happy path is
 * deferred to a focused testing session (requires test-mode account
 * provisioning + email gate handling).
 */

test("quiz entry: opens on the first question, not an animation", async ({
  page,
}) => {
  await page.goto("/quiz", { waitUntil: "networkidle" });

  /* There was a welcome carousel here with a "Find your plan" button. It
     held two full-bleed slides on a timer, so somebody who had just clicked
     "free fitness assessment" waited six seconds watching an animation
     before being asked anything — the only screen in the funnel that took
     time without giving anything back. What has to be true now is simpler
     and stricter: the first thing they see is the first question. */
  await expect(
    page.getByRole("heading", { name: /what brings you to suth performance/i }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("button", { name: /find your plan/i }),
  ).toHaveCount(0);
});

test("partners apply: form renders + required fields present", async ({
  page,
}) => {
  await page.goto("/partners/apply", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: /apply to join/i })).toBeVisible();

  // The form is a multi-screen flow now, so name, email and country are not
  // on the page together. Walking the flow is what actually proves they are
  // all reachable — asserting three labels on one screen only proved the
  // old layout, and kept passing against a page that no longer existed.
  const advance = page.getByRole("button", { name: /continue|submit/i }).last();
  const steps: Array<[RegExp, string]> = [
    [/name/i, "Test Applicant"],
    [/email/i, "applicant@example.com"],
    [/country/i, "United Kingdom"],
  ];

  await advance.click(); // past the intro screen
  for (const [label, value] of steps) {
    const field = page.getByLabel(label).first();
    await expect(field, `${label} field missing`).toBeVisible();
    await field.fill(value);
    await expect(advance, `${label} accepted but could not advance`).toBeEnabled();
    await advance.click();
  }
});
