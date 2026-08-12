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
        ? `Your cancellation is in. You keep full access until ${endDate}, and nothing is charged after that. Whatever you're training for next, we want to keep supporting you, so if there's anything we can do, just let Ben know. You'll always be part of what we're building here.`
        : "Your cancellation is in. You keep full access until the end of what you've paid for, and nothing is charged after that. Whatever you're training for next, we want to keep supporting you, so if there's anything we can do, just let Ben know.",
      note: "Change your mind before then? Open Manage billing in your account and turn it back on. Everything picks up where it left off.",
      ctaLabel: "Your account",
    },
    cancel_reversed: {
      subject: "Good to have you back",
      eyebrow: "Cancellation removed",
      heading: name ? `Good call, ${name}.` : "Good to have you back.",
      body: endDate
        ? `Your membership carries on as normal. The next payment is on ${endDate}, same as before. Right, back to work.`
        : "Your membership carries on as normal, with payments on your usual date. Right, back to work.",
      ctaLabel: "Your account",
    },
    cancelled: {
      subject: "Your membership has ended",
      eyebrow: "Membership ended",
      heading: name ? `All done, ${name}.` : "All done.",
      body: "Your membership has ended and nothing more will be charged. Thank you for training with me, genuinely. Keep smashing it, you've got this, and do keep in touch. If you ever fancy coming back, a message is all it takes and we pick up exactly where we left off.",
    },
    paused: {
      subject: "Your payments are paused",
      eyebrow: "Payments paused",
      heading: name ? `All paused, ${name}.` : "All paused.",
      body: resumeDate
        ? `Your payments with Suth Performance are paused, and nothing will be collected until ${resumeDate}, when they start again by themselves. This isn't the end, just a breather, and the door stays wide open. Whenever you're ready to get back to it, Ben will be right there to pick up where you left off. We're here to support you.`
        : "Your payments with Suth Performance are paused, and nothing will be collected until we start things up again. This isn't the end, just a breather, and the door stays wide open. Whenever you want to get back to it, restart from your account below and Ben will be in touch to sort the next steps. We're here to support you.",
      ctaLabel: "Your account",
    },
    resumed: {
      subject: "Let's get back training",
      eyebrow: "Payments resumed",
      heading: name ? `Let's get back training, ${name}.` : "Let's get back training.",
      body: endDate
        ? `Your payments are running again, with the next one on ${endDate}, and everything else stays exactly as it was. Good to have you back at it.`
        : "Your payments are running again on your usual date, and everything else stays exactly as it was. Good to have you back at it.",
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
  oldAmountPence?: number | null;
  nextInvoiceISO?: string | null;
}): Promise<void> {
  const gbp = (p: number) =>
    p % 100 === 0 ? `£${p / 100}` : `£${(p / 100).toFixed(2)}`;
  const rate = gbp(args.newAmountPence);
  const when = fmtDate(args.nextInvoiceISO);
  const name = args.firstName?.trim();
  // A reduction is good news and gets said as good news; anything else is
  // a neutral confirmation of what was already agreed in person.
  const reduced =
    args.oldAmountPence != null && args.newAmountPence < args.oldAmountPence;
  await send({
    to: args.to,
    subject: reduced
      ? `Your rate has been reduced to ${rate} a month`
      : `Your new rate: ${rate} a month`,
    react: SubscriptionNoticeEmail({
      eyebrow: reduced ? "Rate reduced" : "Rate updated",
      heading: reduced
        ? name
          ? `Good news, ${name}.`
          : "Good news."
        : name
          ? `Sorted, ${name}.`
          : "Sorted.",
      body: reduced
        ? when
          ? `As agreed, your rate has been reduced to ${rate} a month, starting from your next payment on ${when}. Everything else stays exactly the same.`
          : `As agreed, your rate has been reduced to ${rate} a month, starting from your next payment. Everything else stays exactly the same.`
        : when
          ? `As agreed, your membership is now ${rate} a month. It starts from your next payment on ${when}. Nothing else changes.`
          : `As agreed, your membership is now ${rate} a month, starting from your next payment. Nothing else changes.`,
      ctaLabel: "Your account",
      ctaHref: ACCOUNT_URL(),
    }),
  });
}

/** The refund note: what's coming back, and honestly, when. */
export async function sendRefundEmail(args: {
  to: string;
  firstName?: string | null;
  amountPence: number;
}): Promise<void> {
  const amount =
    args.amountPence % 100 === 0
      ? `£${args.amountPence / 100}`
      : `£${(args.amountPence / 100).toFixed(2)}`;
  const name = args.firstName?.trim();
  await send({
    to: args.to,
    subject: `Your ${amount} refund is on its way`,
    react: SubscriptionNoticeEmail({
      eyebrow: "Refund processed",
      heading: name ? `Sorted, ${name}.` : "Sorted.",
      body: `We've refunded ${amount} back to your payment method. Banks usually show it within 5 to 10 working days, and it appears against the original payment rather than as a new one. Nothing else about your membership changes.`,
      note: "If it hasn't appeared after 10 working days, reply to this email and we'll chase it with the bank.",
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
