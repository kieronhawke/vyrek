import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { HYROX_EVENTS } from "@/lib/hyrox-events";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox UK events, race calendar, venues, prep windows",
  description:
    "Hyrox UK race calendar: ExCeL London, Manchester Central, NEC Birmingham, OVO Hydro Glasgow. Venue logistics, divisions, and when to start your 12-week build.",
  alternates: { canonical: `${siteUrl()}/hyrox/events` },
  robots: { index: true, follow: true },
};

export default function EventsIndex() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hyrox UK race events",
    numberOfItems: HYROX_EVENTS.length,
    itemListElement: HYROX_EVENTS.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/hyrox/events/${e.slug}`,
      name: e.name,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Events</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox UK race calendar.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Every UK Hyrox race weekend with venue logistics, divisions, and
              the date your 12-week build should start.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
            </div>
          </div>

          <ul role="list" className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {HYROX_EVENTS.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/hyrox/events/${e.slug}`}
                  className="lift-on-hover shimmer block h-full rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <Eyebrow>{e.eyebrow}</Eyebrow>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                      {format(new Date(e.startDate), "MMM yyyy")}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                    {e.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                    {e.about}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                    Venue + logistics →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
