import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { planByKey } from "@/lib/onboarding/model";
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

  const plan = planByKey(body.plan);
  if (!plan) {
    return NextResponse.json({ error: "PLAN_UNKNOWN" }, { status: 400 });
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
        },
      },
      metadata: {
        plan: plan.key,
        onboarding: read.invite.kind,
        client_name: read.invite.name,
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
