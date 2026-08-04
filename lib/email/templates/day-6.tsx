import {
  Button,
  Heading,
  Link,
  Section,
  Text,
} from "@react-email/components";
import {
  bodyStyle,
  containerStyle,
  monoEyebrow,
  techMarkStyle,
  ctaPrimary,
  ctaSecondary,
  hrRule,
  fontStack,
  TEXT,
  TEXT_DIM,
  TEXT_FAINT,
  SURFACE,
  BORDER,
  TECH_MARK,
} from "@/lib/email/templates/_styles";
import { EmailLayout } from "@/lib/email/templates/_layout";

export function Day6Email({
  week2Teasers = [
    "Hyrox Hybrid: Sled + Rower",
    "Strength: heavy pull + core",
    "Tempo run progression",
  ],
}: {
  week2Teasers?: string[];
} = {}) {
  return (
    <EmailLayout preview={`Tomorrow: £8.99. Cancel anytime.`} campaign="day-6">
          <Text style={monoEyebrow}>[ DAY 06 · TOMORROW: £8.99 ]</Text>
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
            Tomorrow: £8.99.
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
            Your trial converts tomorrow. £8.99 a month for the next 11 weeks
            of programming. Cancel from your account any time.
          </Text>

          <hr style={hrRule} />

          <Text
            style={{
              color: TEXT,
              fontFamily: fontStack,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            Week 2, what&apos;s waiting:
          </Text>

          <Section style={{ marginTop: 12 }}>
            {week2Teasers.map((title, i) => (
              <div
                key={i}
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  marginTop: 8,
                  padding: "12px 14px",
                }}
              >
                <Text
                  style={{
                    color: TEXT_FAINT,
                    fontFamily: fontStack,
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    margin: 0,
                    textTransform: "uppercase",
                  }}
                >
                  Day {i + 1}
                </Text>
                <Text
                  style={{
                    color: TEXT,
                    fontFamily: fontStack,
                    fontSize: 15,
                    fontWeight: 500,
                    margin: "2px 0 0",
                  }}
                >
                  {title}
                </Text>
              </div>
            ))}
          </Section>

          <Section style={{ marginTop: 24 }}>
            <Button href="https://suthperformance.com/plan" style={ctaPrimary}>
              Stay with Suth Performance →
            </Button>
          </Section>

          <Section style={{ marginTop: 12 }}>
            <Link
              href="https://suthperformance.com/account/cancel"
              style={ctaSecondary}
            >
              Cancel my trial
            </Link>
          </Section>

          <hr style={hrRule} />

          <Text style={techMarkStyle}>{TECH_MARK}</Text>
        </EmailLayout>
  );
}
