import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { resolveInvite } from "@/lib/onboarding/resolve";
import { inviteUsage, looksLikeInviteId } from "@/lib/onboarding/invite-store";
import { signingConfigured } from "@/lib/onboarding/token";
import { displayPrice, planByKey } from "@/lib/onboarding/model";
import {
  billingAnchorUnix,
  formatStartDate,
  startDateISO,
} from "@/lib/onboarding/start-date";
import { paymentSchedule } from "@/lib/onboarding/schedule";
import { siteUrl } from "@/lib/site-url";
import { ensurePlanProduct } from "@/lib/billing/products";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { limiters, requestIp } from "@/lib/rate-limit";

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
 * change the price, the balance, the start date or the expiry.
 *
 * `price_data` rather than a pre-created price: Ben has one price in Stripe
 * (the Club) and sells several things, and every existing client is on their
 * own agreed number. Inline prices against a durable product mean a rate is
 * whatever Ben typed, without anybody logging into Stripe — which matters,
 * because nobody is going to.
 *
 * THREE SHAPES, ONE CARD ENTRY. The invite can carry a balance owed today on
 * top of the monthly rate, and Stripe Checkout cannot express every
 * combination of "balance + rate + date" in one subscription session. The
 * shape is chosen by lib/onboarding/schedule.ts, which documents what was
 * measured; this route only builds the session that shape needs.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Anonymous but not unlimited: each call creates a Stripe session and looks
  // up a product, so an unthrottled replay of a valid link is cost/DoS.
  const ip = requestIp(request);
  const rl = await limiters.onboardingCheckout.limit(`ip:${ip}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  let body: { token?: string; plan?: string; email?: string };
  try {
    body = (await request.json()) as { token?: string; plan?: string; email?: string };
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

  const invite = read.invite;
  const inviteId = looksLikeInviteId(body.token ?? "") ? (body.token as string) : null;

  /*
   * HAS THIS LINK ALREADY BEEN PAID?
   *
   * Asked before anything else, because it is the only guard that does not
   * depend on anybody having typed the same email address twice. One link,
   * one client, one payment — whatever address ended up on the account and
   * whichever device the link is re-opened on. See markInviteUsed().
   */
  if (inviteId) {
    const used = await inviteUsage(inviteId);
    if (used) {
      return NextResponse.json(
        { error: "ALREADY_SUBSCRIBED", accountUrl: `${siteUrl().replace(/\/$/, "")}/app/account` },
        { status: 409 },
      );
    }
  }

  /*
   * THE PRICE COMES FROM THE VERIFIED INVITE, NEVER FROM THE REQUEST.
   *
   * The body may name a plan. It does not, and must never, say what that plan
   * costs. Reversing that — trusting an amount posted by the page — is how
   * somebody pays £1 a month for the £220 plan, and it would look entirely
   * normal in Stripe afterwards.
   *
   * ⚠️ `body.plan` IS ONLY EVER A FALLBACK, AND ONLY ON AN OPEN INVITE.
   * An earlier version resolved `planByKey(invite.plan || body.plan)`, which
   * looks safe and is not: when Ben set an agreed rate the invite carried no
   * plan key, so the client's own browser chose which tier priced the
   * subscription. An agreed-rate invite now ignores `body.plan` outright —
   * there is nothing to choose, which is the entire point of this flow.
   */
  const agreedPence =
    typeof invite.amountPence === "number" ? invite.amountPence : null;

  const plan = agreedPence === null ? planByKey(invite.plan || body.plan) : null;
  if (agreedPence === null && !plan) {
    return NextResponse.json({ error: "PLAN_UNKNOWN" }, { status: 400 });
  }

  const amountPence = agreedPence ?? plan!.pence;

  /*
   * WHAT THE CARD IS CHARGED TODAY, AND WHEN THE MONTHLY CYCLE STARTS.
   *
   * `billing_cycle_anchor` with `proration_behavior: "none"` raises NO invoice
   * today and the full amount on the date, monthly from then. The alternative,
   * `trial_end`, does the same job but Checkout refuses it inside 48 hours and
   * Stripe then calls the subscription a free trial — on the checkout page, in
   * its own emails and in the dashboard. These are existing clients moving an
   * agreed arrangement onto a card. They are not on a trial, and saying so at
   * the moment they hand over card details would be a lie.
   *
   * A balance owed today only ever rides an AGREED rate: it is part of an
   * arrangement between Ben and one person, and a published tier has no such
   * thing. The schedule decides the shape; see schedule.ts for the three and
   * why Checkout cannot do all of them in one subscription session.
   */
  const schedule = paymentSchedule({
    amountPence,
    dueTodayPence: agreedPence !== null ? invite.dueTodayPence : 0,
    startDay: invite.startDay,
  });
  const anchorUnix = billingAnchorUnix(invite.startDay);

  /*
   * A trial and an anchor cannot both be set, and only a published tier has a
   * trial. An agreed rate never does: this is somebody who already trains with
   * Ben, moving their existing arrangement onto a card.
   */
  const trialDays = agreedPence !== null ? 0 : (plan?.trialDays ?? 0);

  /*
   * THE ADDRESS THIS SUBSCRIPTION BELONGS TO.
   *
   * ⚠️ THE ONE THE CLIENT CONFIRMED WINS, AND THAT ORDER MATTERS.
   *
   * It used to be the invite's address first. The account screen lets them
   * correct the email Ben typed — and plenty do, because Ben types it off a
   * phone screen between sessions — so /api/onboarding/account created their
   * login under the corrected address while Stripe was handed the original.
   * Activation then made a SECOND account under Ben's version, hung the
   * customer row and the subscription off that one, and left the client
   * signing in successfully to an account with no subscription on it. They
   * had paid, the money was in Stripe, and their account showed nothing.
   *
   * The invite is still what authorises the payment and still fixes the
   * amount; the signature covers the money, not the mailbox. So the address
   * the person actually confirmed is the one everything hangs off, and the
   * invite's is the fallback for the short-SMS path where the signed token
   * carries no email at all.
   */
  const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const bodyEmail = (body.email || "").trim().toLowerCase();
  const inviteEmail = (invite.email || "").trim().toLowerCase();
  const clientEmail = (EMAIL_RE.test(bodyEmail) ? bodyEmail : "") || inviteEmail;

  // Already paying? Stop here. Invites stay valid for weeks, so the commonest
  // way to double-charge somebody is them re-opening the text ("did that go
  // through?") and paying a second time. If this email already has a live
  // subscription, send them to their account instead of creating another.
  let existingStripeCustomer: string | null = null;
  /* BOTH addresses, when they differ. Checking only the confirmed one would
     miss somebody who already paid under the address Ben typed and has since
     corrected it — which is precisely the person most likely to re-open the
     link and try again. */
  const guardEmails = [...new Set([clientEmail, inviteEmail].filter(Boolean))];
  for (const address of guardEmails) {
    try {
      const sb = supabaseAdmin();
      const { data: cust } = await sb
        .from("customers")
        .select("id, stripe_customer_id")
        .eq("email", address)
        .maybeSingle();
      if (!cust?.id) continue;
      // Reuse the Stripe customer of the address we are actually billing.
      if (address === clientEmail) {
        existingStripeCustomer = cust.stripe_customer_id ?? null;
      }
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

  /*
   * A NEUTRAL PRODUCT FOR AN AGREED RATE.
   *
   * Pricing a bespoke arrangement against the "1:1 Coaching" product put a
   * package name the client never agreed to on their Stripe receipt, their
   * card statement descriptor and every invoice thereafter. "Coaching" is the
   * true and sufficient description of what they are buying. The balance
   * gets its own durable product for the same reason: "Outstanding balance"
   * is what it is, on the receipt and in Ben's dashboard.
   */
  const product =
    agreedPence !== null
      ? await ensurePlanProduct("coaching", "Coaching")
      : await ensurePlanProduct(plan!.key, plan!.name, plan!.summary);
  const balanceProduct =
    schedule.dueTodayPence > 0
      ? await ensurePlanProduct("balance", "Outstanding balance")
      : null;

  const startISO = invite.startDay != null ? startDateISO(invite.startDay) : null;

  /* Stamped on the SESSION as well as the subscription, because the welcome
     screen and activation read session.metadata and nothing else; without
     these they cannot say what was charged and when without a second round
     trip to Stripe. `due_today_pence` is only present when a balance was
     owed, so a session without one reads exactly as it did. */
  const stamps = {
    plan: plan?.key ?? "agreed",
    onboarding: invite.kind,
    client_name: invite.name,
    /* Stamped on every subscription, not just bespoke ones, so any amount is
       identifiable in Stripe a year later. An amount that matches no
       published tier otherwise looks like a mistake to whoever finds it. */
    amount_pence: String(amountPence),
    ...(agreedPence !== null ? { agreed_price_pence: String(agreedPence) } : {}),
    ...(startISO ? { starts_on: startISO } : {}),
    ...(schedule.dueTodayPence > 0
      ? { due_today_pence: String(schedule.dueTodayPence) }
      : {}),
    /* So activation can stamp the invite as spent without having to work out
       which link a payment came from by matching email addresses. */
    ...(inviteId ? { invite_id: inviteId } : {}),
  };

  /*
   * ONE SESSION PER INVITE, PRICE, BALANCE AND START DATE.
   *
   * Invites stay valid for thirty days and are never consumed, so the
   * commonest double-charge is somebody re-opening the text to check it went
   * through. Keyed on what the payment IS rather than on when it was asked
   * for: a second tap replays the first session instead of minting a new one.
   * Changing any of the four — a re-issued invite, a corrected rate, a new
   * balance, a new start date — is a genuinely different payment and gets its
   * own key.
   */
  const idempotencyKey = `invite:${body.token}:${amountPence}:${startISO ?? "now"}${
    schedule.dueTodayPence > 0 ? `:due${schedule.dueTodayPence}` : ""
  }`;

  const success_url = `${base}/onboarding/welcome?session_id={CHECKOUT_SESSION_ID}`;
  const cancel_url = `${base}/onboarding/${body.token}?step=pay&cancelled=1`;

  try {
    if (schedule.shape === "balance-then-subscription") {
      /*
       * THE BALANCE NOW, THE SUBSCRIPTION ON THE DATE.
       *
       * A PAYMENT checkout for the balance, with the card saved for
       * off-session use. When it completes, activation creates the anchored
       * subscription against that card (lib/onboarding/activation.ts,
       * ensureDeferredSubscription). The checkout page states the monthly
       * arrangement in Stripe's own words under the pay button, so the
       * person entering the card is told the whole of it there too.
       */
      const session = await client.checkout.sessions.create(
        {
          mode: "payment",
          ...(existingStripeCustomer
            ? { customer: existingStripeCustomer }
            : {
                customer_email: clientEmail || undefined,
                // Payment mode does not make a Customer unless asked, and the
                // subscription needs one to hang off.
                customer_creation: "always" as const,
              }),
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "gbp",
                unit_amount: schedule.dueTodayPence,
                product: balanceProduct!,
              },
            },
          ],
          payment_intent_data: {
            setup_future_usage: "off_session",
            description: "Suth Performance · outstanding balance",
            metadata: stamps,
          },
          custom_text: {
            submit: {
              message: `Then ${displayPrice(amountPence)} a month from ${formatStartDate(
                invite.startDay!,
              )}, taken automatically from this card. Cancel any time.`,
            },
          },
          metadata: { flow: "invite", deferred_subscription: "1", ...stamps },
          locale: "en-GB",
          success_url,
          cancel_url,
        },
        { idempotencyKey },
      );
      return NextResponse.json({ url: session.url });
    }

    const session = await client.checkout.sessions.create(
      {
        mode: "subscription",
        // Pre-filled so they don't retype an address we already have and so the
        // Stripe customer matches the client. Reusing a Stripe customer we
        // already hold stops one person accumulating duplicate customers, which
        // is what happens when only `customer_email` is set.
        ...(existingStripeCustomer
          ? { customer: existingStripeCustomer }
          : { customer_email: clientEmail || undefined }),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "gbp",
              unit_amount: amountPence,
              recurring: { interval: "month" },
              // A persistent product, NOT inline product_data: Stripe archives
              // inline products immediately, and an archived product refuses
              // the new price a later rate change needs.
              product,
            },
          },
          /* The balance, as a one-off line on the same invoice as the first
             month. Only ever here when the monthly cycle starts today —
             Checkout refuses a one-off line beside a future anchor with no
             proration, which is why the shape above exists. */
          ...(schedule.shape === "subscription-with-balance"
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: "gbp",
                    unit_amount: schedule.dueTodayPence,
                    product: balanceProduct!,
                  },
                },
              ]
            : []),
        ],
        /* Explicit, because the deferred-anchor session totals £0 today and a
           £0 total is exactly the case where Checkout would otherwise be free
           to skip collecting a card. The card is the entire point. */
        payment_method_collection: "always",
        subscription_data: {
          ...(anchorUnix
            ? { billing_cycle_anchor: anchorUnix, proration_behavior: "none" as const }
            : {}),
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
          metadata: stamps,
        },
        metadata: {
          // "flow" is what the webhook branches on: an invite session has no
          // client_reference_id (no customers row exists yet) and activation
          // creates the account server-side even if the buyer never returns
          // from Stripe's receipt page.
          flow: "invite",
          ...stamps,
        },
        /*
         * NO PROMOTION CODES ON AN AGREED RATE.
         *
         * Ben agreed a number with this person. A promo code created for the
         * self-serve funnel, typed into this checkout, would discount it — and
         * a subscription-mode coupon keeps applying, so it discounts every
         * month after it too. The published tiers keep the box.
         */
        ...(agreedPence === null ? { allow_promotion_codes: true } : {}),
        locale: "en-GB",
        success_url,
        cancel_url,
      },
      { idempotencyKey },
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    /* Logged in full, reported narrowly. The caller here is anonymous — they
       hold a link, nothing more — and Stripe's messages name configuration
       ("no such price", "account cannot create subscriptions in GBP") that a
       stranger has no business reading. */
    console.error("[onboarding/checkout] stripe refused", error);
    return NextResponse.json({ error: "STRIPE_FAILED" }, { status: 502 });
  }
}
