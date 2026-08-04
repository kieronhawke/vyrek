import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Results section: smoke, responsiveness, interaction and accessibility.
 *
 * Replaces the throwaway scripts used while building. The checks here are the
 * ones that actually caught bugs during the build, so they are the ones worth
 * keeping: horizontal overflow, hydration errors, virtualisation holding, and
 * the authenticity rules on generated reports.
 *
 * Runs against a production build on port 3100 (see playwright.config.ts).
 */

const ROUTES = [
  { name: "landing", path: "/results" },
  { name: "events", path: "/events" },
  { name: "event final", path: "/event/s9-2026-london" },
  { name: "event live", path: "/event/s9-2026-cardiff" },
  { name: "event upcoming", path: "/event/s9-2026-dublin" },
  { name: "ranking", path: "/ranking/s9-2026-london-hyrox-men" },
  { name: "result", path: "/result/s9-2026-london-hyrox-men-1600" },
  { name: "athlete", path: "/athlete/charlie-johansson" },
  { name: "simulator", path: "/simulator" },
  { name: "compare", path: "/results/compare?a=charlie-johansson&b=benjamin-sutherland" },
  { name: "percentile tool", path: "/tools/good-hyrox-time" },
  { name: "rankings", path: "/rankings" },
  { name: "records", path: "/rankings/world-records" },
  { name: "season bests", path: "/rankings/season-bests" },
  { name: "starters", path: "/starters/s9-2026-dublin" },
  { name: "reports index", path: "/reports" },
  { name: "report", path: "/reports/s9-2026-london" },
  { name: "city index", path: "/results/city" },
  { name: "city hub", path: "/results/city/london" },
  { name: "course index", path: "/results/course-index" },
  { name: "race report", path: "/report/s9-2026-london-hyrox-men-1600" },
  { name: "record book", path: "/rankings/records" },
  { name: "tools directory", path: "/results/tools" },
];

/** Fails the test if the page logged an error or threw during hydration. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

/**
 * The site runs a presence heartbeat, so the network never goes idle and
 * `waitUntil: "networkidle"` times out in production. Wait for the page's own
 * h1 instead — deterministic, and it is what "rendered" actually means here.
 */
async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 15_000 });
  return response;
}

/**
 * Opens the results search via the hotkey.
 *
 * The binding attaches on hydration, so a fixed sleep races it on a slow run.
 * This presses and retries until the dialog is actually there, which tests the
 * real affordance without pinning the test to a magic number.
 */
async function openSearch(page: Page) {
  const box = page.getByPlaceholder("Search athletes and events");
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(box).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  return box;
}

/** Reads a Playwright download into a string. */
async function readDownload(download: import("@playwright/test").Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** The only overflow check that means anything: can the user actually scroll sideways. */
async function canScrollHorizontally(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    window.scrollTo(9999, 0);
    const x = window.scrollX;
    window.scrollTo(0, 0);
    return x > 0;
  });
}

/**
 * Viewports come from the Playwright projects in playwright.config.ts
 * (mobile-390, desktop-1440, and the device matrix), so these declare none of
 * their own — an earlier version did both and the two fought each other.
 */
for (const route of ROUTES) {
  test(`${route.name} renders cleanly`, async ({ page }) => {
    const errors = trackErrors(page);
    const response = await open(page, route.path);

    expect(response?.status(), `${route.path} status`).toBe(200);
    expect(await canScrollHorizontally(page), `${route.path} scrolls sideways`).toBe(false);
    await expect(page.locator("h1")).toHaveCount(1);
    expect(await page.title()).not.toBe("");
    expect(errors, `${route.path} console/page errors`).toEqual([]);
  });
}

