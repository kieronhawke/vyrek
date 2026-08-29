import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Edits persist now, which means tests leak into each other.
 *
 * lib/control/store.ts writes to localStorage, and Playwright reuses a context
 * across the tests in a worker — so a test that adds a client or edits a plan
 * changed what every later test saw. Eighteen failed for that reason and every
 * one of them passed in isolation.
 *
 * Clearing per test is the fix. It also means each test starts from the seed,
 * which is what they all assert against.
 */
test.beforeEach(async ({ page }, testInfo) => {
  // The walkthrough suite needs a genuine first visit; everything else needs
  // it out of the way, because clearing storage makes every test a first
  // visit and the sheet then swallows the first click.
  const dismiss = !testInfo.titlePath.includes("walkthrough");
  await page.addInitScript((dismissWalkthrough: boolean) => {
    try {
      window.localStorage.clear();
      if (dismissWalkthrough) {
        window.localStorage.setItem("suth.store.v1.walkthrough.seen", "true");
      }
    } catch {
      /* storage blocked; nothing to clear */
    }
  }, dismiss);
});

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

    test(`${screen.name}: content column is bounded`, async ({ page, viewport }) => {
      await page.goto(screen.path);
      const width = await page
        .locator(".member-main")
        .evaluate((el) => el.getBoundingClientRect().width);
      // --member-max is 760px up to 1024px and 1180px above it: a reading
      // column for prose, room for the week grid on a desktop.
      const cap = (viewport?.width ?? 0) >= 1024 ? 1180 : 760;
      expect(width).toBeLessThanOrEqual(cap + 80);
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
    // The week grid is the plan; the day pages carry the session detail.
    await expect(page.locator(".week__grid")).toBeVisible();
    await expect(page.locator(".week__day").first()).toBeVisible();
  });

  test("feedback collects a verdict, a note, and confirms honestly", async ({
    page,
  }) => {
    // Feedback lives on the session page now — the week grid answers "what is
    // the week", the day page answers "how did it go".
    await page.goto("/control-preview/app/plan/2026-08-04");
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
    await page.goto("/control-preview/admin/plans/haseeb");

    const send = page.getByRole("button", { name: /^Send to/ });
    // Seeded with Ben's real week, note included, so it starts sendable.
    await expect(send).toBeEnabled();
    await page.getByLabel("Note for the week").fill("");
    await expect(send).toBeDisabled();

    await page
      .getByLabel("Note for the week")
      .fill("Build week. Runs faster not longer, sled is technique under fatigue.");
    await expect(send).toBeEnabled();

    await send.click();
    // It must not claim to have sent anything.
    await expect(page.getByRole("status")).toContainText(/not sent/i);
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
/* REWRITTEN 4 August 2026. Every test here described a page that no longer
   exists: the ids moved from c_* to the tracker's a_*, the back link became
   "← Coach tracker", "Write next plan" became "Write their plan", and the
   flag/notes/pause fixtures went entirely. The intent is unchanged — Ben
   opens a client to decide whether they need a plan, whether they have paid,
   how long they have been with him, and what to do next — so each test now
   asserts that against the page as built. */
test.describe("client record", () => {
  /** The tracker is the list Ben actually types into, so it owns the ids. */
  async function openFirstClient(page: import("@playwright/test").Page) {
    await page.goto("/control-preview/admin/tracker");
    const first = page.locator('a[href*="/admin/clients/"]:visible').first();
    await expect(first).toBeVisible({ timeout: 15_000 });
    await first.click();
    await expect(page.getByRole("link", { name: /Coach tracker/ }).first())
      .toBeVisible({ timeout: 15_000 });
  }

  test("the tracker routes through to a record, and back", async ({ page }) => {
    await openFirstClient(page);
    // The way back is named after where it goes, not "back".
    await expect(page.getByText(/← Coach tracker/).first()).toBeVisible();
  });

  test("leads with the four things Ben opens it to decide", async ({ page }) => {
    await openFirstClient(page);
    for (const label of [
      /programmed until/i,
      /tier/i,
      /payment method/i,
      /with ben/i,
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("says how long is left rather than only a date", async ({ page }) => {
    // "2026-08-11" is a fact; "7 days left" is the decision.
    await openFirstClient(page);
    await expect(page.getByText(/\d+ days? left|overdue|ended/i).first())
      .toBeVisible();
  });

  test("writing a plan is one click from the person it is for", async ({
    page,
  }) => {
    await openFirstClient(page);
    await expect(
      page.getByRole("link", { name: /write their plan/i }).first(),
    ).toBeVisible();
  });

  test("coach notes take a new note", async ({ page }) => {
    await openFirstClient(page);
    await expect(
      page.getByRole("button", { name: /^Add note$/ }).first(),
    ).toBeVisible();
  });

  test("does not pretend the payment status is real yet", async ({ page }) => {
    // Stripe is not wired to this preview. Showing "Paid" would be a lie
    // that Ben would act on, so the page says where the number comes from.
    await openFirstClient(page);
    await expect(page.getByText(/arrives with Stripe/i).first()).toBeVisible();
  });

  test("an unknown client says so instead of erroring", async ({ page }) => {
    /* It used to 404. It now keeps the admin shell and explains, which is
       the better answer for somebody who mistyped an id or followed a stale
       link — the navigation stays put rather than dumping them on an error
       page. */
    await page.goto("/control-preview/admin/clients/definitely_not_a_client");
    await expect(page.getByText(/no client with that id/i)).toBeVisible({
      timeout: 15_000,
    });
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

/**
 * THE REVIEW INDEX
 *
 * Built so the whole product can be walked without an account. A review index
 * with a dead row is worse than none, so every link it prints is checked.
 */
test.describe("review index", () => {
  test("every link on /review resolves", async ({ request, page }) => {
    await page.goto("/review");
    const hrefs = await page.evaluate(() =>
      [
        ...new Set(
          Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href^='/']")).map(
            (a) => a.getAttribute("href")!,
          ),
        ),
      ].filter((h) => !h.startsWith("/_next")),
    );
    expect(hrefs.length).toBeGreaterThan(20);

    for (const href of hrefs) {
      const res = await request.get(href, { maxRedirects: 0 });
      expect(res.status(), href).toBe(200);
    }
  });

  test("says plainly which screens are on sample data", async ({ page }) => {
    await page.goto("/review");
    await expect(page.getByText(/The screens are finished; the plumbing is not/)).toBeVisible();
    // The race calendar is the one thing running on real data.
    await expect(page.getByText("Real data").first()).toBeVisible();
  });

  test("both login pages offer one-click entry without claiming to sign you in", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: "Open the member area" })).toBeVisible();
    await expect(page.getByText(/Real sign-in needs Supabase keys/)).toBeVisible();

    await page.goto("/admin/login");
    await expect(page.getByRole("link", { name: "Open the admin" })).toBeVisible();
  });
});

/** Shown once, after onboarding, then never again. */
test.describe("walkthrough", () => {
  /**
   * Every card names a tab — "Today", "Plan", "Fuel" — and the card was
   * rendering on top of the tab bar it was describing, with a sliver of the
   * tabs showing underneath. Somebody reading "start here every day" could not
   * see the thing being pointed at, which is the one job a walkthrough has.
   */
  test("clears the tab bar it is pointing at", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/control-preview/app/plan", { waitUntil: "load" });
    await page.waitForTimeout(1200);

    const geometry = await page.evaluate(() => {
      const card = document.querySelector(".walkthrough__card");
      const tabs = document.querySelector(".member-tabbar");
      if (!card || !tabs) return null;
      return {
        cardBottom: card.getBoundingClientRect().bottom,
        tabsTop: tabs.getBoundingClientRect().top,
      };
    });

    // An assertion that cannot run should say so rather than pass quietly.
    expect(geometry, "walkthrough or tab bar not rendered in the preview").not.toBeNull();
    expect(geometry!.cardBottom).toBeLessThanOrEqual(geometry!.tabsTop + 1);
  });

  test("greets a new athlete on the first visit", async ({ page }) => {
    await page.goto("/control-preview/app/today");
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText("Start here every day");
    await expect(sheet).toContainText("1 of 5");
  });

  test("advances a step when Next is pressed", async ({ page }) => {
    await page.goto("/control-preview/app/today");
    const sheet = page.getByRole("dialog");
    // Scoped to the sheet: there is another "Next" button further down the
    // page, and an unscoped locator picked that one and timed out on a click
    // it could never land.
    await sheet.getByRole("button", { name: "Next" }).click();
    await expect(sheet).toContainText("2 of 5");
    await expect(sheet).toContainText("The whole week, as Ben wrote it");
  });

  test("records that it has been seen when dismissed", async ({ page }) => {
    await page.goto("/control-preview/app/today");
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Skip" }).click();
    await expect(sheet).toBeHidden();
    // Checked through the store rather than a reload: the init script clears
    // storage on every navigation, so a reload would re-show it regardless.
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem("suth.store.v1.walkthrough.seen"),
      ),
    ).toBe("true");
  });
});

/** Filming a set is the one thing a written plan cannot do. */
test.describe("form video", () => {
  test("is offered on a session, attached to that session", async ({ page }) => {
    await page.goto("/control-preview/app/plan/2026-08-04");
    await expect(page.getByText("Film or upload a clip")).toBeVisible();
    await expect(page.getByLabel("What should Ben look at?")).toBeVisible();
  });

  test("is not offered on a rest day", async ({ page }) => {
    await page.goto("/control-preview/app/plan/2026-08-07");
    await expect(page.getByText("Film or upload a clip")).toHaveCount(0);
  });
});

/**
 * Ticking a session off was a silent state change. It is the one moment in the
 * week the app has earned a reaction, and the moment that brings somebody back
 * tomorrow.
 */
test.describe("marking a session done", () => {
  test("celebrates, announces, and cleans up after itself", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/control-preview/app/plan", { waitUntil: "load" });
    await page.waitForTimeout(1200);

    // The walkthrough is modal and intercepts the tick underneath it.
    const skip = page.getByRole("button", { name: "Skip" });
    if (await skip.count()) await skip.click();
    await page.waitForTimeout(400);

    const tick = page.getByRole("button", { name: /Mark .* done/i }).first();
    await tick.scrollIntoViewIfNeeded();
    await tick.click();
    await page.waitForTimeout(250);

    expect(await page.locator(".celebrate__piece").count()).toBeGreaterThan(0);

    // The visual celebration conveys nothing to somebody who cannot see it.
    const announced = await page.locator("[aria-live=polite]").first().innerText();
    expect(announced).toMatch(/logged|week/i);

    // And it must not leave elements on the page for ever.
    await page.waitForTimeout(1300);
    expect(await page.locator(".celebrate__piece").count()).toBe(0);
  });
});

