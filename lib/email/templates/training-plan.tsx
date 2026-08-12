import { Section, Text } from "@react-email/components";
import {
  EmailLayout,
  Eyebrow,
  H1,
  P,
  SignOff,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * The plan itself, in the email. Ben pressed Send in Coach Mode and this
 * is what lands: his note first, then the week day by day. Reply goes
 * straight back to him.
 */

type Day = { day?: string; focus?: string; detail?: string };

export function TrainingPlanEmail({
  firstName,
  title,
  note,
  weekStart,
  content,
}: {
  firstName: string;
  title: string;
  note: string | null;
  weekStart: string;
  content: Day[];
}) {
  const weekLabel = new Date(`${weekStart}T12:00:00`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "long" },
  );
  const days = content.filter((d) => (d.detail ?? "").trim() || (d.focus ?? "").trim());

  return (
    <EmailLayout
      preview={`${title}. Week starting ${weekLabel}.`}
      campaign="training-plan"
    >
      <Eyebrow>Week starting {weekLabel}</Eyebrow>
      <H1>{title}</H1>

      {note ? <P>{note}</P> : null}

      {days.map((d, i) => (
        <Section
          key={i}
          style={{
            borderLeft: "3px solid #B4F03C",
            paddingLeft: 14,
            margin: "18px 0",
          }}
        >
          <Text
            style={{
              fontFamily: fontStack,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              margin: "0 0 2px",
            }}
          >
            {d.day}
            {(d.focus ?? "").trim() ? (
              <span style={{ color: TEXT_DIM, fontWeight: 500 }}>
                {"  ·  "}
                {d.focus}
              </span>
            ) : null}
          </Text>
          <Text
            style={{
              fontFamily: fontStack,
              fontSize: 15,
              lineHeight: "24px",
              whiteSpace: "pre-wrap" as const,
              margin: 0,
            }}
          >
            {d.detail}
          </Text>
        </Section>
      ))}

      <P>
        Any questions, or something doesn&apos;t fit your week, just reply.
        It comes straight to me.
      </P>

      <SignOff />
    </EmailLayout>
  );
}
