import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
  SignOff,
  trackedUrl,
} from "@/lib/email/templates/_layout";

/**
 * Account and billing: the emails a customer hits that have nothing to do
 * with marketing, and which have to be right because they arrive at moments
 * of friction.
 *
 * All transactional, so none carry an unsubscribe line: you cannot opt out
 * of a receipt or a password reset, and adding the footer to them is a
 * common way to get legitimate mail marked as marketing.
 *
 * Security note on the two link emails: the link must be short-lived and
 * single-use, and the copy says what to do if it wasn't you. Neither should
 * ever restate the account's email address as a claim of identity.
 */

/* ─── Magic link sign-in ────────────────────────────────────────────── */

export const magicLinkSubject = "Your sign-in link";

export function MagicLinkEmail({
  linkUrl,
  minutes = 15,
}: {
  linkUrl: string;
  minutes?: number;
}) {
  return (
    <EmailLayout
      preview={`Signs you in. Expires in ${minutes} minutes.`}
      campaign="magic-link"
    >
      <Eyebrow>Sign in</Eyebrow>
      <H1>Here&apos;s your link.</H1>

      <P>
        Tap the button and you&apos;re in. No password to remember. The link
        works once and expires in {minutes} minutes.
      </P>

      <Btn href={linkUrl}>Sign me in →</Btn>

      <P>
        If you didn&apos;t ask to sign in, ignore this and nothing happens.
        Nobody can get into your account with this email alone.
      </P>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Password reset ────────────────────────────────────────────────── */

export const passwordResetSubject = "Reset your password";

export function PasswordResetEmail({
  linkUrl,
  minutes = 60,
}: {
  linkUrl: string;
  minutes?: number;
}) {
  return (
    <EmailLayout
      preview={`Expires in ${minutes} minutes.`}
      campaign="password-reset"
    >
      <Eyebrow>Password</Eyebrow>
      <H1>Let&apos;s get you back in.</H1>

      <P>
        Tap below to set a new password. The link works once and expires in{" "}
        {minutes} minutes.
      </P>

      <Btn href={linkUrl}>Set a new password →</Btn>

      <P>
        If you didn&apos;t ask for this, you can ignore it. Your current
        password still works and nothing has changed.
      </P>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Payment receipt ───────────────────────────────────────────────── */

export const receiptSubject = "Your Suth Club receipt";

export function ReceiptEmail({
  firstName,
  amount,
  period,
  paidOn,
  last4,
  invoiceUrl,
}: {
  firstName: string;
  amount: string;
  period: string;
  paidOn: string;
  last4?: string;
  invoiceUrl?: string;
}) {
  return (
    <EmailLayout
      preview={`${amount} for ${period}.`}
      campaign="receipt"
    >
      <Eyebrow>Receipt</Eyebrow>
      <H1>Thanks, {firstName}.</H1>

      <Panel title="What you paid">
        <Row label="Amount" value={amount} />
        <Row label="For" value={period} />
        <Row label="Paid" value={paidOn} />
        {last4 ? <Row label="Card" value={`Ending ${last4}`} /> : null}
      </Panel>

      <P>
        Nothing to do. Your plan carries on as normal, and you can cancel
        any time from your account without speaking to anyone.
      </P>

      {invoiceUrl ? <Btn href={invoiceUrl}>Download invoice →</Btn> : null}

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Renewal reminder ──────────────────────────────────────────────── */

export const renewalSubject = "Your plan renews next week";

export function RenewalReminderEmail({
  firstName,
  amount,
  renewsOn,
}: {
  firstName: string;
  amount: string;
  renewsOn: string;
}) {
  return (
    <EmailLayout
      preview={`${amount} on ${renewsOn}. Nothing to do if you're staying.`}
      campaign="renewal"
    >
      <Eyebrow>Heads up</Eyebrow>
      <H1>Renewing on {renewsOn}.</H1>

      <P>
        {firstName}, your Suth Club subscription renews at {amount} on{" "}
        {renewsOn}. Nothing to do if you&apos;re carrying on.
      </P>

      <P>
        Telling you in advance rather than after the fact, because being
        surprised by a charge is a rubbish way to find out.
      </P>

      <Btn href={trackedUrl("/app/account", "renewal")}>Manage my plan →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Refund ────────────────────────────────────────────────────────── */

export const refundSubject = "Your refund is on its way";

export function RefundEmail({
  firstName,
  amount,
  days = 10,
}: {
  firstName: string;
  amount: string;
  days?: number;
}) {
  return (
    <EmailLayout preview={`${amount} back to your card.`} campaign="refund">
      <Eyebrow>Refunded</Eyebrow>
      <H1>That&apos;s sorted, {firstName}.</H1>

      <Panel>
        <Row label="Amount" value={amount} />
        <Row label="Back to" value="The card you paid with" />
        <Row label="Timing" value={`Usually within ${days} working days`} />
      </Panel>

      <P>
        Banks are slower than we&apos;d like on this, so give it the full
        window before chasing. If it hasn&apos;t landed by then, reply and
        I&apos;ll dig into it.
      </P>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Contact form acknowledgement ──────────────────────────────────── */

export const contactAckSubject = "Got your message";

export function ContactAckEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="A real person will come back to you."
      campaign="contact-ack"
    >
      <Eyebrow>Received</Eyebrow>
      <H1>Message received, {firstName}.</H1>

      <P>
        This is an automatic note so you know it arrived. A real reply
        follows, usually the same day and always within one working day.
      </P>

      <P>
        If it&apos;s urgent, reply to this and it lands in the same place.
      </P>

      <SignOff />
    </EmailLayout>
  );
}
