import { test, expect, type Page } from "@playwright/test";
import {
  cleanUpInvite,
  mintInvite as newInvite,
  type InviteOverrides,
} from "../fixtures/invites";

/**
 * ONBOARDING, END TO END.
 *
 * The token's tamper-proofing and the step rules are unit-tested in
 * lib/onboarding/onboarding.test.ts. These cover what only a browser answers:
 * that the link opens, that the flow can actually be completed on a phone,
 * that the action bar is never below the fold, and that a bad link explains
 * itself instead of dead-ending somebody Ben is trying to sign up.
 *
 * A real invite is minted through the real endpoint for each test rather than
 * hard-coding a token — a token in a fixture expires and the suite starts
 * failing for a reason that has nothing to do with the code.
 */

/**
 * Every invite this file creates, so afterEach can remove it.
 *
 * These used to be minted by POSTing to `/api/onboarding/invite`. That route
 * is admin-gated now — it sends real email and SMS — so the call returned 401,
 * the token became the string "undefined", and twenty-two tests in this file
 * failed on a page reading "This link looks incomplete". See
 * tests/fixtures/invites.ts.
 */
const minted: string[] = [];

async function mintInvite(
  _request: Page["request"],
  over: InviteOverrides = {},
): Promise<string> {
  const id = await newInvite(over);
  minted.push(id);
  return id;
}

test.afterEach(async () => {
  while (minted.length) await cleanUpInvite(minted.pop()!);
});

async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

test.describe("the invite", () => {
  /**
   * ⚠️ WHAT IS NO LONGER COVERED HERE, AND WHY.
   *
   * Three tests used to POST this endpoint and assert its field validation:
   * that an invite with no email and no phone is refused (CONTACT_REQUIRED),
   * that a nameless one is refused, and that a malformed address is refused.
   *
   * The route is admin-gated now — it sends real email, real SMS and mints a
   * real payment link — so an unauthenticated test cannot get past the door
   * to reach any of that. Signing in would mean a live admin password sitting
   * in the repo, which is a worse trade than the coverage is worth.
   *
   * So what is asserted here is the gate itself, which is the more important
   * of the two: anyone on the internet can otherwise make Ben send texts.
   * The money validation behind it is unit-tested in
   * lib/onboarding/custom-rate.test.ts and due-today.test.ts. The three field
   * checks are genuinely untested end-to-end; they are three lines in
   * app/api/onboarding/invite/route.ts and worth re-covering if that route
   * ever grows a test-mode bypass.
   */
  test("cannot be used by anyone who is not an admin", async ({ request }) => {
    for (const data of [
      { name: "Sam Reeves", email: "sam@example.com", phone: "07700900001" },
      { name: "Sam Reeves" },
      { email: "a@b.co" },
    ]) {
      const res = await request.post("/api/onboarding/invite", { data });
      expect(res.status(), JSON.stringify(data)).toBe(401);
      expect((await res.json()).error).toBe("UNAUTHORIZED");
    }
  });
});

