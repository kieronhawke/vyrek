import { Text } from "@react-email/components";
import {
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * INTERNAL: a client asked for a subscription change, in their own words.
 * Lands in Ben's inbox with everything needed to act — who, what they pay,
 * and what they asked for. The human path the portal doesn't cover.
 */

export function ChangeRequestEmail({
  email,
  planName,
  rate,
  message,
}: {
  email: string;
  planName: string | null;
  rate: string | null;
  message: string;
}) {
  return (
    <EmailLayout preview={`${email} asked for a change`} campaign="change-request">
      <Eyebrow>Subscription change request</Eyebrow>
      <H1>{email}</H1>
      <P>
        {planName ?? "Unknown plan"}
        {rate ? ` · ${rate} a month` : ""}
      </P>
      <Panel title="What they asked for">
        <Text
          style={{
            color: TEXT_DIM,
            fontFamily: fontStack,
            fontSize: 15,
            lineHeight: "1.8",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </Text>
      </Panel>
      <P>
        Reply goes straight to them. Rate changes and pauses live in the admin
        under Customers.
      </P>
    </EmailLayout>
  );
}

export const changeRequestSubject = (email: string) =>
  `Change request from ${email}`;