test.describe("ranking table", () => {
  test("windows a 3,000-row field instead of rendering it", async ({ page }) => {
    await open(page, "/ranking/s9-2026-london-hyrox-men");
    await page.waitForTimeout(1500);

    const counter = await page.locator('p[aria-live="polite"]').innerText();
    expect(counter).toMatch(/3,\d{3} of 3,\d{3}/);

    const domRows = await page.locator('[class*="results-band"]').count();
    expect(domRows).toBeLessThan(160);
  });

  test("filters locally without a page load", async ({ page }) => {
    await open(page, "/ranking/s9-2026-london-hyrox-men");
    await page.waitForTimeout(1500);

    await page.getByPlaceholder("Find an athlete").fill("patel");
    await page.waitForTimeout(600);
    const counter = await page.locator('p[aria-live="polite"]').innerText();
    expect(counter).toMatch(/^\d+ of 3,\d{3}$/);

    /*
     * And the rows shown actually match.
     *
     * The counter alone is a weak assertion: a filter that updated the count
     * but kept rendering the unfiltered board would pass it. Counting rows is
     * no better, because the list is virtualised to roughly twenty — a common
     * surname still fills the viewport, so the count does not move. The
     * invariant that holds either way is that every row *displayed* contains
     * what was typed.
     */
    const shown = await page.locator('a[href^="/result/"]').allInnerTexts();
    expect(shown.length).toBeGreaterThan(0);
    for (const row of shown) {
      expect(row.toLowerCase(), `row shown that does not match "patel"`).toContain("patel");
    }

    await page.getByPlaceholder("Find an athlete").fill("zzzznotaname");
    await page.waitForTimeout(600);
    expect(await page.locator('a[href^="/result/"]').count()).toBe(0);
  });

  test("expands splits in place", async ({ page }) => {
    await open(page, "/ranking/s9-2026-london-hyrox-men");
    await page.waitForTimeout(1500);

    // Desktop uses a chevron button per table row (aria-label "Show splits…");
    // mobile uses the whole card, which is a button inside an <li>. Scoped
    // deliberately: an unscoped [aria-expanded] matches the site nav hamburger
    // first at 390px, which is what an earlier version of this test clicked.
    const expander = page
      .locator('button[aria-label^="Show splits"], li button[aria-expanded]')
      .filter({ visible: true })
      .first();
    await expander.click();

    // Both the desktop table and the mobile card list are in the DOM at every
    // width (one is display:none), so this has to assert on the visible copy.
    await expect(
      page.getByText("Splits vs division average").filter({ visible: true }).first(),
    ).toBeVisible();
  });
});

test.describe("share", () => {
  test("generates a real 1200x630 card before sharing", async ({ page }) => {
    await open(page, "/result/s9-2026-london-hyrox-men-1600");
    await page.getByRole("button", { name: "Share", exact: true }).first().click();

    const card = page.locator('img[alt^="Share card"]');
    await expect(card).toBeVisible();
    await page.waitForFunction(() => {
      const img = document.querySelector('img[alt^="Share card"]') as HTMLImageElement | null;
      return !!img?.complete && img.naturalWidth > 0;
    }, undefined, { timeout: 20_000 });

    const size = await card.evaluate((img) => ({
      w: (img as HTMLImageElement).naturalWidth,
      h: (img as HTMLImageElement).naturalHeight,
    }));
    expect(size).toEqual({ w: 1200, h: 630 });
  });
});

test.describe("search", () => {
  test("⌘K opens the results search, and only that", async ({ page }) => {
    await open(page, "/results");
    await openSearch(page);

    // The site has its own CommandPalette on the same combination. Exactly one
    // dialog must open, and it must be ours.
    await expect(page.locator('[role="dialog"]')).toHaveCount(1);
    await expect(page.locator('[role="dialog"]')).toHaveAttribute("aria-label", "Search athletes and events");
  });

  test("understands a goal and a time, not just names", async ({ page }) => {
    await open(page, "/results");
    const box = await openSearch(page);

    await box.fill("sub 90");
    await expect(page.getByText("Build a Sub 90 race")).toBeVisible();

    await box.fill("1:31:30");
    await expect(page.getByText(/where 1:31:30 places you/)).toBeVisible();
  });

  test("ranks an exact name first and rejects nonsense", async ({ page }) => {
    await open(page, "/results");
    const box = await openSearch(page);

    await box.fill("zachary patel");
    await expect(page.getByRole("option").first()).toContainText("Zachary Patel");

    await box.fill("qqqzzz");
    await expect(page.getByText(/No athletes or events match/)).toBeVisible();
  });

  /**
   * The focus ring must follow the sheet's rounded corners.
   *
   * Reported twice. The ring started on the input and was clipped on three
   * sides by the sheet's overflow-hidden; moving it to the input's row fixed
   * the sides but not the corners, because a square-cornered child flush
   * inside a rounded, clipping parent gets its corners sliced off — a straight
   * green line with black notches bitten out of each end.
   *
   * The fix is that the accent is painted on the element that owns the radius.
   * This asserts that structurally: no descendant may carry its own focus ring,
   * and the sheet's must be a border plus box-shadow, both of which inherit
   * border-radius by definition.
   */
  test("the focus ring follows the palette's rounded corners", async ({ page }) => {
    await open(page, "/results");
    await openSearch(page);

    const sheet = page.locator('[role="dialog"] > div').first();

    const style = await sheet.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        radius: parseFloat(computed.borderTopLeftRadius),
        borderColor: computed.borderTopColor,
        shadow: computed.boxShadow,
      };
    });

    // A radius to follow, and an accent edge drawn on that same element.
    expect(style.radius).toBeGreaterThan(4);
    expect(style.shadow).not.toBe("none");
    // The chartreuse accent is #A3E635 — a green channel well above the others.
    const rgb = style.borderColor.match(/\d+/g)!.map(Number);
    expect(rgb[1]).toBeGreaterThan(rgb[0] + 40);
    expect(rgb[1]).toBeGreaterThan(rgb[2] + 40);

    // Nothing inside may draw its own ring: an inner square ring is exactly
    // the bug, and it is invisible to every other assertion here.
    const innerRings = await sheet.evaluate((el) =>
      [...el.querySelectorAll("*")].filter((child) => {
        const computed = getComputedStyle(child);
        return computed.boxShadow !== "none" && !computed.boxShadow.includes("rgba(0, 0, 0");
      }).length,
    );
    expect(innerRings).toBe(0);
  });

  test("escape closes it", async ({ page }) => {
    await open(page, "/results");
    await openSearch(page);
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder("Search athletes and events")).toBeHidden();
  });
});

