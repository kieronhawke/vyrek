import {
  Body,
  Button,
  Container,
  Head,
  Heading,
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
  TECH_MARK,
  fontStack,
  bodyStyle,
  containerStyle,
  monoEyebrow,
  techMarkStyle,
  ctaPrimary,
  hrRule,
} from "@/lib/email/templates/_styles";

export function WelcomeEmail({
  trialEndsAt,
  firstWorkoutDate,
  programmeName,
}: {
  trialEndsAt: Date | null;
  firstWorkoutDate: Date;
  programmeName: string;
}) {
  const tEnd = trialEndsAt ? formatDate(trialEndsAt) : "in 7 days";
  const tFirst = formatDate(firstWorkoutDate);
  return (
    <Html>
      <Head />
      <Preview>You&apos;re in. Day 1 starts {tFirst}.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ VYREK ]</Text>
          <Heading
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              margin: "16px 0 8px",
            }}
          >
            You&apos;re in.
          </Heading>
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 16,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Day 1 of your {programmeName} programme starts {tFirst}.
          </Text>

          <Section style={{ marginTop: 32 }}>
            <Text style={{ ...monoEyebrow, color: TEXT_DIM }}>
              Trial ends · {tEnd}
            </Text>
            <Text style={{ ...monoEyebrow, color: TEXT_DIM, marginTop: 4 }}>
              First workout · {tFirst}
            </Text>
          </Section>

          <Section style={{ marginTop: 32 }}>
            <Button href="https://vyrek.vercel.app/plan" style={ctaPrimary}>
              View your plan →
            </Button>
          </Section>

          <hr style={hrRule} />

          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            What happens next:
          </Text>
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 14,
              lineHeight: 1.6,
              margin: "8px 0",
            }}
          >
            01 · Add Vyrek to your home screen
            <br />
            02 · Open Tuesday morning
            <br />
            03 · Hit the session
          </Text>

          <hr style={hrRule} />

          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </Container>
      </Body>
    </Html>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Re-export the colour palette for tests
export { BG, TEXT, ACCENT };
