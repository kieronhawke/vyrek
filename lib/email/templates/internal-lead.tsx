import { Link, Section, Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
  TEXT,
  TEXT_FAINT,
  url,
} from "@/lib/email/templates/_layout";
import { fontStack, monoStack } from "@/lib/email/templates/_styles";

/**
 * The internal lead brief: what Ben (and Kieron, while the inbox is his)
 * opens on their phone before ringing someone back.
 *
 * Optimised for one job, which is being read in ten seconds on a phone
 * screen while deciding whether to call now. The name, what they want and
 * how warm they are come first; the full answer dump comes last.
 *
 * The plain-text quiz brief from lib/lead-brief.ts is included verbatim at
 * the bottom, so the email is still complete if the styled version renders
 * badly anywhere.
 */

export const internalLeadSubject = ({
  name,
  rail,
  readiness,
}: {
  name: string;
  rail: string;
  readiness?: string;
}) =>
  `Lead · ${name} · ${rail}${readiness ? ` · ${readiness}` : ""}`;

export function InternalLeadEmail({
  name,
  email,
  phone,
  rail,
  wants,
  readiness,
  goal,
  programme,
  injury,
  sourcePath,
  brief,
}: {
  name: string;
  email: string;
  phone?: string | null;
  rail: string;
  wants: string;
  readiness?: string;
  goal?: string;
  programme?: string;
  injury?: string;
  sourcePath?: string | null;
  /** The plain-text brief from lib/lead-brief.ts. */
  brief: string;
}) {
  return (
    <EmailLayout
      preview={`${name} · ${wants}${readiness ? ` · ${readiness}` : ""}`}
      campaign="internal-lead"
    >
      <Eyebrow>New lead</Eyebrow>
      <H1>{name}</H1>

      <Panel title="Call this one">
        <Row label="Wants" value={wants} />
        {readiness ? <Row label="Ready" value={readiness} /> : null}
        <Row label="Path" value={rail} />
        {goal ? <Row label="Goal" value={goal} /> : null}
        {programme ? <Row label="Plan" value={programme} /> : null}
        {injury ? <Row label="Injury" value={injury} /> : null}
      </Panel>

      <Panel title="Reach them">
        <Row label="Email" value={email} />
        <Row label="Phone" value={phone || "not given"} />
        {sourcePath ? <Row label="Came from" value={sourcePath} /> : null}
      </Panel>

      {phone ? (
        <Btn href={`tel:${phone.replace(/\s+/g, "")}`}>Call {name} →</Btn>
      ) : (
        <Btn href={`mailto:${email}`}>Email {name} →</Btn>
      )}

      <Section style={{ margin: "8px 0 0" }}>
        <Link
          href={`mailto:${email}`}
          style={{
            color: TEXT_FAINT,
            fontFamily: fontStack,
            fontSize: 13,
            textDecoration: "underline",
          }}
        >
          Or reply by email
        </Link>
      </Section>

      <P>
        Speed matters more than polish here. Contact inside five minutes and
        the odds of actually reaching them are an order of magnitude better
        than at thirty.
      </P>

      <Panel title="Everything they told us">
        <Text
          style={{
            color: TEXT,
            fontFamily: monoStack,
            fontSize: 13,
            lineHeight: "1.7",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}
        >
          {brief}
        </Text>
      </Panel>

      <Section style={{ margin: "20px 0 0" }}>
        <Link
          href={url("/admin/customers")}
          style={{
            color: TEXT_FAINT,
            fontFamily: fontStack,
            fontSize: 13,
            textDecoration: "underline",
          }}
        >
          Open admin →
        </Link>
      </Section>
    </EmailLayout>
  );
}
