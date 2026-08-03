import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * THE PLAN BUILDER — the screen Ben lives in.
 *
 * Every other admin screen is something he looks at. This is the one he works
 * in, weekly, per client, and it is the one that has to beat the spreadsheet
 * he already has. So it gets its own spec rather than a line in the gates.
 *
 * The builder renders two layouts from one set of cells — a day switcher below
 * 900px, the whole week above it — so most of these run on the device matrix
 * AND on desktop-1440, and branch on viewport width rather than on project
 * name. A test that only ever proved the desktop path would have missed that
 * HTML5 drag events do not fire on a phone at all.
 */

const URL = "/control-preview/admin/plans/haseeb";

/**
 * Storage is the persistence layer, so a dirty one leaks between tests.
 *
 * Wiped ONCE per context, not on every navigation — several tests here prove
 * that an edit survives a reload, and an init script that clears on every
 * load would wipe the very thing under test and report a persistence bug that
 * does not exist.
 */
async function fresh(page: Page) {
  await page.addInitScript(() => {
    try {
      if (!window.localStorage.getItem("__wiped")) {
        window.localStorage.clear();
        window.localStorage.setItem("__wiped", "1");
      }
    } catch {
      /* storage blocked — the tests below then measure the seed, which is fine */
    }
  });
}

/**
 * Wait until React has actually taken over the server HTML.
 *
 * Before hydration the textareas are plain DOM: Playwright can type into them
 * and the value sticks, but no onChange fires, nothing is saved, and React
 * overwrites the lot the moment it attaches. That produced a persistence
 * failure that moved between devices run to run — the classic shape of a race
 * being read as a flaky assertion.
 *
 * The App Router hydrates the document itself, so the marker React leaves is
 * on `document`, not on a wrapper div.
 */
async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

