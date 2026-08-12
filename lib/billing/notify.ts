import { sendNewSubscriptionAlert } from "@/lib/email/send";
import { sendSms, smsConfigured } from "@/lib/sms/send";
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
}): Promise<void> {
  const rate =
    args.amountPence != null
      ? args.amountPence % 100 === 0
        ? `£${args.amountPence / 100}`
        : `£${(args.amountPence / 100).toFixed(2)}`
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

  const inbox = process.env.CONSULTATION_INBOX ?? "kieron.hawke@gmail.com";
  const recipients = new Set([inbox]);
  // Ben gets his own copy when his address is set and different.
  const ben = process.env.BEN_EMAIL ?? "ben@suthperformance.com";
  if (ben && ben !== inbox) recipients.add(ben);

  await Promise.all([
    ...Array.from(recipients).map((to) =>
      sendNewSubscriptionAlert({
        to,
        clientName: args.clientName,
        email: args.email,
        planName: args.planName,
        rate,
        paymentMethod,
        adminUrl,
        stripeUrl,
        source: args.source,
      }).catch((e) => {
        console.error("[notify] new-subscription email failed", e);
      }),
    ),
    (async () => {
      const mobile = process.env.BEN_MOBILE?.trim();
      if (!mobile || !smsConfigured()) return;
      const who = args.clientName || args.email;
      const body = `NEW SUB: ${who}${rate ? ` - ${rate}/mo` : ""}${
        args.planName ? ` (${args.planName})` : ""
      }. Card on file, collects monthly. ${siteUrl().replace(/^https?:\/\/(www\.)?/, "")}/admin`;
      await sendSms({ to: mobile, body, sender: "brand" }).catch((e) => {
        console.error("[notify] new-subscription SMS failed", e);
      });
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
