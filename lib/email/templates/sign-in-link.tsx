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
 * A SIGN-IN LINK, REQUESTED FROM THE LOGIN PAGE.
 *
 * Most clients never set a password — the onboarding flow deliberately
 * never asks for one — so this IS their way in, every time. One button,
 * nothing to remember, and the expiry is said out loud rather than
 * discovered.
 */

export function SignInLinkEmail({
  firstName,
  signInUrl,
}: {
  firstName: string;
  signInUrl: string;
}) {
  return (
    <EmailLayout
      preview="Your sign-in link. One tap and you're in."
      campaign="sign-in-link"
    >
      <Eyebrow>Sign in</Eyebrow>
      <H1>Here you go, {firstName}.</H1>

      <P>
        Tap the button and you&apos;re straight into your account. No
        password needed.
      </P>

      <Btn href={signInUrl}>Sign me in</Btn>

      <Text
        style={{
          color: TEXT_DIM,
          fontFamily: fontStack,
          fontSize: 13,
          lineHeight: "1.6",
          margin: "16px 0 0",
        }}
      >
        The link works for a short while for security, and only from this
        email. Didn&apos;t ask for it? You can safely ignore this. Nobody
        gets in without it.
      </Text>

      <SignOff />
    </EmailLayout>
  );
}

export const signInLinkSubject = () => "Your Suth Performance sign-in link";