test.describe("the flow", () => {
  test("opens on their name, with nothing to retype", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}`);
    await hydrated(page);

    // The uppercase is CSS; the DOM keeps sentence case.
    await expect(page.locator(".ob-title")).toContainText(/set up/i);
    await expect(page.locator(".ob-lead")).toContainText("Sam");
    // Nine steps for a full invite.
    // Ten steps for a full invite; three for a payment one, asserted below.
    await expect(page.locator(".ob-count")).toContainText("/ 10");
  });

  test("a payment-only invite is three steps, not nine", async ({ page }) => {
    const token = await mintInvite(page.request, { kind: "payment" });
    await page.goto(`/onboarding/${token}`);
    await hydrated(page);
    await expect(page.locator(".ob-count")).toContainText("/ 3");
  });

  test("says why it cannot continue rather than just greying the button", async ({
    page,
  }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=training`);
    await hydrated(page);

    // A disabled button with no explanation is the commonest reason somebody
    // abandons a form.
    await expect(page.locator(".ob-next")).toBeDisabled();
    await expect(page.locator(".ob-stop")).toContainText("sounds most like you");

    await page.locator(".ob-choice").first().click();
    await page.locator(".ob-number").nth(2).click();
    await expect(page.locator(".ob-next")).toBeEnabled();
  });

  test("can be walked from the first screen to the card", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}`);
    await hydrated(page);

    await page.locator(".ob-next").click(); // welcome

    /*
     * The email is typed, not prefilled, and that is correct on this path.
     *
     * The invite link comes in two forms. When a Redis store is configured the
     * link carries a ten-character id, the full payload lives server-side, and
     * every field is prefilled. Without one — which is the case here and in
     * any environment where UPSTASH_REDIS_REST_URL is unset — the link falls
     * back to a signed token that deliberately carries only the first name,
     * because `lib/sms/send.ts` refuses any invite text over three segments
     * and the contact fields push it past that limit.
     *
     * So this test types the email, exactly as the recipient would. It used to
     * assume prefill, so it sat on a disabled Continue button until it timed
     * out — the invite flow looked broken when it was the test that was.
     */
    const email = page.locator("input[type='email']");
    if (!(await email.inputValue())) await email.fill("sam@example.com");
    /* The account step asks for a password now, on this path as well as the
       payment one, and Continue stays blocked until it has one. The test
       predates that and sat on a blocked button until it timed out. */
    await page.locator('input[type="password"]').fill("correct-horse-battery-staple");
    await page.locator(".ob-next").click(); // account

    // The name IS prefilled on both paths — that much the token always carries.
    await page.locator(".ob-next").click(); // about

    await page.locator(".ob-choice").first().click();
    await page.locator(".ob-number").nth(2).click();
    await page.locator(".ob-next").click(); // training

    await page.locator(".ob-next").click(); // health, optional

    await page.locator(".ob-day").nth(0).click();
    await page.locator(".ob-day").nth(3).click();
    await page.locator(".ob-next").click(); // availability

    /* `support` and `photo` are two steps, not one. The test had a single
       click labelled "photo", so it stopped on `photo` and waited for a plan
       card that was still a screen away. */
    await page.locator(".ob-next").click(); // support, optional
    await page.locator(".ob-next").click(); // photo, optional

    await page.locator(".ob-plan").first().click();
    await page.locator(".ob-next").click(); // plan

    await expect(page.locator(".ob-title")).toContainText(/payment/i);
    await expect(page.locator(".ob-next")).toBeEnabled();
  });

  test("remembers the answers if they come back later", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=about`);
    await hydrated(page);
    await page.getByLabel("What are you training for?").fill("Sub-1:20 at Manchester");

    await page.goto(`/onboarding/${token}?step=about`);
    await hydrated(page);
    // Somebody who gets a phone call halfway through comes back to where they
    // were, not to the beginning.
    await expect(page.getByLabel("What are you training for?")).toHaveValue(
      "Sub-1:20 at Manchester",
    );
  });

  test("never prints health answers back on the summary", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=health`);
    await hydrated(page);
    /* This used to type into a free-text "Injuries, past or present" box. The
       step is a layered picker now — the same shape as the quiz — so the
       answer is tapped. The point of the test is unchanged: whatever they
       give, the summary must say it was given, never what it was. */
    const area = page.locator(".ob-day--wide").nth(1);
    await area.click();

    await page.goto(`/onboarding/${token}?step=plan`);
    await hydrated(page);
    await page.locator(".ob-plan").first().click();
    await page.locator(".ob-next").click();

    /* Article 9 data, on a phone, in public. It says it was given, not what.
       The structured picker used to list the areas back here; "Lower back" is
       the label of the area tapped above and must not appear. */
    await expect(page.locator(".ob-summary")).toContainText("Given to Ben");
    await expect(page.locator(".ob-summary")).not.toContainText("Lower back");
  });

  test("says who can see the health answers, on the screen that asks", async ({
    page,
  }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=health`);
    await hydrated(page);
    await expect(page.locator(".ob-privacy")).toContainText("Only Ben sees this");
  });

  test("a cancelled checkout comes back reassuring, not scolding", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=pay&cancelled=1`);
    await hydrated(page);
    /* A NOTICE, not an error. Coming back from Stripe having pressed cancel
       is not a failure, and rendering it through the red role="alert" box
       read as "your payment was declined" to somebody already anxious. */
    await expect(page.locator(".ob-note").first()).toContainText("nothing was charged");
    await expect(page.locator(".ob-error")).toHaveCount(0);
  });

  test("nothing overflows sideways", async ({ page }) => {
    const token = await mintInvite(page.request);
    for (const step of ["welcome", "account", "training", "plan", "pay"]) {
      await page.goto(`/onboarding/${token}?step=${step}`);
      await hydrated(page);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, step).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("a link that does not work", () => {
  test("tells them which of the three problems it is", async ({ page }) => {
    // "Expired, ask Ben" and "your text message cut it short" are different
    // things to do about it.
    await page.goto("/onboarding/not-a-real-token");
    await expect(page.locator(".ob-title")).toContainText(/isn't valid|incomplete/i);

    /* A MUTATED LINK, whichever kind it is.
       Changing the tail of a SIGNED token breaks its signature — that is
       "isn't valid". Changing the tail of a SHORT id just produces an id
       nobody was ever issued, which reads as expired, and that is both
       correct and the kinder thing to tell somebody: ask Ben for a new one.
       Either way it is refused and either way the screen says what to do,
       which is what this test is actually for. */
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token.slice(0, -3)}aaa`);
    await expect(page.locator(".ob-title")).toContainText(
      /isn't valid|has expired|incomplete/i,
    );
  });
});

