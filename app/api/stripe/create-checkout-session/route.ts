import { NextResponse } from "next/server";
import { stripe, getStripePriceId, getSiteUrl } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Create a Stripe Checkout session for the £8.99/mo subscription with a
 * 7-day free trial. Called from the plan reveal "Start training" button.
 *
 * Requires an authenticated Supabase session (the user finished the V3
 * quiz, created an account, and is now on /plan). Maps the auth user back
 * to our customers row to attach Stripe metadata + the referral code if any.
 */

export async function POST() {
  let priceId: string;
  try {
    priceId = getStripePriceId();
  } catch (err) {
    return NextResponse.json(
      {
        error: "STRIPE_NOT_CONFIGURED",
        detail:
          err instanceof Error ? err.message : "missing stripe env vars",
      },
      { status: 503 },
    );
  }

  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const admin = supabaseAdmin();
  const { data: customer, error: customerErr } = await admin
    .from("customers")
    .select(
      "id, email, stripe_customer_id, referral_code, referred_by_code",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (customerErr || !customer) {
    return NextResponse.json(
      { error: "CUSTOMER_NOT_FOUND" },
      { status: 404 },
    );
  }

  const { data: quizResponse } = await admin
    .from("quiz_responses")
    .select("program")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    const s = stripe();

    // Create or reuse the Stripe customer record.
    let stripeCustomerId = customer.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const stripeCustomer = await s.customers.create({
        email: customer.email,
        metadata: { vyrek_customer_id: customer.id },
      });
      stripeCustomerId = stripeCustomer.id;
      await admin
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", customer.id);
    }

    const site = getSiteUrl();
    const session = await s.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          vyrek_customer_id: customer.id,
          programme: quizResponse?.program ?? "unknown",
          referred_by_code: customer.referred_by_code ?? "",
        },
      },
      client_reference_id: customer.id,
      success_url: `${site}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/plan?cancelled=true`,
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      metadata: {
        vyrek_customer_id: customer.id,
        programme: quizResponse?.program ?? "unknown",
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
     
    console.error("[/api/stripe/create-checkout-session] failed", err);
    return NextResponse.json(
      {
        error: "STRIPE_ERROR",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 },
    );
  }
}
