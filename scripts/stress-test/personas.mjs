// 8 personas. Each defines viewport, network, quiz answers (where applicable),
// and a `journey` function that takes (page, ctx) and exercises the site as
// that persona would. Journeys return after the persona has either converted
// (reached /quiz pre-result), bounced, or given up.

import { devices } from "@playwright/test";

const M390 = { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } };
const M375 = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, userAgent: devices["iPhone 12 Pro"].userAgent };
const D1440 = { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } };

// Pause helper that records the hesitation event.
async function hesitate(ctx, ms, reason) {
  ctx.events.push({ t: Date.now() - ctx.t0, kind: "hesitation", ms, reason });
  await new Promise((r) => setTimeout(r, ms));
}

async function click(page, ctx, selector, label) {
  ctx.events.push({ t: Date.now() - ctx.t0, kind: "click", selector, label });
  try {
    await page.locator(selector).first().click({ timeout: 5000 });
    return true;
  } catch (e) {
    ctx.events.push({ t: Date.now() - ctx.t0, kind: "click-failed", selector, err: e.message.slice(0, 100) });
    return false;
  }
}

async function scrollALittle(page, ctx, steps = 3) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(200 + Math.random() * 300);
  }
  ctx.events.push({ t: Date.now() - ctx.t0, kind: "scroll", steps });
}

// Auto-advance through the quiz by repeatedly pressing primary CTAs.
// Doesn't pretend to be smart about which answer; just tries to keep moving
// forward to measure friction in the flow.
async function autoQuiz(page, ctx, maxSteps = 18) {
  for (let i = 0; i < maxSteps; i++) {
    await page.waitForTimeout(300 + Math.random() * 400);
    // Find the most prominent affirmative button on the screen.
    const candidates = [
      'button:has-text("Continue")',
      'button:has-text("Next")',
      'button:has-text("Start")',
      'button:has-text("Skip")',
      'a:has-text("Continue")',
      'a:has-text("Get my plan")',
      // Quiz single-select buttons render as <button type="button"> with the option label.
      'button[type="button"]:visible',
    ];
    let advanced = false;
    for (const sel of candidates) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        try {
          await el.click({ timeout: 1500 });
          advanced = true;
          break;
        } catch {
          /* try next */
        }
      }
    }
    if (!advanced) {
      ctx.events.push({ t: Date.now() - ctx.t0, kind: "quiz-stuck", step: i });
      break;
    }
    ctx.events.push({ t: Date.now() - ctx.t0, kind: "quiz-step", step: i, url: page.url() });
    // If we've reached /quiz/done or /pricing, we've converted.
    if (/\/quiz\/done|\/pricing|\/plan|\/account\/create/.test(page.url())) {
      ctx.events.push({ t: Date.now() - ctx.t0, kind: "quiz-completed", url: page.url() });
      return;
    }
  }
}

export const PERSONAS = [
  {
    id: "beginner-sarah",
    label: "Beginner Sarah (first-time Hyrox, 35F, 2 days/week, no race)",
    context: M390,
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 1800, "reading hero");
      await scrollALittle(page, ctx, 4);
      await hesitate(ctx, 1200, "reading 'what you get'");
      await scrollALittle(page, ctx, 3);
      await click(page, ctx, 'a:has-text("Find your plan"), a:has-text("find your plan")', "hero cta");
      await page.waitForLoadState("domcontentloaded");
      await autoQuiz(page, ctx);
    },
  },
  {
    id: "sub90-marcus",
    label: "Sub-90 Marcus (intermediate, 32M, 4 days/week, race in 14 weeks)",
    context: D1440,
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/programmes`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 1500, "comparing programmes");
      await scrollALittle(page, ctx, 2);
      await click(page, ctx, 'a[href*="sub-90"]', "sub-90 card");
      await page.waitForLoadState("domcontentloaded");
      await autoQuiz(page, ctx);
    },
  },
  {
    id: "doubles-pair",
    label: "Doubles Alex+Jamie (partner training, both 28, 5 days/week)",
    context: D1440,
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 800, "skim hero");
      await scrollALittle(page, ctx, 6);
      await click(page, ctx, 'a[href*="doubles"]', "doubles card");
      await page.waitForLoadState("domcontentloaded");
      await autoQuiz(page, ctx);
    },
  },
  {
    id: "pro-david",
    label: "Pro Athlete David (advanced, 30M, 6 days/week, podium goal)",
    context: D1440,
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/pricing`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 1200, "checking price first");
      await scrollALittle(page, ctx, 3);
      await page.goto(`${ctx.base}/programmes`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 800, "scanning programmes");
      await click(page, ctx, 'a[href*="pro"]', "pro card");
      await page.waitForLoadState("domcontentloaded");
      await autoQuiz(page, ctx);
    },
  },
  {
    id: "returning-lapsed",
    label: "Returning Lapsed (did quiz before, didn't subscribe)",
    context: M390,
    journey: async (page, ctx) => {
      // localStorage from a prior visit
      await page.goto(`${ctx.base}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        try {
          localStorage.setItem("vyrek:quiz:v2:state", JSON.stringify({ answers: { intent: "first-race" }, screenIndex: 5 }));
        } catch {}
      });
      await hesitate(ctx, 600, "recognise site");
      await click(page, ctx, 'a:has-text("sign in"), a:has-text("Member sign in")', "sign-in link");
      await page.waitForLoadState("domcontentloaded");
      await hesitate(ctx, 1500, "remember password?");
      await page.goBack();
      await page.waitForLoadState("domcontentloaded");
      await scrollALittle(page, ctx, 5);
    },
  },
  {
    id: "confused-visitor",
    label: "Confused Visitor (lands, scrolls a bit, leaves)",
    context: M390,
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 2200, "is this for me?");
      await scrollALittle(page, ctx, 2);
      await hesitate(ctx, 900, "hmm");
      // Visit FAQ
      await page.goto(`${ctx.base}/how-it-works`, { waitUntil: "domcontentloaded" });
      await scrollALittle(page, ctx, 3);
      await hesitate(ctx, 1100, "still not sure");
      ctx.events.push({ t: Date.now() - ctx.t0, kind: "abandon", reason: "confused, left" });
    },
  },
  {
    id: "mobile-commuter",
    label: "Mobile-only Commuter (whole flow at 375px)",
    context: M375,
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/`, { waitUntil: "domcontentloaded" });
      await hesitate(ctx, 700, "thumb-scroll");
      await scrollALittle(page, ctx, 8);
      await click(page, ctx, 'a:has-text("Find your plan")', "hero cta");
      await page.waitForLoadState("domcontentloaded");
      await autoQuiz(page, ctx);
    },
  },
  {
    id: "slow-3g",
    label: "Slow 3G User (throttled, measures patience)",
    context: M390,
    cdpThrottle: {
      // 750ms latency, 1.5Mbps down, 750Kbps up — slow-3G profile
      offline: false,
      downloadThroughput: (1.5 * 1000 * 1000) / 8,
      uploadThroughput: (750 * 1000) / 8,
      latency: 400,
    },
    journey: async (page, ctx) => {
      await page.goto(`${ctx.base}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await hesitate(ctx, 2500, "waiting for hero");
      await scrollALittle(page, ctx, 4);
      await click(page, ctx, 'a:has-text("Find your plan")', "hero cta");
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
      await autoQuiz(page, ctx, 12);
    },
  },
];