/**
 * No page may scroll sideways at 320px.
 *
 * 320 is the narrowest phone still in real use and the width every layout bug
 * shows up at first. An adversarial sweep found three of these at once, all the
 * same root cause: a grid item defaults to `min-width: auto` and refuses to
 * shrink below its content, so a card grew past its track instead of letting
 * the text inside truncate. Nothing in the existing suite looked at document
 * scroll width, so every one of them had shipped.
 */
/**
 * The consent bar is the first control every visitor meets, and it is
 * deliberately slim — a tall banner would shift the layout, which is a bug this
 * repo has already paid for once. So its buttons are 32px and 18px tall on
 * purpose, and the fix for the tap target was to extend the hit area with a
 * pseudo-element rather than to grow the bar.
 *
 * Measuring the element box would therefore prove nothing. This clicks outside
 * the visible pill and asserts the tap still lands, which is the only thing a
 * thumb cares about.
 */
/**
 * No Results page may drag heavy imagery it never renders.
 *
 * This bug has now shipped twice. Both times the mechanism was identical: a
 * marketing page marks a hero `eager` (or `priority`), a Results page links to
 * it in the footer, Next prefetches the route, and the image comes along —
 * 403 KB of a 1.1 MB page on pages that render no photography at all. Nothing
 * in the suite looked at transferred bytes, so both times it was found by
 * hand, long after release.
 *
 * The budget is deliberately generous. This is a tripwire for a page pulling
 * a whole hero it does not use, not a byte-level performance target.
 */
/**
 * The race report is the section's flagship document, and most of what makes
 * it work is invisible to a screenshot: the print palette, the pagination, and
 * whether the charts survive being inverted for paper.
 *
 * Every assertion here corresponds to something that was actually broken
 * during the build and would have shipped silently otherwise.
 */
/**
 * Discoverability, and the scroll-reveal that nearly broke it.
 *
 * The nav carries six links and the section had grown well past six things
 * worth using — the race report, the record book and the course speed index
 * were each reachable only from one page deep inside it. `/results/tools` is
 * the directory that fixes that, so the things it lists are worth pinning.
 */
