import { Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  SignOff,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * ONE SHAPE FOR EVERY SUBSCRIPTION NOTE.
 *
 * Cancelling, un-cancelling, pausing, resuming, a new rate, a recovered
 * payment: each is a short factual note in Ben's voice. Same bones every
 * time so nothing drifts off-brand, different words every time so nothing
 * reads like a machine wrote it.
 */

export function SubscriptionNoticeEmail({
  eyebrow,
  heading,
  body,
  note,
  ctaLabel,
  ctaHref,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  /** Smaller line under the button, for the caveat that saves a reply. */
  note?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <EmailLayout preview={body.slice(0, 90)} campaign="subscription-notice">
      <Eyebrow>{eyebrow}</Eyebrow>
      <H1>{heading}</H1>
      <P>{body}</P>
      {ctaLabel && ctaHref ? <Btn href={ctaHref}>{ctaLabel}</Btn> : null}
      {note ? (
        <Text
          style={{
            color: TEXT_DIM,
            fontFamily: fontStack,
            fontSize: 13,
            lineHeight: "1.6",
            margin: "16px 0 0",
          }}
        >
          {note}
        </Text>
      ) : null}
      <SignOff />
    </EmailLayout>
  );
}
