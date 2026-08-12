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
 */

export function OnboardingInviteEmail({
  firstName,
  link,
  kind,
  coach = "Ben",
  planName,
}: {
  firstName: string;
  link: string;
  kind: "full" | "payment";
  coach?: string;
  /** Named only when Ben has already agreed one with them. */
  planName?: string;
}) {
  const payment = kind === "payment";

  return (
    <EmailLayout
      preview={
        payment
          ? "Pick your plan and you're set. It takes two minutes."
          : "Five minutes, and Ben can write your first week."
      }
      campaign="onboarding-invite"
    >
      <Eyebrow>{payment ? "One step left" : "Welcome aboard"}</Eyebrow>
      <H1>{payment ? "Let's get you started." : `Good to have you, ${firstName}.`}</H1>

      <P>
        {payment
          ? "Everything is ready at my end. Pick the plan that suits you, add a card, and I'll get your first week written."
          : "Before I write your first week I need a few things from you: what you're training for, how you're training now, and anything I should know about injuries."}
      </P>

      <P>
        {payment
          ? planName
            ? `We agreed ${planName}, so it's already selected. Confirm and you're done.`
            : "It takes about two minutes."
          : "It takes about five minutes, and it's all on your phone."}
      </P>

      <Btn href={link}>{payment ? "Choose your plan" : "Set up my account"}</Btn>

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
        <P>Any questions at all, just reply to this. It comes straight to me.</P>
      </Section>

      <SignOff />
    </EmailLayout>
  );
}

export function onboardingInviteSubject(firstName: string, kind: "full" | "payment"): string {
  return kind === "payment"
    ? `${firstName}, choose your plan`
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
): string {
  return kind === "payment"
    ? `${firstName}, it's Ben. Ready when you are - pick your plan: ${link}`
    : `${firstName}, it's Ben. Welcome aboard! 5 mins to set up: ${link}`;
}
