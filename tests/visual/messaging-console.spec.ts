import { test, expect, type Page } from "@playwright/test";

/**
 * THE MESSAGING CONSOLE.
 *
 * The rules — classification, SMS cost, what may not be sent — are unit-tested
 * in lib/control/messaging.test.ts. These cover the browser side, and the one
 * that matters most is that a transactional message offers no per-client
 * switch: somebody who opts out of marketing still has to be told their card
 * failed.
 *
 * Named -console because tests/visual/messaging.spec.ts already exists and
 * covers the outbound SMS copy in lib/sms.
 */

const URL = "/control-preview/admin/messages";

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

test.describe("messaging console", () => {
  test("says nothing sends yet, above everything", async ({ page }) => {
    await open(page);
    const banner = page.locator(".mg-banner");
    await expect(banner).toContainText("Nothing sends yet");
    const b = (await banner.boundingBox())!;
    const l = (await page.locator(".mg-list").boundingBox())!;
    expect(b.y).toBeLessThan(l.y);
  });

  test("lists every message with its trigger", async ({ page }) => {
    await open(page);
    const rows = page.locator(".mg-row");
    expect(await rows.count()).toBeGreaterThan(6);
    // A template nobody can explain the trigger for is one nobody dares edit.
    await expect(rows.first().locator(".mg-row__trigger")).not.toBeEmpty();
  });

  test("filters by channel", async ({ page }) => {
    await open(page);
    const rows = page.locator(".mg-row");
    const all = await rows.count();
    await page.locator(".mg-filters").getByRole("button", { name: "SMS" }).click();
    const sms = await rows.count();
    expect(sms).toBeGreaterThan(0);
    expect(sms).toBeLessThan(all);
    await page.locator(".mg-filters").getByRole("button", { name: "Everything" }).click();
    await expect(rows).toHaveCount(all);
  });

  test("an edit persists", async ({ page }) => {
    await open(page);
    await page.locator(".mg-row__open").first().click();
    await page.getByLabel("Message").fill("Hi {{first_name}}, new wording.");
    await page.getByRole("button", { name: "Done" }).click();

    await page.reload();
    await hydrated(page);
    await page.locator(".mg-row__open").first().click();
    await expect(page.getByLabel("Message")).toHaveValue("Hi {{first_name}}, new wording.");
  });

  test("an unknown variable is an error, in front of you", async ({ page }) => {
    await open(page);
    await page.locator(".mg-row__open").first().click();
    await page.getByLabel("Message").fill("Hi {{frist_name}}");
    // Not a typo that degrades gracefully — it arrives in an inbox as written.
    await expect(page.locator('.mg-problems li[data-level="error"]')).toContainText(
      "{{frist_name}}",
    );
    await expect(page.locator(".mg-status")).toContainText("Cannot send");
  });

  test("the preview shows what they would actually receive", async ({ page }) => {
    await open(page);
    await page.locator(".mg-row__open").first().click();
    await page.getByLabel("Message").fill("Hi {{first_name}}, it's {{coach}}.");
    await expect(page.locator(".mg-preview__body")).toHaveText("Hi Sam, it's Ben.");
  });

  test("an SMS says what it costs", async ({ page }) => {
    await open(page);
    await page.locator(".mg-filters").getByRole("button", { name: "SMS" }).click();
    await page.locator(".mg-row__open").first().click();

    await page.getByLabel("Message").fill("a".repeat(100));
    await expect(page.locator(".mg-cost")).toContainText("1 segment");
    await expect(page.locator(".mg-cost")).toContainText("GSM");

    // One curly quote halves the segment. Nothing else would explain that.
    await page.getByLabel("Message").fill("It’s ready");
    await expect(page.locator(".mg-cost")).toContainText("UCS-2");
  });

  test("marketing needs a way out before it can send", async ({ page }) => {
    await open(page);
    await page.locator(".mg-row", { hasText: "Come back" }).locator(".mg-row__open").click();
    await page.getByLabel("Message").fill("Buy a block.");
    await expect(page.locator('.mg-problems li[data-level="error"]')).toContainText(
      "unsubscribe_link",
    );
    await page.getByLabel("Message").fill("Buy a block. {{unsubscribe_link}}");
    await expect(page.locator('.mg-problems li[data-level="error"]')).toHaveCount(0);
  });

  test("a transactional message cannot be muted for one client", async ({ page }) => {
    await open(page);
    await page
      .locator(".mg-row", { hasText: "Card declined" })
      .first()
      .locator(".mg-row__open")
      .click();
    await expect(page.locator(".mg-audience")).toContainText("Everybody");
    await expect(page.locator(".mg-client")).toHaveCount(0);
  });

  test("marketing can be muted per client, and it sticks", async ({ page }) => {
    await open(page);
    await page.locator(".mg-row", { hasText: "Come back" }).locator(".mg-row__open").click();

    const first = page.locator(".mg-client input").first();
    await expect(first).toBeChecked();
    await first.uncheck();
    await page.getByRole("button", { name: "Done" }).click();

    await page.reload();
    await hydrated(page);
    await page.locator(".mg-row", { hasText: "Come back" }).locator(".mg-row__open").click();
    await expect(page.locator(".mg-client input").first()).not.toBeChecked();
  });

  test("switching a template off is remembered", async ({ page }) => {
    await open(page);
    const row = page.locator(".mg-row").first();
    await row.locator(".mg-switch input").uncheck();
    await expect(row).toHaveAttribute("data-off", "true");

    await page.reload();
    await hydrated(page);
    await expect(page.locator(".mg-row").first()).toHaveAttribute("data-off", "true");
  });

  test("a switched-on template that cannot send is called out at the top", async ({
    page,
  }) => {
    await open(page);
    await page.locator(".mg-row__open").first().click();
    await page.getByLabel("Message").fill("{{nonsense}}");
    await page.getByRole("button", { name: "Done" }).click();
    // Otherwise it fails silently at send time, which is when it matters.
    await expect(page.locator(".mg-broken")).toContainText("cannot send");
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
