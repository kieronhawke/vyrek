import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { signingConfigured } from "@/lib/onboarding/token";
import { planByKey } from "@/lib/onboarding/model";
import { siteUrl } from "@/lib/site-url";
import { ensurePlanProduct } from "@/lib/billing/products";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

  // Defence in depth: if invite signing is not configured, the HMAC would
  // ride on the in-repo fallback constant and a stranger could forge an
  // invite priced however they liked. Refuse to take money in that state.
  if (!signingConfigured()) {
    return NextResponse.json({ error: "SIGNING_NOT_CONFIGURED" }, { status: 503 });
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

  // Ben's agreed per-client rate, carried on the SIGNED invite — never from
  // the request body, so a client cannot name their own price. Whenever the
  // invite names a plan (any agreed-rate invite, or a full invite where Ben
  // chose the tier), that plan wins; the request body only picks the tier on
  // an open invite that deliberately left it to the buyer. Otherwise someone
  // invited for 1:1 Coaching could POST plan:"club" and self-downgrade to the
  // trialing Club tier.
  const isCustomRate = typeof read.invite.amountPence === "number";
  const plan = planByKey(read.invite.plan || body.plan);
  if (!plan) {
    return NextResponse.json({ error: "PLAN_UNKNOWN" }, { status: 400 });
  }

  // A custom rate also means no trial: this is an existing client moving
  // their agreed payment onto Stripe, and the first collection happens at
  // checkout.
  const amountPence = read.invite.amountPence ?? plan.pence;
  const trialDays = isCustomRate ? 0 : plan.trialDays;

  // Already paying? Stop here. Invites stay valid for weeks, so the commonest
  // way to double-charge somebody is them re-opening the text ("did that go
  // through?") and paying a second time. If this email already has a live
  // subscription, send them to their account instead of creating another.
  const inviteEmail = (read.invite.email || "").trim().toLowerCase();
  if (inviteEmail) {
    try {
      const sb = supabaseAdmin();
      const { data: cust } = await sb
        .from("customers")
        .select("id")
        .eq("email", inviteEmail)
        .maybeSingle();
      if (cust?.id) {
        const { data: live } = await sb
          .from("subscriptions")
          .select("id")
          .eq("customer_id", cust.id)
          .in("status", ["active", "trialing", "past_due"])
          .limit(1);
        if (live && live.length > 0) {
          return NextResponse.json(
            { error: "ALREADY_SUBSCRIBED", accountUrl: `${siteUrl().replace(/\/$/, "")}/app/account` },
            { status: 409 },
          );
        }
      }
    } catch (e) {
      // A lookup blip must not block a genuine first payment; log and proceed.
      console.error("[onboarding/checkout] existing-sub check failed", e);
    }
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
            unit_amount: amountPence,
            recurring: { interval: "month" },
            // A persistent per-plan product, NOT inline product_data:
            // Stripe archives inline products immediately, and an archived
            // product refuses the new price a later rate change needs.
            product: await ensurePlanProduct(plan.key, plan.name, plan.summary),
          },
        },
      ],
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: {
          plan: plan.key,
          onboarding: read.invite.kind,
          client_name: read.invite.name,
          amount_pence: String(amountPence),
        },
      },
      metadata: {
        // "flow" is what the webhook branches on: an invite session has no
        // client_reference_id (no customers row exists yet) and activation
        // creates the account server-side even if the buyer never returns
        // from Stripe's receipt page.
        flow: "invite",
        plan: plan.key,
        onboarding: read.invite.kind,
        client_name: read.invite.name,
      },
      allow_promotion_codes: true,
      locale: "en-GB",
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
