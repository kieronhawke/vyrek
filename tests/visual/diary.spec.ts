import { test, expect, type Page } from "@playwright/test";

/**
 * THE DIARY CALENDAR.
 *
 * The layout arithmetic is unit-tested in lib/control/diary.test.ts, where it
 * belongs. These cover the things only a browser can answer: that tapping a
 * slot opens the editor already filled in with that slot, that an entry
 * survives a reload, that the three views are exclusive, and that overlapping
 * entries are actually drawn side by side rather than one on top of the other.
 */

const URL = "/control-preview/admin/diary";

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

async function open(page: Page) {
  await page.goto(URL);
  await hydrated(page);
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test.describe("diary", () => {
  test("opens on the week, with the seeded entries in it", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("tab", { name: "Week" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Eight seeded entries: seven timed and one all-day race.
    await expect(page.locator(".dc-event")).toHaveCount(8);
    await expect(page.locator(".dc-event--allday")).toHaveCount(1);
  });

  test("the three views are exclusive", async ({ page }) => {
    await open(page);

    await page.getByRole("tab", { name: "Month" }).click();
    await expect(page.locator(".dc-month")).toBeVisible();
    await expect(page.locator(".dc-grid")).toHaveCount(0);
    // Six rows of seven, always — a grid that changes height makes the page
    // jump on every press of next.
    await expect(page.locator(".dc-day")).toHaveCount(42);

    await page.getByRole("tab", { name: "Day" }).click();
    await expect(page.locator(".dc-grid")).toHaveAttribute("data-cols", "1");
    await expect(page.locator(".dc-month")).toHaveCount(0);

    await page.getByRole("tab", { name: "Week" }).click();
    await expect(page.locator(".dc-grid")).toHaveAttribute("data-cols", "7");
  });

  test("tapping a slot opens the editor on that slot", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Day" }).click();

    // This is the whole reason a calendar beats a list: the thing you tapped
    // is the thing the form already says.
    const slot = page.getByRole("button", { name: /New at 14:00/ });
    await slot.click();

    const editor = page.getByRole("dialog", { name: "New entry" });
    await expect(editor).toBeVisible();
    await expect(editor.locator('input[type="time"]').first()).toHaveValue("14:00");
    // An hour by default, which is what a session is.
    await expect(editor.locator('input[type="time"]').nth(1)).toHaveValue("15:00");
  });

  test("an entry can be added, and survives a reload", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Day" }).click();

    await page.getByRole("button", { name: /New at 15:00/ }).click();
    const editor = page.getByRole("dialog", { name: "New entry" });
    await editor.getByPlaceholder("Track session").fill("Sled technique");
    await editor.getByRole("button", { name: "Race" }).click();
    await editor.getByRole("button", { name: "Add" }).click();

    const made = page.locator(".dc-event", { hasText: "Sled technique" });
    await expect(made).toHaveCount(1);

    await page.reload();
    await hydrated(page);
    await expect(page.locator(".dc-event", { hasText: "Sled technique" })).toHaveCount(1);
  });

  test("an entry can be edited and deleted", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Day" }).click();

    /*
     * ⚠️ THIS TEST USED TO PASS TWO DAYS IN SEVEN.
     *
     * It looked for an entry called "Track session", which the seed places at
     * day offsets 0 and 4 — Monday and Friday. The Day view shows *today*, so
     * on the other five days there was no such entry and the click timed out.
     * It read as a broken diary; it was a test that only worked at the start
     * and end of the week. It happened to be green when it was last run
     * because that run was on a Monday.
     *
     * Whichever entry is on today is fine: the behaviour under test is that an
     * entry can be edited and deleted, not that a particular one exists.
     */
    const first = page.locator(".dc-event").first();
    await expect(first, "no diary entries on today's date at all").toBeVisible();
    const original = ((await first.textContent()) ?? "").trim();
    await first.click();

    const editor = page.getByRole("dialog", { name: "Edit entry" });
    await editor.getByPlaceholder("Track session").fill("Hill reps");
    await editor.getByRole("button", { name: "Save" }).click();

    await expect(page.locator(".dc-event", { hasText: "Hill reps" })).toHaveCount(1);
    expect(original, "the entry kept its old title").not.toContain("Hill reps");

    await page.locator(".dc-event", { hasText: "Hill reps" }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.locator(".dc-event", { hasText: "Hill reps" })).toHaveCount(0);
  });

  test("an end before its start cannot be saved", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Day" }).click();

    await page.getByRole("button", { name: /New at 10:00/ }).click();
    const editor = page.getByRole("dialog", { name: "New entry" });
    await editor.locator('input[type="time"]').nth(1).fill("09:00");

    await expect(editor.getByRole("button", { name: "Add" })).toBeDisabled();
    await expect(page.getByText("The end has to be after the start.")).toBeVisible();
  });

  test("moving the start drags the end with it", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Day" }).click();

    await page.getByRole("button", { name: /New at 10:00/ }).click();
    const editor = page.getByRole("dialog", { name: "New entry" });
    // Otherwise pushing a 10:00–11:00 entry to 12:00 makes it negative and the
    // save button just stops working with no explanation.
    await editor.locator('input[type="time"]').first().fill("12:00");
    await expect(editor.locator('input[type="time"]').nth(1)).toHaveValue("13:00");
    await expect(editor.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  test("overlapping entries are drawn side by side", async ({ page }) => {
    await open(page);
    // Tuesday holds a 07:00 and a 07:30 that overlap. Drawn on top of each
    // other, one of them is invisible and Ben double-books.
    const strength = page.locator(".dc-event", { hasText: "Strength" });
    const consult = page.locator(".dc-event", { hasText: "Consultation" });
    await expect(strength).toBeVisible();
    await expect(consult).toBeVisible();

    const a = (await strength.boundingBox())!;
    const b = (await consult.boundingBox())!;
    const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    expect(overlapX).toBeLessThanOrEqual(4);
  });

  test("today is marked, and Today comes back to it", async ({ page }) => {
    await open(page);
    await expect(page.locator(".dc-col__head[data-today]")).toHaveCount(1);

    const label = page.locator(".dc-label");
    const start = await label.innerText();
    // Scoped to the calendar's own controls — "Next" is not a unique name on
    // an admin page and an unscoped role locator has picked the wrong button
    // in this suite before.
    const nav = page.locator(".dc-nav");
    await nav.getByRole("button", { name: "Next" }).click();
    await expect(label).not.toHaveText(start);
    await nav.getByRole("button", { name: "Today" }).click();
    await expect(label).toHaveText(start);
  });

  test("the reminder says plainly that nothing sends it yet", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Day" }).click();
    await page.getByRole("button", { name: /New at 09:00/ }).click();

    const editor = page.getByRole("dialog", { name: "New entry" });
    await editor.getByRole("combobox").selectOption("30");
    // A reminder that silently does nothing is worse than no reminder.
    await expect(editor.getByText(/Nothing sends it yet/)).toBeVisible();
  });

  test("the view you chose is the view you get back", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Month" }).click();
    await page.reload();
    await hydrated(page);
    await expect(page.getByRole("tab", { name: "Month" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("nothing overflows the page sideways", async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    // The week grid scrolls inside itself on a phone; the page never does.
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("diary on a phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= 900, "phone only");

  test("the week columns stay wide enough to read", async ({ page }) => {
    await open(page);
    const col = (await page.locator(".dc-col").first().boundingBox())!;
    // Seven columns at 393px is 45px a day, which truncates every title to
    // three letters. The grid scrolls sideways instead.
    expect(col.width).toBeGreaterThanOrEqual(96);
  });

  test("every control clears the touch target", async ({ page }) => {
    await open(page);
    const controls = page.locator(".dc-step, .dc-today, .dc-view, .dc-add");
    const n = await controls.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const box = await controls.nth(i).boundingBox();
      if (box) expect(box.height, `control ${i}`).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe("diary at a desk", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) < 900, "desk only");

  test("the editor is a panel, not a full-width sheet", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "+ New" }).click();
    const panel = (await page.locator(".dc-editor__panel").boundingBox())!;
    // A 1400px-wide form holding forty characters is not a form.
    expect(panel.width).toBeLessThanOrEqual(560);
  });

  test("a month day with entries opens that day", async ({ page }) => {
    await open(page);
    await page.getByRole("tab", { name: "Month" }).click();
    await page.locator(".dc-day[data-today]").click();
    await expect(page.getByRole("tab", { name: "Day" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
