import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";
import {
  bodyStyle,
  containerStyle,
  monoEyebrow,
  techMarkStyle,
  ctaPrimary,
  hrRule,
  fontStack,
  TEXT,
  TEXT_DIM,
  TECH_MARK,
} from "@/lib/email/templates/_styles";

export function Day1Email({
  workoutTitle,
  durationMin,
  intensity,
}: {
  workoutTitle: string;
  durationMin: number;
  intensity: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{`Day 1. ${workoutTitle}, ${durationMin} min.`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ DAY 01 ]</Text>
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
            Day 1.
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
            Today&apos;s session is ready.
          </Text>

          <hr style={hrRule} />

          <Text
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {workoutTitle}
          </Text>
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 14,
              lineHeight: 1.6,
              margin: "4px 0 0",
            }}
          >
            {durationMin} min · {intensity}
          </Text>

          <Button
            href="https://vyrek.vercel.app/plan"
            style={{ ...ctaPrimary, marginTop: 24 }}
          >
            Open today&apos;s session →
          </Button>

          <hr style={hrRule} />

          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </Container>
      </Body>
    </Html>
  );
}
