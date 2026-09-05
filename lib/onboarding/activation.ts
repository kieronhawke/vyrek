import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { sendAccountReady } from "@/lib/email/send";
import { planByKey } from "@/lib/onboarding/model";
import {
  billingAnchorUnix,
  formatStartDate,
  formatStartDateShort,
  parseStartDate,
} from "@/lib/onboarding/start-date";
import { paymentSchedule, scheduleAfterLines } from "@/lib/onboarding/schedule";

/**
 * TURN A PAID CHECKOUT SESSION INTO AN ACCOUNT THEY CAN GET INTO.
 *
 * Shared by two callers:
 *   - /api/onboarding/activate — fired from the welcome page in the browser
 *   - /api/stripe/webhook (checkout.session.completed) — fired by Stripe
 *
 * The webhook path is the one that matters: a client who pays and then
 * closes the tab on the Stripe receipt page never loads the welcome page,
 * and before this was shared, that person had paid and no account existed.
 * Both paths are idempotent, so whichever fires second finds the work done.
 *
 * THE PASSWORD, IF THERE IS ONE, WAS SET BEFORE THIS RAN.
 * This used to create the account with no password at all, on the reasoning
 * that a password field between somebody and their plan is a drop-off for no
 * security gain. That was right about the drop-off and wrong about the gain:
 * the only door in was a single-use emailed link, so losing that email locked
 * a paying client out of the thing they were paying for.
 *
 * The flow now asks for one on the sign-up screen and POSTs it to
 * /api/onboarding/account BEFORE checkout, which is why the "already
 * registered" branch below is the normal path for those clients rather than a
 * rare race. createUser here still passes no password, so it never overwrites
 * one somebody already chose.
 *
 * The emailed sign-in link stays, because it is still the easier door. It goes
 * through our own /auth/callback with a token hash, because Supabase's hosted
 * action_link redirected to a page that had no way to exchange it — every
 * invited customer was stranded at a password login they could never pass.
 */

/**
 * Find an existing auth user's id by email, paginating so it does not
 * silently stop at the first 200 users. Used only to recover the id when
 * createUser reports "already registered" and the customers row hasn't
 * carried it back yet — never to send anything.
 */
export async function findAuthUserIdByEmail(
  sb: ReturnType<typeof supabaseAdmin>,
  email: string,
): Promise<string | null> {
  const target = email.trim().toLowerCase();
  try {
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return null;
      const users = data?.users ?? [];
      const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
      if (hit) return hit.id;
      if (users.length < 200) break; // last page
    }
  } catch {
    /* fall through to null */
  }
  return null;
}

export type ActivationOutcome = {
  ok: boolean;
  email?: string;
  error?: string;
  /**
   * Whether a sign-in email actually went out on THIS run.
   *
   * ⚠️ REPORTED, NOT ASSUMED. The route used to answer a hardcoded
   * `emailed: true` and the welcome screen printed "check your email for a
   * link that signs you straight in" on the strength of it. The email is
   * gated on `userIsNew`, and since the flow started creating the account
   * before checkout, the user almost never IS new — so the screen was
   * telling nearly every client to go and look for a message nobody sent.
   */
  emailed?: boolean;
};

function periodEndUnix(sub: Stripe.Subscription): number | null {
  const legacy = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  if (typeof legacy === "number") return legacy;
  const ends = (sub.items?.data ?? [])
    .map(
      (i) =>
        (i as unknown as { current_period_end?: number }).current_period_end,
    )
    .filter((n): n is number => typeof n === "number");
  return ends.length ? Math.max(...ends) : null;
}

/**
 * `session` must be retrieved with `expand: ["subscription", "customer"]`.
 * The caller has already verified the session is paid / trialing.
 */
