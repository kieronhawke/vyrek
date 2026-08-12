import { send } from "@/lib/email/send";
import {
  SubscriptionNoticeEmail,
} from "@/lib/email/templates/subscription-notice";
import { AdminAlertEmail } from "@/lib/email/templates/admin-alert";
import { siteUrl } from "@/lib/site-url";
import { stripeDashboardUrl } from "@/lib/billing/stripe-dashboard";
import type { AdminAlertKind, CustomerEmailKind } from "@/lib/billing/lifecycle";

/**
 * The words behind each lifecycle note. Copy lives here, in one place,
 * written the way Ben talks. The engine (lifecycle.ts) decides WHETHER a
 * note goes; this file decides WHAT it says.
 */

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
  }).format(d);
}

const ACCOUNT_URL = () => `${siteUrl()}/app/account`;

export async function sendCustomerLifecycleEmail(args: {
  kind: CustomerEmailKind;
  to: string;
  firstName?: string | null;
  periodEndISO?: string | null;
  resumeISO?: string | null;
}): Promise<void> {
  const name = args.firstName?.trim();
  const endDate = fmtDate(args.periodEndISO);
  const resumeDate = fmtDate(args.resumeISO);

  const copy: Record<
    CustomerEmailKind,
    { subject: string; eyebrow: string; heading: string; body: string; note?: string; ctaLabel?: string }
  > = {
    cancel_scheduled: {
      subject: endDate
        ? `Your membership runs until ${endDate}`
        : "Your membership is set to end",
      eyebrow: "Cancellation confirmed",
      heading: name ? `Sorry to see you go, ${name}.` : "Sorry to see you go.",
      body: endDate
        ? `Your cancellation is in. You keep full access until ${endDate}, and nothing is charged after that.`
        : "Your cancellation is in. You keep full access until the end of what you've paid for, and nothing is charged after that.",
      note: "Change your mind before then? Open Manage billing in your account and turn it back on. Everything picks up where it left off.",
      ctaLabel: "Your account",
    },
    cancel_reversed: {
      subject: "Good to have you back",
      eyebrow: "Cancellation removed",
      heading: name ? `Good call, ${name}.` : "Good to have you back.",
      body: endDate
        ? `Your membership carries on as normal. The next payment is on ${endDate}, same as before.`
        : "Your membership carries on as normal, with payments on your usual date.",
      ctaLabel: "Your account",
    },
    cancelled: {
      subject: "Your membership has ended",
      eyebrow: "Membership ended",
      heading: "All done.",
      body: "Your membership has ended and nothing more will be charged. Thanks for training with me. If you ever fancy coming back, a message is all it takes and we pick up where we left off.",
    },
    paused: {
      subject: "Your payments are paused",
      eyebrow: "Payments paused",
      heading: name ? `All paused, ${name}.` : "All paused.",
      body: resumeDate
        ? `Nothing will be collected until ${resumeDate}, when payments start again by themselves. You don't need to do anything.`
        : "Nothing will be collected until we start things up again. You don't need to do anything.",
      ctaLabel: "Your account",
    },
    resumed: {
      subject: "Your payments are back on",
      eyebrow: "Payments resumed",
      heading: "Back on.",
      body: endDate
        ? `Payments are running again, with the next one on ${endDate}. Everything else stays exactly as it was.`
        : "Payments are running again on your usual date. Everything else stays exactly as it was.",
      ctaLabel: "Your account",
    },
    payment_failed: {
      subject: "That payment didn't go through",
      eyebrow: "Payment not taken",
      heading: "One small thing to fix.",
      body: "This month's payment didn't go through. It happens: an expired card, a new bank app, a limit. Update your card and it retries by itself. Your access is untouched in the meantime.",
      ctaLabel: "Update your card",
    },
    payment_recovered: {
      subject: "All sorted",
      eyebrow: "Payment received",
      heading: "That's gone through.",
      body: "The payment that failed has now cleared. Nothing else to do, and nothing changes with your training.",
    },
  };

  const c = copy[args.kind];
  await send({
    to: args.to,
    subject: c.subject,
    react: SubscriptionNoticeEmail({
      eyebrow: c.eyebrow,
      heading: c.heading,
      body: c.body,
      note: c.note,
      ctaLabel: c.ctaLabel,
      ctaHref: c.ctaLabel ? ACCOUNT_URL() : undefined,
    }),
  });
}