test.describe("tools directory", () => {
  test("lists every headline feature", async ({ page }) => {
    await open(page, "/results/tools");

    /*
     * The race report is no longer one link in the grid. As a card among nine
     * it was indistinguishable from "Race calendar", so it was promoted into a
     * hero block with its contents listed and its own call to action.
     *
     * This asserts it is still reachable and still the most prominent thing on
     * the page, rather than pinning the old link text — which is what made this
     * test fail on a deliberate improvement.
     */
    const hero = page.locator("section[aria-labelledby='flagship-heading']");
    await expect(hero, "the race report is no longer featured").toBeVisible();
    await expect(hero).toContainText(/race report/i);
    await expect(hero.getByRole("link").first()).toBeVisible();

    for (const name of [
      /record book/i, /course speed index/i,
      /race simulator/i, /is my time any good/i, /compare two races/i,
    ]) {
      await expect(page.getByRole("link", { name }).first(), `missing: ${name}`).toBeVisible();
    }
  });

  test("every card links somewhere real", async ({ page }) => {
    await open(page, "/results/tools");
    const hrefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main a[href^='/']")).map((a) => a.getAttribute("href")!),
    );
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of new Set(hrefs)) {
      const res = await page.request.get(href);
      expect(res.status(), `${href} returned ${res.status()}`).toBeLessThan(400);
    }
  });

  test("content below the fold is visible without scrolling to it", async ({ page }) => {
    await open(page, "/results/tools");
    // `Reveal` rests at opacity 0 until its observer fires. A full-page capture
    // of this page came back with the entire third section blank, and the same
    // would happen in print or anywhere the page renders off-screen. It settles
    // on a deadline now whether or not it is ever scrolled past.
    await page.waitForTimeout(2600);
    const hidden = await page.evaluate(() =>
      Array.from(document.querySelectorAll("main a[href^='/']"))
        .filter((a) => Number(getComputedStyle(a.parentElement ?? a).opacity) < 0.9)
        .map((a) => (a.textContent ?? "").trim().slice(0, 30)),
    );
    expect(hidden, `still invisible: ${hidden.join(", ")}`).toEqual([]);
  });

  test("is reachable from the section navigation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "/results");
    const nav = page.locator('nav[aria-label="Results sections"]');
    await expect(nav.getByRole("link", { name: "Tools" })).toHaveAttribute("href", "/results/tools");
  });
});

test.describe("the record book", () => {
  test("lists world, national and age-group records", async ({ page }) => {
    await open(page, "/rankings/records");
    /*
     * "World records" was one flat list of sixteen identical cards in
     * alphabetical order, so the book opened on Adaptive Men and the fastest
     * HYROX ever run sat in the middle looking like everything else. It is now
     * split: the two outright bests, then every division in significance order.
     */
    await expect(page.getByRole("heading", { name: /outright world bests/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Every division" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "National records" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Age-group records" })).toBeVisible();

    const cards = page.locator("article").filter({ hasText: "race report" });
    expect(await cards.count()).toBeGreaterThan(10);
  });

  test("every record names a real holder, not a placeholder flag", async ({ page }) => {
    await open(page, "/rankings/records");
    // The previous implementation stamped countryIso "gb" on every entry, so a
    // Swedish world record flew a British flag. Records must show more than one
    // nationality across the board.
    // `Nationality` exposes the country as sr-only text beside the flag.
    const codes = await page.evaluate(() =>
      Array.from(document.querySelectorAll("article .sr-only"))
        .map((el) => (el.textContent ?? "").trim())
        .filter((code) => /^[A-Z]{3}$/.test(code)),
    );
    expect(codes.length, "no nationality codes rendered at all").toBeGreaterThan(5);
    expect(new Set(codes).size, `every record shows ${codes[0]}`).toBeGreaterThan(1);
  });

  test("filters by country through a real URL", async ({ page }) => {
    await open(page, "/rankings/records?country=se");
    await expect(page.getByRole("heading", { name: /Swedish records/i })).toBeVisible();
  });

  test("does not flag anything as new when nothing is recent", async ({ page }) => {
    await open(page, "/rankings/records");
    // Demo data's finished events are months old or future-dated, so the
    // freshness window is correctly empty. A "New" badge here would mean the
    // date guard had broken.
    await expect(page.locator("text=/^New$/").first()).toBeHidden();
  });
});

