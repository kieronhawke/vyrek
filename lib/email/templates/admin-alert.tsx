import { Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * INTERNAL: something on a subscription needs the admin's eyes. Kept to
 * one screen: who, what happened, one button into the admin, a Stripe
 * link for the detail.
 */

export function AdminAlertEmail({
  eyebrow,
  heading,
  body,
  adminUrl,
  stripeUrl,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  adminUrl: string;
  stripeUrl?: string | null;
}) {
  return (
    <EmailLayout preview={body.slice(0, 90)} campaign="admin-alert">
      <Eyebrow>{eyebrow}</Eyebrow>
      <H1>{heading}</H1>
      <P>{body}</P>
      <Btn href={adminUrl}>Open in the admin</Btn>
      {stripeUrl ? (
        <Text
          style={{
            color: TEXT_DIM,
            fontFamily: fontStack,
            fontSize: 13,
            lineHeight: "1.6",
            margin: "16px 0 0",
          }}
        >
          Or view it in{" "}
          <a href={stripeUrl} style={{ color: "#A3E635" }}>
            Stripe
          </a>
          .
        </Text>
      ) : null}
    </EmailLayout>
  );
}
