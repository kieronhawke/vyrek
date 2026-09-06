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
import {
  TEXT_DIM,
  TEXT_FAINT,
  fontStack,
  monoStack,
} from "@/lib/email/templates/_styles";

/**
 * THE INVITE EMAIL.
 *
 * The first thing a paying client ever receives from Suth Performance. One
 * job: get them to press the button. Everything in it serves that.
 *
 * NOW ON THE SHARED LAYOUT. It was standalone, so it carried no logo, no
 * footer, and none of the Outlook handling every other email here already
 * had — in particular the wrapper table with a bgcolor attribute, because
 * Outlook's Word engine ignores CSS backgrounds on <body> and would have
 * rendered this design as near-white text on a white page.
 *
 * WRITTEN AS BEN, NOT AS A COMPANY. He has already spoken to this person —
 * that is why they are getting a link — so "Dear Customer, welcome to our
 * platform" reads as though it came from somewhere else entirely.
 *
 * ONE BUTTON. A second call to action halves the first.
 *
 * THE LINK IS PRINTED AS TEXT TOO. Some corporate clients strip the button,
 * and the plain-text alternative has no button at all; without the URL in
 * words those recipients have no way through. It costs one line.
 *
 * THE MONEY IS SAID ONCE, IN FULL. What comes out today and what comes out
 * monthly, from when — built by lib/onboarding/schedule.ts from the same
 * numbers the checkout charges, so this email and the card screen cannot
 * disagree. It replaced `amount` + `startsOn`, which between them could not
 * describe a balance owed today at all.
 *
 * THE MESSAGE IS BEN'S, THE REST IS THE TEMPLATE'S. `paragraphs` is plain
 * text he can rewrite before sending (lib/onboarding/message-copy.ts). It is
 * rendered as text nodes, so whatever he types is escaped on the way in and
 * an email can never be broken by a stray angle bracket. The headline, the
 * button, the payment table and the sign-off are not his to edit: they are
 * the parts that have to be right every time.
 */

export type PayRow = { label: string; value: string };

export function OnboardingInviteEmail({
  firstName,
  link,
  kind,
  paragraphs,
  payRows,
}: {
  firstName: string;
  link: string;
  kind: "full" | "payment";
  /**
   * The body above the button, one string per paragraph. Ben's own words when
   * he has edited them, otherwise `defaultInviteEmailBody`.
   */
  paragraphs: string[];
  /** The schedule as rows, for the panel. */
  payRows?: PayRow[] | null;
}) {
  const payment = kind === "payment";

  return (
    <EmailLayout
      /* The line the inbox shows beside the subject, before anything is
         opened. It has to be Ben's own first sentence once he has rewritten
         the message: a fixed "Add your card and you're set" sitting next to
         a subject he wrote himself is the one part of the email that would
         still be talking over him. Trimmed, because most clients show around
         ninety characters and cut mid-word after that. */
      preview={
        paragraphs[0]
          ? paragraphs[0].length > 100
            ? `${paragraphs[0].slice(0, 97).trimEnd()}...`
            : paragraphs[0]
          : payment
            ? "Add your card and you're set. It takes two minutes."
            : "Five minutes, and Ben can write your first week."
      }
      campaign="onboarding-invite"
    >
      <Eyebrow>{payment ? "One step left" : "Welcome aboard"}</Eyebrow>
      <H1>
        {payment ? `Let's get you on card, ${firstName}.` : `Good to have you, ${firstName}.`}
      </H1>

      {/* Single newlines inside a paragraph become line breaks. Somebody
          typing a note presses return once between lines and expects to see
          them separated; without this the whole thing renders as one run-on
          sentence and the message looks broken rather than merely different.
          Rendered as text nodes throughout, so whatever Ben types is escaped
          and no email can be broken by a stray angle bracket. */}
      {paragraphs.map((text, i) => (
        <P key={i}>
          {text.split("\n").map((line, j, all) => (
            <span key={j}>
              {line}
              {j < all.length - 1 ? <br /> : null}
            </span>
          ))}
        </P>
      ))}

      <Btn href={link}>{payment ? "Set up my payments" : "Set up my account"}</Btn>

      <Text
        style={{
          color: TEXT_FAINT,
          fontFamily: monoStack,
          fontSize: 13,
          lineHeight: "1.6",
          margin: "18px 0 0",
          wordBreak: "break-all",
        }}
      >
        {/* Deliberately muted, not accent. This is a fallback for clients
            that strip the button — set in the same chartreuse it competes
            with the button it exists to back up, and the eye goes to the
            longest thing on the screen rather than the thing to press. */}
        Or paste this into your browser:
        <br />
        <span style={{ color: TEXT_DIM }}>{link}</span>
      </Text>

      {payment && payRows && payRows.length > 0 ? (
        <Panel title="What you'll pay">
          {payRows.map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
        </Panel>
      ) : null}

      {!payment ? (
        <Panel title="What I'll ask you">
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 15,
              lineHeight: "1.8",
              margin: 0,
            }}
          >
            What you&apos;re training for
            <br />
            How your week looks at the moment
            <br />
            Anything I should train around
            <br />
            Which days you can train
          </Text>
        </Panel>
      ) : null}

      <SignOff />
    </EmailLayout>
  );
}