/**
 * "Ben talks through the week" was a play triangle with no onClick and a model
 * with no URL — a control that looked working and was not. Tapping it did
 * nothing at all, which is worse than looking unrecorded.
 */
test.describe("coach voice note", () => {
  test("says there is no recording rather than offering a dead play button", async ({ page }) => {
    await page.goto("/control-preview/app/plan", { waitUntil: "load" });
    await page.waitForTimeout(1200);

    // Demo data carries a label and a duration but no URL.
    const none = page.locator(".week__media--none");
    const player = page.locator(".week__media-player");

    // Exactly one of the two, never a button with nothing behind it.
    const hasNone = await none.count();
    const hasPlayer = await player.count();
    expect(hasNone + hasPlayer, "no coach-media block rendered at all").toBeGreaterThan(0);

    if (hasPlayer) {
      // A real player must have a real control and a real source.
      await expect(page.getByRole("button", { name: /play|pause/i }).first()).toBeVisible();
      const src = await page.locator(".week__media-player audio").getAttribute("src");
      expect(src, "player rendered with no audio source").toBeTruthy();
    } else {
      // The empty state must not be pressable.
      await expect(none).toBeVisible();
      expect(await none.evaluate((el) => el.tagName.toLowerCase())).not.toBe("button");
    }
  });
});

