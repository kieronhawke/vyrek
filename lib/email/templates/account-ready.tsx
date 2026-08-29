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
  variant = "full",
  amount,
  startsOn,
}: {
  firstName: string;
  signInUrl: string;
  planName?: string;
  /** The agreed monthly rate, formatted — "£150". */
  amount?: string | null;
  /**
   * When the first payment comes out, formatted, or null if it already has.
   *
   * ⚠️ WITHOUT THIS THE EMAIL LIES. It said the subscription "now collects
   * automatically each month" to everybody — including somebody whose first
   * collection is three weeks away and whose bank statement therefore shows
   * nothing. The first thing a careful person does after paying is check.
   */
  startsOn?: string | null;
  /**
   * "billing" is an existing client moved onto Stripe by a payment link:
   * their training already happens with Ben, so the email promises the
   * subscription portal — not a first week that deliberately isn't
   * switched on yet.
   */
  variant?: "billing" | "full";
}) {
  return (
    <EmailLayout
      preview="Your account is ready. One tap and you're in."
      campaign="account-ready"
    >
      <Eyebrow>You&apos;re in</Eyebrow>
      <H1>
        {variant === "billing"
          ? `All set, ${firstName}.`
          : `Welcome aboard, ${firstName}.`}
      </H1>

      <P>
        {variant === "billing"
          ? startsOn
            ? `Your card is saved. Nothing has been taken yet — your first payment${
                amount ? ` of ${amount}` : ""
              } comes out on ${startsOn}, and the same day each month after that. Nothing else changes.`
            : `Your card is saved and ${
                amount ? `${amount} ` : ""
              }collects automatically each month from now on. Nothing else changes. Your account is where you see payments, update your card, or make changes.`
          : planName
            ? `Your ${planName} is set up and your account is waiting.`
            : "Your account is set up and waiting."}{" "}
        This link signs you straight in, or use the password you chose.
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
        working, sign in with your email and password, or ask for a new link
        from the sign-in page.
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
          {variant === "billing" ? (
            <>
              {startsOn
                ? `Your first payment${amount ? ` of ${amount}` : ""} comes out on ${startsOn}`
                : "Your payment collects automatically each month"}
              <br />
              Update your card or make changes any time from your account
              <br />
              Training carries on with me exactly as it does now
            </>
          ) : (
            <>
              I write your first week around what you told me
              <br />
              It lands in your account, and you get a text
              <br />
              Message me any time from inside the app
            </>
          )}
        </Text>
      </Panel>

      <Section>
        <P>Any questions at all, just reply. It comes straight to me.</P>
      </Section>

      <SignOff />
    </EmailLayout>
  );
}

export const accountReadySubject = (firstName: string) =>
  `${firstName}, your account is ready`;
