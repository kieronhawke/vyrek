import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { groupLocationsByRegion } from "@/lib/uk-locations";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox training. UK cities and boroughs",
  description:
    "Vyrek Hyrox programmes for every UK city and London borough. Personalised 12-week plans built by an Elite 15 coach. Find your local Hyrox training in three minutes.",
  alternates: { canonical: `${siteUrl()}/hyrox` },
  openGraph: {
    title: "Hyrox training across the UK. Vyrek",
    description:
      "Find personalised Hyrox training programmes for every UK city. Built by an Elite 15 coach. Free trial.",
    url: `${siteUrl()}/hyrox`,
    siteName: "Vyrek",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/media/images/v2/programme-first-race.jpg",
        width: 1200,
        height: 630,
        alt: "Hyrox athlete training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyrox training across the UK. Vyrek",
    description:
      "Personalised 12-week Hyrox plans for every UK city.",
    images: ["/media/images/v2/programme-first-race.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function HyroxLocationsPage() {
  const grouped = groupLocationsByRegion();
  const regions = Object.keys(grouped).sort();
  const total = Object.values(grouped).reduce((n, list) => n + list.length, 0);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hyrox locations",
        item: `${siteUrl()}/hyrox`,
      },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Hyrox training locations across the UK",
    numberOfItems: total,
    itemListElement: Object.values(grouped).flat().map((loc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl()}/hyrox/${loc.slug}`,
        name: `Hyrox training in ${loc.name}`,
      })),
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
            <Eyebrow>Locations</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox training, anywhere in the UK.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Vyrek programmes are designed for your city, your equipment, and
              your race date. Find your local landing page below, or skip
              straight to the quiz and we&apos;ll build your Week 1 in three
              minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
              <Link
                href="/programmes"
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
              >
                Browse programmes
              </Link>
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl border-t border-vyrek-border-subtle pt-12">
            <Eyebrow>{total} UK locations</Eyebrow>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Pick your city or borough.
            </h2>
            <div className="mt-10 space-y-12">
              {regions.map((region) => (
                <div key={region}>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                    {region}
                  </h3>
                  <ul
                    role="list"
                    className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                  >
                    {grouped[region].map((loc) => (
                      <li key={loc.slug}>
                        <Link
                          href={`/hyrox/${loc.slug}`}
                          className="block py-1.5 text-sm text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
                        >
                          {loc.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