export async function activateFromSession(
  session: Stripe.Checkout.Session,
): Promise<ActivationOutcome> {
  const email = (session.customer_details?.email ?? "").trim().toLowerCase();
  const name = String(session.metadata?.client_name ?? "");
  // metadata.plan holds the KEY ("coaching-121"); the email says the NAME.
  // The first live test email read "Your coaching-121 is set up".
  const planKey = String(session.metadata?.plan ?? "");
  const plan = planByKey(planKey)?.name ?? "";
  // A payment-only invite is an EXISTING client whose training already
  // happens with Ben — their portal opens in billing mode: subscription
  // management only, until the admin switches their training space on.
  const isBillingOnly = session.metadata?.onboarding === "payment";
  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);
  let sub =
    typeof session.subscription === "object" && session.subscription !== null
      ? session.subscription
      : null;
  let subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (sub?.id ?? null);

  if (!email) {
    // Stripe always has an email for a subscription; a session without one
    // is a real anomaly rather than a normal branch.
    return { ok: false, error: "NO_EMAIL" };
  }

  /* THE SUBSCRIPTION CHECKOUT COULD NOT MAKE.
   *
   * A client who owed a balance AND starts monthly billing on a later date
   * paid through a PAYMENT checkout — Stripe will not put a one-off line on a
   * subscription checkout with a future anchor and no proration (see
   * schedule.ts). The card is saved; the subscription is created HERE, once,
   * from the figures the checkout route stamped on the session. Both
   * activation callers pass through this, and it is idempotent: a Stripe
   * idempotency key on the create, plus a search for a subscription already
   * carrying this session's id, so the welcome page and the webhook cannot
   * mint two. If it fails, the function returns ok:false so the webhook 500s
   * and Stripe redelivers — the balance has been taken, so giving up is not
   * an option. */
  if (session.metadata?.deferred_subscription === "1" && !subscriptionId) {
    const made = await ensureDeferredSubscription(session);
    if (!made.ok) {
      console.error("[activation] deferred subscription not created:", made.error);
      return { ok: false, email, error: made.error };
    }
    sub = made.subscription;
    subscriptionId = made.subscription.id;
  }

  const sb = supabaseAdmin();

  /* The money already moved. If ANY durable write below fails, we must NOT
   * report success: the webhook returns 200 on ok:true and Stripe never
   * retries, so a swallowed DB error would leave a paying client with no
   * account and no second chance. Every critical failure sets this, and the
   * function returns ok:false so the webhook 500s and Stripe redelivers.
   * Every step is idempotent, so a redelivery is safe. */
  let criticalError: string | null = null;

  /* 1 — the auth user. Confirmed, no password.
   *
   * `userIsNew` is what gates the email below. Activation runs TWICE per
   * checkout — the welcome page and the webhook both fire it — and
   * createUser is atomic, so exactly one caller sees a fresh user. The
   * first live test sent two "account ready" emails five seconds apart,
   * and worse: each generateLink invalidates the previous token, so the
   * earlier email's sign-in button was already dead when it arrived. */
  let authUserId: string | null = null;
  let userIsNew = false;
  /**
   * Did THIS run create the subscription row?
   *
   * This is the dedupe token for the client's "you're in" email, and it
   * replaced `userIsNew`, which had quietly stopped working.
   *
   * `userIsNew` was chosen because activation runs TWICE per checkout — the
   * welcome page and the webhook both fire it — and createUser is atomic, so
   * exactly one caller saw a fresh user. That was true right up until the flow
   * started creating the account BEFORE the card, so the client could set a
   * password. From then on the user was never new at activation time, the
   * condition was false on both runs, and a client who had just paid received
   * nothing from Ben at all — only Stripe's receipt.
   *
   * The subscription insert is the better token: it is guarded by a
   * select-then-insert on the Stripe subscription id, so exactly one caller
   * performs it, and unlike the user it is genuinely new on every new
   * subscription — including a client who cancelled and came back, who should
   * be welcomed again.
   */
  let subscriptionIsNew = false;
  /** Set only where the email is actually dispatched. */
  let emailed = false;
  try {
    const created = await sb.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        member_mode: isBillingOnly ? "billing" : "full",
      },
    });
    if (created.data.user) {
      authUserId = created.data.user.id;
      userIsNew = true;
    } else if (created.error) {
      // Already registered — the other activation caller won the race, or
      // Ben set them up earlier. Find the id from the customers row the
      // winner wrote. NOT via generateLink: generating a link here would
      // invalidate the token in the email the winner just sent, which is
      // exactly the dead-button bug this branch exists to avoid. (And not
      // via listUsers, which silently broke past 200 users.)
      const { data: existing } = await sb
        .from("customers")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();
      authUserId = (existing?.auth_user_id as string | null) ?? null;
      if (!authUserId) {
        // The customers row hasn't carried the id back yet (the racing
        // caller may have inserted a row before it knew the id, or a
        // transient blip lost it). Recover it straight from Supabase Auth
        // by email so this run can backfill auth_user_id, rather than
        // wedging the account and retrying the webhook forever. Paginated
        // (not generateLink, which would kill the winner's emailed token).
        authUserId = await findAuthUserIdByEmail(sb, email);
      }
      if (!authUserId) {
        criticalError = "AUTH_ID_UNRESOLVED";
        console.error(
          "[activation] user exists but id unrecoverable:",
          created.error.message,
        );
      } else if (isBillingOnly) {
        /* ⚠️ THE MODE HAS TO BE SET HERE TOO, NOT ONLY ON A FRESH USER.
         *
         * `member_mode` was written inside createUser and nowhere else, so
         * every activation that took this branch left it unset — and
         * lib/member/auth.ts reads an absent mode as "full". The effect was
         * the exact opposite of what a payment invite means: an existing
         * client, whose training happens with Ben off the site, paid and
         * landed in the whole training app.
         *
         * This branch is not rare. It is taken by the loser of the
         * welcome-page/webhook race — which is one of the two callers on
         * EVERY checkout — and by anybody who set a password before paying.
         *
         * Only ever fills in a BLANK mode. Somebody Ben has deliberately
         * switched to "full" must not be demoted by a later payment. */
        try {
          const { data: current } = await sb.auth.admin.getUserById(authUserId);
          if (!current.user?.user_metadata?.member_mode) {
            await sb.auth.admin.updateUserById(authUserId, {
              user_metadata: {
                ...(current.user?.user_metadata ?? {}),
                member_mode: "billing",
              },
            });
          }
        } catch (e) {
          /* Not critical: they are paying and have an account. The worst case
             is a client seeing more of the app than Ben meant them to, which
             is not worth failing a paid activation and retrying the webhook
             over. Logged so it is findable. */
          console.error("[activation] could not set member_mode on existing user", e);
        }
      }
    }
  } catch (e) {
    criticalError = "AUTH_UNREACHABLE";
    console.error("[activation] auth admin unreachable", e);
  }

  /* 2 — the customer row. Look first, then insert or update: customers.id
   * has no default, and supplying one on the update path would rewrite the
   * primary key of a row that already exists. */
  let customerRowId: string | null = null;
  try {
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
          ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
          // The name on the row itself, so the coach's client list never
          // needs an auth API call per person.
          ...(name?.trim() ? { full_name: name.trim() } : {}),
        })
        .eq("id", customerRowId);
      if (error) {
        criticalError = "CUSTOMER_UPDATE_FAILED";
        console.error("[activation] customer update failed", error.message);
      }
    } else {
      const id = randomUUID();
      const { error } = await sb.from("customers").insert({
        id,
        email,
        ...(authUserId ? { auth_user_id: authUserId } : {}),
        ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
        ...(name?.trim() ? { full_name: name.trim() } : {}),
      });
      // Lost the insert race (customers.email is unique): another caller
      // inserted between our SELECT and INSERT — possibly with a null
      // auth_user_id. Fall back to an UPDATE by email so THIS run, which
      // may be the only one holding the id, still writes it onto the row.
      if (error && /duplicate key|unique/i.test(error.message)) {
        const { data: row } = await sb
          .from("customers")
          .select("id")
          .eq("email", email)
          .maybeSingle();
        if (row?.id) {
          customerRowId = row.id;
          const { error: updErr } = await sb
            .from("customers")
            .update({
              ...(authUserId ? { auth_user_id: authUserId } : {}),
              ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
              ...(name?.trim() ? { full_name: name.trim() } : {}),
            })
            .eq("id", row.id);
          if (updErr) {
            criticalError = "CUSTOMER_UPDATE_FAILED";
            console.error("[activation] customer conflict-update failed", updErr.message);
          }
        }
      } else if (error) {
        criticalError = "CUSTOMER_INSERT_FAILED";
        console.error("[activation] customer insert failed", error.message);
      } else {
        customerRowId = id;
      }
    }
  } catch (e) {
    criticalError = "CUSTOMER_WRITE_THREW";
    console.error("[activation] customer write threw", e);
  }

  /* 3 — the subscription row, with its real status ("trialing" stays
   * "trialing" — the webhook keeps it current from then on). */
  try {
    if (subscriptionId && customerRowId) {
      const status = sub?.status ?? "active";
      const trialEnd = sub?.trial_end ?? null;
      const periodEnd = sub ? periodEndUnix(sub) : null;
      const { data: existing } = await sb
        .from("subscriptions")
        .select("id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await sb
          .from("subscriptions")
          .update({
            customer_id: customerRowId,
            status,
            trial_end: trialEnd
              ? new Date(trialEnd * 1000).toISOString()
              : null,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          })
          .eq("id", existing.id);
        if (error) {
          criticalError = "SUBSCRIPTION_UPDATE_FAILED";
          console.error("[activation] subscription update failed", error.message);
        }
      } else {
        // subscriptions.id is a uuid with no default; the Stripe sub id is
        // NOT a uuid and Postgres rejects it — mint our own.
        const { error } = await sb.from("subscriptions").insert({
          id: randomUUID(),
          customer_id: customerRowId,
          stripe_subscription_id: subscriptionId,
          status,
          trial_end: trialEnd ? new Date(trialEnd * 1000).toISOString() : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        });
        if (error) {
          criticalError = "SUBSCRIPTION_INSERT_FAILED";
          console.error("[activation] subscription insert failed", error.message);
        } else {
          /* The same dedupe the admin alert below already relies on, now also
             gating the CLIENT's email — see the note on `subscriptionIsNew`. */
          subscriptionIsNew = true;
          // A NEW subscription row = money just arrived. Tell the admin on
          // every channel; inserting the row is the dedupe — the losing
          // activation caller takes the update branch above and stays quiet.
          const { notifyAdminNewSubscription } = await import(
            "@/lib/billing/notify"
          );
          const amountPence = sub?.items?.data?.[0]?.price?.unit_amount ?? null;
          /* What the checkout took today and when the monthly cycle starts,
             from the same stamps the client's email reads below, so Ben's
             confirmation and the client's say the same thing. */
          const stamped = stampedSchedule(session);
          void notifyAdminNewSubscription({
            clientName: name,
            email,
            customerRowId,
            stripeSubscriptionId: subscriptionId,
            amountPence,
            planName: plan || null,
            source: isBillingOnly ? "payment link" : "set-up link",
            paidTodayPence: stamped?.dueTodayPence ?? null,
            startsOn:
              stamped?.startDay != null ? formatStartDate(stamped.startDay) : null,
            startsOnShort:
              stamped?.startDay != null
                ? formatStartDateShort(stamped.startDay)
                : null,
          }).catch(() => {});
        }
      }
    }
  } catch (e) {
    criticalError = "SUBSCRIPTION_WRITE_THREW";
    console.error("[activation] subscription write threw", e);
  }

  /* 4 — a way in, with no password to invent. ONLY the caller that
   * created the user sends it: the loser of the createUser race skips
   * this block entirely, because a second generateLink would invalidate
   * the token in the email the winner already sent. The link is generated
   * by Supabase but sent by us through Resend on the verified domain, and
   * it targets our own /auth/callback with the token hash so the exchange
   * actually happens. */
  if (userIsNew || subscriptionIsNew) {
    let signInUrl = `${siteUrl()}/login`;
    // A billing-only client's home is their subscription page — landing
    // them on "Ben is writing your first week" would promise a feature
    // that is deliberately not switched on yet.
    const landing = isBillingOnly ? "/app/account" : "/app/today";
    try {
      const link = await sb.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      const hashed = link.data?.properties?.hashed_token;
      if (hashed) {
        signInUrl = `${siteUrl()}/auth/callback?token_hash=${encodeURIComponent(
          hashed,
        )}&type=magiclink&next=${encodeURIComponent(landing)}`;
      }
    } catch (e) {
      console.error("[activation] generateLink failed", e);
    }

    /* The figures the checkout route stamped on the session — rate, balance,
       date — resolved into past-tense sentences AS OF THE CHECKOUT, so this
       email describes what actually happened rather than the general case. */
    const stamped = stampedSchedule(session);

    emailed = true;
    void sendAccountReady({
      to: email,
      firstName: (name || email).split(/[\s@]/)[0],
      signInUrl,
      planName: plan,
      variant: isBillingOnly ? "billing" : "full",
      after: stamped ? scheduleAfterLines(stamped) : null,
    }).catch(() => {});
  }

  // ok:false makes the webhook 500 and Stripe redeliver. Every write above
  // is idempotent (createUser dedupes, customer/subscription are
  // select-then-write on natural keys), so a redelivery completes what this
  // run couldn't rather than duplicating it.
  if (criticalError) return { ok: false, email, error: criticalError, emailed };
  return { ok: true, email, emailed };
}

