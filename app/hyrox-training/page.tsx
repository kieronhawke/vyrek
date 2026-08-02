import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { CtaButton } from "@/components/shared/cta-button";
import { groupLocationsByRegion, regionSlug } from "@/lib/uk-locations";
import { GeoInternational } from "@/components/landing/geo-international";
import { siteUrl } from "@/lib/blog/urls";

export const metadata: Metadata = {
  // See the personal-trainer hub: layout.tsx already appends the brand.
  title: "Hyrox training across the UK",
  description:
    "Personalised Hyrox training programmes across the UK, built by a HYROX Elite 15 athlete. Find your city and see your Week 1 for free.",
  alternates: { canonical: `${siteUrl()}/hyrox-training` },
  // app/layout.tsx defaults to index: false. The detail pages under this hub
  // override it but the hub never did, so it would have stayed out of the
  // index after the switch flipped, orphaning everything it links to.
  robots: { index: true, follow: true },
};

export default function HyroxTrainingHub() {
  const regions = groupLocationsByRegion();
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <header className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
              [ Hyrox training · UK ]
            </p>
            <h1 className="mt-4 text-balance text-[34px] font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-[46px]">
              Hyrox training, wherever you are.
            </h1>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              One programme, personalised to your race, your kit, and your
              city. Pick your area or go straight to the quiz.
            </p>
            <div className="mt-7">
              <CtaButton href="/quiz" size="lg">
                Start the 3-minute quiz
              </CtaButton>
            </div>
          </header>
          <div className="mx-auto mt-16 max-w-4xl space-y-10">
            {/* Top towns per region, then the region page for the rest.
                Listing all 879 here made a 600 KB page with 1,748 links. */}
            {Object.entries(regions).map(([region, locs]) => (
              <section key={region} aria-label={region}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                    [ {region} ]
                  </h2>
                  <Link
                    href={`/hyrox-training/in/${regionSlug(region)}`}
                    className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                  >
                    All {locs.length} in {region} →
                  </Link>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {locs.slice(0, 18).map((l) => (
                    <li key={l.slug}>
                      <Link
                        href={`/hyrox-training/${l.slug}`}
                        className="inline-flex h-10 items-center rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                      >
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <GeoInternational base="/hyrox-training" />
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
