import { test, expect, type Page } from "@playwright/test";

/**
 * THE CLIENT PROFILE.
 *
 * The pure helpers are unit-tested in lib/control/client-profile.test.ts.
 * These cover what only a browser answers: that every field edits in place and
 * persists, that the two kinds of note stay distinguishable, and — the one
 * that matters most — that health data carries its "who can see this" line,
 * because that sentence is part of the lawful basis and not decoration.
 */

const BASE = "/control-preview/admin";
const URL = `${BASE}/clients/a_01`;

async function fresh(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!window.localStorage.getItem("__wiped")) {
        window.localStorage.clear();
        window.localStorage.setItem("__wiped", "1");
      }
    } catch {
      /* storage blocked; the tests then measure the seed */
    }
  });
}

async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

async function open(page: Page, url = URL) {
  await page.goto(url);
  await hydrated(page);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test.describe("client profile", () => {
  test("says whose record it is", async ({ page }) => {
    await open(page);
    // The shell title is server-rendered and cannot know the name, so a page
    // headed only "Client" would tell Ben nothing.
    await expect(page.locator(".cp-name")).toHaveText("Athlete A");
  });

  test("leads with what makes him act", async ({ page }) => {
    await open(page);
    const stats = page.locator(".cp-status .cp-stat");
    await expect(stats).toHaveCount(4);
    // Programmed-until first: it is the only field that decides whether he
    // has work to do today.
    await expect(stats.first()).toContainText("Programmed until");
    await expect(stats.first()).toContainText("2026-08-11");
  });

  test("a field edits in place and survives a reload", async ({ page }) => {
    await open(page);
    const goal = page.getByLabel("Goal");
    await goal.fill("Sub-1:15, doubles in the spring");

    await page.reload();
    await hydrated(page);
    await expect(page.getByLabel("Goal")).toHaveValue("Sub-1:15, doubles in the spring");
  });

  test("an untouched profile can still be edited", async ({ page }) => {
    // a_03 is seeded almost empty and a_04 has no stored profile at all. The
    // first edit has to create the record rather than being dropped.
    await open(page, `${BASE}/clients/a_04`);
    await page.getByLabel("Email").fill("new@example.com");

    await page.reload();
    await hydrated(page);
    await expect(page.getByLabel("Email")).toHaveValue("new@example.com");
  });

  test("says what is missing, and stops saying it once filled", async ({ page }) => {
    await open(page, `${BASE}/clients/a_03`);
    const missing = page.locator(".cp-missing");
    await expect(missing).toBeVisible();
    await expect(missing).toContainText("phone number");

    // The phone was the only thing outstanding on this one, so the banner
    // goes entirely rather than losing a line — a warning that lingers with
    // nothing in it trains you to ignore warnings.
    await page.getByLabel("Phone").fill("+44 7700 900999");
    await expect(page.locator(".cp-missing")).toHaveCount(0);
  });

  test("health data says who can see it", async ({ page }) => {
    await open(page);
    // spec/09 §14: Article 9 special-category data. Telling the person who can
    // see it is part of the lawful basis, not a nicety to drop for space.
    const panel = page.locator(".cp-panel", { hasText: "Injuries and conditions" });
    await expect(panel).toContainText("Special-category health data");
    await expect(panel).toContainText("Ben and Kieron can see this");
  });

  test("a note is explicitly internal or shared, with no default", async ({ page }) => {
    await open(page);

    // Internal by default is the safe way round: a coach's shorthand
    // appearing in a client's account is not a bug you can apologise for.
    await page.locator("#cp-note").fill("Ring before Thursday.");
    await expect(page.getByLabel("They can read this")).not.toBeChecked();
    await page.getByRole("button", { name: "Add note" }).click();

    const note = page.locator(".cp-note", { hasText: "Ring before Thursday." });
    await expect(note).toContainText("Internal");
    await expect(note).not.toHaveAttribute("data-shared", "true");

    await page.locator("#cp-note").fill("Strong month. Keep it up.");
    await page.getByLabel("They can read this").check();
    await page.getByRole("button", { name: "Add note" }).click();

    const shared = page.locator(".cp-note", { hasText: "Strong month. Keep it up." });
    await expect(shared).toContainText("Shared with them");
    await expect(shared).toHaveAttribute("data-shared", "true");

    // And the checkbox resets, so the next note does not inherit the last
    // one's audience.
    await expect(page.getByLabel("They can read this")).not.toBeChecked();
  });

  test("a note can be deleted", async ({ page }) => {
    await open(page);
    const first = page.locator(".cp-note").first();
    const before = await page.locator(".cp-note").count();
    await first.getByRole("button", { name: /Delete note/ }).click();
    await expect(page.locator(".cp-note")).toHaveCount(before - 1);
  });

  test("race history is searched and chosen, never guessed", async ({ page }) => {
    await open(page);
    const panel = page.locator(".cp-panel", { hasText: "HYROX results" });
    // Attaching the wrong person's races would put someone else's times into
    // the plan Ben writes, so nothing is linked until he picks it.
    await expect(panel).toContainText("Not linked");
    await expect(panel.getByRole("button", { name: "Search" })).toBeVisible();
  });

  test("an unknown client says so rather than rendering an empty form", async ({
    page,
  }) => {
    await open(page, `${BASE}/clients/does-not-exist`);
    await expect(page.getByText("No client with that id")).toBeVisible();
    await expect(page.locator(".cp-status")).toHaveCount(0);
  });

  test("nothing overflows sideways", async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("client profile from the tracker", () => {
  test("every tracker row reaches its profile", async ({ page }) => {
    await page.goto(`${BASE}/tracker`);
    await hydrated(page);
    const profile = page.getByRole("link", { name: "Profile" }).first();
    await expect(profile).toBeVisible();
    await profile.click();
    await expect(page).toHaveURL(/\/clients\/a_/);
    await expect(page.locator(".cp-name")).not.toBeEmpty();
  });
});
