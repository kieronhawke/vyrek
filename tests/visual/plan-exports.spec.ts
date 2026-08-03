import { test, expect, type Page } from "@playwright/test";

/**
 * THE EXPORTS, AND THE PLAN THAT BELONGS TO NOBODY.
 *
 * The workbook's own contract — that it opens, and that it loses no line Ben
 * wrote — is unit-tested in lib/export/plan-xlsx-v2.test.ts against the real
 * bytes. These cover the browser side: that v2 is the designed document, that
 * v1 is still there, and that a standalone plan does not quietly become
 * somebody else's week.
 */

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

test.beforeEach(async ({ page }) => {
  await fresh(page);
});

test.describe("the designed plan", () => {
  test("names the week unmistakably", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    // "Going between different weeks it isn't really clear" was the complaint.
    await expect(page.locator(".p2-head__name")).toHaveText("Haseeb");
    await expect(page.locator(".p2-head__dates")).toContainText("Aug");
    await expect(page.locator(".p2-head__range")).toContainText("2026-08-03");
  });

  test("gives every line an icon and picks out its quantity", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);

    const lines = page.locator(".p2-line:not(.p2-line--connector)");
    const n = await lines.count();
    expect(n).toBeGreaterThan(20);
    // Every one. A line with no icon is a line that fell through the table.
    await expect(page.locator(".p2-line:not(.p2-line--connector) .p2-line__icon svg")).toHaveCount(n);

    // "20 mins ski" reads as a quantity and a thing, not a sentence.
    const ski = page.locator(".p2-line", { hasText: "mins ski" }).first();
    await expect(ski.locator(".p2-qty")).toHaveText("20 mins");
  });

  test("loses nothing Ben wrote", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    // Including the connectors — "into" and "x3" are the shape of a session.
    await expect(page.locator(".p2-line--connector", { hasText: "into" })).toHaveCount(1);
    await expect(page.locator(".p2-line--connector", { hasText: "x3" })).toHaveCount(1);
    await expect(page.getByText("practice hitting the ground quickly")).toBeVisible();
  });

  test("carries the note, the totals and a rest day", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    await expect(page.locator(".p2-note__body")).toContainText("Keep the ski and row easy");
    await expect(page.locator(".p2-fact")).toHaveCount(4);
    await expect(page.locator(".p2-day[data-rest]")).toHaveCount(1);
    // Seven days, always — a missing card is a missing day.
    await expect(page.locator(".p2-day")).toHaveCount(7);
  });

  test("every session has a box to tick with a pen", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    const sessions = await page.locator(".p2-session").count();
    await expect(page.locator(".p2-tick")).toHaveCount(sessions);
  });

  test("keeps the plain version reachable", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    // v1 is the ink-saver and is deliberately kept, not replaced.
    await page.getByRole("link", { name: "Plain version" }).click();
    await expect(page).toHaveURL(/\/print\/plan\/haseeb$/);
    await expect(page.locator(".print")).toBeVisible();
  });

  test("hides its own controls on paper", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    await expect(page.locator(".p2-actions")).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".p2-actions")).toBeHidden();
  });

  test("reserves no space for the cookie banner on paper", async ({ page }) => {
    await page.goto("/print/plan/haseeb/v2");
    await hydrated(page);
    await page.emulateMedia({ media: "print" });
    // globals.css pads the body for the consent strip; on paper that was a
    // 13mm white band above the masthead on every page.
    const pad = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.body).paddingTop),
    );
    expect(pad).toBe(0);
  });
});

test.describe("a plan that belongs to nobody", () => {
  const URL = "/control-preview/admin/plans/new";

  test("starts empty and asks who it is for", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);

    await expect(page.locator(".pb-who")).toBeVisible();
    // Seeding a blank plan with somebody else's training is how a wrong week
    // gets sent.
    const cells = page.locator(".pb-textarea");
    const n = await cells.count();
    for (let i = 0; i < n; i++) {
      await expect(cells.nth(i)).toHaveValue("");
    }
  });

  test("the typed name is what the plan is addressed to", async ({ page }) => {
    await page.goto(URL);
    await hydrated(page);

    await page.locator(".pb-who input").first().fill("Jordan Reeves");
    await expect(page.getByRole("button", { name: /^Send to/ })).toHaveText(
      "Send to Jordan Reeves",
    );

    await page.goto("/print/plan/new/v2");
    await hydrated(page);
    // Never "New" at the top of a training plan.
    await expect(page.locator(".p2-head__name")).toHaveText("Jordan Reeves");
  });

  test("falls back to a title rather than the word New", async ({ page }) => {
    await page.goto("/print/plan/new/v2");
    await hydrated(page);
    await expect(page.locator(".p2-head__name")).toHaveText("Training plan");
  });

  test("is reachable from the plans page", async ({ page }) => {
    await page.goto("/control-preview/admin/plans");
    await hydrated(page);
    await page.getByRole("link", { name: "+ New plan" }).click();
    await expect(page).toHaveURL(/\/plans\/new$/);
  });
});

test.describe("plans do not share a week", () => {
  test("two clients edit two different plans", async ({ page }) => {
    // Every slug not in the fixtures used to fall back to Haseeb, so every
    // athlete reached from the coach tracker opened and edited the same week.
    await page.goto("/control-preview/admin/plans/athlete-a");
    await hydrated(page);
    await page.locator('.pb-cell[data-active="true"]:visible textarea').first().fill("A only");

    await page.goto("/control-preview/admin/plans/athlete-b");
    await hydrated(page);
    await expect(
      page.locator('.pb-cell[data-active="true"]:visible textarea').first(),
    ).not.toHaveValue("A only");

    await page.goto("/control-preview/admin/plans/athlete-a");
    await hydrated(page);
    await expect(
      page.locator('.pb-cell[data-active="true"]:visible textarea').first(),
    ).toHaveValue("A only");
  });
});

test.describe("the workbook routes", () => {
  test("both versions download a real xlsx", async ({ request }) => {
    for (const path of ["xlsx", "xlsx-v2"]) {
      const res = await request.get(`/api/export/haseeb/${path}`);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"]).toContain("spreadsheetml");
      const body = await res.body();
      // "PK" — every zip starts with it, and an xlsx is a zip.
      expect(body.subarray(0, 2).toString("latin1"), path).toBe("PK");
      expect(body.length).toBeGreaterThan(1500);
    }
  });

  test("the v2 file is named as v2", async ({ request }) => {
    const res = await request.get("/api/export/haseeb/xlsx-v2");
    expect(res.headers()["content-disposition"]).toContain("-v2.xlsx");
  });
});
