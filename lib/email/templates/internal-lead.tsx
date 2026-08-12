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
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack, monoStack } from "@/lib/email/templates/_styles";

/**
 * THE LEAD BRIEF: what Ben opens on his phone before ringing somebody.
 *
 * ONE JOB, and it is not "present information". It is to get him to press
 * call inside five minutes, because contact speed is the single largest
 * lever on whether a lead ever becomes a client. Everything is ordered by
 * that — name, where they are, a call button the width of the email, the
 * full-request link, then the detail, then the raw dump.
 *
 * THE CALL BUTTON IS A REAL BUTTON, not a number to select and copy.
 * `tel:` opens the dialler on a phone and hands off to FaceTime or a desk
 * phone on a Mac.
 *
 * THE MAP IS AN IMAGE FROM OUR OWN DOMAIN, composed from OpenStreetMap
 * tiles in lib/geo/static-map.ts. The keyless service everyone links to
 * for this — staticmap.openstreetmap.de — no longer resolves at all, so
 * pointing an email at it would have shipped a permanently broken image.
 *
 * It sits inside a link to Google Maps, so a tap anywhere on it opens
 * directions, and if images are blocked (the default in a lot of clients)
 * the alt text names the place and the text link underneath still works.
 * The map is the nicety; the link is the feature.
 *
 * IT IS CAPTIONED AS A REGION, not an address. An IP puts somebody on a
 * mobile network wherever that network's gateway is, which in the UK can
 * be a hundred miles from the person holding the phone. Ben needs it for
 * one decision — whether an in-person session is plausible — and false
 * precision would make that decision worse rather than better.
 */

export const internalLeadSubject = ({
  name,
  place,
  readiness,
}: {
  name: string;
  place?: string | null;
  readiness?: string;
}) =>
  `New lead · ${name}${place ? ` · ${place}` : ""}${readiness ? ` · ${readiness}` : ""}`;

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
  place,
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
  /** "Leeds, England". Null when the request carried no location. */
  place?: string | null;
  mapUrl?: string | null;
  mapImageUrl?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  timeOnSite?: string | null;
  pageViews?: number | null;
  /** The full enquiry page — the same link as the text message. */
  leadUrl?: string | null;
}) {
  const firstName = name.trim().split(/\s+/)[0] || name;
  const dialable = phone ? phone.replace(/\s+/g, "") : null;

  return (
    <EmailLayout
      preview={`${name}${place ? ` · ${place}` : ""} · ${wants}`}
      campaign="internal-lead"
    >
      <Eyebrow>New lead</Eyebrow>
      <H1>{name}</H1>

      {place || timeOnSite ? (
        <Text
          style={{
            color: TEXT_DIM,
            fontFamily: fontStack,
            fontSize: 17,
            lineHeight: "1.5",
            margin: "0 0 4px",
          }}
        >
          {[place, timeOnSite ? `${timeOnSite} on site` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}

      {/* Above everything else, because this is the action. */}
      {dialable ? (
        <Btn href={`tel:${dialable}`}>
          Call {firstName} on {phone}
        </Btn>
      ) : (
        <Btn href={`mailto:${email}`}>Email {firstName}</Btn>
      )}

      {leadUrl ? (
        <Section style={{ margin: "12px 0 0" }}>
          {/* Secondary by design: outlined rather than filled, so it does
              not compete with the call button it sits under. */}
          <Link
            href={leadUrl}
            style={{
              backgroundColor: "#171717",
              border: "1px solid #333333",
              borderRadius: 999,
              color: TEXT,
              display: "block",
              fontFamily: fontStack,
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 24px",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            View the full request →
          </Link>
        </Section>
      ) : null}

      <Panel title="What they want">
        <Row label="Wants" value={wants} />
        {readiness ? <Row label="Ready" value={readiness} /> : null}
        <Row label="Route" value={rail} />
        {goal ? <Row label="Goal" value={goal} /> : null}
        {programme ? <Row label="Plan" value={programme} /> : null}
        {injury ? <Row label="Injury" value={injury} /> : null}
      </Panel>

      <Panel title="Contact">
        <Row label="Phone" value={phone || "not given"} />
        <Row label="Email" value={email} />
      </Panel>

      {mapImageUrl && mapUrl ? (
        <Section style={{ margin: "0 0 8px" }}>
          <Link href={mapUrl}>
            <Img
              src={mapImageUrl}
              alt={`Map showing roughly ${place ?? "their location"}`}
              width="600"
              style={{
                border: "1px solid #262626",
                borderRadius: 8,
                display: "block",
                maxWidth: "100%",
                width: "100%",
              }}
            />
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
            <Link
              href={mapUrl}
              style={{ color: TEXT_FAINT, textDecoration: "underline" }}
            >
              Open in Google Maps
            </Link>
            {" · "}
            From their IP, so it is a region rather than an address.
          </Text>
        </Section>
      ) : null}

      <Panel title="How they got here">
        {landingPath ? <Row label="Landed on" value={landingPath} /> : null}
        {referrer ? <Row label="Came via" value={referrer} /> : null}
        {timeOnSite ? <Row label="Time on site" value={timeOnSite} /> : null}
        {pageViews ? <Row label="Pages" value={String(pageViews)} /> : null}
        {sourcePath ? <Row label="Enquired from" value={sourcePath} /> : null}
        {place ? <Row label="Roughly" value={place} /> : null}
      </Panel>

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
    </EmailLayout>
  );
}