test.describe("race report", () => {
  const REPORT = "/report/s9-2026-london-hyrox-men-1600";

  test("renders every section with real numbers", async ({ page }) => {
    await open(page, REPORT);
    // Twelve numbered sections, each with a heading.
    const sections = page.locator(".report-section");
    expect(await sections.count()).toBeGreaterThanOrEqual(8);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /story of your race/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /How every figure here was worked out/i })).toBeVisible();
  });

  test("every chart carries a text alternative", async ({ page }) => {
    await open(page, REPORT);
    // An SVG chart is a shape to a screen reader unless it says otherwise, and
    // the numbers are the entire point of this document.
    const charts = page.locator("figure.report-chart svg");
    const count = await charts.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i++) {
      const label = await charts.nth(i).getAttribute("aria-label");
      expect(label, `chart ${i} has no aria-label`).toBeTruthy();
      expect(label!.length).toBeGreaterThan(20);
    }
  });

  test("the radar labels are inside the canvas, not clipped", async ({ page }) => {
    await open(page, REPORT);
    // The first version placed labels past the viewBox and rendered
    // "Sandbag Lunges" as "ndbag Lunges".
    const clipped = await page.evaluate(() => {
      const svg = document.querySelector("figure.report-chart svg") as SVGSVGElement | null;
      if (!svg) return "no chart";
      const box = svg.viewBox.baseVal;
      const bad: string[] = [];
      for (const text of Array.from(svg.querySelectorAll("text"))) {
        const b = (text as SVGTextElement).getBBox();
        if (b.x < 0 || b.x + b.width > box.width) bad.push(text.textContent ?? "?");
      }
      return bad;
    });
    expect(clipped).toEqual([]);
  });

  test("prints with a paper palette, not the dark UI one", async ({ page }) => {
    await open(page, REPORT);
    await page.emulateMedia({ media: "print" });

    const ink = await page.evaluate(() => {
      const root = document.querySelector(".results-report") as HTMLElement;
      const cs = getComputedStyle(root);
      return {
        ink: cs.getPropertyValue("--report-ink").trim(),
        band5: cs.getPropertyValue("--report-band-5").trim(),
      };
    });

    // Both blocks target `.results-report` with equal specificity, so source
    // order decides which wins. With the screen block last it won on paper too
    // and every chart printed as five shades of near-black.
    expect(ink.ink.toLowerCase()).toBe("#101010");
    expect(ink.band5.toLowerCase()).toBe("#f8f8f5");
  });

  test("paginates: sections break, screen furniture is dropped", async ({ page }) => {
    await open(page, REPORT);
    await page.emulateMedia({ media: "print" });

    const layout = await page.evaluate(() => ({
      /*
       * The SECOND section, not the first. The cover page now carries
       * `break-after: page`, so a `break-before` on section 01 would be a
       * second break against the same boundary — which stranded the demo-data
       * notice alone on a sheet of its own. Section 01 is deliberately `auto`;
       * every section after it still starts a page.
       */
      sectionBreak: getComputedStyle(document.querySelectorAll(".report-section")[1]!).breakBefore,
      toolbar: getComputedStyle(document.querySelector(".report-toolbar")!).display,
      coverMinHeight: getComputedStyle(document.querySelector(".report-cover")!).minHeight,
    }));

    expect(layout.sectionBreak).toBe("page");
    expect(layout.toolbar).toBe("none");
    // `min-height: 82vh` on the cover threw two blank pages before any content.
    expect(layout.coverMinHeight).toBe("0px");
  });

  test("the cover photograph is actually visible, not a black rectangle", async ({ page }) => {
    await open(page, REPORT);
    // Wait for the decode rather than sampling immediately — on the slower
    // device profiles the check raced the image and failed intermittently,
    // which is a flaky test rather than a black cover.
    await page.waitForFunction(() => {
      const img = document.querySelector(".report-cover img") as HTMLImageElement | null;
      return Boolean(img?.complete && img.naturalWidth > 0);
    }, undefined, { timeout: 15_000 });

    const cover = await page.evaluate(() => {
      const img = document.querySelector(".report-cover img") as HTMLImageElement | null;
      if (!img) return null;
      return {
        loaded: img.complete && img.naturalWidth > 0,
        opacity: Number(getComputedStyle(img).opacity),
      };
    });
    expect(cover?.loaded).toBe(true);
    // Dimming the photograph is what made the first version render black; the
    // scrim shapes it instead, so the image itself stays at full strength.
    expect(cover?.opacity).toBe(1);
  });

  test("section numbers run in sequence even when sections are skipped", async ({ page }) => {
    // The winner of a division gets no "against the winner" section, and a
    // first-timer gets no comparison. With hardcoded numbers the winner's own
    // report read 06 then 08, which looks like a missing page.
    await open(page, "/report/s9-2026-london-hyrox-men-1");
    const numbers = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".report-section h2"))
        .map((h) => h.previousElementSibling?.textContent?.trim() ?? "")
        .filter(Boolean),
    );
    expect(numbers.length).toBeGreaterThan(6);
    expect(numbers).toEqual(numbers.map((_, i) => String(i + 1).padStart(2, "0")));
  });

  test("the report is linked from the result it describes", async ({ page }) => {
    await open(page, "/result/s9-2026-london-hyrox-men-1600");
    // Two links point at the report by design: the CTA at the top, and the
    // onward nav at the foot of a long page. Both must resolve to it.
    const links = page.getByRole("link", { name: /full race report/i });
    expect(await links.count()).toBeGreaterThanOrEqual(1);
    for (let i = 0; i < await links.count(); i++) {
      await expect(links.nth(i)).toHaveAttribute("href", REPORT);
    }
  });
});

