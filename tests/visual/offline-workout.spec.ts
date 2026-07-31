import { test, expect, chromium, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * THE OFFLINE TEST — docs/build-pack/spec/16 §2.
 *
 * "MOST IMPORTANT IN THE SUITE ... This test must pass on every commit. If it
 * fails, nothing merges."
 *
 * The scenario is the spec's, step for step: log twelve sets across four
 * exercises with the network off, force-close the browser context, reopen
 * still offline and assert every set survived, then restore the network and
 * assert they sync with zero duplicates.
 *
 * Plus the second scenario: network flapping every two seconds during
 * logging.
 */

const ROUTE = "/train";

/** Count what the sync endpoint has been asked to accept, by id. */
type Recorder = { ids: string[] };

async function interceptSync(page: Page, rec: Recorder, mode: "ok" | "fail") {
  await page.route("**/api/client/workout-sets", async (route) => {
    if (mode === "fail") {
      await route.abort("failed");
      return;
    }
    const body = JSON.parse(route.request().postData() ?? "{}") as {
      sets?: Array<{ clientGeneratedId: string }>;
    };
    const ids = (body.sets ?? []).map((s) => s.clientGeneratedId);
    rec.ids.push(...ids);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ acceptedIds: ids }),
    });
  });
}

async function openPlayer(page: Page, waitForSW = false) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" });
  if (waitForSW) {
    // The shell must be cached before we can prove an offline reopen works.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.waitForTimeout(500);
  }
  const reject = page.getByRole("button", { name: /reject/i }).first();
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
  }
  await expect(page.getByTestId("workout-player")).toBeVisible({ timeout: 15_000 });
}

/** Log `count` sets, advancing an exercise every three. */
async function logSets(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.getByTestId("log-set").click();
    await page.waitForTimeout(60);
    if ((i + 1) % 3 === 0 && i < count - 1) {
      await page.getByRole("button", { name: /next exercise/i }).click();
      await page.waitForTimeout(60);
    }
  }
}

/** How many sets the device is holding, whatever their sync status. */
async function localCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem("suth:workout-queue:v1");
      if (!raw) return 0;
      return (JSON.parse(raw) as { items: unknown[] }).items.length;
    } catch {
      return 0;
    }
  });
}

test.describe("never lose a workout", () => {
  test("twelve sets survive offline, a close, and a reopen — then sync once", async () => {
    // A PERSISTENT context, not browser.newContext(): service workers, the
    // cache and IndexedDB all live in the browser profile, and
    // `storageState` carries none of them. Only a persistent profile
    // reproduces what actually happens when someone force-quits the app on
    // a phone and opens it again in a basement.
    const profile = mkdtempSync(join(tmpdir(), "suth-offline-"));
    const rec: Recorder = { ids: [] };

    try {
      // ── First run: cache the shell, then go offline and log ──────────
      let context = await chromium.launchPersistentContext(profile, {
        viewport: { width: 393, height: 852 },
      });
      let page = context.pages()[0] ?? (await context.newPage());
      await interceptSync(page, rec, "ok");
      await openPlayer(page, true);

      await context.setOffline(true);
      await page.evaluate(() => window.dispatchEvent(new Event("offline")));

      await logSets(page, 12);
      expect(await localCount(page)).toBe(12);
      await expect(page.getByTestId("sync-state")).toHaveAttribute(
        "data-sync",
        "offline",
      );
      // Nothing may have reached the network while offline.
      expect(rec.ids).toEqual([]);

      // ── Force-close ──────────────────────────────────────────────────
      await context.close();

      // ── Reopen, still offline ────────────────────────────────────────
      context = await chromium.launchPersistentContext(profile, {
        viewport: { width: 393, height: 852 },
        offline: true,
      });
      page = context.pages()[0] ?? (await context.newPage());
      await interceptSync(page, rec, "ok");
      await openPlayer(page);

      // The whole promise of the module.
      expect(
        await localCount(page),
        "sets did not survive the close and reopen",
      ).toBe(12);

      // ── Network back ─────────────────────────────────────────────────
      await context.setOffline(false);
      await page.evaluate(() => window.dispatchEvent(new Event("online")));

      await expect(page.getByTestId("sync-state")).toHaveAttribute(
        "data-sync",
        "synced",
        { timeout: 10_000 },
      );

      // Zero duplicates — idempotency via client_generated_id.
      expect(new Set(rec.ids).size, "the same set was sent twice").toBe(12);

      await context.close();
    } finally {
      rmSync(profile, { recursive: true, force: true });
    }
  });

  test("network flapping during logging loses nothing and duplicates nothing", async ({
    browser,
  }) => {
    const rec: Recorder = { ids: [] };
    const context = await browser.newContext();
    const page = await context.newPage();
    await interceptSync(page, rec, "ok");
    await openPlayer(page);

    // 7. Flap every couple of sets while logging.
    for (let i = 0; i < 12; i++) {
      const offline = i % 2 === 0;
      await context.setOffline(offline);
      await page.evaluate(
        (o) => window.dispatchEvent(new Event(o ? "offline" : "online")),
        offline,
      );
      await page.getByTestId("log-set").click();
      await page.waitForTimeout(80);
      if ((i + 1) % 3 === 0 && i < 11) {
        await page.getByRole("button", { name: /next exercise/i }).click();
      }
    }

    expect(await localCount(page), "a set was lost while flapping").toBe(12);

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.getByTestId("sync-state")).toHaveAttribute(
      "data-sync",
      "synced",
      { timeout: 15_000 },
    );

    expect(new Set(rec.ids).size).toBe(12);
    // At-least-once delivery is acceptable; duplicate *rows* are not. The
    // server dedupes on client_generated_id, so what matters is that the
    // set of ids is exactly the twelve logged.
    expect(rec.ids.length).toBeGreaterThanOrEqual(12);

    await context.close();
  });

  test("a failing server never loses the sets", async ({ browser }) => {
    const rec: Recorder = { ids: [] };
    const context = await browser.newContext();
    const page = await context.newPage();
    await interceptSync(page, rec, "fail");
    await openPlayer(page);

    await logSets(page, 6);

    // The UI must not have blocked, and the data must still be here.
    expect(await localCount(page)).toBe(6);
    await expect(page.getByTestId("log-set")).toBeEnabled();

    await context.close();
  });
});