/**
 * THE WEEK'S LAYOUT.
 *
 * This was a four-column card grid, and seven days into four columns is two
 * rows with a hole in the corner. Worse, the days are wildly different sizes —
 * a rest day is one word, a Saturday brick is sixteen lines — so the cards
 * either stretched to match the tallest, which turned a rest day into a
 * card-sized box with one word floating in it, or kept their own heights and
 * made a staircase from 108px to 616px. Both looked broken.
 *
 * The rebuilt version is a list of day rows with fixed-width session blocks.
 * These tests hold the two properties that were actually wrong, at every
 * width, because a layout regression here is invisible in code review and
 * obvious to whoever opens the page.
 */
test.describe("the week's layout", () => {
  const WIDTHS = [390, 430, 768, 1024, 1180, 1440, 1728];

  test("every session block is the same width at any given size", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "drives its own viewports");

    const problems: string[] = [];
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto("/control-preview/app/plan", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".week__session");

      const sizes = await page.evaluate(() => {
        const blocks = [...document.querySelectorAll(".week__session")];
        return [
          ...new Set(blocks.map((b) => Math.round(b.getBoundingClientRect().width))),
        ];
      });

      /*
       * The failure this caught: at 1180px a half-row was too narrow to hold
       * a whole block, so the paired days rendered theirs at 236px while a
       * full-width day kept 268px — two sizes of the same thing on one
       * screen. It is the exact complaint the rebuild answers, reappearing
       * because a breakpoint was chosen by eye.
       */
      if (sizes.length !== 1) {
        problems.push(`${width}px: ${sizes.length} block widths (${sizes.join(", ")})`);
      }
      await ctx.close();
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("no day towers over the week, and nothing overflows sideways", async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "drives its own viewports");

    const problems: string[] = [];
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto("/control-preview/app/plan", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".week__day");

      const m = await page.evaluate(() => {
        const days = [...document.querySelectorAll(".week__day")];
        const heights = days.map((d) => Math.round(d.getBoundingClientRect().height));
        return {
          overflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          tallest: Math.max(...heights),
          shortest: Math.min(...heights),
        };
      });

      if (m.overflow > 1) problems.push(`${width}px: ${m.overflow}px of horizontal overflow`);

      /* On a wide screen a two-session day takes the whole row so both
         sessions sit side by side. Without that it stacks in half a row and
         becomes several times the height of the day beside it, which is the
         raggedness this layout removed, one level up. */
      if (width >= 1180 && m.tallest > 420) {
        problems.push(`${width}px: tallest day is ${m.tallest}px — a day is stacking`);
      }
      await ctx.close();
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
