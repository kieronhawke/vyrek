import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { activateFromSession } from "@/lib/onboarding/activation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TURN A PAID CHECKOUT INTO AN ACCOUNT THEY CAN GET INTO.
 *
 * Fired from the welcome page on mount. The heavy lifting lives in
 * lib/onboarding/activation.ts, shared with the Stripe webhook — the
 * webhook is the reliable path (it fires even if the buyer closes the tab
 * on Stripe's receipt page); this route is the fast path that makes the
 * welcome page truthful the moment it renders. Both are idempotent.
 *
 * STRIPE IS THE AUTHORISATION. Nothing is created unless the session id
 * resolves to a real, paid session — the caller supplies an id, not an
 * email, so it cannot be used to mint an account for somebody else's
 * address.
 */

type Body = { sessionId?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "NO_SESSION" }, { status: 400 });
  }

  /* 1 — did they actually pay? */
  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });
  } catch (e) {
    console.error("[activate] stripe lookup failed", e);
    return NextResponse.json({ error: "STRIPE_UNREACHABLE" }, { status: 502 });
  }

  const paid =
    session.payment_status === "paid" ||
    session.status === "complete" ||
    // A trial subscription is complete without a payment having been taken.
    (typeof session.subscription === "object" &&
      session.subscription !== null &&
      session.subscription.status === "trialing");
  if (!paid) {
    return NextResponse.json({ error: "NOT_PAID" }, { status: 402 });
  }

  /* 2 — auth user, customer row, subscription row, sign-in email. */
  const outcome = await activateFromSession(session);
  if (!outcome.ok) {
    return NextResponse.json(
      { error: outcome.error ?? "ACTIVATION_FAILED" },
      { status: outcome.error === "NO_EMAIL" ? 422 : 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    email: outcome.email,
    // The client shows a "check your email" line; it never gets the link.
    emailed: true,
  });
}
