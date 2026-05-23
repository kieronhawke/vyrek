import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getEvent,
  listEventSlugs,
  HYROX_EVENTS,
} from "@/lib/hyrox-events";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listEventSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) return { title: "Not found" };
  const url = `${siteUrl()}/hyrox/events/${e.slug}`;
  const title = `${e.name}, venue, logistics, 12-week prep`;
  const description = `Everything you need for ${e.name}: ${e.venue.name} logistics, divisions, transport, hotels, and a 12-week training prep window.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Vyrek",
      type: "website",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) notFound();

  const url = `${siteUrl()}/hyrox/events/${e.slug}`;

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: e.name,
    description: e.about,
    startDate: e.startDate,
    endDate: e.endDate,
    eventStatus: e.past
      ? "https://schema.org/EventScheduled": "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: e.venue.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: e.venue.addressLine,
        addressLocality: e.venue.city,
        postalCode: e.venue.postcode,
        addressRegion: e.venue.region,
        addressCountry: e.venue.countryCode,
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Hyrox",
      url: "https://hyrox.com",
    },
    url,
    image: `${siteUrl()}/icon-512.png`,
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: e.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hyrox events",
        item: `${siteUrl()}/hyrox/events`,
      },
      { "@type": "ListItem", position: 3, name: e.name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary"
          >
            <Link href="/" className="hover:text-vyrek-text">Home</Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/hyrox/events" className="hover:text-vyrek-text">Events</Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-vyrek-text">{e.eyebrow}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>{e.eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              {e.name}
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              {e.about}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-vyrek-accent/40 bg-vyrek-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-accent">
                {format(new Date(e.startDate), "EEE d MMM yyyy")}
                {e.endDate !== e.startDate
                  ? `, ${format(new Date(e.endDate), "EEE d MMM yyyy")}`: ""}
              </span>
              <span className="rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-secondary">
                {e.venue.name}, {e.venue.city}
              </span>
            </div>
          </div>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Venue + logistics</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Getting to {e.venue.name}.
            </h2>
            <address className="mt-4 text-base not-italic leading-relaxed text-vyrek-text-secondary md:text-lg">
              {e.venue.addressLine}
              <br />
              {e.venue.city} {e.venue.postcode}
              {e.venue.googleMapsUrl ? (
                <>
                  <br />
                  <a
                    href={e.venue.googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-vyrek-text underline decoration-vyrek-accent underline-offset-4 hover:decoration-2"
                  >
                    Open in Google Maps ↗
                  </a>
                </>
              ): null}
            </address>
            <ul role="list" className="mt-6 space-y-2 text-base leading-relaxed text-vyrek-text-secondary">
              {e.logistics.map((l) => (
                <li key={l} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-accent" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Divisions</Eyebrow>
            <ul role="list" className="mt-4 flex flex-wrap gap-2">
              {e.divisions.map((d) => (
                <li
                  key={d}
                  className="rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 py-1.5 text-sm text-vyrek-text"
                >
                  {d}
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Train backwards from this date</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              When to start training.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              {e.prepWindow}
            </p>
            <div className="mt-6">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
            </div>
          </section>

          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>FAQs</Eyebrow>
            <div className="mt-6">
              <Accordion>
                {e.faqs.map((f, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="border-b border-vyrek-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-medium text-vyrek-text hover:no-underline md:text-lg">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-base leading-relaxed text-vyrek-text-secondary">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>

          {/* Related events */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Other UK Hyrox events</Eyebrow>
            <ul role="list" className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {HYROX_EVENTS.filter((x) => x.slug !== e.slug).map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/hyrox/events/${x.slug}`}
                    className="block rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4 transition-colors hover:border-vyrek-border-strong"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {x.eyebrow}
                    </p>
                    <p className="mt-1 text-sm font-medium text-vyrek-text">
                      {x.name}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