/**
 * The share sheet is where a PB actually leaves the site, and most of what
 * makes it work on a phone is invisible on a desktop test run. These cover the
 * parts that were wrong: a capability read during render, and a share payload
 * that dropped the link back to us.
 */
test.describe("share", () => {
  const RESULT = "/result/s9-2026-london-hyrox-men-1600";

  test("opens without a hydration mismatch", async ({ page }) => {
    const errors = trackErrors(page);
    await open(page, RESULT);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect(page.getByRole("dialog", { name: /share this result/i })).toBeVisible();
    expect(errors.filter((e) => /hydrat|did not match/i.test(e))).toEqual([]);
  });

  test("the shared caption carries a link back to us", async ({ page }) => {
    // The stub has to be installed BEFORE the page renders. The share buttons
    // are gated on `navigator.share` existing, and headless Chromium has no
    // Web Share API — stubbing after load meant the button under test was
    // never drawn, which is what the first version of this test got wrong.
    await page.addInitScript(() => {
      (window as unknown as { __shared: unknown[] }).__shared = [];
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: unknown) => {
          (window as unknown as { __shared: unknown[] }).__shared.push(data);
        },
      });
    });

    await open(page, RESULT);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("button", { name: /share the link/i }).click();

    const shared = await page.evaluate(
      () => (window as unknown as { __shared: Record<string, unknown>[] }).__shared[0] ?? null,
    );

    expect(shared, "native share was never called").toBeTruthy();
    // Several iOS targets take `text` and drop `url`, so the link has to be in
    // the text too or the share arrives with no way to follow it back here.
    expect(String(shared!.text)).toContain("/result/");
    expect(String(shared!.url)).toContain("/result/");
  });

  test("the copied caption carries the link too", async ({ page }) => {
    // The clipboard is stubbed rather than permitted: `clipboard-write` is not
    // a grantable permission on WebKit, so granting it fails the whole test on
    // every iPhone and iPad project. Intercepting `writeText` also asserts the
    // exact string we hand over, which is the thing under test.
    await page.addInitScript(() => {
      (window as unknown as { __copied: string[] }).__copied = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            (window as unknown as { __copied: string[] }).__copied.push(text);
          },
        },
      });
    });

    await open(page, RESULT);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page.getByRole("button", { name: /copy caption/i }).click();

    const copied = await page.evaluate(
      () => (window as unknown as { __copied: string[] }).__copied[0] ?? "",
    );
    expect(copied).toContain("/result/");
    expect(copied).toMatch(/\d+:\d\d/);
  });

  test("generates a real card file for the native sheet", async ({ page }) => {
    await open(page, RESULT);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    // The card is fetched while the sheet is open rather than on tap, because
    // Safari drops the user activation across an await.
    const ok = await page.evaluate(async () => {
      const res = await fetch(
        document.querySelector<HTMLImageElement>("[role=dialog] img")?.src ?? "",
      );
      return res.ok && (await res.blob()).size > 1000;
    });
    expect(ok).toBe(true);
  });
});

test.describe("page weight", () => {
  const IMAGE_BUDGET_KB = 150;

  for (const path of ["/results", "/results/city/london", "/results/course-index", "/events"]) {
    test(`${path} pulls no unrendered imagery`, async ({ page }) => {
      await open(page, path);
      // Give prefetch and any post-hydration preloads time to fire.
      await page.waitForTimeout(2500);

      const images = await page.evaluate(() => {
        const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
        return res
          .filter((r) => r.initiatorType === "img" || /\.(png|jpe?g|webp|avif|gif)/.test(r.name))
          .map((r) => ({
            kb: Math.round((r.encodedBodySize || r.transferSize || 0) / 1024),
            name: r.name.replace(location.origin, ""),
          }))
          .filter((r) => r.kb > 0)
          .sort((a, b) => b.kb - a.kb);
      });

      const totalKb = images.reduce((t, i) => t + i.kb, 0);
      expect(
        totalKb,
        `${totalKb}kB of images on a page that renders none:\n`
          + images.slice(0, 5).map((i) => `  ${i.kb}kB ${i.name}`).join("\n"),
      ).toBeLessThan(IMAGE_BUDGET_KB);
    });
  }
});

