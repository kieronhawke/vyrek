import { Section, Text } from "@react-email/components";
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
 */

export type PayRow = { label: string; value: string };

export function OnboardingInviteEmail({
  firstName,
  link,
  kind,
  coach = "Ben",
  payLine,
  payRows,
}: {
  firstName: string;
  link: string;
  kind: "full" | "payment";
  coach?: string;
  /**
   * The schedule in one or two sentences — "£100 today, for your outstanding
   * balance. Then £60 a month from Tuesday 1 October, on the same day each
   * month." Null when no rate was agreed on the invite.
   */
  payLine?: string | null;
  /** The same schedule as rows, for the panel. */
  payRows?: PayRow[] | null;
}) {
  const payment = kind === "payment";

  return (
    <EmailLayout
      preview={
        payment
          ? "Add your card and you're set. It takes two minutes."
          : "Five minutes, and Ben can write your first week."
      }
      campaign="onboarding-invite"
    >
      <Eyebrow>{payment ? "One step left" : "Welcome aboard"}</Eyebrow>
      <H1>
        {payment ? `Let's get you on card, ${firstName}.` : `Good to have you, ${firstName}.`}
      </H1>

      <P>
        {payment
          ? "Nothing changes about your training. This just moves your payments onto a card so neither of us has to think about it again."
          : "Before I write your first week I need a few things from you: what you're training for, how you're training now, and anything I should know about injuries."}
      </P>

      <P>
        {payment
          ? payLine
            ? `Exactly as we agreed: ${payLine}`
            : "It takes about two minutes."
          : "It takes about five minutes, and it's all on your phone."}
      </P>

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

      <Section>
        <P>Any questions at all, just reply to this. It comes straight to {coach === "Ben" ? "me" : coach}.</P>
      </Section>

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
