import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * MEMBER SHELL GATES
 *
 * These exist because of four defects that all shipped, and all of which a
 * gate this cheap would have caught:
 *
 *  1. The tab bar had no breakpoint at all, so a mobile bar stretched the
 *     full width of a desktop monitor.
 *  2. Four of the seven member pages set no max-width, so Account rendered
 *     its label hard-left and its value hard-right across the whole screen.
 *  3. /app/nutrition and /app/analysis were in no navigation anywhere — two
 *     working sections reachable only by typing the URL.
 *  4. The preview mount re-exported auth-gated pages, so the ungated preview
 *     redirected to /login and could not preview anything.
 *
 * The preview mount is used rather than /app because /app needs Supabase.
 * Same shell, same screens, no auth boundary.
 */

const SCREENS = [
  { path: "/control-preview/app/today", name: "today" },
  { path: "/control-preview/app/plan", name: "plan" },
  { path: "/control-preview/app/nutrition", name: "nutrition" },
  { path: "/control-preview/app/coach", name: "coach" },
  { path: "/control-preview/app/progress", name: "progress" },
  { path: "/control-preview/app/account", name: "account" },
];

/** Every destination the member navigation must offer. */
const REQUIRED_TABS = ["Today", "Plan", "Fuel", "Coach", "Account"];

