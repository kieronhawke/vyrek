import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { STATIONS } from "@/lib/hyrox-stations";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "The 8 HYROX stations: technique and splits",
  description:
    "All eight HYROX stations explained: coaching cues, common faults, goal splits and training drills, from the official 26/27 movement standards.",
  alternates: { canonical: `${siteUrl()}/hyrox/stations` },
  openGraph: {
    title: "The 8 Hyrox stations. Suth Performance technique guides",
    description:
      "Station-by-station coaching for every Hyrox race element. Built by an Elite 15 coach.",
    url: `${siteUrl()}/hyrox/stations`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
    /*
      Shared when somebody sends a station guide to a training partner, which
      is most of how these pages travel. Without it the link arrives as a bare
      grey rectangle in WhatsApp and gets scrolled past.
    */
    images: [{ url: "/media/images/track/og-default.jpg", width: 1200, height: 630, alt: "HYROX athletes racing" }],
  },
  /*
    ⚠️ Inconsistent with the rest of the site, and inert only by accident.

    Every other page inherits `robots: { index: false }` from the root layout
    under a stated pre-launch rule. These two station routes declare the
    opposite. Right now it makes no difference, because the `X-Robots-Tag`
    header in next.config.ts overrides all per-page metadata — but that header
    is described in its own comment as the single line to remove at launch, and
    the moment it goes these become the only indexable pages on the site while
    everything else stays blocked.

    Left as-is rather than flipped: opening or closing indexing is explicitly
    Kieron's call. Flagged here so whoever removes that header sees this too.
  */
  robots: { index: true, follow: true },
};

export default function StationsIndex() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "The 8 Hyrox stations",
    numberOfItems: STATIONS.length,
    itemListElement: STATIONS.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/hyrox/stations/${s.slug}`,
      name: `Hyrox ${s.name}`,
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
        name: "Hyrox stations",
        item: `${siteUrl()}/hyrox/stations`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Stations</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              The 8 Hyrox stations, decoded.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              Every Hyrox race is the same eight stations in the same order,
              separated by eight 1 km runs. Get each one right and the race
              gets honest. Get them wrong and the back half collapses.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <ol role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {STATIONS.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/hyrox/stations/${s.slug}`}
                    className="lift-on-hover shimmer block h-full rounded-lg border border-suth-border bg-suth-elevated p-6"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="shrink-0 whitespace-nowrap">
                        <Eyebrow>
                          Station {String(s.order).padStart(2, "0")}
                        </Eyebrow>
                      </span>
                      <span className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                        {s.spec.distance ?? s.spec.reps}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-suth-text">
                      {s.name}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-suth-text-secondary">
                      {s.summary}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-suth-accent">
                      Read the guide →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