/**
 * The schedule the checkout was built with, read back off the session.
 *
 * Resolved at `session.created`, not now: a webhook redelivered two days after
 * a Friday checkout must still describe Friday's decision. Null when the
 * session carries no rate — a published-tier sign-up, which has no schedule
 * of this kind.
 */
export function stampedSchedule(session: Stripe.Checkout.Session) {
  const amountPence = Number(session.metadata?.amount_pence);
  if (!Number.isInteger(amountPence) || amountPence <= 0) return null;
  const due = Number(session.metadata?.due_today_pence);
  const startDay = session.metadata?.starts_on
    ? parseStartDate(session.metadata.starts_on)
    : null;
  const at = session.created ? session.created * 1000 : Date.now();
  return paymentSchedule(
    {
      amountPence,
      dueTodayPence: Number.isInteger(due) && due > 0 ? due : 0,
      startDay,
    },
    at,
  );
}

export type DeferredOutcome =
  | { ok: true; subscription: Stripe.Subscription }
  | { ok: false; error: string };

/**
 * Create the anchored subscription behind a balance-first checkout, exactly
 * once per session. See the note at the call site in `activateFromSession`.
 *
 * The anchor is recomputed from the stamped date at the moment this runs. If
 * the date has passed in between — a client who paid the balance on the 30th
 * and whose webhook lands on the 1st — the subscription is created with no
 * anchor and charges its first month now, which is what the date meant.
 */
