import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { groupLocationsByRegion, regionSlug, getLocationBySlug } from "@/lib/uk-locations";
import { RACE_CITY_SLUGS } from "@/lib/locations/seo";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox training. UK cities and boroughs",
  description:
    "HYROX programmes for every UK city and London borough. Personalised twelve-week plans built by an Elite 15 coach, dated to your race.",
  alternates: { canonical: `${siteUrl()}/hyrox` },
  openGraph: {
    title: "Hyrox training across the UK. Suth Performance",
    description:
      "Find personalised Hyrox training programmes for every UK city. Built by an Elite 15 coach. Free trial.",
    url: `${siteUrl()}/hyrox`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: "/media/images/track/programme-first-race.jpg",
        width: 1200,
        height: 630,
        alt: "Hyrox athlete training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hyrox training across the UK. Suth Performance",
    description:
      "Personalised 12-week Hyrox plans for every UK city.",
    images: ["/media/images/track/programme-first-race.jpg"],
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
    itemListElement: Object.values(grouped)
      .flat()
      .map((loc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        // The coaching page is the one that renders for every town; only the
        // five race cities keep a /hyrox/{city} URL.
        url: `${siteUrl()}/hyrox-training/${loc.slug}`,
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
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Hyrox training, anywhere in the UK.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              Suth Performance programmes are designed for your city, your equipment, and
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
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-5 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
              >
                Browse programmes
              </Link>
            </div>
          </div>

          {/* Only five cities keep a /hyrox/{city} page; the rest of the 879
              towns redirect to their coaching page, so linking them all from
              here was 879 links straight into a 308. Race cities directly,
              everything else via the region directories. */}
          <section className="mx-auto mt-20 max-w-5xl border-t border-suth-border-subtle pt-12">
            <Eyebrow>Race cities</Eyebrow>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.04em] text-suth-text md:text-3xl">
              Where the UK races happen.
            </h2>
            <ul role="list" className="mt-8 flex flex-wrap gap-2.5">
              {RACE_CITY_SLUGS.map((slug) => {
                const loc = getLocationBySlug(slug);
                if (!loc) return null;
                return (
                  <li key={slug}>
                    <Link
                      href={`/hyrox/${slug}`}
                      className="inline-flex h-11 items-center rounded-pill border border-suth-border bg-suth-elevated px-5 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                    >
                      Hyrox {loc.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-14 text-2xl font-black leading-tight tracking-[-0.04em] text-suth-text md:text-3xl">
              Training in your town.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-suth-text-secondary">
              {total} towns and cities across the UK, each with its nearest race
              venue and the measured 5 km courses closest to it.
            </p>
            <ul role="list" className="mt-6 flex flex-wrap gap-2.5">
              {regions.map((region) => (
                <li key={region}>
                  <Link
                    href={`/hyrox-training/in/${regionSlug(region)}`}
                    className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                  >
                    {region}
                    <span className="ml-2 font-mono text-[11px] tabular-nums text-suth-text-tertiary">
                      {grouped[region].length}
                    </span>
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
