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
 *
 * THE MONEY IS DESCRIBED IN THE PAST TENSE, FROM THE SCHEDULE. It used to be
 * assembled here from `amount` and `startsOn`, which could say "nothing has
 * been taken yet" to somebody who had just paid a £100 balance. The two
 * sentences now come from lib/onboarding/schedule.ts, built from the same
 * numbers the checkout actually charged.
 */

export function AccountReadyEmail({
  firstName,
  signInUrl,
  planName,
  variant = "full",
  after,
}: {
  firstName: string;
  signInUrl: string;
  planName?: string;
  /**
   * "billing" is an existing client moved onto Stripe by a payment link:
   * their training already happens with Ben, so the email promises the
   * subscription portal — not a first week that deliberately isn't
   * switched on yet.
   */
  variant?: "billing" | "full";
  /**
   * What happened today and what happens monthly, past and future tense —
   * `scheduleAfterLines()`. Null when the figures are not known, in which
   * case the email says less rather than guessing.
   */
  after?: { today: string; monthly: string } | null;
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
          ? after
            ? `${after.today} ${after.monthly} Nothing else changes. Your account is where you see payments, update your card, or make changes.`
            : "Your card is saved and your payments now collect automatically. Nothing else changes. Your account is where you see payments, update your card, or make changes."
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
              {after?.monthly ?? "Your payment collects automatically each month"}
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
