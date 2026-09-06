import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * THE CONTINUE BUTTON, ON THE SCREEN A PAYING CLIENT ACTUALLY SEES.
 *
 * A client reported that Continue "wasn't working" while signing up from one
 * of Ben's payment links. This walks that exact journey — welcome, details,
 * card — and asserts at every step both that the button does what it should
 * AND that when it is deliberately disabled the screen says why.
 *
 * ── WHY IT MINTS ITS OWN INVITE INSTEAD OF POSTING TO THE API ─────────────
 * tests/visual/onboarding.spec.ts asks `/api/onboarding/invite` for a link.
 * That route is admin-gated (it sends real email and real SMS and creates a
 * payment link), so an unauthenticated test now gets 401, `body.link` comes
 * back undefined, and every downstream test fails on a page reading "This
 * link looks incomplete" — which looks exactly like a broken product and is
 * not. Writing the invite row directly tests the client journey without
 * needing to hold an admin session or send anybody a text.
 *
 * Both link shapes are covered, because they behave differently and only one
 * of them is the common case:
 *   · a SHORT ID, backed by the invite store — what production mints, and it
 *     carries the email, so the client retypes nothing.
 *   · a SIGNED TOKEN, the fallback when the store is unreachable — it cannot
 *     afford the characters for an email (see lib/onboarding/token.ts), so
 *     the client has to type one and Continue must say so rather than sit
 *     there grey and silent.
 */

const PASSWORD = "correct-horse-battery-staple";
const ALPHABET = "abcdefghjkmnpqrstvwxyz23456789";

/**
 * Playwright does not load .env.local — Next does that for the server under
 * test, not for this process — so read the two keys straight out of the file.
 * Cheaper than adding a dotenv dependency for one test.
 */
