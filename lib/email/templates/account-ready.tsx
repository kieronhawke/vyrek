import { Section, Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  SignOff,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * THE WAY IN, SENT THE MOMENT THEY PAY.
 *
 * The onboarding flow never asks for a password, on purpose — somebody who
 * has just handed over a card should not then have to invent a credential
 * they will forget. So this is how they get into the account: one link,
 * already signed in at the other end.
 *
 * THE LINK IS TIME-LIMITED, and the email says so plainly. A magic link
 * that has quietly expired, in an email that promised it would work, is a
 * support message at the worst possible moment — the first hour of somebody
 * paying. There is a fallback line for when it does expire.
 *
 * IT IS NOT A RECEIPT. Stripe sends that, and duplicating it here would
 * bury the one thing this email exists to do.
 */

export function AccountReadyEmail({
  firstName,
  signInUrl,
  planName,
}: {
  firstName: string;
  signInUrl: string;
  planName?: string;
}) {
  return (
    <EmailLayout
      preview="Your account is ready — one tap to get in."
      campaign="account-ready"
    >
      <Eyebrow>You&apos;re in</Eyebrow>
      <H1>Welcome aboard, {firstName}.</H1>

      <P>
        {planName
          ? `Your ${planName} is set up and your account is waiting.`
          : "Your account is set up and waiting."}{" "}
        There&apos;s no password to remember — this link signs you straight
        in.
      </P>

      <Btn href={signInUrl}>Open my account</Btn>

      <Text
        style={{
          color: TEXT_DIM,
          fontFamily: fontStack,
          fontSize: 13,
          lineHeight: "1.6",
          margin: "16px 0 0",
        }}
      >
        {/* Said out loud rather than discovered. A link that has silently
            expired, in an email that promised it would work, is a support
            message in the first hour of somebody paying. */}
        The link works for a short while for security. If it&apos;s stopped
        working, ask for a new one from the sign-in page — same address, no
        password needed.
      </Text>

      <Panel title="What happens next">
        <Text
          style={{
            color: TEXT_DIM,
            fontFamily: fontStack,
            fontSize: 15,
            lineHeight: "1.8",
            margin: 0,
          }}
        >
          I write your first week around what you told me
          <br />
          It lands in your account, and you get a text
          <br />
          Message me any time from inside the app
        </Text>
      </Panel>

      <Section>
        <P>Any questions at all, just reply — it comes straight to me.</P>
      </Section>

      <SignOff />
    </EmailLayout>
  );
}

export const accountReadySubject = (firstName: string) =>
  `${firstName}, your account is ready`;
