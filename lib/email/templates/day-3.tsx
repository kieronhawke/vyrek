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

export function Day3Email() {
  return (
    <Html>
      <Head />
      <Preview>Three days in. Most members say day 3 is the hardest.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ DAY 03 ]</Text>
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
            Three days in.
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
            Most members say day 3 is the hardest. The legs feel it. The plan
            doesn&apos;t care. Keep going — you&apos;ve got this.
          </Text>

          <hr style={hrRule} />

          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            Tomorrow is built on top of today. Open the app, see what&apos;s
            next, then move on with your day.
          </Text>

          <Button
            href="https://vyrek.vercel.app/plan"
            style={{ ...ctaPrimary, marginTop: 24 }}
          >
            See tomorrow&apos;s session →
          </Button>

          <hr style={hrRule} />

          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </Container>
      </Body>
    </Html>
  );
}