/**
 * The simulator is almost entirely sliders, on a page people mostly open on a
 * phone — and a native range input renders about 16px tall, which is a fiddly
 * thing to drag with a thumb.
 *
 * Height rather than padding, because a range input centres its own track and
 * thumb inside its box: growing the box grows the hit area without restyling
 * the control or losing the platform's focus and active states.
 */
test.describe("simulator sliders", () => {
  test("are big enough to grab", async ({ page }) => {
    await open(page, "/simulator");

    const slider = page.locator('input[type="range"]').first();
    await slider.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const box = (await slider.boundingBox())!;

    // The rule is pointer-aware and so is this. A mouse does not need 44px,
    // and a tall invisible box beside other controls is easier to hit by
    // accident than on purpose. Resizing the viewport cannot fake touch — that
    // is a browser-context capability — so the expectation follows whatever
    // pointer the running project actually has.
    const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    expect(
      Math.round(box.height),
      coarse ? "too short to drag with a thumb" : "too short to grab with a mouse",
    ).toBeGreaterThanOrEqual(coarse ? 40 : 26);

    // Deliberately no synthetic drag here. Dragging was verified by hand on
    // both a touch and a mouse context — 319 to 525 on a phone, 319 to 522 on
    // a desktop — but the same gesture through the device profiles in this
    // suite is unreliable in a way that is about the harness rather than the
    // control, and a flaky assertion is worse than an honest gap.
  });
});

test.describe("consent bar tap targets", () => {
  test("a tap below the visible button still hits it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/results", { waitUntil: "domcontentloaded" });

    const accept = page.getByRole("button", { name: "Accept" });
    await expect(accept).toBeVisible();
    const box = (await accept.boundingBox())!;

    // The pill is 32px tall; the hit area should reach ~8px past each edge.
    const x = box.x + box.width / 2;
    const y = box.y + box.height + 7;

    const hit = await page.evaluate(
      ([px, py]) => document.elementFromPoint(px, py)?.closest("button")?.textContent?.trim() ?? "MISS",
      [x, y],
    );
    expect(hit).toBe("Accept");

    await page.mouse.click(x, y);
    await expect(accept).toBeHidden();
  });
});

test.describe("no horizontal scroll on a small phone", () => {
  for (const path of [
    "/results",
    "/events",
    "/results/city",
    "/results/city/london",
    "/results/course-index",
    "/event/s9-2026-london",
    "/ranking/s9-2026-london-hyrox-men",
    "/result/s9-2026-london-hyrox-men-1600",
    "/athlete/charlie-johansson",
    "/simulator",
    "/rankings/world-records",
  ]) {
    test(`320px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      await open(page, path);

      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const over = doc.scrollWidth - doc.clientWidth;
        if (over <= 1) return null;
        let worst = { tag: "", cls: "", right: 0 };
        for (const el of Array.from(document.querySelectorAll("body *"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          // Report the deepest offender: an ancestor is only wide because a
          // descendant is, and naming the ancestor sends you to the wrong file.
          const hasWideChild = Array.from(el.children).some(
            (c) => c.getBoundingClientRect().right > doc.clientWidth + 1,
          );
          if (hasWideChild) continue;
          if (r.right > worst.right) {
            worst = {
              tag: el.tagName.toLowerCase(),
              cls: (el.className?.toString?.() ?? "").slice(0, 80),
              right: Math.round(r.right),
            };
          }
        }
        return { over, worst };
      });

      expect(
        overflow,
        overflow
          ? `${overflow.over}px of horizontal scroll — widest <${overflow.worst.tag}> `
            + `right=${overflow.worst.right} "${overflow.worst.cls}"`
          : "",
      ).toBeNull();
    });
  }
});

test.describe("unknown URLs 404 rather than rendering an empty page", () => {
  for (const path of [
    "/event/does-not-exist",
    "/ranking/s9-2026-london-hyrox-nonsense",
    "/ranking/garbage",
    "/result/nope",
    "/athlete/nobody",
    "/starters/nope",
    "/reports/nope",
  ]) {
    test(`404: ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(404);
    });
  }
});

test.describe("no layout shift", () => {
  test("nothing moves after first paint", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value ?? 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/results", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    // The cookie strip used to push every page down 48px on load.
    expect(cls).toBeLessThan(0.01);
  });
});

