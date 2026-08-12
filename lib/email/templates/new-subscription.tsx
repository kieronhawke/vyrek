import { Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * INTERNAL: money just arrived. The one email the admin actually wants
 * the moment it happens — who, what plan, what rate, and one tap into
 * either the admin or Stripe.
 */

export function NewSubscriptionEmail({
  clientName,
  email,
  planName,
  rate,
  adminUrl,
  stripeUrl,
  source,
}: {
  clientName: string;
  email: string;
  planName: string | null;
  rate: string | null;
  adminUrl: string;
  stripeUrl: string;
  /** "payment link" or "website sign-up" — how they arrived. */
  source: string;
}) {
  return (
    <EmailLayout
      preview={`${clientName || email} just set up their payment`}
      campaign="new-subscription"
    >
      <Eyebrow>New subscription</Eyebrow>
      <H1>{clientName || email}</H1>
      <P>
        {planName ?? "Subscription"}
        {rate ? ` · ${rate} a month` : ""} — set up just now via {source}.
        Their card is on file and collects automatically from today.
      </P>

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

      <Panel title="Client">
        <Text
          style={{
            color: TEXT_DIM,
            fontFamily: fontStack,
            fontSize: 15,
            lineHeight: "1.8",
            margin: 0,
          }}
        >
          {email}
        </Text>
      </Panel>
    </EmailLayout>
  );
}

export const newSubscriptionSubject = (
  clientName: string,
  rate: string | null,
) => `💷 New subscription — ${clientName}${rate ? ` · ${rate}/mo` : ""}`;