test.describe("checkout", () => {
  test("a tampered link cannot buy anything", async ({ page }) => {
    const token = await mintInvite(page.request);
    const res = await page.request.post("/api/onboarding/checkout", {
      data: { token: `${token.slice(0, -3)}aaa`, plan: "coaching-121" },
    });
    /* The property that matters is that it cannot buy anything, not which
       of the two refusals it is — a broken signature is "tampered", an id
       nobody was issued is "expired". Both are 403 and neither reaches
       Stripe. */
    expect(res.status()).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("INVITE_INVALID");
    expect(["tampered", "expired", "malformed"]).toContain(json.reason);
  });

  test("a plan that does not exist is refused", async ({ page }) => {
    // Otherwise a forged key could fall through to the cheapest price.
    const token = await mintInvite(page.request);
    const res = await page.request.post("/api/onboarding/checkout", {
      data: { token, plan: "free-forever" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("PLAN_UNKNOWN");
  });

  /**
   * The agreed price has to come from the signed invite and nowhere else.
   *
   * Asking for the bespoke plan on a link that carries no agreed price is
   * what a forged request looks like, and letting it through would mean the
   * page got to decide what somebody pays.
   */
  test("the agreed plan is refused on an invite with no agreed price", async ({
    page,
  }) => {
    const token = await mintInvite(page.request);
    const res = await page.request.post("/api/onboarding/checkout", {
      data: { token, plan: "custom" },
    });
    expect(res.status()).toBe(400);
    /* The refusal is the point, not the wording. With no agreed price the
       route falls back to `planByKey("custom")`, which is not a published
       tier, so it stops at PLAN_UNKNOWN — a rename of NO_AGREED_PRICE, same
       door. What matters is that nothing is priced by the request body. */
    expect((await res.json()).error).toBe("PLAN_UNKNOWN");
  });

  /**
   * An amount in the request body does not stop the checkout working.
   *
   * WHAT THIS DOES AND DOES NOT PROVE. It proves the route does not read a
   * posted amount as a signal — an unknown field does not divert it, error it,
   * or change its answer. It does NOT prove what Stripe was asked to charge,
   * because that lives in a session this test cannot see.
   *
   * The charge itself is covered where it can be: the token unit tests forge
   * an edited price and assert the link stops resolving, and the route reads
   * the amount from `read.invite` rather than from `body`. A test that
   * asserted "£150 was charged" from here would be asserting its own
   * assumption, which is worse than a narrower test that says so.
   */
  /* An unreadable agreed price used to be asserted here: "one fifty" must be
     refused with PRICE_INVALID rather than quietly dropped, because an invite
     that ignored a bad price would offer the published tiers to somebody Ben
     had just quoted and he would not find out until they rang back.

     It cannot run through the admin gate any more (see the note at the top of
     this file). `parsePrice` is unit-tested in custom-rate.test.ts, including
     that it returns null for anything unparseable, so the behaviour is still
     covered — one layer down. */
});

test.describe("a price agreed with one person", () => {
  /**
   * ⚠️ REWRITTEN, BECAUSE THE THING IT TESTED NO LONGER EXISTS.
   *
   * This used to assert that an agreed rate led the PLAN STEP: a card
   * reading "Sam's plan · £150 · Agreed with Ben", pre-selected, with the
   * published tiers beside it. `PAYMENT_STEPS` in lib/onboarding/model.ts
   * removed that on purpose — showing a menu to somebody Ben already coaches
   * invited them to change an arrangement that was never on the table — so a
   * payment invite is now welcome → account → pay with no plan step at all,
   * and `customName` was dropped from the token entirely.
   *
   * The test kept passing against nothing for as long as the whole file was
   * failing to mint an invite. What matters now is that the agreed money is
   * stated plainly on the first screen, from the same numbers checkout will
   * charge.
   */
  test("states the agreed money on the first screen", async ({ page }) => {
    const token = await mintInvite(page.request, {
      kind: "payment",
      amountPence: 6000,
      dueTodayPence: 10000,
    });
    await page.goto(`/o/${token}`);
    await hydrated(page);

    const body = page.locator(".ob-step");
    await expect(body).toContainText("£100");
    await expect(body).toContainText("£60");

    // No plan menu on this journey, and no invented package name.
    await expect(page.locator(".ob-plan")).toHaveCount(0);
    await expect(body).not.toContainText("Most popular");

  });

  test("an invite with no agreed rate says no money on the first screen", async ({
    page,
  }) => {
    const token = await mintInvite(page.request, { kind: "payment" });
    await page.goto(`/o/${token}`);
    await hydrated(page);
    await expect(page.locator(".ob-step")).not.toContainText("£");
  });
});

test.describe("the welcome landing", () => {
  test("never claims a subscription it cannot see", async ({ page }) => {
    await page.goto("/onboarding/welcome");
    await hydrated(page);
    await expect(page.locator(".obw-title")).toContainText(/you're in/i);
    // No session id, so it must not assert that anything is live.
    await expect(page.locator(".obw-lead")).not.toContainText("subscription is live");
  });

  test("tells them what happens next", async ({ page }) => {
    await page.goto("/onboarding/welcome");
    await hydrated(page);
    await expect(page.locator(".obw-next li")).toHaveCount(3);
    /* No session id on this URL, so the page cannot know they are signed
       in: it offers sign-in rather than a button into the account. */
    await expect(
      page.getByRole("link", { name: "Sign in to my account" }),
    ).toBeVisible();
  });
});

test.describe("onboarding on a phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1440) >= 720, "phone only");

  test("the action bar is always reachable without scrolling", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=plan`);
    await hydrated(page);

    const viewport = page.viewportSize()!;
    const bar = (await page.locator(".ob-actions").boundingBox())!;
    // Pinned: the commonest reason a step stalls on a phone is a next button
    // below the fold.
    expect(bar.y + bar.height).toBeGreaterThanOrEqual(viewport.height - 2);
  });

  test("inputs are big enough that iOS does not zoom the page", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=account`);
    await hydrated(page);
    const size = await page
      .locator(".ob-input")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    // Under 16px and Safari zooms the whole page on focus, which feels broken.
    expect(size).toBeGreaterThanOrEqual(16);
  });

  test("every control clears the touch target", async ({ page }) => {
    const token = await mintInvite(page.request);
    await page.goto(`/onboarding/${token}?step=training`);
    await hydrated(page);
    const controls = page.locator(".ob-choice, .ob-number, .ob-next, .ob-back");
    const n = await controls.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const box = await controls.nth(i).boundingBox();
      if (box) expect(box.height, `control ${i}`).toBeGreaterThanOrEqual(44);
    }
  });
});