export async function ensureDeferredSubscription(
  session: Stripe.Checkout.Session,
): Promise<DeferredOutcome> {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);
  if (!customerId) return { ok: false, error: "DEFERRED_NO_CUSTOMER" };

  const amountPence = Number(session.metadata?.amount_pence);
  if (!Number.isInteger(amountPence) || amountPence <= 0) {
    return { ok: false, error: "DEFERRED_NO_AMOUNT" };
  }

  const { stripe } = await import("@/lib/stripe");
  const s = stripe();

  // Already made by the other activation caller? The session id is stamped
  // on the subscription for exactly this question.
  try {
    const existing = await s.subscriptions.list({ customer: customerId, limit: 20 });
    const hit = existing.data.find(
      (x) => x.metadata?.checkout_session === session.id,
    );
    if (hit) return { ok: true, subscription: hit };
  } catch (e) {
    console.error("[activation] deferred: subscription search failed", e);
  }

  // The card that just paid the balance, saved for off-session use.
  let paymentMethod: string | null = null;
  try {
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    if (piId) {
      const pi = await s.paymentIntents.retrieve(piId);
      paymentMethod =
        typeof pi.payment_method === "string"
          ? pi.payment_method
          : (pi.payment_method?.id ?? null);
    }
  } catch (e) {
    console.error("[activation] deferred: payment intent lookup failed", e);
  }
  if (!paymentMethod) return { ok: false, error: "DEFERRED_NO_PAYMENT_METHOD" };

  const startDay = session.metadata?.starts_on
    ? parseStartDate(session.metadata.starts_on)
    : null;
  const anchorUnix = billingAnchorUnix(startDay);

  try {
    const { ensurePlanProduct } = await import("@/lib/billing/products");
    const product = await ensurePlanProduct("coaching", "Coaching");
    const created = await s.subscriptions.create(
      {
        customer: customerId,
        default_payment_method: paymentMethod,
        items: [
          {
            price_data: {
              currency: "gbp",
              unit_amount: amountPence,
              recurring: { interval: "month" },
              product,
            },
          },
        ],
        // No invoice today, the full amount on the date, monthly after — and
        // never a prorated slice of the first month. Measured in start-date.ts.
        ...(anchorUnix
          ? { billing_cycle_anchor: anchorUnix, proration_behavior: "none" as const }
          : {}),
        metadata: {
          plan: "agreed",
          onboarding: session.metadata?.onboarding ?? "payment",
          client_name: session.metadata?.client_name ?? "",
          amount_pence: String(amountPence),
          agreed_price_pence: String(amountPence),
          ...(session.metadata?.starts_on ? { starts_on: session.metadata.starts_on } : {}),
          ...(session.metadata?.due_today_pence
            ? { due_today_pence: session.metadata.due_today_pence }
            : {}),
          checkout_session: session.id,
        },
      },
      { idempotencyKey: `deferred-sub:${session.id}` },
    );
    return { ok: true, subscription: created };
  } catch (e) {
    console.error("[activation] deferred: subscription create failed", e);
    return { ok: false, error: "DEFERRED_SUB_FAILED" };
  }
}
