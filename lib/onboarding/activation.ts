import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { sendAccountReady } from "@/lib/email/send";
import { planByKey } from "@/lib/onboarding/model";

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
 * NO PASSWORD, DELIBERATELY. The person has just paid; a password field
 * between them and their plan is a drop-off for no security gain. The
 * account is created confirmed and they get a branded sign-in link by
 * email. The link goes through our own /auth/callback with a token hash,
 * because Supabase's hosted action_link redirected to a page that had no
 * way to exchange it — every invited customer was stranded at a password
 * login they could never pass.
 */

/**
 * Find an existing auth user's id by email, paginating so it does not
 * silently stop at the first 200 users. Used only to recover the id when
 * createUser reports "already registered" and the customers row hasn't
 * carried it back yet — never to send anything.
 */
async function findAuthUserIdByEmail(
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
  const sub =
    typeof session.subscription === "object" && session.subscription !== null
      ? session.subscription
      : null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (sub?.id ?? null);

  if (!email) {
    // Stripe always has an email for a subscription; a session without one
    // is a real anomaly rather than a normal branch.
    return { ok: false, error: "NO_EMAIL" };
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
          // A NEW subscription row = money just arrived. Tell the admin on
          // every channel; inserting the row is the dedupe — the losing
          // activation caller takes the update branch above and stays quiet.
          const { notifyAdminNewSubscription } = await import(
            "@/lib/billing/notify"
          );
          const amountPence = sub?.items?.data?.[0]?.price?.unit_amount ?? null;
          void notifyAdminNewSubscription({
            clientName: name,
            email,
            customerRowId,
            stripeSubscriptionId: subscriptionId,
            amountPence,
            planName: plan || null,
            source: isBillingOnly ? "payment link" : "set-up link",
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
  if (userIsNew) {
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

    void sendAccountReady({
      to: email,
      firstName: (name || email).split(/[\s@]/)[0],
      signInUrl,
      planName: plan,
      variant: isBillingOnly ? "billing" : "full",
    }).catch(() => {});
  }

  // ok:false makes the webhook 500 and Stripe redeliver. Every write above
  // is idempotent (createUser dedupes, customer/subscription are
  // select-then-write on natural keys), so a redelivery completes what this
  // run couldn't rather than duplicating it.
  if (criticalError) return { ok: false, email, error: criticalError };
  return { ok: true, email };
}
