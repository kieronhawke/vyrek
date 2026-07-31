import { test, expect, type APIRequestContext } from "@playwright/test";
import {
  SMS_SAMPLES,
  isGsm7,
  segments,
  smsLength,
} from "../../lib/sms/messages";

/**
 * Messaging checks. These are unit-style assertions that happen to run in
 * the Playwright runner, because it is the only test runner this repo has.
 *
 * They exist because email and SMS bugs are invisible until a real person
 * receives them, at which point it is too late: a broken template goes to
 * the whole list at once, and a 161-character text silently costs double
 * and can arrive truncated.
 */

test.describe("SMS", () => {
  test("every message fits one segment and stays GSM-7", async () => {
    const failures: string[] = [];

    for (const s of SMS_SAMPLES) {
      if (!isGsm7(s.text)) {
        const bad = [...s.text].filter(
          (c) => !isGsm7(c),
        );
        failures.push(
          `${s.id}: not GSM-7, offending characters: ${JSON.stringify(bad.join(""))}`,
        );
      }
      const segs = segments(s.text);
      if (segs > 1) {
        failures.push(
          `${s.id}: ${smsLength(s.text)} chars = ${segs} segments (limit 160)`,
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("messages to leads identify the sender", async () => {
    // A link from an unknown number with no name attached reads as
    // phishing, and gets reported rather than clicked.
    const toLeads = SMS_SAMPLES.filter((s) => s.audience === "Lead");
    expect(toLeads.length).toBeGreaterThan(0);

    for (const s of toLeads) {
      expect(
        /ben/i.test(s.text),
        `${s.id} never says who it is from: ${s.text}`,
      ).toBe(true);
    }
  });

  test("marketing messages carry an opt-out", async () => {
    const marketing = SMS_SAMPLES.filter(
      (s) => s.audience === "Club member",
    );
    for (const s of marketing) {
      expect(/STOP/i.test(s.text), `${s.id} has no opt-out`).toBe(true);
    }
  });
});

/**
 * The email tests below render through `/api/dev/messaging-check`, which
 * deliberately 404s in production — it exposes internal lifecycle copy and
 * has no business being reachable on the live site.
 *
 * The rest of the suite now runs against a production build, because the
 * offline test in spec/16 §2 cannot be proven against `next dev`. So these
 * skip rather than fail, with the reason stated: a skip that says why is
 * honest, a green tick that never ran is not.
 *
 * To actually run them:  pnpm dev  &&  PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *   pnpm exec playwright test tests/visual/messaging.spec.ts --project=desktop-1440
 */
async function skipUnlessDevRouteIsUp(request: APIRequestContext) {
  const probe = await request.get("/api/dev/messaging-check").catch(() => null);
  test.skip(
    !probe?.ok(),
    "needs the dev-only /api/dev/messaging-check route; run against `pnpm dev`",
  );
}

test.describe("Email templates", () => {
  /**
   * Rendered inside Next via a dev-only route rather than imported here:
   * the Playwright runner applies its own JSX transform, so templates
   * imported into a spec produce elements React won't render. This also
   * means we're validating the same render path that actually sends.
   */
  test("every template renders cleanly", async ({ request }) => {
    await skipUnlessDevRouteIsUp(request);
    const res = await request.get("/api/dev/messaging-check");
    expect(res.ok(), "dev messaging-check route unavailable").toBe(true);
    const { count, results } = (await res.json()) as {
      count: number;
      results: Array<Record<string, unknown>>;
    };

    expect(count).toBeGreaterThan(15);

    const problems: string[] = [];
    for (const r of results) {
      const id = r.id as string;
      if (!r.ok) problems.push(`${id}: threw ${r.error}`);
      if (!r.hasHtmlTag) problems.push(`${id}: not a complete HTML document`);
      if (r.rendersUndefined) problems.push(`${id}: renders "undefined"`);
      if (r.rendersObject) problems.push(`${id}: renders "[object Object]"`);
      if ((r.imagesWithoutAlt as number) > 0)
        problems.push(`${id}: ${r.imagesWithoutAlt} image(s) with no alt text`);
      if ((r.relativeLinks as string[])?.length)
        problems.push(
          `${id}: relative links ${JSON.stringify(r.relativeLinks)}`,
        );
      if (r.mentionsStalePrice)
        problems.push(`${id}: contains the old £8.99 price`);
      if (r.overGmailClipLimit)
        problems.push(`${id}: over Gmail's 102KB clipping limit`);
      if ((r.subjectLength as number) > 60)
        problems.push(
          `${id}: subject is ${r.subjectLength} chars and will truncate`,
        );
      if ((r.subjectLength as number) === 0)
        problems.push(`${id}: empty subject`);

      // Regressions for bugs that shipped once already.
      //
      // A text/plain alternative is required: without it spam filters score
      // the message worse and some clients show a blank body.
      if ((r.plainTextChars as number) < 80)
        problems.push(
          `${id}: plain-text alternative is only ${r.plainTextChars} chars`,
        );
      // Without declaring the scheme, clients that force light mode invert
      // a dark design and it becomes unreadable.
      if (!r.declaresColorScheme)
        problems.push(`${id}: does not declare color-scheme`);
      // Outlook ignores CSS backgrounds; the bgcolor attribute is the only
      // thing that keeps the design dark there.
      if (!r.hasOutlookBgcolor)
        problems.push(`${id}: no bgcolor attribute for Outlook`);
    }

    expect(problems, problems.join("\n")).toEqual([]);
  });
});

test.describe("Email rendering environments", () => {
  // A representative spread: customer-facing, internal, and billing.
  const IDS = ["lead-confirmation", "internal-lead", "club-d5"];

  for (const id of IDS) {
    test(`${id} holds up in light mode, with images off, and at 320px`, async ({
      browser,
      request,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop-1440",
        "drives its own viewports",
      );
      await skipUnlessDevRouteIsUp(request);

      const cases = [
        { name: "dark", colorScheme: "dark" as const, width: 390, block: false },
        // The one that used to break everything: plenty of clients force a
        // light background, and a dark design must not invert into
        // near-white text on white.
        { name: "light", colorScheme: "light" as const, width: 390, block: false },
        // Images are blocked by default in many clients.
        { name: "images-off", colorScheme: "dark" as const, width: 390, block: true },
        // Smallest phone still in real use.
        { name: "320px", colorScheme: "dark" as const, width: 320, block: false },
      ];

      for (const c of cases) {
        const ctx = await browser.newContext({
          viewport: { width: c.width, height: 900 },
          colorScheme: c.colorScheme,
        });
        if (c.block) {
          await ctx.route("**/*.{png,jpg,jpeg,gif,webp,svg}", (r) => r.abort());
        }
        const page = await ctx.newPage();
        await page.goto(`/api/dev/messaging-check?id=${id}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(400);

        const bg = await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor,
        );
        expect(bg, `${id} @ ${c.name}: background was not dark`).toBe(
          "rgb(10, 10, 10)",
        );

        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `${id} @ ${c.name}: ${overflow}px of horizontal overflow`,
        ).toBeLessThanOrEqual(1);

        await ctx.close();
      }
    });
  }
});

