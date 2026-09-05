import { Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * INTERNAL: money just arrived. The one email the admin actually wants
 * the moment it happens — who, what rate, what came in today, when the
 * monthly cycle starts, and one tap into either the admin or Stripe.
 *
 * It is Ben's confirmation that a client he set up has finished: the link
 * was opened, the details given, the card entered. If a balance was owed it
 * says it was taken; if the first monthly payment is on a date, it names
 * the date rather than saying "from today" about money that is not moving
 * today.
 */

export function NewSubscriptionEmail({
  clientName,
  email,
  planName,
  rate,
  paidToday,
  startsOn,
  paymentMethod,
  adminUrl,
  stripeUrl,
  source,
}: {
  clientName: string;
  email: string;
  planName: string | null;
  /** "£60", the monthly rate. */
  rate: string | null;
  /** "£100" taken at checkout for an outstanding balance, or null. */
  paidToday?: string | null;
  /** "Tuesday 1 October" when the first monthly collection is deferred. */
  startsOn?: string | null;
  /** "visa •••• 4242", "Direct Debit •••• 2345", or null when unknown. */
  paymentMethod?: string | null;
  adminUrl: string;
  stripeUrl: string;
  /** "payment link" or "website sign-up" — how they arrived. */
  source: string;
}) {
  const who = clientName || email;
  return (
    <EmailLayout
      preview={`${who} just set up their payment`}
      campaign="new-subscription"
    >
      <Eyebrow>Client set up</Eyebrow>
      <H1>{who}</H1>
      <P>
        {planName ?? "Subscription"}
        {rate ? ` · ${rate} a month` : ""}, set up just now via their {source}.
        {paymentMethod ? ` Paying by ${paymentMethod}.` : " Their payment method is on file."}
      </P>

      <Panel title="What happened">
        {paidToday ? (
          <Row label="Taken today" value={`${paidToday} outstanding balance`} />
        ) : null}
        <Row
          label={startsOn ? `First monthly payment` : "Monthly"}
          value={
            startsOn
              ? `${rate ?? "their rate"} on ${startsOn}, then the same day each month`
              : `${rate ?? "their rate"}, collected automatically${
                  paidToday ? " with today's payment and monthly from now" : " from today"
                }`
          }
        />
        <Row label="Client" value={email} />
      </Panel>

      <Btn href={adminUrl}>Open in the admin</Btn>

      <Text
        style={{
          color: TEXT_DIM,
          fontFamily: fontStack,
          fontSize: 13,
          lineHeight: "1.6",
          margin: "16px 0 0",
        }}
      >
        Or straight to Stripe:{" "}
        <a href={stripeUrl} style={{ color: "#A3E635" }}>
          view the subscription
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

export const newSubscriptionSubject = (
  clientName: string,
  rate: string | null,
  paidToday?: string | null,
) =>
  `Client set up: ${clientName}${rate ? ` · ${rate}/mo` : ""}${
    paidToday ? ` · ${paidToday} taken today` : ""
  }`;
