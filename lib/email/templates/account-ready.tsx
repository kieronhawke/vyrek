import { Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
  SignOff,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * THE WAY IN, SENT THE MOMENT THEY PAY.
 *
 * One job: get them into the account they have just started paying for.
 *
 * ── SHORTER, ON PURPOSE ───────────────────────────────────────────────────
 * This email used to open with a single sentence carrying five separate
 * facts: what was taken, that the card was saved, the monthly figure, the
 * date, that nothing else changes, and what the account is for. Read aloud it
 * is thirty seconds of talking before the reader is told what to do. Kieron
 * quoted it back as exactly that — "a lot of words going on".
 *
 * So the prose says one thing, and the figures moved into a table where a
 * figure belongs. Somebody checking what they paid finds it by looking rather
 * than by reading, which is the whole difference between a receipt and a
 * paragraph about a receipt.
 *
 * IT IS NOT A RECEIPT. Stripe sends that. Duplicating it here would bury the
 * one thing this email exists to do.
 */

export function AccountReadyEmail({
  firstName,
  signInUrl,
  planName,
  variant = "full",
  rows,
}: {
  firstName: string;
  signInUrl: string;
  planName?: string;
  /**
   * "billing" is an existing client moved onto Stripe by a payment link:
   * their training already happens with Ben, so this promises the
   * subscription portal, not a first week that deliberately isn't switched
   * on yet.
   */
  variant?: "billing" | "full";
  /**
   * What was taken and what comes next, as label/value pairs — the same rows
   * the invite showed them before they paid, so the two match. Null when the
   * figures are not known, in which case the email says less rather than
   * guessing.
   */
  rows?: { label: string; value: string }[] | null;
}) {
  const billing = variant === "billing";
  return (
    <EmailLayout
      preview={`You're all set, ${firstName}. Here's the way into your account.`}
      campaign="account-ready"
      /* Transactional. The site links belong on an email that wants a browse,
         not on the one telling somebody their payment went through. */
      nav={false}
    >
      <Eyebrow>{billing ? "All set" : "You're in"}</Eyebrow>
      <H1>
        {billing ? `You're all set, ${firstName}.` : `Welcome aboard, ${firstName}.`}
      </H1>

      <P>
        {billing
          ? "Thanks for getting that sorted. Everything is set up at your end."
          : planName
            ? `Your ${planName} is set up and your account is waiting.`
            : "Your account is set up and waiting."}
      </P>

      <Btn href={signInUrl}>Open my account</Btn>

      {rows && rows.length > 0 ? (
        <Panel title="Your payments">
          {rows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
        </Panel>
      ) : null}

      <Text
        style={{
          color: TEXT_DIM,
          fontFamily: fontStack,
          fontSize: 13,
          lineHeight: "1.6",
          margin: "20px 0 0",
        }}
      >
        {/* Said out loud rather than discovered. A link that has quietly
            expired, in an email that promised it would work, is a support
            message in the first hour of somebody paying. */}
        That button works for a short while. After that, sign in with your
        email and password.
      </Text>

      <SignOff line="Any questions, just reply." />
    </EmailLayout>
  );
}

export const accountReadySubject = (firstName: string) =>
  `${firstName}, your account is ready`;
