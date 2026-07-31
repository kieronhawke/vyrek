import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Suth Performance's visual + smoke test suite (Phase B3 Part 13).
 *
 * Run locally:
 *   pnpm test:visual              # all tests
 *   pnpm test:visual --headed     # with browser visible
 *   pnpm test:visual:report       # open HTML report after a run
 *
 * The suite assumes `pnpm dev` is reachable at PLAYWRIGHT_BASE_URL (default
 * http://localhost:3000). For CI / one-shot runs, the webServer block boots
 * Next on demand.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/visual/report", open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // ── docs/build-pack/spec/16 §3 — THE DEVICE MATRIX ─────────────────
    // Six devices, every PR. Named `dm-*` so the whole matrix can be run
    // with `--grep-invert` or selected with `--project=dm-...`.
    {
      name: "dm-iphone-se",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } },
    },
    {
      name: "dm-iphone-15-pro",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPhone 15 Pro"], viewport: { width: 393, height: 852 } },
    },
    {
      name: "dm-iphone-15-pro-max",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPhone 15 Pro Max"], viewport: { width: 430, height: 932 } },
    },
    {
      name: "dm-pixel-8",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["Pixel 7"], viewport: { width: 412, height: 915 } },
    },
    {
      name: "dm-ipad-mini",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPad Mini"], viewport: { width: 744, height: 1133 } },
    },
    {
      // Narrowest real device. If it survives here it survives anywhere.
      name: "dm-galaxy-fold",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["Galaxy S9+"], viewport: { width: 344, height: 882 } },
    },

    {
      // The offline contract (spec/16 §2) runs here rather than on the
      // device-matrix projects: Playwright's iPhone descriptors default to
      // WebKit, whose offline emulation is less reliable, and the contract
      // is about storage and queueing rather than layout. Mobile viewport,
      // Chromium engine.
      name: "offline",
      use: { ...devices["Pixel 7"], viewport: { width: 393, height: 852 } },
      testMatch: /offline-workout\.spec\.ts/,
    },

    // ── Pre-existing marketing-site projects ───────────────────────────
    {
      name: "mobile-375",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } },
    },
    {
      name: "mobile-390",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "tablet-768",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop-1440",
      testIgnore: /offline-workout\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
