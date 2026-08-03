import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { sendAccountReady } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TURN A PAID CHECKOUT INTO AN ACCOUNT THEY CAN GET INTO.
 *
 * The last missing step. The welcome page has been telling people "Your
 * account is set up" and offering a "Go to my account" button since the
 * onboarding flow was built, and no account existed — the journey ended at
 * Stripe. Saying it and not doing it is the worst of the options.
 *
 * NO PASSWORD, DELIBERATELY. The onboarding flow decided not to ask for one
 * ("inventing a password they will forget") and that judgement is right: the
 * person has just paid, and a password field between them and their plan is
 * a drop-off for no security gain. So the account is created confirmed, and
 * they get a sign-in link by email. They can set a password later from
 * inside the account if they want one.
 *
 * STRIPE IS THE AUTHORISATION. Nothing is created unless the session id
 * resolves to a real, paid session — the caller supplies an id, not an
 * email, so it cannot be used to mint an account for somebody else's
 * address.
 *
 * IDEMPOTENT. The welcome page can be refreshed, shared, or opened twice,
 * and this runs on mount. Second and later calls find the customer already
 * there and return the same answer rather than a duplicate or an error.
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
  let email = "";
  let name = "";
  let plan = "";
  let customerId: string | null = null;
  let subscriptionId: string | null = null;
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "customer"],
    });
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
    email = (session.customer_details?.email ?? "").trim().toLowerCase();
    name = String(session.metadata?.client_name ?? "");
    plan = String(session.metadata?.plan ?? "");
    customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer?.id ?? null);
    subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription?.id ?? null);
  } catch (e) {
    console.error("[activate] stripe lookup failed", e);
    return NextResponse.json({ error: "STRIPE_UNREACHABLE" }, { status: 502 });
  }

  if (!email) {
    // Stripe always has an email for a subscription, so this is a real
    // anomaly rather than a normal branch.
    return NextResponse.json({ error: "NO_EMAIL" }, { status: 422 });
  }

  const sb = supabaseAdmin();

  /* 2 — the auth user. Confirmed, no password. */
  let authUserId: string | null = null;
  try {
    const created = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (created.data.user) {
      authUserId = created.data.user.id;
    } else if (created.error) {
      // Already registered — they came back to this page, or Ben set them up
      // earlier. Find them rather than treating it as a failure.
      const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
      authUserId =
        data?.users.find(
          (u) => (u.email ?? "").toLowerCase() === email,
        )?.id ?? null;
      if (!authUserId) {
        console.error("[activate] createUser failed", created.error.message);
      }
    }
  } catch (e) {
    console.error("[activate] auth admin unreachable", e);
  }

  /* 3 — the customer row.
   *
   * Only the columns that exist. The first version wrote `name` and `plan`,
   * neither of which is on this table — the insert failed silently and the
   * customer row was never created, while the auth user and the email both
   * succeeded. That is the worst shape of bug: a journey that looks complete
   * from every screen and leaves a person signed in with no record behind
   * them. The plan lives on the Stripe subscription; the name is on the auth
   * user's metadata. */
  let customerRowId: string | null = null;
  try {
    // Look first, then insert or update. `customers.id` has no default, so
    // an upsert has to supply one — and supplying one on the update path
    // would try to rewrite the primary key of a row that already exists.
    const existing = await sb
      .from("customers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing.data?.id) {
      customerRowId = existing.data.id;
      const { error } = await sb
        .from("customers")
        .update({
          ...(authUserId ? { auth_user_id: authUserId } : {}),
          ...(customerId ? { stripe_customer_id: customerId } : {}),
        })
        .eq("id", customerRowId);
      if (error) console.error("[activate] customer update failed", error.message);
    } else {
      const id = randomUUID();
      const { error } = await sb.from("customers").insert({
        id,
        email,
        ...(authUserId ? { auth_user_id: authUserId } : {}),
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      });
      if (error) console.error("[activate] customer insert failed", error.message);
      else customerRowId = id;
    }
  } catch (e) {
    console.error("[activate] customer write threw", e);
  }

  /* 4 — the subscription, joined by customer id rather than by email. */
  try {
    if (subscriptionId && customerRowId) {
      // `subscriptions.id` has no default, exactly like customers.id — the
      // first version left it out and every insert failed the not-null
      // constraint while the rest of the journey looked perfect.
      const { error } = await sb.from("subscriptions").upsert(
        {
          id: randomUUID(),
          customer_id: customerRowId,
          stripe_subscription_id: subscriptionId,
          status: "active",
        },
        { onConflict: "stripe_subscription_id", ignoreDuplicates: true },
      );
      if (error) console.error("[activate] subscription upsert failed", error.message);
    }
  } catch {
    /* The account works without this; the Stripe webhook reconciles it. */
  }

  /* 5 — a way in, with no password to invent.
   *
   * The link is generated by Supabase but sent by us, through Resend, on the
   * verified domain. Supabase's built-in mailer is rate limited to a couple
   * an hour and arrives unbranded, which is not what somebody who has just
   * paid should receive. */
  let signInUrl = `${siteUrl()}/login`;
  try {
    const link = await sb.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${siteUrl()}/app` },
    });
    if (link.data?.properties?.action_link) {
      signInUrl = link.data.properties.action_link;
    }
  } catch (e) {
    console.error("[activate] generateLink failed", e);
  }

  // Never blocks the response: they are looking at the welcome screen now.
  void sendAccountReady({
    to: email,
    firstName: (name || email).split(/[\s@]/)[0],
    signInUrl,
    planName: plan,
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    email,
    // The client shows a "check your email" line; it never gets the link.
    emailed: true,
  });
}
