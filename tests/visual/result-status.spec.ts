import { test, expect } from "@playwright/test";

/**
 * DISQUALIFICATIONS, DID-NOT-FINISHES, AND TIME PENALTIES.
 *
 * The model carried `finished | dnf` and nothing else, so a DSQ was either
 * dropped or — through `status === "dnf" ? "dnf" : "finished"` — promoted to a
 * valid finish. The report page compounded it by checking whether the *event*
 * had finished and never whether the *athlete* had.
 */

const DSQ = "/report/s8-2025-malaga-hyrox-men-dsq-archie-romero-s8-2025-malaga-257";
const PENALISED = "/report/s9-2026-glasgow-hyrox-men-6";

test("a disqualified entry still has a page", async ({ page }) => {
  /*
   * It used to 404. `getResult` filtered on "is this a finish", which answers
   * a different question from "does this row exist" — and to the athlete a
   * 404 reads as the site having lost their race. They are the person most
   * likely to come looking.
   */
  const res = await page.goto(DSQ);
  expect(res?.status()).toBe(200);
});

test("a disqualified entry says so, prominently", async ({ page }) => {
  await page.goto(DSQ);
  const notice = page.getByRole("note").filter({ hasText: /disqualified/i });
  await expect(notice).toBeVisible();
  // The two claims that assume a valid finish have to be withdrawn explicitly.
  await expect(notice).toContainText(/does not stand/i);
  await expect(notice).toContainText(/percentile do not apply/i);
});

test("a time penalty is explained rather than left as a discrepancy", async ({ page }) => {
  /*
   * Organisers publish the penalised finish, so an athlete reading their own
   * report finds their splits do not add up to their total, with nothing
   * anywhere accounting for the difference.
   */
  await page.goto(PENALISED);
  const notice = page.getByRole("note").filter({ hasText: /penalty/i });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/Officials added/i);
  await expect(notice).toContainText(/already includes it/i);
});

test("a clean finish gets no notice at all", async ({ page }) => {
  // A banner on every page is wallpaper by the second one, and stops being
  // read exactly when it matters.
  await page.goto("/report/s8-2025-malaga-hyrox-men-1");
  await expect(page.getByRole("note").filter({ hasText: /disqualified|penalty/i }))
    .toHaveCount(0);
});

test("no disqualified athlete appears in the record book", async ({ page }) => {
  /*
   * The reason the whole status change exists. A struck result must never be
   * eligible for a world, national or age-group record.
   */
  await page.goto("/rankings/records");
  const body = (await page.locator("body").textContent()) ?? "";
  expect(body).not.toMatch(/\bDSQ\b|disqualified/i);

  const hrefs = await page.locator("a[href^='/report/']").evaluateAll((as) =>
    as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));
  for (const href of hrefs) {
    expect(href, `${href} is a disqualified result in the record book`).not.toContain("-dsq-");
  }
});
