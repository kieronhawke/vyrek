import { test, expect, type Page } from "@playwright/test";

/**
 * SITE-WIDE SEO AUDIT.
 *
 * Written as a test rather than a one-off check because every one of these
 * fails silently. A missing canonical, a duplicated H1, a description that got
 * truncated to nothing — none of them break a page, none of them show up in a
 * screenshot, and you find out months later from a ranking that never came.
 *
 * The pages below are the ones that have to earn search traffic: the home page,
 * the two commercial pages, and the free tools that bring people in cold.
 */

/* The dev server compiles a route on first request, which can exceed the
   default 30s navigation budget on a cold start. Production is prerendered. */
test.setTimeout(90_000);

const PAGES = [
  "/",
  "/programmes",
  "/how-it-works",
  "/results/tools",
  "/rankings/records",
  "/hyrox/stations",
  "/hyrox/stations/sled-push",
];

type Meta = {
  title: string;
  description: string;
  canonical: string | null;
  ogTitle: string | null;
  ogImage: string | null;
  h1s: string[];
  jsonLdTypes: string[];
  robots: string | null;
};

async function readMeta(page: Page): Promise<Meta> {
  return page.evaluate(() => {
    const attr = (sel: string, name: string) =>
      document.querySelector(sel)?.getAttribute(name) ?? null;
    return {
      title: document.title,
      description: attr('meta[name="description"]', "content") ?? "",
      canonical: attr('link[rel="canonical"]', "href"),
      ogTitle: attr('meta[property="og:title"]', "content"),
      ogImage: attr('meta[property="og:image"]', "content"),
      h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent?.trim() ?? ""),
      jsonLdTypes: [...document.querySelectorAll('script[type="application/ld+json"]')]
        .flatMap((s) => {
          try {
            const d = JSON.parse(s.textContent ?? "{}");
            return Array.isArray(d) ? d.map((x) => x["@type"]) : [d["@type"]];
          } catch {
            return ["INVALID"];
          }
        })
        .filter(Boolean),
      robots: attr('meta[name="robots"]', "content"),
    };
  });
}

for (const path of PAGES) {
  test(`${path} — title and description are usable`, async ({ page }) => {
    await page.goto(path);
    const m = await readMeta(page);

    expect(m.title.length, `${path} has no title`).toBeGreaterThan(10);
    // Google truncates around 60 characters; past that the tail is written for
    // nobody. The layout appends " · Suth Performance", so this is the budget
    // including the brand.
    expect(m.title.length, `${path} title is too long: "${m.title}"`).toBeLessThan(75);

    expect(m.description.length, `${path} has no description`).toBeGreaterThan(50);
    expect(m.description.length, `${path} description is too long`).toBeLessThan(170);
  });

  test(`${path} — has exactly one H1`, async ({ page }) => {
    /*
     * Two H1s is the most common way a page confuses a crawler about what it is
     * actually about, and it happens by accident whenever a hero and a section
     * heading are both promoted.
     */
    await page.goto(path);
    const m = await readMeta(page);
    expect(m.h1s.length, `${path} has ${m.h1s.length} H1s: ${JSON.stringify(m.h1s)}`).toBe(1);
    expect(m.h1s[0].length).toBeGreaterThan(2);
  });

  test(`${path} — declares a canonical and an OG image`, async ({ page }) => {
    await page.goto(path);
    const m = await readMeta(page);
    expect(m.canonical, `${path} has no canonical`).toBeTruthy();
    // Every one of these pages is shareable, and a link with no card is a link
    // people scroll past.
    expect(m.ogImage, `${path} has no og:image`).toBeTruthy();
  });

  test(`${path} — carries the deliberate pre-launch noindex`, async ({ page }) => {
    /*
     * ⚠️ THE WHOLE SITE IS `noindex, nofollow` ON PURPOSE.
     *
     * `app/layout.tsx` sets it under a stated hard rule: no indexing until
     * Kieron explicitly clears it. `next.config.ts` braces it with an
     * `X-Robots-Tag` header, which wins over any per-page value — so flipping
     * the metadata alone would not be enough.
     *
     * This test asserts the pre-launch state rather than the launched one, so
     * that the day it starts failing is the day somebody deliberately opened
     * the site up. Both places have to change together, and this fails loudly
     * if only one of them does.
     *
     * Everything else in this file — titles, canonicals, structured data — is
     * worth getting right now regardless. None of it earns a single visit
     * until this flag is turned over.
     */
    const res = await page.goto(path);

    /*
     * Checked on the HEADER, not the meta tag, because the header is the
     * actual gate — and the two disagree. `/hyrox/stations` and its station
     * routes declare `robots: { index: true }` in their own metadata while
     * every other page inherits `index: false` from the root layout. Today
     * that difference is invisible: `X-Robots-Tag` overrides all of it.
     *
     * Which is exactly why it is worth a test. The header is documented as the
     * one line to delete at launch, and the moment it goes those station pages
     * become the only indexable pages on the site.
     */
    expect(
      res?.headers()["x-robots-tag"] ?? "",
      `${path} is no longer noindex at the header — was that intended?`,
    ).toMatch(/noindex/i);
  });

  test(`${path} — structured data parses`, async ({ page }) => {
    // Invalid JSON-LD is ignored wholesale by search engines, so a single
    // trailing comma silently discards every rich result on the page.
    await page.goto(path);
    const m = await readMeta(page);
    expect(m.jsonLdTypes, `${path} has unparseable JSON-LD`).not.toContain("INVALID");
  });
}

test("titles are unique across the key pages", async ({ page }) => {
  /*
   * Duplicate titles make two pages compete for the same query and neither
   * wins. This has bitten the repo before, when a layout template appended the
   * brand name to titles that already carried it.
   */
  const titles: Record<string, string> = {};
  for (const path of PAGES) {
    await page.goto(path);
    titles[path] = await page.title();
  }
  const seen = Object.values(titles);
  expect(new Set(seen).size, `duplicate titles: ${JSON.stringify(titles, null, 2)}`).toBe(seen.length);
});

test("the brand name is not repeated inside a title", async ({ page }) => {
  // The root layout appends "· Suth Performance". A page that also names the
  // brand prints it twice and spends its title budget on itself.
  for (const path of PAGES) {
    await page.goto(path);
    const title = await page.title();
    const hits = title.toLowerCase().split("suth performance").length - 1;
    expect(hits, `"${title}" names the brand ${hits} times`).toBeLessThanOrEqual(1);
  }
});

test("the home page carries organisation and FAQ markup", async ({ page }) => {
  await page.goto("/");
  const m = await readMeta(page);
  // FAQPage is the one that actually wins surface area on a brand query.
  expect(m.jsonLdTypes).toContain("FAQPage");
});

test("the programmes page carries course and FAQ markup", async ({ page }) => {
  await page.goto("/programmes");
  const m = await readMeta(page);
  expect(m.jsonLdTypes).toContain("ItemList");
  expect(m.jsonLdTypes).toContain("FAQPage");
});

test("no page ships an unresolved placeholder", async ({ page }) => {
  /*
   * Bracketed placeholders are how "to be confirmed" copy reaches production.
   * One was live in the footer of every page until recently.
   */
  for (const path of PAGES) {
    await page.goto(path);
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body, `${path} contains placeholder copy`).not.toMatch(
      /\[[A-Z][A-Z \-_]{6,}\]|lorem ipsum|TO BE CONFIRMED/,
    );
  }
});
