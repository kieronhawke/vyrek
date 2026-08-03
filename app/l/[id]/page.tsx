import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLead } from "@/lib/leads/store";
import { isLeadId, shortPlace } from "@/lib/leads/model";
import { mapImagePath } from "@/lib/geo/static-map";
import { googleMapsUrl } from "@/lib/geo/request-location";
import { describeDuration } from "@/lib/geo/request-location";

/**
 * THE FULL ENQUIRY, OPENED FROM A TEXT MESSAGE.
 *
 * No login. See lib/leads/model.ts for why, and for what carries the
 * security instead — a sixteen-character id is the credential, and the
 * page is noindex, never linked publicly, and expires with the record.
 *
 * BUILT FOR A PHONE HELD IN ONE HAND, because that is where it is read:
 * Ben gets the text, taps the link, and decides whether to ring now. So
 * the name, the number and the call button are above everything, the call
 * button is the size of a thumb, and the detail is underneath in the order
 * he would ask about it.
 */

export const metadata: Metadata = {
  title: "Lead",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Shape-check before touching storage: a malformed id is a 404, not a
  // lookup, so scanning costs nothing.
  if (!isLeadId(id)) notFound();

  const lead = await getLead(id);
  if (!lead) notFound();

  const place = shortPlace(lead);
  const hasCoords = lead.latitude !== null && lead.longitude !== null;
  const maps = googleMapsUrl({
    city: lead.city,
    region: lead.region,
    country: lead.country,
    latitude: lead.latitude,
    longitude: lead.longitude,
  });
  const timeOnSite = describeDuration(lead.secondsOnSite ?? undefined);
  const when = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(lead.createdISO));

  return (
    <main className="mx-auto min-h-svh max-w-2xl bg-suth-base px-5 pb-20 pt-[max(1.5rem,var(--safe-top))]">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
        [ New lead · {when} ]
      </p>

      <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-4xl">
        {lead.name}
      </h1>

      {place ? (
        <p className="mt-2 text-base text-suth-text-secondary">{place}</p>
      ) : null}

      {/* The one thing this page exists to make easy. */}
      {lead.phone ? (
        <a
          href={`tel:${lead.phone.replace(/\s+/g, "")}`}
          className="mt-6 flex h-16 w-full items-center justify-center gap-3 rounded-pill bg-suth-accent text-lg font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover"
        >
          Call {lead.name.split(" ")[0]} · {lead.phone}
        </a>
      ) : (
        <a
          href={`mailto:${lead.email}`}
          className="mt-6 flex h-16 w-full items-center justify-center rounded-pill bg-suth-accent text-lg font-semibold text-[#0A0A0A]"
        >
          Email {lead.name.split(" ")[0]}
        </a>
      )}

      <a
        href={`mailto:${lead.email}`}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-pill border border-suth-border text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
      >
        {lead.email}
      </a>

      <Section title="What they want">
        <Row label="Route" value={lead.rail} />
        <Row label="Wants" value={lead.wants} />
        <Row label="Ready" value={lead.readiness} />
        <Row label="Goal" value={lead.goal} />
        <Row label="Plan" value={lead.programme} />
        <Row label="Injury" value={lead.injury} />
      </Section>

      <Section title="Where they are">
        {hasCoords && maps ? (
          <a href={maps} className="mt-1 block overflow-hidden rounded-xl border border-suth-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mapImagePath(lead.latitude!, lead.longitude!, 11)}
              alt={`Map showing roughly ${place ?? "their location"}`}
              width={600}
              height={240}
              className="block h-auto w-full"
            />
          </a>
        ) : null}
        <Row label="Roughly" value={place} />
        {maps ? (
          <p className="mt-3">
            <a
              href={maps}
              className="text-sm text-suth-accent underline underline-offset-4"
            >
              Open in Google Maps
            </a>
          </p>
        ) : null}
        <p className="mt-3 text-xs leading-relaxed text-suth-text-tertiary">
          From their IP address, so treat it as a region rather than an
          address. A mobile network can place somebody a long way from where
          they actually are.
        </p>
      </Section>

      <Section title="How they got here">
        <Row label="Landed on" value={lead.landingPath} />
        <Row label="Came via" value={lead.referrer} />
        <Row label="Time on site" value={timeOnSite} />
        <Row
          label="Pages"
          value={lead.pageViews ? String(lead.pageViews) : null}
        />
        <Row label="Enquired from" value={lead.sourcePath} />
      </Section>

      <Section title="Everything they told us">
        <pre className="mt-1 whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-suth-text-secondary">
          {lead.brief}
        </pre>
      </Section>

      <p className="mt-10 text-xs leading-relaxed text-suth-text-tertiary">
        This page is private and unlisted. It expires 90 days after the
        enquiry.
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary">
        {title}
      </h2>
      <dl className="mt-3">{children}</dl>
    </section>
  );
}

/** Renders nothing when there is nothing — an empty row is noise. */
function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-suth-border-subtle py-2.5 last:border-b-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {label}
      </dt>
      <dd className="max-w-[70%] break-words text-right text-sm text-suth-text">
        {value}
      </dd>
    </div>
  );
}
