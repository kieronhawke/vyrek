import { test, expect } from "@playwright/test";

/**
 * LINKS THAT GO NOWHERE.
 *
 * A 404 behind an internal link is invisible in review: the linking page looks
 * perfect, and the only way to notice is to follow every link. So this follows
 * them.
 *
 * The bug it was written for: `/rankings` linked to sixteen athletes and six of
 * them 404'd — 38%, on a primary results surface. Every broken one had a
 * disambiguating slug (`samuel-johnson-s8-2025-stockholm-158`), because the
 * demo generator minted those athletes inline but only wrote its 4,000
 * recurring "profiled" athletes into `athletes.json`. The pages linked to
 * people the index had never heard of.
 */

const SURFACES = [
  "/rankings",
  "/rankings/season-bests",
  "/rankings/world-records",
  "/results",
  "/results/city/london",
  "/events",
];

test("every athlete linked from a results surface has a page", async ({ page, request }) => {
  const links = new Set<string>();

  for (const surface of SURFACES) {
    await page.goto(surface, { waitUntil: "load" });
    for (const href of await page.locator("a[href^='/athlete/']").evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""),
    )) {
      if (href) links.add(href);
    }
  }

  expect(links.size, "no athlete links found — the selector or the pages changed")
    .toBeGreaterThan(5);

  const broken: string[] = [];
  for (const href of links) {
    const res = await request.get(href);
    if (res.status() !== 200) broken.push(`${href} (${res.status()})`);
  }

  expect(broken, `dead athlete links: ${broken.join(", ")}`).toEqual([]);
});

test("every event and result linked from the results index resolves", async ({ page, request }) => {
  await page.goto("/results", { waitUntil: "load" });

  const hrefs = await page.locator("a[href^='/event/'], a[href^='/result/'], a[href^='/ranking/']")
    .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href") ?? ""));

  // Sampled rather than exhaustive: the index can carry hundreds of links and
  // the failure mode here is systemic, not one bad row.
  const sample = [...new Set(hrefs.filter(Boolean))].slice(0, 25);
  expect(sample.length).toBeGreaterThan(0);

  const broken: string[] = [];
  for (const href of sample) {
    const res = await request.get(href);
    if (res.status() !== 200) broken.push(`${href} (${res.status()})`);
  }
  expect(broken, `dead links: ${broken.join(", ")}`).toEqual([]);
});