function env(key: string): string {
  const raw = readFileSync(".env.local", "utf8");
  const line = raw
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} is not in .env.local`);
  return line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

function db(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}

function newInviteId(): string {
  const bytes = randomBytes(20);
  let id = "";
  for (let i = 0; id.length < 10 && i < bytes.length; i++) {
    if (bytes[i] >= 240) continue;
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  while (id.length < 10) id += ALPHABET[randomBytes(1)[0] % ALPHABET.length];
  return id;
}

/** A unique address per run, so a leftover account cannot make a test pass. */
function freshEmail(): string {
  return `kieron.hawke+cbtest-${randomBytes(4).toString("hex")}@googlemail.com`;
}

async function mintStoredInvite(email: string) {
  const id = newInviteId();
  const now = Math.floor(Date.now() / 1000);
  const { error } = await db()
    .from("onboarding_invites")
    .insert({
      id,
      expires_at: new Date(Date.now() + 31 * 86400 * 1000).toISOString(),
      payload: {
        name: "Continue Test",
        email,
        phone: "07700900123",
        kind: "payment",
        amountPence: 6000,
        dueTodayPence: 10000,
        startDay: Math.floor(Date.now() / 86400000) + 7,
        iat: now,
        exp: now + 30 * 86400,
      },
    });
  if (error) throw new Error(`could not mint an invite: ${error.message}`);
  return id;
}

/** Everything this spec created, removed whether it passed or failed. */
async function cleanUp(inviteId: string, email: string) {
  const sb = db();
  await sb.from("onboarding_invites").delete().eq("id", inviteId);
  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  const user = data?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (user) {
    const { data: customer } = await sb
      .from("customers")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (customer) {
      await sb.from("subscriptions").delete().eq("customer_id", customer.id);
      await sb.from("customers").delete().eq("id", customer.id);
    }
    await sb.auth.admin.deleteUser(user.id);
  }
}

async function hydrated(page: Page) {
  await page.waitForFunction(() =>
    [document, document.body].some((n) =>
      Object.keys(n).some((k) => k.startsWith("__reactContainer")),
    ),
  );
}

const next = (page: Page) => page.locator(".ob-next");
const stop = (page: Page) => page.locator(".ob-stop");

test.describe("the Continue button on a payment link", () => {
  let inviteId = "";
  let email = "";

  test.beforeEach(async () => {
    email = freshEmail();
    inviteId = await mintStoredInvite(email);
  });

  test.afterEach(async () => {
    if (inviteId) await cleanUp(inviteId, email);
  });

  test("carries a client from the first screen to the card", async ({ page }) => {
    await page.goto(`/o/${inviteId}`);
    await hydrated(page);

    /* ── 1. Welcome ─────────────────────────────────────────────────────
       Nothing is asked yet, so there is nothing to block on. A disabled
       button here would be the report we are chasing. */
    await expect(next(page)).toBeVisible();
    await expect(next(page)).toBeEnabled();
    await expect(next(page)).toHaveText(/continue/i);
    await next(page).click();

    /* ── 2. Their details ───────────────────────────────────────────── */
    await expect(page).toHaveURL(/step=account/);
    // Ben already typed these into the invite; retyping them is the thing
    // the link exists to avoid.
    await expect(page.locator('input[autocomplete="name"]')).toHaveValue("Continue Test");
    await expect(page.locator('input[autocomplete="email"]')).toHaveValue(email);

    // Blocked WITH a reason. A grey button and no explanation is the single
    // commonest way a form gets reported as broken. It is aria-disabled
    // rather than disabled, so it can still be pressed — see the nudge test.
    await expect(next(page)).toHaveAttribute("aria-disabled", "true");
    await expect(stop(page)).toContainText(/password/i);

    // Too short: still refused, and the reason changes to the real one.
    await page.locator('input[type="password"]').fill("short");
    await expect(next(page)).toHaveAttribute("aria-disabled", "true");
    await expect(stop(page)).toContainText(/8 characters/i);

    // Long enough: the button goes live.
    await page.locator('input[type="password"]').fill(PASSWORD);
    await expect(next(page)).toHaveAttribute("aria-disabled", "false");

    /* ── 3. It actually advances ────────────────────────────────────────
       The account is created by this click, so a failure here is a client
       who cannot get past the details screen no matter what they type. */
    await next(page).click();
    await expect(page).toHaveURL(/step=pay/, { timeout: 20_000 });

    // No error box on the way through.
    await expect(page.locator(".ob-error")).toHaveCount(0);

    /* ── 4. The card step ───────────────────────────────────────────────
       Stops here deliberately: pressing this button opens Stripe. The
       assertion is that it is ready to be pressed. */
    const pay = page.locator(".ob-next");
    await expect(pay).toBeEnabled();
    await expect(pay).toHaveText(/secure checkout/i);
  });

  test("says what is missing rather than greying out in silence", async ({ page }) => {
    await page.goto(`/o/${inviteId}?step=account`);
    await hydrated(page);

    // Clearing a prefilled field must produce a sentence, not just a dead
    // button. Each of these is a real state a client can reach by editing.
    await page.locator('input[autocomplete="name"]').fill("");
    await expect(next(page)).toHaveAttribute("aria-disabled", "true");
    await expect(stop(page)).not.toHaveText("");

    await page.locator('input[autocomplete="name"]').fill("Continue Test");
    await page.locator('input[autocomplete="email"]').fill("not-an-email");
    await expect(next(page)).toHaveAttribute("aria-disabled", "true");
    await expect(stop(page)).toContainText(/does not look right/i);
  });

  test("a blocked Continue carries them to the field that is blocking it", async ({
    page,
  }) => {
    /*
     * THE ACTUAL REPORTED BUG.
     *
     * A payment-link client arrives on this step with name, email and mobile
     * already filled in by Ben. The only thing left is the password — and on
     * a phone that field is BELOW THE FOLD, behind the pinned action bar. So
     * the client sees a finished form and a dead button.
     *
     * Note what the other tests could not catch: Playwright scrolls an
     * element into view before filling it, so every assertion about the
     * password field passed while a real thumb could not find it. This one
     * presses the button first, exactly as a person does.
     */
    await page.goto(`/o/${inviteId}?step=account`);
    await hydrated(page);

    const field = page.locator('input[type="password"]');
    await expect(next(page)).toHaveAttribute("aria-disabled", "true");

    /* `force` because Playwright's actionability check treats aria-disabled
       as not-enabled and refuses to click. A browser does not: aria-disabled
       is a promise to assistive technology, not a block on pointer events, so
       a real thumb lands the press and force is the honest simulation of it. */
    await next(page).click({ force: true });

    await expect(field).toBeInViewport();
    await expect(field).toBeFocused();
  });

  test("the action bar is reachable without scrolling", async ({ page }) => {
    /* The button being below the fold is indistinguishable from the button
       not working, and is the more likely of the two on a phone. */
    await page.goto(`/o/${inviteId}?step=account`);
    await hydrated(page);

    const box = await next(page).boundingBox();
    expect(box, "the Continue button has no box at all").not.toBeNull();
    const viewport = page.viewportSize();
    expect(box!.y + box!.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
  });
});