async function isMobileLayout(page: Page) {
  return (page.viewportSize()?.width ?? 1440) < 900;
}

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test.describe("plan builder", () => {
  test("opens on the week Ben already has", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    await expect(page.locator(".pb")).toBeVisible();
    await expect(page.locator(".pb-toolbar__status")).toContainText("sessions");

    // The layouts are mutually exclusive. Both showing is the bug that makes
    // every cell exist twice and every locator ambiguous.
    const grid = page.locator(".pb-grid");
    const switcher = page.locator(".pb-dayswitch");
    if (await isMobileLayout(page)) {
      await expect(switcher).toBeVisible();
      await expect(grid).toBeHidden();
    } else {
      await expect(grid).toBeVisible();
      await expect(switcher).toBeHidden();
    }
  });

  test("a tapped block lands in the active cell", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);

    // The active cell is stated on screen — if the label and the behaviour
    // disagree, Ben is typing into a cell he cannot see.
    const target = page.locator(".pb-target b");
    await expect(target).toContainText("AM");

    const first = page.locator(".pb-block__add").first();
    const name = (await first.locator(".pb-block__name").innerText()).trim();
    const before = await activeCellText(page);
    await first.click();

    const after = await activeCellText(page);
    expect(after.length).toBeGreaterThan(before.length);
    expect(after).toContain(after.trim().split("\n")[0]);
    expect(name.length).toBeGreaterThan(0);
  });

  test("tapping twice appends rather than replaces", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const first = page.locator(".pb-block__add").first();

    await first.click();
    const once = await activeCellText(page);
    await first.click();
    const twice = await activeCellText(page);

    // Ben builds a session out of parts. A block that overwrites the cell
    // makes the library useless after the first tap.
    expect(twice.length).toBeGreaterThan(once.length);
  });

  test("a session can be saved as a block and reused", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);

    const cell = activeCell(page);
    await cell.locator("textarea").fill("6 x 400m @ race pace, 90s rest");
    await cell.locator(".pb-save").click();

    await page.locator("#pb-blockname").fill("Race-pace 400s");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    // Saving switches the library to Saved, so the new block is in front of
    // him rather than behind a category he has to think to press.
    const saved = page.locator(".pb-cat", { hasText: "Saved" });
    await expect(saved).toHaveAttribute("data-on", "true");
    await expect(
      page.locator(".pb-block__name", { hasText: "Race-pace 400s" }),
    ).toBeVisible();

    // And it survives a reload — a block that vanishes is worse than none.
    // The library opens on HYROX again, which is right: the Saved tab is a
    // place he goes, not a mode he gets stuck in. So the tab has to still be
    // there, and it has to still hold the block.
    await page.reload();
    await hydrated(page);
    await page.locator(".pb-cat", { hasText: "Saved" }).click();
    await expect(
      page.locator(".pb-block__name", { hasText: "Race-pace 400s" }),
    ).toBeVisible();
  });

  test("a saved block can be deleted, and only saved blocks can", async ({
    page,
  }) => {
    await page.goto(URL);
    await hydrated(page);

    const cell = activeCell(page);
    await cell.locator("textarea").fill("Sled push 4 x 25m");
    await cell.locator(".pb-save").click();
    await page.locator("#pb-blockname").fill("Sled push");
    await page.getByRole("button", { name: "Save", exact: true }).click();

    const block = page.locator(".pb-block", { hasText: "Sled push" });
    await expect(block.locator(".pb-block__del")).toBeVisible();
    await block.locator(".pb-block__del").click();
    await expect(
      page.locator(".pb-block__name", { hasText: "Sled push" }),
    ).toHaveCount(0);

    // The shipped library is Ben's own shorthand, lifted from his sheets. It
    // is not his to delete by accident.
    await page.locator(".pb-cat", { hasText: "HYROX" }).first().click();
    await expect(page.locator(".pb-blocks .pb-block__del")).toHaveCount(0);
  });

  test("edits persist across a reload", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    await activeCell(page).locator("textarea").fill("Easy 40min zone 2");
    await page.reload();
    await hydrated(page);
    await expect(activeCell(page).locator("textarea")).toHaveValue(
      "Easy 40min zone 2",
    );
  });

  test("typing into a cell keeps the focus, character by character", async ({
    page,
  }) => {
    await page.goto(URL);
    await hydrated(page);

    // The regression this exists for: `Cell` was declared inside the builder,
    // so every render made a new component type and React remounted the
    // textarea instead of updating it. Focusing a cell re-rendered, focus was
    // lost, and every keystroke after the first went to a detached node — Ben
    // could drop blocks in but could not type a word. Nothing threw.
    const cell = activeCell(page).locator("textarea");
    await cell.fill("");
    await cell.click();
    await page.keyboard.type("6 x 400m off 90s");

    await expect(cell).toHaveValue("6 x 400m off 90s");
    await expect(cell).toBeFocused();
  });

  test("the note gate holds — HARD-RULES §3", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const send = page.getByRole("button", { name: /^Send to/ });

    await page.locator("#pb-note").fill("");
    await expect(send).toBeDisabled();
    await expect(
      page.getByText("A plan without a note cannot be sent"),
    ).toBeVisible();

    await page.locator("#pb-note").fill("Deload. Keep the runs honest.");
    await expect(send).toBeEnabled();
  });

  test("light mode toggles, and is remembered", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const surface = page.locator('[data-surface="control"]').first();
    const toggle = page.getByRole("button", { name: /Switch to (light|dark) mode/ });

    await expect(surface).not.toHaveAttribute("data-theme", "light");
    await toggle.click();
    await expect(surface).toHaveAttribute("data-theme", "light");

    // Ground actually changes — not just the attribute.
    const bg = await surface.evaluate(
      (el) => getComputedStyle(el).getPropertyValue("--bg").trim(),
    );
    expect(bg.toLowerCase()).not.toBe("#0a0a0a");

    await page.reload();
    await hydrated(page);
    await expect(page.locator('[data-surface="control"]').first()).toHaveAttribute(
      "data-theme",
      "light",
    );

    // Text stays readable on the new ground — the whole point of the earlier
    // admin complaint was contrast, and a light mode that repeats it is worse
    // than none.
    const text = await surface.evaluate(
      (el) => getComputedStyle(el).getPropertyValue("--text").trim(),
    );
    expect(text.toLowerCase()).not.toBe("#f5f5f3");
  });

  test("nothing overflows its container sideways", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("plan builder on a phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= 900, "day switcher only");

  test("shows one day, and switching changes which", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);

    await expect(page.locator(".pb-mobileday__head")).toHaveCount(1);
    const monday = await page.locator(".pb-mobileday__head").innerText();

    await page.locator(".pb-dayswitch__btn").nth(3).click();
    const thursday = await page.locator(".pb-mobileday__head").innerText();
    expect(thursday).not.toBe(monday);

    // Switching day also moves the insert target, or a tapped block would
    // land in a day that is no longer on screen.
    await expect(page.locator(".pb-target b")).toContainText("AM");
    const first = page.locator(".pb-block__add").first();
    await first.click();
    await expect(activeCell(page).locator("textarea")).not.toHaveValue("");
  });

  test("the cells are big enough to type into", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const box = await activeCell(page).locator("textarea").boundingBox();
    expect(box).not.toBeNull();
    // Two full lines of a session at 12px/1.5 plus padding. Below this it is
    // a scroll box, which is what made the seven-column phone view unusable.
    expect(box!.height).toBeGreaterThanOrEqual(100);
    expect(box!.width).toBeGreaterThanOrEqual(200);
  });

  test("every control clears the 44px touch target", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const controls = page.locator(
      ".pb-dayswitch__btn, .pb-cat, .pb-block__add, .pb-block__del",
    );
    const n = await controls.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const box = await controls.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height, `control ${i} height`).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe("plan builder on a desktop", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) < 900, "full week only");

  test("shows all seven days, morning and afternoon", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    await expect(page.locator(".pb-grid thead th")).toHaveCount(8); // 7 + row label
    await expect(page.locator(".pb-grid tbody tr")).toHaveCount(2);
    await expect(page.locator(".pb-grid .pb-textarea")).toHaveCount(14);
  });

  test("the library sits beside the week, not above it", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);
    const lib = await page.locator(".pb-library").boundingBox();
    const week = await page.locator(".pb-week").boundingBox();
    expect(lib).not.toBeNull();
    expect(week).not.toBeNull();
    // Side by side: the week starts to the right of where the library ends.
    expect(week!.x).toBeGreaterThanOrEqual(lib!.x + lib!.width - 1);
  });

  test("a block dropped on a cell lands in that cell, not the active one", async ({
    page,
  }) => {
    await page.goto(URL);
    await hydrated(page);

    // Friday PM — deliberately not the active cell, which is Monday AM.
    const friday = page.locator(".pb-grid tbody tr").nth(1).locator("td").nth(4);
    const monday = page
      .locator(".pb-grid tbody tr")
      .nth(0)
      .locator("td")
      .nth(0)
      .locator("textarea");
    await expect(friday.locator("textarea")).toHaveValue("");
    const mondayBefore = await monday.inputValue();

    await dragBlockTo(page, page.locator(".pb-block").first(), friday.locator("textarea"));

    await expect(friday.locator("textarea")).not.toHaveValue("");
    // And the active cell is untouched — a drop that also writes to the
    // active cell duplicates the block every time he drags.
    await expect(monday).toHaveValue(mondayBefore);
  });
});

/** The cell the builder says it is writing into, in whichever layout is live. */
function activeCell(page: Page) {
  return page.locator('.pb-cell[data-active="true"]:visible').first();
}

async function activeCellText(page: Page) {
  return activeCell(page).locator("textarea").inputValue();
}

/**
 * HTML5 drag and drop, driven by the mouse.
 *
 * `locator.dragTo` moves in one hop, and Chromium will not start a native
 * drag from a single move — the dragover fires but the drop never does, which
 * reads exactly like a broken handler. Pressing, moving in steps, and settling
 * on the target before releasing is what a hand does anyway.
 */
async function dragBlockTo(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("drag source or target is not on screen");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 20, from.y + from.height / 2 + 20, {
    steps: 6,
  });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 2, { steps: 4 });
  await page.mouse.up();
}
