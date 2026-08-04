import { test, expect, type Page } from "@playwright/test";

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

async function mintInvite(
  request: Page["request"],
  over: Record<string, unknown> = {},
): Promise<string> {
  const res = await request.post("/api/onboarding/invite", {
    data: {
      name: "Sam Reeves",
      email: "sam@example.com",
      phone: "07700900001",
      kind: "full",
      ...over,
    },
  });
  const body = await res.json();
  /* The invite path is `/o/{token}`, not `/onboarding/{token}`.
     It was shortened because the link rides in a text message, and this
     helper was never moved with it — so every token came back `undefined`
     and twelve tests in this file failed with a TypeError three calls
     later, which reads like a broken page rather than a broken split.
     Both paths still render, so accept either. */
  const link = String(body.link);
  return link.split(/\/(?:o|onboarding)\//)[1];
}

async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

test.describe("the invite", () => {
  test("creates a signed link and reports each channel honestly", async ({ request }) => {
    const res = await request.post("/api/onboarding/invite", {
      data: { name: "Sam Reeves", email: "sam@example.com", phone: "07700900001" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.link).toMatch(/\/(?:o|onboarding)\//);
    expect(body.secured).toBe(true);
    /* SMS honesty. The reason changes with how the environment is
       configured — no provider at all, or a provider that refused — and
       what matters is that a message which did not go is never reported
       as sent. Asserting the exact string tied this to one environment. */
    if (body.sms.ok) {
      expect(body.sms.sentAs ?? "").not.toBe("");
    } else {
      expect(String(body.sms.reason).length).toBeGreaterThan(0);
    }
    expect(body.sms.text).toMatch(/\/(?:o|onboarding)\//);
  });

  test("refuses an invite with nowhere to send it", async ({ request }) => {
    const res = await request.post("/api/onboarding/invite", {
      data: { name: "Sam Reeves" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("CONTACT_REQUIRED");
  });

  test("refuses a nameless invite and a broken address", async ({ request }) => {
    expect(
      (await request.post("/api/onboarding/invite", { data: { email: "a@b.co" } })).status(),
    ).toBe(400);
    expect(
      (
        await request.post("/api/onboarding/invite", {
          data: { name: "Sam", email: "not-an-email" },
        })
      ).status(),
    ).toBe(400);
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
    await expect(page.locator(".ob-count")).toContainText("/ 9");
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
    await page.locator(".ob-next").click(); // account (prefilled)
    await page.locator(".ob-next").click(); // about (name prefilled)

    await page.locator(".ob-choice").first().click();
    await page.locator(".ob-number").nth(2).click();
    await page.locator(".ob-next").click(); // training

    await page.locator(".ob-next").click(); // health, optional

    await page.locator(".ob-day").nth(0).click();
    await page.locator(".ob-day").nth(3).click();
    await page.locator(".ob-next").click(); // availability

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
    await page.getByLabel("Injuries, past or present").fill("Left calf tear");

    await page.goto(`/onboarding/${token}?step=plan`);
    await hydrated(page);
    await page.locator(".ob-plan").first().click();
    await page.locator(".ob-next").click();

    // Article 9 data, on a phone, in public. It says it was given, not what.
    await expect(page.locator(".ob-summary")).toContainText("Given to Ben");
    await expect(page.locator(".ob-summary")).not.toContainText("calf");
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
    await expect(page.locator(".ob-error")).toContainText("nothing was charged");
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
    expect((await res.json()).error).toBe("NO_AGREED_PRICE");
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
  /* Refused rather than quietly dropped: an invite that silently ignored a
     bad price would offer the published tiers to somebody Ben had just
     quoted, and he would not find out until they rang back. */
  test("an unreadable agreed price is refused at the invite, not ignored", async ({
    page,
  }) => {
    const res = await page.request.post("/api/onboarding/invite", {
      data: {
        name: "Sam Reeves",
        email: "sam@example.com",
        kind: "payment",
        agreedPrice: "one fifty",
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toBe("PRICE_INVALID");
  });
});

test.describe("a price agreed with one person", () => {
  test("leads their plan step, and only theirs", async ({ page }) => {
    const token = await mintInvite(page.request, {
      kind: "payment",
      agreedPrice: "150",
      agreedName: "Sam's plan",
    });
    await page.goto(`/o/${token}?step=plan`);

    const cards = page.locator(".ob-plan");
    await expect(cards.first()).toContainText("Sam's plan");
    await expect(cards.first()).toContainText("£150");
    /* "Agreed with Ben", never "Most popular": calling a plan built for one
       person popular is a fabricated claim about other people. */
    await expect(cards.first()).toContainText("Agreed with Ben");
    await expect(page.locator(".ob-plan__flag")).toHaveCount(1);

    // Pre-selected. He quoted them a number; they should not have to hunt.
    await expect(cards.first()).toHaveAttribute("aria-pressed", "true");

    // An ordinary invite gets none of this.
    const plain = await mintInvite(page.request, { kind: "payment" });
    await page.goto(`/o/${plain}?step=plan`);
    await expect(page.locator(".ob-plan").first()).not.toContainText(
      "Agreed with Ben",
    );
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
    await expect(page.getByRole("link", { name: "Go to my account" })).toBeVisible();
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