test.describe("member shell", () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: exactly one navigation is visible`, async ({
      page,
      viewport,
    }) => {
      await page.goto(screen.path);
      const tabbar = page.locator(".member-tabbar");
      const rail = page.locator(".member-rail");

      const wide = (viewport?.width ?? 0) >= 768;
      // Not "at least one" — exactly one. The admin shipped a bug where the
      // mobile card stack rendered underneath every desktop table because an
      // inline style beat a non-!important display:none, and nobody saw it.
      await expect(tabbar).toBeVisible({ visible: !wide });
      await expect(rail).toBeVisible({ visible: wide });
    });

    test(`${screen.name}: page never scrolls sideways`, async ({ page }) => {
      await page.goto(screen.path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test(`${screen.name}: content column is bounded`, async ({ page }) => {
      await page.goto(screen.path);
      const width = await page
        .locator(".member-main")
        .evaluate((el) => el.getBoundingClientRect().width);
      // 760px is --member-max; the allowance is the horizontal padding.
      expect(width).toBeLessThanOrEqual(760 + 80);
    });

    test(`${screen.name}: reaches every section of the app`, async ({ page }) => {
      await page.goto(screen.path);
      for (const label of REQUIRED_TABS) {
        await expect(
          page.getByRole("link", { name: label, exact: true }).first(),
        ).toBeAttached();
      }
    });

    test(`${screen.name}: no text below 12px`, async ({ page }) => {
      await page.goto(screen.path);
      const tooSmall = await page.evaluate(() => {
        const bad: string[] = [];
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const text = (el.textContent ?? "").trim();
          if (!text || el.children.length > 0) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (size && size < 12) bad.push(`${size}px "${text.slice(0, 30)}"`);
        }
        return bad;
      });
      expect(tooSmall).toEqual([]);
    });

    test(`${screen.name}: no accessibility violations`, async ({ page }) => {
      await page.goto(screen.path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  /**
   * Tab labels must fit their column.
   *
   * "PROGRESS" and "ACCOUNT" at 12px on a 375px screen overflowed their grid
   * cells and rendered as "PROGRESSACCOUNT" — one run-together word. Nothing
   * else caught it: the page did not scroll sideways, because the overflow was
   * inside a fixed-width pill, and the type was above the size floor.
   */
  test("tab labels fit their column and do not run together", async ({
    page,
    viewport,
  }) => {
    test.skip((viewport?.width ?? 0) >= 768, "mobile pill only");
    await page.goto("/control-preview/app/today");
    const overflowing = await page.evaluate(() => {
      const out: string[] = [];
      for (const span of Array.from(
        document.querySelectorAll<HTMLElement>(".member-tabbar__link span"),
      )) {
        if (span.scrollWidth > span.clientWidth + 1) {
          out.push(`${span.textContent} (${span.scrollWidth} > ${span.clientWidth})`);
        }
      }
      return out;
    });
    expect(overflowing).toEqual([]);
  });

  /**
   * Touch targets. The app is used one-handed between sets, and 44x44 is the
   * floor below which a sweaty thumb starts missing.
   */
  for (const screen of SCREENS) {
    test(`${screen.name}: every control is at least 44px tall`, async ({ page }) => {
      await page.goto(screen.path);
      const small = await page.evaluate(() => {
        const out: string[] = [];
        const controls = document.querySelectorAll(
          "a, button, input, select, textarea, [role=radio]",
        );
        for (const el of Array.from(controls)) {
          const r = el.getBoundingClientRect();
          // Skip anything not rendered, and links inside running prose, which
          // inherit the line height of the paragraph by design.
          if (r.width === 0 || r.height === 0) continue;
          if (el.closest("p")) continue;
          if (r.height < 44) {
            out.push(`${Math.round(r.height)}px ${el.tagName} "${(el.textContent ?? "").trim().slice(0, 24)}"`);
          }
        }
        return [...new Set(out)];
      });
      expect(small).toEqual([]);
    });
  }

  /** The plan is the screen the product hangs off; assert its substance. */
  test("plan shows the block, the coach's note and a way to answer back", async ({
    page,
  }) => {
    await page.goto("/control-preview/app/plan");
    await expect(page.getByRole("heading", { name: "Your plan" })).toBeVisible();
    // The whole twelve-week arc, not just this week. Scoped to the page,
    // because the same string is now in the chrome on every screen.
    await expect(
      page.locator("main").getByText("Week 4 of 12").first(),
    ).toBeVisible();
    // Attributed to a person, because that is what is being paid for.
    await expect(page.getByText("Ben Sutherland")).toBeVisible();
    await expect(page.getByText(/Set this block/)).toBeVisible();
    // And a route back to them.
    await expect(
      page.getByRole("radio", { name: /About right/ }),
    ).toBeVisible();
  });

  test("plan feedback collects a verdict, a note, and confirms honestly", async ({
    page,
  }) => {
    await page.goto("/control-preview/app/plan");
    await page.getByRole("radio", { name: /Too hard/ }).click();

    const note = page.getByLabel(/Anything Ben should know/);
    await expect(note).toBeVisible();
    await note.fill("Knee grumbled on the lunges.");
    await page.getByRole("button", { name: "Send to Ben" }).click();

    // It must not claim to have sent anything: there is no messaging backend.
    await expect(page.getByRole("status")).toContainText(/Saved on this device/);
    await expect(page.getByRole("status")).toContainText(/once messaging is connected/);
  });

  test("progress explains the numbers rather than only listing them", async ({
    page,
  }) => {
    await page.goto("/control-preview/app/progress");
    await expect(page.getByText(/stations are faster/)).toBeVisible();
    // Every station carries a percentile the athlete can act on.
    const bars = page.getByRole("img", { name: /percentile/ });
    expect(await bars.count()).toBe(8);
  });

  test("nutrition places the workout inside the day", async ({ page }) => {
    await page.goto("/control-preview/app/nutrition");
    await expect(
      page.getByRole("heading", { name: "Today's fuel" }),
    ).toBeVisible();
    await expect(page.getByText(/Hyrox hybrid: run \+ sled ·/)).toBeVisible();
  });

  test("the preview mount renders rather than redirecting to login", async ({
    page,
  }) => {
    const res = await page.goto("/control-preview/app/today");
    expect(res?.status()).toBe(200);
    expect(page.url()).toContain("/control-preview/app/today");
  });

  test("/app is a redirect, not a second home page", async ({ request }) => {
    const res = await request.get("/app", { maxRedirects: 0 });
    expect([307, 308]).toContain(res.status());
    // Signed out, middleware gets there first and sends you to sign in; signed
    // in, the page itself forwards to /app/today. Either way /app never renders
    // a screen of its own, which is the thing being asserted — there were two
    // home pages before this, on different fixtures and different tokens.
    const location = res.headers()["location"] ?? "";
    expect(location).toMatch(/\/login|\/app\/today/);
  });
});

/**
 * SESSION DETAIL + THE COACH LOOP
 *
 * The plan listed seven days and expanded only today, so an athlete could not
 * look at Thursday on Tuesday. And nothing anywhere could write a plan — the
 * member area could display one and answer back to it, with no other end.
 */
test.describe("sessions and the coach loop", () => {
  test("every day of the week is its own page", async ({ page }) => {
    await page.goto("/control-preview/app/plan");
    const links = page.locator('a[href*="/plan/20"]');
    // Seven session cards plus seven week-strip days.
    expect(await links.count()).toBeGreaterThanOrEqual(7);

    const href = await links.first().getAttribute("href");
    const res = await page.goto(href!);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("link", { name: /Back to your plan/ })).toBeVisible();
  });

  test("a day outside the programmed week 404s rather than inventing one", async ({
    request,
  }) => {
    const res = await request.get("/control-preview/app/plan/1999-01-01");
    expect(res.status()).toBe(404);
  });

  test("the week is dated to now, not to the fixtures", async ({ page }) => {
    await page.goto("/control-preview/app/plan");
    const year = String(new Date().getFullYear());
    const hrefs = await page.locator('a[href*="/plan/20"]').first().getAttribute("href");
    expect(hrefs).toContain(year);
  });

  test("coach can write a week, and cannot send it without a note", async ({
    page,
  }) => {
    await page.goto("/control-preview/admin/plans/sample-a");

    const send = page.getByRole("button", { name: /^Send to/ });
    await expect(send).toBeDisabled();

    // The athlete's verdict on last week is on the same screen as the week
    // being written — that is the whole point of the layout.
    await expect(page.getByText(/flagged \d+ session/)).toBeVisible();
    await expect(page.getByText(/Sled turned into a grind/)).toBeVisible();

    await page
      .getByLabel(/Coach's note/)
      .fill("Build week. Runs faster not longer, sled is technique under fatigue.");
    await expect(send).toBeEnabled();

    await send.click();
    // It must not claim to have sent anything.
    await expect(page.getByRole("status")).toContainText(/Not sent/);
  });

  test("the plans table routes through to the builder", async ({ page }) => {
    await page.goto("/control-preview/admin/plans");
    // The data table renders a table and a card list, one hidden at any
    // width, so this has to pick the visible copy rather than the first.
    const first = page.locator('a[href*="/admin/plans/"]:visible').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.getByRole("button", { name: /^Send to/ })).toBeVisible();
  });
});

/**
 * THE CLIENT RECORD
 *
 * The admin listed clients and opened a row that showed the same fields again.
 * Ben opens a client to decide one of four things: do they need a plan, have
 * they paid, are they in trouble, what did they last say.
 */
test.describe("client record", () => {
  test("the clients table routes through to a record", async ({ page }) => {
    await page.goto("/control-preview/admin/clients");
    const first = page.locator('a[href*="/admin/clients/c_"]:visible').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.getByRole("link", { name: /All clients/ })).toBeVisible();
  });

  test("leads with the four things, and the flags in plain English", async ({
    page,
  }) => {
    await page.goto("/control-preview/admin/clients/c_01");
    await expect(page.getByText("Needs attention")).toBeVisible();
    // spec/14 §9: a flag is a sentence, never a flag name.
    await expect(page.getByText(/Hasn't opened her plan in 8 days/)).toBeVisible();
    for (const label of ["Programmed", "Payment", "Next race", "Tier"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("writing a plan is one click from the person it is for", async ({
    page,
  }) => {
    await page.goto("/control-preview/admin/clients/c_01");
    const write = page.getByRole("link", { name: "Write next plan" });
    await expect(write).toBeVisible();
    await write.click();
    await expect(page.getByRole("button", { name: /^Send to/ })).toBeVisible();
  });

  test("coach notes accept a new note and keep the old ones", async ({ page }) => {
    await page.goto("/control-preview/admin/clients/c_01");
    const before = await page.getByText(/calf niggle/).count();
    expect(before).toBe(1);

    await page.getByLabel(/Add a note about/).fill("Chase the unopened plan.");
    await page.getByRole("button", { name: "Add note" }).click();

    await expect(page.getByText("Chase the unopened plan.")).toBeVisible();
    // The new note must not replace the history.
    await expect(page.getByText(/calf niggle/)).toBeVisible();
  });

  test("actions say what they would do rather than pretending", async ({
    page,
  }) => {
    await page.goto("/control-preview/admin/clients/c_01");
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByRole("status")).toContainText(/Not connected/);
    await expect(page.getByRole("status")).toContainText(/stop billing and programming/);
  });

  test("an unknown client 404s", async ({ request }) => {
    const res = await request.get("/control-preview/admin/clients/c_nope");
    expect(res.status()).toBe(404);
  });
});

/**
 * ASK BEN
 *
 * The athlete could answer back to a session but could not ask a question,
 * which is what people actually pay a coach for — and the thing they cancel
 * over when it is missing.
 */
test.describe("coach thread", () => {
  test("shows a two-way conversation with Ben", async ({ page }) => {
    await page.goto("/control-preview/app/coach");
    await expect(page.getByRole("heading", { name: "Ask Ben" })).toBeVisible();
    // Both sides of the thread are present and attributed.
    await expect(page.getByText(/Sled turned into a grind/)).toBeVisible();
    await expect(page.getByText(/drop the sled to 50%/)).toBeVisible();
  });

  test("offers prompts when the composer is empty, and hides them once typing", async ({
    page,
  }) => {
    await page.goto("/control-preview/app/coach");
    const prompt = page.getByRole("button", { name: "I've picked up a niggle" });
    await expect(prompt).toBeVisible();
    await prompt.click();
    // Tapping a prompt seeds the composer and the prompts get out of the way.
    await expect(page.getByLabel("Message Ben")).toHaveValue(/niggle/);
    await expect(prompt).toBeHidden();
  });

  test("sending appends to the thread and does not claim to have sent", async ({
    page,
  }) => {
    await page.goto("/control-preview/app/coach");
    await page.getByLabel("Message Ben").fill("Is Saturday full distance?");
    await page.getByRole("button", { name: "Send to Ben" }).click();
    await expect(page.getByText("Is Saturday full distance?")).toBeVisible();
    await expect(page.getByRole("status")).toContainText(/not sent/i);
  });

  test("Progress is still reachable after leaving the tab bar", async ({
    page,
  }) => {
    await page.goto("/control-preview/app/today");
    await page.getByRole("link", { name: /Progress →/ }).click();
    await expect(
      page.getByRole("heading", { name: /Where the race is won/ }),
    ).toBeVisible();
  });
});

/**
 * SESSION STRUCTURE AND BLOCK PROGRESS
 *
 * Two things the second reference teardown produced: RPE and numbered
 * intervals (RoxFit is closer to our sport than MarchOn and structures a
 * session better), and block progress in the chrome rather than buried on one
 * screen (Runna keeps it in the top bar of the whole app).
 */
test.describe("session structure", () => {
  test("a session is numbered intervals, not a paragraph", async ({ page }) => {
    await page.goto("/control-preview/app/today");
    // The quantity leads, the movement follows.
    await expect(page.getByText("Sled push", { exact: true })).toBeVisible();
    await expect(page.getByText("60% race weight")).toBeVisible();
    // Repeat count is a chip, not prose.
    await expect(page.getByText("Repeat 6x")).toBeVisible();
  });

  test("RPE is on the prescription and is not colour-only", async ({ page }) => {
    await page.goto("/control-preview/app/today");
    await expect(page.getByText("8/10").first()).toBeVisible();
    // The bars are decorative; the number and a spoken label carry it.
    await expect(
      page.getByText(/Hard effort, 8 out of 10 perceived exertion/).first(),
    ).toBeAttached();
  });

  test("block progress is in the chrome of every screen", async ({ page }) => {
    for (const path of [
      "/control-preview/app/today",
      "/control-preview/app/plan",
      "/control-preview/app/nutrition",
      "/control-preview/app/coach",
      "/control-preview/app/account",
    ]) {
      await page.goto(path);
      // Rendered in both chromes with one hidden per width, so this has to
      // pick the visible copy rather than the first in DOM order.
      await expect(
        page.locator('[title*="of your training block"]:visible').first(),
      ).toBeVisible();
    }
  });
});
