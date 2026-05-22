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

export function CancellationEmail() {
  return (
    <Html>
      <Head />
      <Preview>You&apos;re cancelled. Doors are open if you&apos;re back.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ MEMBERSHIP CANCELLED ]</Text>
          <Heading
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: "16px 0 8px",
            }}
          >
            All done.
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
            Your Vyrek membership is cancelled. Nothing more will be charged.
            If you change your mind, the door is open — your answers stay
            saved.
          </Text>

          <Button
            href="https://vyrek.vercel.app/quiz"
            style={{ ...ctaPrimary, marginTop: 24 }}
          >
            Restart your plan →
          </Button>

          <hr style={hrRule} />
          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </Container>
      </Body>
    </Html>
  );
}