export function onboardingInviteSubject(firstName: string, kind: "full" | "payment"): string {
  /* Not "choose your plan". There is nothing to choose — this goes to somebody
     Ben already coaches, and a subject line inviting them to pick a package
     is the first thing they would have had to ignore. */
  return kind === "payment"
    ? `${firstName}, set up your payments`
    : `${firstName}, let's get you set up`;
}

/**
 * THE TEXT MESSAGE.
 *
 * The first thing a new client gets, on a lock screen. It has about eight
 * words before they decide whether it came from a person or a system.
 *
 * SHORT BECAUSE THE SENDER ALREADY SAYS WHO IT IS. It arrives from
 * "SuthPerform", so repeating "Suth Performance" in the body spends twenty
 * characters saying what is already on the screen — and that is exactly what
 * bought the room to fit in ONE segment: 4.2p rather than 12.7p, and a
 * message that reads like a note rather than a wall.
 *
 * NO EMOJI, and not for taste — one emoji forces the whole message to UCS-2,
 * cuts every segment from 160 characters to 70 and doubles the bill. Same for
 * curly quotes, hence the typewriter apostrophes.
 *
 * It must stay under 160 for a LONG first name, not just for "Sam": the name
 * is billed twice, once in the greeting and once inside the link.
 * lib/onboarding/invite-cost.test.ts holds that line.
 */
export function onboardingInviteSms(
  firstName: string,
  link: string,
  kind: "full" | "payment",
  /**
   * "£60/mo from 1 Oct", "£100 today, then £60/mo from 1 Oct" — built by
   * scheduleSms() so it says the same thing as the email. Null when no rate
   * was agreed.
   */
  schedule?: string | null,
): string {
  // A payment-only invite goes to an EXISTING client on an agreed rate, so
  // "pick your plan" was wrong: there is nothing to pick. The link sets up
  // their account and card, that's all.
  //
  // The FIGURES go in when there are any. This is the message most of them
  // actually read, and a link asking for card details is exactly the shape of
  // a scam text — the agreed numbers are the thing only Ben could know, so
  // they are what make the message obviously genuine. invite-cost.test.ts
  // holds the one-segment line for the longest schedule and a long name.
  if (kind !== "payment") {
    return `${firstName}, it's Ben. Welcome aboard! 5 mins to set up: ${link}`;
  }
  if (schedule) {
    return `Hi ${firstName}, it's Ben. Set your card up for ${schedule}: ${link}`;
  }
  return `Hi ${firstName}, it's Ben. Your account set-up link: ${link}`;
}
