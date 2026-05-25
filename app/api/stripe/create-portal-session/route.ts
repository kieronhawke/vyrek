import { NextResponse } from "next/server";
import { stripe, getSiteUrl } from "@/lib/stripe";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Create a Stripe Billing Portal session for the signed-in customer.
 *
 * Replaces the previously hardcoded test-mode portal URL on the member
 * subscription panel. The portal session is short-lived (Stripe TTL
 * applies) and tied to the customer's real Stripe customer id, so the
 * link works the same in test and production.
 */
export async function POST() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const admin = supabaseAdmin();
  const { data: customer } = await admin
    .from("customers")
    .select("stripe_customer_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return NextResponse.json(
      { error: "NO_STRIPE_CUSTOMER" },
      { status: 404 },
    );
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${getSiteUrl()}/app/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Don't surface raw Stripe SDK errors to the client.
    console.error("[stripe/portal] failed", err);
    return NextResponse.json(
      { error: "PORTAL_UNAVAILABLE" },
      { status: 500 },
    );
  }
}
