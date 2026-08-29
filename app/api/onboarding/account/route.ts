import { NextResponse } from "next/server";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { signingConfigured } from "@/lib/onboarding/token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findAuthUserIdByEmail } from "@/lib/onboarding/activation";
import { limiters, requestIp } from "@/lib/rate-limit";

/**
 * THE ACCOUNT, MADE BEFORE THE CARD.
 *
 * An existing client opening Ben's link is being moved onto card payment.
 * They need a way back in afterwards, and the only door that existed was a
 * single-use sign-in link emailed after checkout — fine until the email is
 * lost, at which point somebody who is paying every month cannot reach the
 * thing they are paying for.
 *
 * So the flow asks for a password before it asks for a card, and this is
 * where that lands.
 *
 * WHY THIS IS SAFE TO CALL ANONYMOUSLY
 * The caller holds a signed invite Ben issued. It is checked here exactly as
 * checkout checks it, so this cannot be used to mint accounts at arbitrary
 * addresses without one. It is also rate limited, because an endpoint that
 * writes to the auth store should never be limited only by someone's patience.
 *
 * WHY IT RUNS BEFORE PAYMENT AND NOT AFTER
 * Because the person is sitting there. After checkout they are on Stripe's
 * receipt page and half of them close the tab — which is precisely the case
 * `activateFromSession` exists to survive. Doing it here means the password
 * is set by the person who chose it, while they are looking at the screen.
 *
 * IT IS NOT A SESSION. Nothing here signs anybody in. The browser signs in
 * with the password it just collected, or the client uses the emailed link.
 *
 * IT IS IDEMPOTENT. Somebody who backs out of Stripe and returns runs it
 * again, and must not meet an error for having already done what they were
 * asked to do.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The shortest password worth calling one. Matches /api/account/create. */
const MIN_PASSWORD = 8;

export async function POST(request: Request) {
  const rl = await limiters.onboardingActivate.limit(`acct:${requestIp(request)}`);
  if (!rl.success) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  if (!signingConfigured()) {
    return NextResponse.json({ error: "SIGNING_NOT_CONFIGURED" }, { status: 503 });
  }

  let body: {
    token?: string;
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const read = await resolveInvite(body.token ?? "");
  if (!read.ok) {
    return NextResponse.json(
      { error: "INVITE_INVALID", reason: read.reason },
      { status: 403 },
    );
  }

  const email = (body.email ?? read.invite.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? read.invite.name ?? "").trim();
  const phone = (body.phone ?? read.invite.phone ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "EMAIL_INVALID" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });
  }

  /*
   * Billing mode, because this is an existing client.
   *
   * Their training already happens with Ben, off the site. The account they
   * are creating manages a payment and nothing else until he switches their
   * work area on, and the member shell reads this to decide that.
   */
  const isBillingOnly = read.invite.kind === "payment";

  const sb = supabaseAdmin();

  try {
    const created = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        ...(phone ? { phone } : {}),
        ...(isBillingOnly ? { member_mode: "billing" } : {}),
      },
    });

    if (created.data.user) {
      return NextResponse.json({ ok: true, created: true });
    }

    /*
     * Already registered.
     *
     * NOT an error, and NOT a password reset. This runs again every time
     * somebody backs out of Stripe and comes forward a second time, so the
     * common case here is the same person repeating themselves — and
     * overwriting the password of an account that already exists, on nothing
     * more than possession of a link, would be a way to take over an account.
     *
     * The client signs in with whatever password that account already has, or
     * uses the emailed link. Reported honestly so the screen can say so.
     */
    const existingId = await findAuthUserIdByEmail(sb, email);
    if (!existingId) {
      console.error("[onboarding/account] user exists but id unrecoverable");
      return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 502 });
    }
    return NextResponse.json({ ok: true, created: false, alreadyRegistered: true });
  } catch (e) {
    console.error("[onboarding/account] createUser threw", e);
    return NextResponse.json({ error: "AUTH_UNAVAILABLE" }, { status: 502 });
  }
}
