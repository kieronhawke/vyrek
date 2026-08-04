import { test, expect } from "@playwright/test";

/**
 * PAGE-WEIGHT BUDGETS.
 *
 * Every regression these guard against was the same mistake: a raw `<img>`
 * pointing at a full-resolution original, bypassing the Next image optimiser
 * entirely. It is invisible in review — the page looks correct, the file is
 * committed, and the only symptom is that somebody on mobile data waits.
 *
 * `/hyrox/events` was the worst: 111 race cards each pulling an 1800x1013
 * source into a 331x166 slot, 1.9 MB of photography for about 150 KB of
 * visible pixels.
 *
 * Budgets are set roughly 40% above the measured figure after the fix, so
 * ordinary content changes do not trip them but a reintroduced raw `<img>`
 * does.
 */

const BUDGETS: { route: string; imgKb: number; note: string }[] = [
  { route: "/hyrox/events", imgKb: 450, note: "111 race cards; was 1914 KB" },
  { route: "/how-it-works", imgKb: 380, note: "4 step images; was 1570 KB" },
  { route: "/about", imgKb: 220, note: "2 inline photos; was 586 KB" },
];

for (const b of BUDGETS) {
  test(`${b.route} stays within its image budget (${b.note})`, async ({ page }) => {
    await page.goto(b.route, { waitUntil: "load" });
    await page.waitForTimeout(1200);

    const imgKb = await page.evaluate(() =>
      Math.round(
        performance
          .getEntriesByType("resource")
          .filter((r) => (r as PerformanceResourceTiming).initiatorType === "img")
          .reduce((s, r) => s + ((r as PerformanceResourceTiming).transferSize || 0), 0) / 1024,
      ),
    );

    expect(imgKb, `${b.route} shipped ${imgKb} KB of images`).toBeLessThan(b.imgKb);
  });
}

test("no page ships a raw <img> pointing at an unoptimised original", async ({ page }) => {
  /*
   * The root cause, asserted directly. `next/image` rewrites to
   * `/_next/image?url=…`; anything still pointing straight at `/media/…` is
   * bypassing the optimiser and will serve the full-size original.
   */
  for (const route of ["/hyrox/events", "/how-it-works", "/about"]) {
    await page.goto(route, { waitUntil: "load" });
    const raw = await page.evaluate(() =>
      [...document.querySelectorAll("img")]
        .map((i) => i.getAttribute("src") ?? "")
        .filter((s) => s.startsWith("/media/")),
    );
    expect(raw, `${route} has unoptimised images: ${raw.join(", ")}`).toEqual([]);
  }
});

test("the home page does not fetch its hero still twice", async ({ page }) => {
  /*
   * The `<video poster>` pointed at the same file as the `priority` `<Image>`
   * beneath it, so the home page fetched that photograph twice: once through
   * the optimiser and once raw, 247 KB for a frame nobody could see.
   */
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1500);

  const heroFetches = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .filter((n) => n.includes("pair-frontal-bw")).length,
  );
  expect(heroFetches, "the hero still is being fetched more than once").toBeLessThanOrEqual(1);
});