/**
 * Rate changes come from a conversation with Ben, so the note reads like
 * the confirmation of something already agreed, not an announcement.
 */
export async function sendRateChangeEmail(args: {
  to: string;
  firstName?: string | null;
  newAmountPence: number;
  nextInvoiceISO?: string | null;
}): Promise<void> {
  const rate =
    args.newAmountPence % 100 === 0
      ? `£${args.newAmountPence / 100}`
      : `£${(args.newAmountPence / 100).toFixed(2)}`;
  const when = fmtDate(args.nextInvoiceISO);
  const name = args.firstName?.trim();
  await send({
    to: args.to,
    subject: `Your new rate: ${rate} a month`,
    react: SubscriptionNoticeEmail({
      eyebrow: "Rate updated",
      heading: name ? `Sorted, ${name}.` : "Sorted.",
      body: when
        ? `As agreed with Ben, your membership is now ${rate} a month. It starts from your next payment on ${when}. Nothing else changes.`
        : `As agreed with Ben, your membership is now ${rate} a month, starting from your next payment. Nothing else changes.`,
      ctaLabel: "Your account",
      ctaHref: ACCOUNT_URL(),
    }),
  });
}

export async function sendAdminLifecycleAlert(args: {
  kind: AdminAlertKind;
  clientEmail: string;
  clientName?: string | null;
  customerRowId?: string | null;
  stripeSubscriptionId?: string | null;
  periodEndISO?: string | null;
  attemptCount?: number;
}): Promise<void> {
  const who = args.clientName?.trim() || args.clientEmail;
  const endDate = fmtDate(args.periodEndISO);
  const adminUrl = args.customerRowId
    ? `${siteUrl()}/admin/customers/${args.customerRowId}`
    : `${siteUrl()}/admin/customers`;
  const stripeUrl = args.stripeSubscriptionId
    ? stripeDashboardUrl("subscription", args.stripeSubscriptionId)
    : null;

  const copy: Record<AdminAlertKind, { subject: string; eyebrow: string; heading: string; body: string }> = {
    cancel_scheduled: {
      subject: `Cancellation: ${who}`,
      eyebrow: "Cancellation scheduled",
      heading: who,
      body: endDate
        ? `They've cancelled. Access and billing run until ${endDate}, then stop. Worth a message before that date if you want to keep them.`
        : "They've cancelled. Access and billing run to the end of the period, then stop. Worth a message before then if you want to keep them.",
    },
    cancelled: {
      subject: `Ended: ${who}`,
      eyebrow: "Membership ended",
      heading: who,
      body: "Their membership has now fully ended and no more payments will be taken.",
    },
    payment_failed: {
      subject: `Payment failed: ${who}`,
      eyebrow: "Payment failed",
      heading: who,
      body:
        args.attemptCount && args.attemptCount > 1
          ? `Attempt ${args.attemptCount} at their monthly payment has failed. Stripe keeps retrying and they've been emailed a fix link. If this keeps happening, it becomes a conversation.`
          : "Their monthly payment failed on the first try. Stripe retries by itself and they've been emailed a fix link. Nothing to do yet unless you know something's up.",
    },
  };

  const c = copy[args.kind];
  const inbox = process.env.CONSULTATION_INBOX ?? "kieron.hawke@gmail.com";
  const recipients = new Set([inbox]);
  const ben = process.env.BEN_EMAIL ?? "ben@suthperformance.com";
  if (ben && ben !== inbox) recipients.add(ben);

  await Promise.all(
    Array.from(recipients).map((to) =>
      send({
        to,
        subject: c.subject,
        react: AdminAlertEmail({
          eyebrow: c.eyebrow,
          heading: c.heading,
          body: c.body,
          adminUrl,
          stripeUrl,
        }),
      }).catch((e) => console.error("[comms] admin alert failed", e)),
    ),
  );
}
