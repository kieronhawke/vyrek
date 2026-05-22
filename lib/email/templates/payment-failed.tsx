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

export function PaymentFailedEmail({
  updatePaymentUrl = "https://vyrek.vercel.app/account/billing",
}: {
  updatePaymentUrl?: string;
} = {}) {
  return (
    <Html>
      <Head />
      <Preview>Payment couldn&apos;t go through. Quick fix.</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Text style={monoEyebrow}>[ PAYMENT NOT TAKEN ]</Text>
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
            We couldn&apos;t take this month&apos;s payment.
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
            No drama. Update your card and we&apos;ll try again. Your plan is
            paused until the payment clears.
          </Text>

          <Button href={updatePaymentUrl} style={{ ...ctaPrimary, marginTop: 24 }}>
            Update payment →
          </Button>

          <hr style={hrRule} />
          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </Container>
      </Body>
    </Html>
  );
}
