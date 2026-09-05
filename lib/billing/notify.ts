import { sendNewSubscriptionAlert } from "@/lib/email/send";
import { sendSms, smsConfigured } from "@/lib/sms/send";
import { adminEmails, adminMobiles } from "@/lib/admin/recipients";
import { logEvent } from "@/lib/admin/events";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";
import { siteUrl } from "@/lib/site-url";

/**
 * THE MOMENT MONEY ARRIVES, THE ADMIN HEARS ABOUT IT.
 *
 * One call, three channels, none allowed to fail the others:
 *   - email to the ops inbox (and Ben when his address differs)
 *   - a text to Ben when BEN_MOBILE is configured
 *   - the admin activity feed, so the overview page shows it
 *
 * Called from BOTH activation paths (welcome page and webhook), so it
 * dedupes the same way account creation does: the caller only invokes it
 * when it actually inserted the new subscription row.
 */
export async function notifyAdminNewSubscription(args: {
  clientName: string;
  email: string;
  customerRowId: string | null;
  stripeSubscriptionId: string | null;
  amountPence: number | null;
  planName: string | null;
  /** "payment link" | "full set-up link" | "website sign-up" */
  source: string;
  /** A balance taken at checkout, in pence, when there was one. */
  paidTodayPence?: number | null;
  /** "Tuesday 1 October" when the first monthly collection is deferred. */
  startsOn?: string | null;
  /** "1 Oct" for the text, where characters are billed. */
  startsOnShort?: string | null;
}): Promise<void> {
  const gbp = (pence: number) =>
    pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;
  const rate = args.amountPence != null ? gbp(args.amountPence) : null;
  const paidToday =
    args.paidTodayPence != null && args.paidTodayPence > 0
      ? gbp(args.paidTodayPence)
      : null;
  const adminUrl = args.customerRowId
    ? `${siteUrl()}/admin/customers/${args.customerRowId}`
    : `${siteUrl()}/admin/customers`;
  const stripeUrl = stripeDashboardUrl(
    "subscription",
    args.stripeSubscriptionId,
  );

  // How they're paying: "visa •••• 4242" or "Direct Debit •••• 2345".
  // The admin wants to know at a glance whether this is a card or Bacs.
  let paymentMethod: string | null = null;
  if (args.stripeSubscriptionId) {
    try {
      const { subscriptionBilling } = await import(
        "@/lib/billing/subscription-info"
      );
      const billing = await subscriptionBilling(args.stripeSubscriptionId);
      paymentMethod = billing?.paymentMethod ?? null;
    } catch {
      /* The alert is still worth sending without it. */
    }
  }

  // Kieron and Ben, on email and by text — one shared recipient list.
  await Promise.all([
    ...adminEmails().map((to) =>
      sendNewSubscriptionAlert({
        to,
        clientName: args.clientName,
        email: args.email,
        planName: args.planName,
        rate,
        paidToday,
        startsOn: args.startsOn ?? null,
        paymentMethod,
        adminUrl,
        stripeUrl,
        source: args.source,
      }).catch((e) => {
        console.error("[notify] new-subscription email failed", e);
      }),
    ),
    (async () => {
      if (!smsConfigured()) return;
      const who = args.clientName || args.email;
      /* Says what actually happened: a balance taken today, and the date the
         monthly cycle starts when it is not today. "Collects monthly" alone
         had Ben expecting money on a date nothing was scheduled for. */
      const body = `CLIENT SET UP: ${who}${rate ? ` - ${rate}/mo` : ""}${
        args.startsOnShort ? ` from ${args.startsOnShort}` : ""
      }${paidToday ? ` (+${paidToday} taken today)` : ""}${
        args.planName ? ` (${args.planName})` : ""
      }. Card on file. ${siteUrl().replace(/^https?:\/\/(www\.)?/, "")}/admin`;
      await Promise.all(
        adminMobiles().map((to) =>
          sendSms({ to, body, sender: "brand" }).catch((e) => {
            console.error("[notify] new-subscription SMS failed", e);
          }),
        ),
      );
    })(),
    logEvent({
      actor: "system",
      action: "customer.signed_up",
      targetKind: "customer",
      targetId: args.customerRowId ?? args.email,
      metadata: {
        event: "subscription_started",
        plan: args.planName,
        amount_pence: args.amountPence,
        source: args.source,
      },
    }).catch(() => {}),
  ]);
}
