import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { CUSTOM_PLAN_KEY, planFor } from "@/lib/onboarding/model";
import { siteUrl } from "@/lib/site-url";

/**
 * CHECKOUT, FROM AN INVITE.
 *
 * The existing /api/stripe/create-checkout-session requires a Supabase session
 * and a customers row, because it serves the self-serve quiz funnel. Somebody
 * onboarding from Ben's link has neither yet — they are being set up, that is
 * the whole point — so this is a separate route rather than a weakening of
 * that one. Loosening the authenticated route to accept anonymous callers
 * would be a real hole in the funnel that already works.
 *
 * THE INVITE IS THE AUTHORISATION. It is HMAC-signed, so the caller cannot
 * change the plan, the price or the expiry. The price is looked up from the
 * plan key on the server; nothing about the amount comes from the request.
 *
 * `price_data` rather than a pre-created price: Ben has one price in Stripe
 * (the £8.99 Club) and three things he sells. Inline prices mean a tier can be
 * added in lib/onboarding/model.ts without anybody logging into Stripe, which
 * matters because nobody is going to.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: string; plan?: string };
  try {
    body = (await request.json()) as { token?: string; plan?: string };
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // Accepts a short id or a signed token. Using readInvite here would reject
  // every short link at the moment of payment, which is the worst place in the
  // whole flow to break.
  const read = await resolveInvite(body.token ?? "");
  if (!read.ok) {
    // The reason travels so the screen can say "this link has expired, ask
    // Ben for a new one" rather than a generic refusal.
    return NextResponse.json({ error: "INVITE_INVALID", reason: read.reason }, { status: 403 });
  }

  /*
   * THE PRICE COMES FROM THE VERIFIED INVITE, NEVER FROM THE REQUEST.
   *
   * The body says which plan they picked. It does not, and must never, say
   * what that plan costs. For the standard tiers the amount is looked up from
   * the model; for a price Ben agreed with this person it is read out of the
   * signed token, where editing it breaks the signature.
   *
   * Reversing that — trusting an amount posted by the page — is how somebody
   * pays £1 a month for the £220 plan, and it would look completely normal in
   * Stripe afterwards.
   */
  const custom = read.invite.customPence
    ? { pence: read.invite.customPence, name: read.invite.customName }
    : null;
  const plan = planFor(body.plan, custom);
  if (!plan) {
    /* Asking for the agreed plan on an invite that carries no agreed price
       is the one case worth naming separately: it means a link was edited or
       a stale page was left open, and "unknown plan" would send Ben looking
       for a bug in the plan list. */
    return NextResponse.json(
      {
        error: body.plan === CUSTOM_PLAN_KEY ? "NO_AGREED_PRICE" : "PLAN_UNKNOWN",
      },
      { status: 400 },
    );
  }

  let client: ReturnType<typeof stripe>;
  try {
    client = stripe();
  } catch {
    return NextResponse.json({ error: "STRIPE_NOT_CONFIGURED" }, { status: 503 });
  }

  const base = siteUrl().replace(/\/$/, "");

  try {
    const session = await client.checkout.sessions.create({
      mode: "subscription",
      // Pre-filled from the signed invite, so they do not retype an address
      // Ben already has — and so the Stripe customer matches the client.
      customer_email: read.invite.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "gbp",
            unit_amount: plan.pence,
            recurring: { interval: "month" },
            product_data: {
              name: `Suth Performance — ${plan.name}`,
              description: plan.summary,
            },
          },
        },
      ],
      subscription_data: {
        ...(plan.trialDays > 0 ? { trial_period_days: plan.trialDays } : {}),
        metadata: {
          plan: plan.key,
          onboarding: read.invite.kind,
          client_name: read.invite.name,
          /* Stamped on the subscription so a bespoke price is identifiable in
             Stripe a year later. Without it, an amount that matches no
             published tier looks like a mistake to whoever finds it. */
          ...(plan.key === CUSTOM_PLAN_KEY
            ? { agreed_price_pence: String(plan.pence) }
            : {}),
        },
      },
      metadata: {
        plan: plan.key,
        onboarding: read.invite.kind,
        client_name: read.invite.name,
        ...(plan.key === CUSTOM_PLAN_KEY
          ? { agreed_price_pence: String(plan.pence) }
          : {}),
      },
      allow_promotion_codes: true,
      // Back to the step they were on, not to the top of the funnel: somebody
      // who pressed back on a card form has not changed their mind about the
      // five minutes of answers they just gave.
      success_url: `${base}/onboarding/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/onboarding/${body.token}?step=pay&cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[onboarding/checkout] stripe refused", error);
    return NextResponse.json(
      { error: "STRIPE_FAILED", reason: error instanceof Error ? error.message : "unknown" },
      { status: 502 },
    );
  }
}
