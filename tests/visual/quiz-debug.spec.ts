import { test, expect, type Page } from "@playwright/test";

/**
 * Debug version of the quiz walk that snaps a screenshot after each step
 * so I can see exactly where the flow breaks.
 */

async function snap(page: Page, name: string) {
  await page.screenshot({ path: `/Users/kieronhawke/code/vyrek/scripts/audit-shots/debug-${name}.png` });
}

test("debug quiz walk with snapshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "single-viewport flow");
  test.setTimeout(120_000);

  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE:", msg.text());
  });

  await page.goto("/quiz", { waitUntil: "networkidle" });
  await snap(page, "01-welcome");

  // Skip welcome carousel by clicking Find your plan
  await page.getByRole("button", { name: /find your plan/i }).first().click();
  await page.waitForTimeout(800);
  await snap(page, "02-after-find-your-plan");

  // Primary intent: select First Hyrox
  await page.getByRole("button", { name: /first hyrox/i }).first().click();
  await page.waitForTimeout(300);
  await snap(page, "03-intent-selected");

  // Click Continue
  const cont1 = page.getByRole("button", { name: /^continue/i }).first();
  await cont1.click();
  await page.waitForTimeout(800);
  await snap(page, "04-after-intent-continue");

  // Now should be on reassurance 1 OR experience
  await snap(page, "05-current-screen");

  // List all buttons visible now
  const buttons = await page.locator("button:visible").allTextContents();
  console.log("VISIBLE BUTTONS:", JSON.stringify(buttons.slice(0, 20)));

  // Try clicking Continue if present (reassurance)
  const reassuranceCont = page.getByRole("button", { name: /^continue/i }).first();
  if (await reassuranceCont.isVisible().catch(() => false)) {
    await reassuranceCont.click();
    await page.waitForTimeout(800);
    await snap(page, "06-after-reassurance-continue");
  }

  const buttons2 = await page.locator("button:visible").allTextContents();
  console.log("AFTER REASSURANCE BUTTONS:", JSON.stringify(buttons2.slice(0, 20)));

  await snap(page, "07-final");
});
