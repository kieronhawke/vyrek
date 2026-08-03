import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import {
  BG,
  TEXT,
  TEXT_DIM,
  ACCENT,
  fontStack,
  bodyStyle,
  containerStyle,
  monoEyebrow,
  ctaPrimary,
  hrRule,
} from "@/lib/email/templates/_styles";

/**
 * THE INVITE EMAIL.
 *
 * This is the first thing a paying client ever receives from Suth
 * Performance, and it has exactly one job: get them to press the button.
 * Everything else in it is in service of that.
 *
 * WRITTEN AS BEN, NOT AS A COMPANY. He has already spoken to this person —
 * that is why they are getting a link — so an email that opens "Dear
 * Customer, welcome to our platform" reads as though it came from somewhere
 * else entirely. It is signed by him, it says what happens next, and it says
 * how long it takes.
 *
 * ONE BUTTON. No navigation, no social icons, no footer of links to a blog.
 * A second call to action halves the first one.
 *
 * THE LINK IS ALSO PRINTED AS TEXT. Buttons are stripped by some corporate
 * mail clients and by most plain-text views, and somebody who cannot see the
 * button has no way through at all. It costs one line.
 *
 * Two variants from one template: `full` for a new client with the questions
 * to answer, `payment` for somebody Ben has already talked through everything
 * with and just needs a card from.
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
    <Html>
      <Head />
      <Preview>
        {payment
          ? `Set up your Suth Performance plan — two minutes`
          : `Your Suth Performance setup link — five minutes and you're training`}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ SUTH PERFORMANCE ]</Text>

          <Heading
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontSize: 30,
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: "0 0 18px",
            }}
          >
            {payment ? "Let's get you started." : `Welcome aboard, ${firstName}.`}
          </Heading>

          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 16,
              lineHeight: 1.6,
              margin: "0 0 14px",
            }}
          >
            {payment ? (
              <>
                {firstName}, everything is ready your end — pick your plan and add a
                card and I&apos;ll have your first week with you.
              </>
            ) : (
              <>
                Good to have you on board. Before I write your first week I need a
                few things from you: what you&apos;re training for, how you&apos;re
                training now, and anything I should know about injuries.
              </>
            )}
          </Text>

          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 16,
              lineHeight: 1.6,
              margin: "0 0 26px",
            }}
          >
            {payment
              ? planName
                ? `We agreed ${planName}. It's already selected — just confirm and pay.`
                : "It takes about two minutes."
              : "It takes about five minutes, and it's all on your phone."}
          </Text>

          {/* One button. A second call to action halves the first. */}
          <Section style={{ margin: "0 0 22px" }}>
            <Button href={link} style={ctaPrimary}>
              {payment ? "Choose your plan →" : "Set up my account →"}
            </Button>
          </Section>

          {/* Printed as text as well: corporate mail clients strip buttons, and
              somebody who cannot see it has no way through at all. */}
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 13,
              lineHeight: 1.6,
              margin: "0 0 26px",
              wordBreak: "break-all",
            }}
          >
            Button not working? Paste this into your browser:
            <br />
            <span style={{ color: ACCENT }}>{link}</span>
          </Text>

          <Hr style={hrRule} />

          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 14,
              lineHeight: 1.6,
              margin: "18px 0 0",
            }}
          >
            Any questions at all, just reply to this — it comes straight to me.
          </Text>

          <Text
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontSize: 15,
              fontWeight: 700,
              margin: "14px 0 0",
            }}
          >
            {coach}
          </Text>
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 13,
              margin: "2px 0 0",
            }}
          >
            Suth Performance
          </Text>

          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 11,
              lineHeight: 1.6,
              margin: "26px 0 0",
              opacity: 0.75,
            }}
          >
            {/* No unsubscribe: this is a transactional message to somebody who
                asked Ben to set them up. HARD-RULES §11 — putting an opt-out on
                it invites somebody to opt out of their own account. */}
            You&apos;re getting this because {coach} is setting up your coaching.
            The link expires in 30 days.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function onboardingInviteSubject(firstName: string, kind: "full" | "payment"): string {
  return kind === "payment"
    ? `${firstName}, choose your plan — two minutes`
    : `${firstName}, let's get you set up`;
}

/**
 * THE TEXT.
 *
 * The first thing a new client ever gets from Suth Performance, and it lands
 * on a lock screen. It has about eight words before they decide whether it
 * came from a person or a system.
 *
 * SHORT BECAUSE THE SENDER ALREADY SAYS WHO IT IS. The text arrives from
 * "SuthPerform", so repeating "Suth Performance" in the body spends twenty
 * characters saying what is already on the screen. That is what bought the
 * room for it to fit in ONE segment — 4.2p rather than 12.7p, and more
 * importantly a message that looks like a note rather than a wall.
 *
 * Warm, and specific about the cost in minutes: "set up your account" with no
 * sense of how long it takes is what gets left until later and forgotten.
 *
 * NO EMOJI, and not for taste — one emoji forces the whole message to UCS-2,
 * cuts every segment from 160 characters to 70 and doubles the bill. Same for
 * curly quotes, which is why the apostrophes here are typewriter ones.
 *
 * IT MUST STAY UNDER 160 FOR A LONG FIRST NAME, not just for "Sam" — the name
 * is paid for twice, once in the greeting and once inside the link.
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

export { BG };
