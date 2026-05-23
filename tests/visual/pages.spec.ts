import { test, expect } from "@playwright/test";

/**
 * Page coverage matrix (brief 13.2.1).
 *
 * For every public page, this test loads it, waits for the network to
 * settle, asserts no console errors, and takes a viewport screenshot per
 * the active project (mobile-375 / mobile-390 / tablet-768 / desktop-1440).
 *
 * Output: tests/visual/report/ contains the HTML report; screenshots are
 * attached to each test as failures or as named artefacts.
 */

const PAGES = [
  { name: "landing", path: "/" },
  { name: "programmes", path: "/programmes" },
  { name: "how-it-works", path: "/how-it-works" },
  { name: "about", path: "/about" },
  { name: "contact", path: "/contact" },
  { name: "press", path: "/press" },
  { name: "journal", path: "/blog" },
  { name: "partners", path: "/partners" },
  { name: "partners-apply", path: "/partners/apply" },
  { name: "legal-privacy", path: "/legal/privacy" },
  { name: "legal-terms", path: "/legal/terms" },
  { name: "legal-cookies", path: "/legal/cookies" },
  { name: "legal-refunds", path: "/legal/refunds" },
  { name: "quiz-entry", path: "/quiz" },
  { name: "pricing", path: "/pricing" },
] as const;

for (const page of PAGES) {
  test(`page: ${page.name} (${page.path})`, async ({ page: p }, testInfo) => {
    const errors: string[] = [];
    p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    p.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
    });

    const response = await p.goto(page.path, { waitUntil: "networkidle" });
    expect(response, `no response for ${page.path}`).not.toBeNull();
    expect(response!.status(), `unexpected status for ${page.path}`).toBeLessThan(400);

    // Capture a full-page screenshot as a named artefact.
    const screenshot = await p.screenshot({ fullPage: true });
    await testInfo.attach(`${page.name}-${testInfo.project.name}`, {
      body: screenshot,
      contentType: "image/png",
    });

    expect(
      errors,
      `console errors on ${page.path}:\n${errors.join("\n")}`,
    ).toEqual([]);
  });
}
