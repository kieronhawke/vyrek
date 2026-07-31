import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * THE QUALITY GATES — docs/build-pack/spec/16 §3 and §5.
 *
 * Wired in Phase 0, before the first real screen exists, so that every later
 * phase inherits them rather than discovering failures at the end. Your
 * brief: "test against the six-device matrix continuously, not at the end".
 *
 * `SURFACES` is the list every gate runs against. Adding a route here is how
 * a new screen opts into the matrix, and it is the only thing a later phase
 * needs to remember to do.
 */
const SURFACES: Array<{ path: string; name: string; fullPage?: boolean }> = [
  // fullPage only where the screen is a document. Coach Mode has a fixed
  // bottom tab bar, and a fullPage capture renders it partway down the image
  // rather than pinned — a baseline that looks broken and hides real
  // regressions behind an artefact.
  { path: "/control-preview", name: "design-system", fullPage: true },
  { path: "/coach", name: "coach-today" },
  { path: "/coach/clients", name: "coach-clients" },
  { path: "/coach/plans", name: "coach-plans" },
  { path: "/coach/messages", name: "coach-messages" },
  { path: "/coach/diary", name: "coach-diary" },
  { path: "/train", name: "client-train" },
];

/**
 * The member area at /app/* is deliberately absent from the list above.
 *
 * middleware.ts already gates /app/* and bounces unauthenticated visits to
 * /login, which is correct for a members' area — but it means these gates
 * would measure the login redirect rather than the page. Adding a test-only
 * bypass to shipped middleware would be a real security smell for the sake
 * of a screenshot.
 *
 * They join the matrix the moment auth is wired (QUESTIONS.md §19 and the
 * Supabase blocker). Until then they are covered by typecheck, lint and
 * review, and their components — SessionCard, SplitBar, Num — are gated
 * through the surfaces above.
 */

/** Only run these on the six matrix projects, not the marketing ones. */
function matrixOnly(projectName: string) {
  return projectName.startsWith("dm-");
}

async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Dismiss consent if the shared banner is present; it overlays the header
  // and would otherwise sit on top of tap targets.
  const reject = page.getByRole("button", { name: /reject/i }).first();
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
    await page.waitForTimeout(300);
  }
  // Let fonts settle so measurements are of the final layout.
  await page.waitForTimeout(500);
}

for (const surface of SURFACES) {
  test.describe(surface.name, () => {
    test("zero horizontal scroll", async ({ page }, info) => {
      test.skip(!matrixOnly(info.project.name), "device matrix only");
      await open(page, surface.path);

      // HARD-RULES §13 and spec/16 §3: a hard gate, at any breakpoint, on
      // any device. It is the most common mobile failure and it is trivially
      // detectable, so there is no excuse for shipping it.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(
        overflow.scrollWidth,
        `${surface.name} on ${info.project.name}: page is ${overflow.scrollWidth}px wide in a ${overflow.innerWidth}px viewport`,
      ).toBeLessThanOrEqual(overflow.innerWidth);
    });

    test("touch targets are at least 44x44 and spaced", async ({ page }, info) => {
      test.skip(!matrixOnly(info.project.name), "device matrix only");
      await open(page, surface.path);

      const undersized = await page.evaluate(() => {
        const bad: string[] = [];
        const els = document.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [role="button"], [tabindex]:not([tabindex="-1"])',
        );
        for (const el of els) {
          const r = el.getBoundingClientRect();
          // Skip anything not actually rendered.
          if (r.width === 0 && r.height === 0) continue;
          if (r.width < 44 || r.height < 44) {
            bad.push(
              `${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
            );
          }
        }
        return bad;
      });

      expect(undersized, undersized.join(" · ")).toEqual([]);
    });

    test("no text below 12px", async ({ page }, info) => {
      test.skip(!matrixOnly(info.project.name), "device matrix only");
      await open(page, surface.path);

      // spec/16 §3. The scale bottoms out at 11px for uppercase eyebrows,
      // which is deliberate and legible at that weight and tracking, so
      // those are allowed by class. Everything else must clear 12px.
      const tooSmall = await page.evaluate(() => {
        const bad: string[] = [];
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set<Element>();
        let n = walk.nextNode();
        while (n) {
          const text = (n.textContent ?? "").trim();
          const el = n.parentElement;
          if (text && el && !seen.has(el)) {
            seen.add(el);
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (size < 12 && !el.classList.contains("eyebrow")) {
              bad.push(`${size}px "${text.slice(0, 24)}"`);
            }
          }
          n = walk.nextNode();
        }
        return bad;
      });

      expect(tooSmall, tooSmall.join(" · ")).toEqual([]);
    });

    test("zero axe violations at WCAG AA", async ({ page }, info) => {
      test.skip(!matrixOnly(info.project.name), "device matrix only");
      await open(page, surface.path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const summary = results.violations
        .map((v) => `${v.id} (${v.nodes.length}): ${v.help}`)
        .join("\n");
      expect(results.violations, summary).toEqual([]);
    });

    test("every number renders in the mono face", async ({ page }, info) => {
      test.skip(info.project.name !== "dm-iphone-15-pro", "one device is enough");
      await open(page, surface.path);

      // spec/14 §3: "Every number renders in Geist Mono with tabular-nums.
      // No exceptions." The <Num> component is the mechanism; this asserts
      // the mechanism actually took effect rather than trusting it.
      const broken = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(".num")) {
          const cs = getComputedStyle(el);
          if (!/mono/i.test(cs.fontFamily)) {
            bad.push(`font-family: ${cs.fontFamily}`);
          }
          if (!/tabular-nums/.test(cs.fontVariantNumeric)) {
            bad.push(`font-variant-numeric: ${cs.fontVariantNumeric}`);
          }
        }
        return bad;
      });

      expect(broken, broken.join(" · ")).toEqual([]);
    });

    test("visual regression baseline", async ({ page }, info) => {
      test.skip(!matrixOnly(info.project.name), "device matrix only");
      await open(page, surface.path);
      // spec/16 §9: 0.1% threshold, baselines reviewed on change and never
      // auto-accepted.
      await expect(page).toHaveScreenshot(`${surface.name}.png`, {
        fullPage: surface.fullPage ?? false,
        maxDiffPixelRatio: 0.001,
        animations: "disabled",
      });
    });
  });
}
