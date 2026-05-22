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

export function Day5Email({
  sessionsLogged,
}: {
  sessionsLogged?: number;
} = {}) {
  return (
    <Html>
      <Head />
      <Preview>Two days left in your trial. Week 2 lands tomorrow.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ DAY 05 · 2 DAYS LEFT ]</Text>
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
            Two days left.
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
            {sessionsLogged
              ? `${sessionsLogged} session${sessionsLogged === 1 ? "" : "s"} logged so far. `
              : ""}
            Tomorrow we&apos;ll show you what Week 2 looks like.
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
            Week 2 is where the strength block really starts. Same time
            commitment. Higher returns.
          </Text>

          <Button
            href="https://vyrek.vercel.app/plan"
            style={{ ...ctaPrimary, marginTop: 24 }}
          >
            Open the app →
          </Button>

          <hr style={hrRule} />

          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </Container>
      </Body>
    </Html>
  );
}
