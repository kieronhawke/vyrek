import { test, expect } from "@playwright/test";

/**
 * THE RACE REPORT AS A PRINTED DOCUMENT.
 *
 * These assertions are all things that were actually wrong and were only
 * visible by generating a real PDF and looking at it. None of them show up in
 * a screen screenshot, which is why they survived so long.
 *
 * Everything runs in print-media emulation against the demo data source.
 */

const REPORT = "/report/s8-2025-malaga-hyrox-men-1";

test.use({ colorScheme: "light" });

test.beforeEach(async ({ page }) => {
  await page.goto(REPORT);
  await page.emulateMedia({ media: "print" });
});

test("prints on a white page, not a black one", async ({ page }) => {
  /*
   * THE BIG ONE. Every page came out with a near-black frame around the
   * content — rgb(18,18,18) sampled at the corner of a generated PDF. On paper
   * that is most of a toner cartridge per copy and a document that looks
   * broken.
   *
   * Two causes, both in globals.css and both invisible on screen:
   * `color-scheme: dark` painted the canvas, and `height: 100svh` meant the
   * html box stopped at the end of page one so later pages had no background
   * to propagate at all. All three declarations in the fix are load-bearing.
   */
  const root = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { background: cs.backgroundColor, scheme: cs.colorScheme, height: cs.height };
  });

  expect(root.background).toBe("rgb(255, 255, 255)");
  expect(root.scheme).toBe("light");
  // Anything viewport-pinned here truncates the background after page one.
  expect(root.height).not.toMatch(/^(100|[0-9]{3}\.?[0-9]*)px$/);
  expect(Number.parseFloat(root.height)).toBeGreaterThan(2000);

  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(255, 255, 255)");
});

test("opens on a cover page that is hidden on screen", async ({ page }) => {
  const cover = page.locator(".report-print-cover");
  await expect(cover).toBeVisible();
  await expect(cover).toContainText("Race");
  // The athlete has to be identifiable from the cover alone — this is the page
  // somebody sees when the PDF has been forwarded to them.
  await expect(cover).toContainText("HYROX Malaga 2025");

  await page.emulateMedia({ media: "screen" });
  await expect(cover).toBeHidden();
});

test("hides the web cover on paper so page one is not printed twice", async ({ page }) => {
  // Both covers visible was the original "printed web page" look: a rounded
  // header card floating above a real cover.
  await expect(page.locator(".report-cover")).toBeHidden();
});

test("stamps every section with the athlete and event", async ({ page }) => {
  /*
   * Sections start on their own page, so this is the running header. It is
   * generated content driven by `--report-ident`, which the page sets inline —
   * if that ever stops being set the ident silently becomes an empty string
   * and every page loses its identification.
   */
  /*
   * Read the athlete off the page rather than hard-coding one. An earlier
   * version asserted "Edward Edwards", which was true until the demo dataset
   * was regenerated and that result id belonged to somebody else — a test
   * failure that said nothing about the feature. What matters is that the
   * ident matches whoever this report is actually about.
   */
  const athlete = (await page.locator(".report-print-cover__name").textContent())?.trim() ?? "";
  expect(athlete.length).toBeGreaterThan(3);

  const ident = await page.evaluate(() => {
    const el = document.querySelector(".results-report");
    return el ? getComputedStyle(el).getPropertyValue("--report-ident").trim() : "";
  });

  expect(ident).toContain(athlete);
  expect(ident).toContain("HYROX Malaga 2025");

  const rendered = await page.evaluate(() => {
    const section = document.querySelector(".report-section");
    return section ? getComputedStyle(section, "::before").content : "";
  });
  expect(rendered).toContain(athlete);
});

test("ends on a colophon carrying the URL", async ({ page }) => {
  // A forwarded PDF with no address on it is a dead end for everyone who
  // receives it, and this document is the most forwardable thing on the site.
  const colophon = page.locator(".report-print-colophon");
  await expect(colophon).toBeVisible();
  await expect(colophon).toContainText(/report\//);
});

test("keeps the screen-only controls off the page", async ({ page }) => {
  await expect(page.locator(".report-toolbar")).toBeHidden();
});

test("prints section headings large enough to navigate by", async ({ page }) => {
  // On paper the heading is the only wayfinding there is; these printed at
  // roughly body size before.
  const size = await page.evaluate(() => {
    const h = document.querySelector(".report-section h2");
    return h ? Number.parseFloat(getComputedStyle(h).fontSize) : 0;
  });
  expect(size).toBeGreaterThan(24);
});

test("offers a share control on screen", async ({ page }) => {
  /*
   * The reason this exists: on a phone the only action was "Save as PDF",
   * which iOS routes through the print dialog. The share that actually happens
   * after a race is a link into a group chat, and a shared link is the only
   * version of this that search engines can see.
   */
  await page.emulateMedia({ media: "screen" });
  const share = page.getByRole("button", { name: /share report/i });
  await expect(share).toBeVisible();

  // Taken from the page, not hard-coded: the demo dataset is regenerated and
  // the time attached to any given result id is not stable.
  const finishTime = (await page.locator(".report-print-cover__time").textContent())?.trim() ?? "";
  expect(finishTime).toMatch(/^\d+:\d{2}(:\d{2})?$/);

  await share.click();
  const dialog = page.getByRole("dialog", { name: /share this race report/i });
  await expect(dialog).toBeVisible();
  // The message must carry the numbers — "my race report" means nothing to
  // somebody who has not seen one.
  await expect(dialog).toContainText(finishTime);
  await expect(dialog).toContainText(/report\//);
});
