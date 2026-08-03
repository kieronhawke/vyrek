import { Img, Link, Section, Text } from "@react-email/components";
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
  location,
  mapUrl,
  mapImageUrl,
  landingPath,
  referrer,
  timeOnSite,
  pageViews,
  leadUrl,
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
  /** City-level, from the IP. Frequently wrong — see the panel copy. */
  location?: string | null;
  mapUrl?: string | null;
  mapImageUrl?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  timeOnSite?: string | null;
  pageViews?: number | null;
  /** Straight to the record in admin. */
  leadUrl?: string | null;
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

      {/* HOW THEY GOT HERE. Which page pulled them in, how long they stayed,
          and roughly where they are. The last one is the only part that
          needs a caveat, and it gets one: an IP puts a lead on a mobile
          network wherever that network's gateway is, which for a UK phone
          can be a hundred miles from the person holding it. Ben needs it
          for one decision — whether an in-person session is plausible —
          and a false precision would make that decision worse, not better. */}
      {(landingPath || timeOnSite || location) ? (
        <Panel title="How they got here">
          {landingPath ? <Row label="Landed on" value={landingPath} /> : null}
          {referrer ? <Row label="Came via" value={referrer} /> : null}
          {timeOnSite ? <Row label="Time on site" value={timeOnSite} /> : null}
          {pageViews ? <Row label="Pages" value={String(pageViews)} /> : null}
          {location ? <Row label="Roughly" value={location} /> : null}
        </Panel>
      ) : null}

      {location && mapUrl ? (
        <Section style={{ margin: "0 0 8px" }}>
          <Link href={mapUrl}>
            {mapImageUrl ? (
              /* Inside the link on purpose. If the tile server does not
                 answer, or the client blocks images, the alt text still
                 names the place and the whole block still opens Maps. */
              <Img
                src={mapImageUrl}
                alt={`Map: roughly ${location}`}
                width="560"
                style={{
                  border: "1px solid #262626",
                  borderRadius: 8,
                  display: "block",
                  maxWidth: "100%",
                  width: "100%",
                }}
              />
            ) : null}
          </Link>
          <Text
            style={{
              color: TEXT_FAINT,
              fontFamily: fontStack,
              fontSize: 12,
              lineHeight: "1.6",
              margin: "8px 0 0",
            }}
          >
            <Link href={mapUrl} style={{ color: TEXT_FAINT, textDecoration: "underline" }}>
              Open in Google Maps
            </Link>
            {" · "}
            From their IP address, so treat it as a region rather than an
            address.
          </Text>
        </Section>
      ) : null}

      {phone ? (
        <Btn href={`tel:${phone.replace(/\s+/g, "")}`}>Call {name} →</Btn>
      ) : (
        <Btn href={`mailto:${email}`}>Email {name} →</Btn>
      )}

      {leadUrl ? (
        <Section style={{ margin: "12px 0 0" }}>
          <Link
            href={leadUrl}
            style={{
              color: TEXT_FAINT,
              fontFamily: fontStack,
              fontSize: 13,
              textDecoration: "underline",
            }}
          >
            Open this lead in admin
          </Link>
        </Section>
      ) : null}

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