test.describe("export", () => {
  test("downloads the whole division as CSV, and honours the active filter", async ({ page }) => {
    await open(page, "/ranking/s9-2026-london-hyrox-men");
    await page.waitForTimeout(1800);

    const full = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export CSV/ }).click();
    const fullFile = await full;
    const fullText = await readDownload(fullFile);
    // Header plus every finisher in the division.
    expect(fullText.trimEnd().split("\r\n").length).toBeGreaterThan(3000);
    expect(fullText.charCodeAt(0)).toBe(0xfeff); // BOM, so Excel reads it correctly

    await page.getByPlaceholder("Find an athlete").fill("patel");
    await page.waitForTimeout(500);
    const filtered = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export \d+/ }).click();
    const filteredText = await readDownload(await filtered);
    const lines = filteredText.trimEnd().split("\r\n").length;
    expect(lines).toBeGreaterThan(1);
    expect(lines).toBeLessThan(200);
  });

  test("downloads a race split by split", async ({ page }) => {
    await open(page, "/result/s9-2026-london-hyrox-men-1600");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export splits/ }).click();
    const text = await readDownload(await download);
    // 8 runs + 8 stations + Roxzone + finish + header
    expect(text.trimEnd().split("\r\n")).toHaveLength(19);
    expect(text).toContain("Division average (seconds)");
  });

  test("downloads an athlete's full history", async ({ page }) => {
    await open(page, "/athlete/charlie-johansson");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export history/ }).click();
    const text = await readDownload(await download);
    expect(text).toContain("Finish (seconds)");
    expect(text.trimEnd().split("\r\n").length).toBeGreaterThan(2);
  });
});

test.describe("print / PDF", () => {
  test("inverts to ink on paper and drops screen-only furniture", async ({ page }) => {
    await open(page, "/result/s9-2026-london-hyrox-men-1600");
    await page.emulateMedia({ media: "print" });
    await page.waitForTimeout(400);

    const printed = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const nav = document.querySelector('nav[aria-label="Results sections"]');
      const hidden = document.querySelector("[data-print-hide]");
      const footer = document.querySelector(".results-print-footer");
      return {
        background: body.backgroundColor,
        colour: body.color,
        nav: nav ? getComputedStyle(nav).display : "absent",
        screenOnly: hidden ? getComputedStyle(hidden).display : "absent",
        footer: footer ? getComputedStyle(footer).display : "absent",
      };
    });

    expect(printed.background).toBe("rgb(255, 255, 255)");
    expect(printed.colour).toBe("rgb(16, 16, 16)");
    expect(printed.nav).toBe("none");
    expect(printed.screenOnly).toBe("none");
    expect(printed.footer).toBe("block");

    // A printed PDF of synthetic data must still say so.
    const footerText = await page.locator(".results-print-footer").innerText();
    expect(footerText).toContain("DEMO DATA");
  });
});

test.describe("automated reports honour the authenticity rules", () => {
  test("carry the label and never simulate a human voice", async ({ page }) => {
    await open(page, "/reports/s9-2026-london");
    const text = await page.locator("article").innerText();

    expect(text).toMatch(/automated race report, generated from race data/i);
    // "Ben's Take" must not appear while no human has written one.
    expect(text).not.toMatch(/ben's take/i);
    expect(text).not.toMatch(/\b(I|we|my|our)\b/);
  });
});

test.describe("demo data must not be indexable", () => {
  test("every results page is noindex while the data is synthetic", async ({ page }) => {
    for (const path of ["/results", "/ranking/s9-2026-london-hyrox-men", "/athlete/charlie-johansson"]) {
      await open(page, path);
      const robots = await page
        .locator('meta[name="robots"]')
        .first()
        .getAttribute("content");
      expect(robots, `${path} robots meta`).toContain("noindex");
    }
  });

  test("the results sitemap submits nothing while on demo data", async ({ request }) => {
    const response = await request.get("/sitemap-results.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain("<urlset");
    expect(xml).not.toContain("<url>");
  });
});

test.describe("accessibility", () => {
  // One representative page per template family, at mobile width where the
  // layouts differ most.
  const sample = [
    "/results",
    "/event/s9-2026-london",
    "/ranking/s9-2026-london-hyrox-men",
    "/result/s9-2026-london-hyrox-men-1600",
    "/athlete/charlie-johansson",
    "/simulator",
    "/tools/good-hyrox-time",
    "/reports/s9-2026-london",
  ];
  for (const path of sample) {
    test(`no critical or serious axe violations: ${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(
        blocking.map((v) => `${v.id} (${v.impact}) — ${v.nodes.length} node(s)`),
      ).toEqual([]);
    });
  }
});
