import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
  url,
} from "@/lib/email/templates/_layout";

/**
 * THE TWO EMAILS BEN GETS ABOUT MONEY.
 *
 * The chain from enquiry to paying client ran: form → text to Ben → he rings
 * → setup link → they choose a plan → Stripe. And then it stopped. The
 * subscription started, the money arrived, and nobody told him. He found out
 * by opening Stripe, which meant in practice he found out days later, and a
 * new client's first week did not get written because he did not know there
 * was one.
 *
 * So: one email when somebody becomes a client, and one when each payment
 * lands.
 *
 * WHY THEY ARE TWO EMAILS AND NOT ONE
 * They are read in different states of mind. The first is an event — go and
 * write this person's first week — and it wants a button. The second is a
 * record, most of them are unremarkable, and its job is to be filed and
 * findable. Merging them would make the important one arrive monthly and stop
 * being read.
 *
 * WHAT IS IN THEM
 * The name, the plan, the amount, and whether the price was one he agreed
 * rather than a published tier — because a £150 charge that matches no tier
 * looks like a mistake to whoever finds it in six months, and this is the only
 * record saying it was not.
 *
 * The amounts come from Stripe. Nothing here is calculated from a plan name,
 * and there are no defaults: an unknown amount renders as unknown rather than
 * as zero, because a receipt that quietly says £0.00 is worse than one that
 * admits it does not know.
 */

/* ── Somebody just became a client ──────────────────────────────────────── */

export const subscriptionStartedSubject = ({
  name,
  amount,
}: {
  name: string;
  amount: string | null;
}) => `New client · ${name}${amount ? ` · ${amount} a month` : ""}`;

export function SubscriptionStartedEmail({
  name,
  email,
  planName,
  amount,
  agreed,
  trialDays,
  startedOn,
}: {
  name: string;
  email?: string | null;
  planName: string | null;
  /** Formatted, e.g. "£150". Null when Stripe did not give one. */
  amount: string | null;
  /** True when the price was one Ben agreed rather than a published tier. */
  agreed?: boolean;
  trialDays?: number | null;
  startedOn: string;
}) {
  return (
    <EmailLayout internal preview={`${name} has set up and paid. Their first week is on you.`}>
      <Eyebrow>New client</Eyebrow>
      <H1>{name} is in.</H1>

      <P>
        They finished setup and the subscription is live. The only thing
        outstanding is the thing only you can do.
      </P>

      <Panel>
        <Row label="Client" value={name} />
        {email ? <Row label="Email" value={email} /> : null}
        <Row label="Plan" value={planName ?? "Not recorded"} />
        <Row
          label="Price"
          value={
            amount
              ? `${amount} a month${agreed ? " — the price you agreed" : ""}`
              : "Not recorded by Stripe"
          }
        />
        {trialDays && trialDays > 0 ? (
          <Row label="Trial" value={`${trialDays} days free before the first charge`} />
        ) : null}
        <Row label="Started" value={startedOn} />
      </Panel>

      {/* One button, and it is the thing that has to happen today. A client
          whose first week does not arrive in the first few days is a client
          who starts wondering what they have paid for. */}
      <Btn href={url("/coach/clients")}>Write their first week</Btn>

      <P>
        Their answers, their injuries and their availability are on their
        client record. If anything is missing it is because they skipped it,
        and the setup link marks which.
      </P>
    </EmailLayout>
  );
}

/* ── A payment landed ───────────────────────────────────────────────────── */

export const paymentReceivedSubject = ({
  name,
  amount,
}: {
  name: string;
  amount: string | null;
}) => `Payment received${amount ? ` · ${amount}` : ""} · ${name}`;

export function PaymentReceivedEmail({
  name,
  amount,
  planName,
  agreed,
  paidOn,
  invoiceUrl,
  first,
}: {
  name: string;
  amount: string | null;
  planName: string | null;
  agreed?: boolean;
  paidOn: string;
  invoiceUrl?: string | null;
  /** True for the first payment on a subscription. */
  first?: boolean;
}) {
  return (
    <EmailLayout internal preview={`${amount ?? "A payment"} from ${name}.`}>
      <Eyebrow>{first ? "First payment" : "Payment received"}</Eyebrow>
      <H1>{amount ? `${amount} from ${name}.` : `Payment from ${name}.`}</H1>

      <Panel>
        <Row label="Client" value={name} />
        <Row label="Plan" value={planName ?? "Not recorded"} />
        <Row
          label="Amount"
          value={
            amount
              ? `${amount}${agreed ? " — the price you agreed" : ""}`
              : "Not recorded by Stripe"
          }
        />
        <Row label="Paid" value={paidOn} />
      </Panel>

      {/* Stripe's own receipt rather than one built here. Reproducing tax
          lines and credit notes and getting either wrong on a document that
          goes to an accountant is worse than a link out. */}
      {invoiceUrl ? <Btn href={invoiceUrl}>Open the invoice in Stripe</Btn> : null}

      <P>
        Nothing needs doing. This is here so the money and the client list
        agree without you opening Stripe to check.
      </P>
    </EmailLayout>
  );
}
