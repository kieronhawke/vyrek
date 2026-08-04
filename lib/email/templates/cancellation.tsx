import {
  Button,
  Heading,
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
import { EmailLayout } from "@/lib/email/templates/_layout";

export function CancellationEmail() {
  return (
    <EmailLayout preview={`You&apos;re cancelled. Doors are open if you&apos;re back.`} campaign="cancellation">
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
            Your Suth Performance membership is cancelled. Nothing more will be charged.
            If you change your mind, the door is open, your answers stay
            saved.
          </Text>

          <Button
            href="https://suthperformance.com/quiz"
            style={{ ...ctaPrimary, marginTop: 24 }}
          >
            Restart your plan →
          </Button>

          <hr style={hrRule} />
          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </EmailLayout>
  );
}
