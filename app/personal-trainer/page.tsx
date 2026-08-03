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
  // app/layout.tsx appends " · Suth Performance". Naming it here too
  // rendered "… · Suth Performance · Suth Performance" and ate 20
  // characters of a title that has to fit in about 65.
  title: "Online personal training across the UK",
  description:
    "Online personal training from a HYROX Elite 15 athlete. Weekly programming that adapts to you, anywhere in the UK. Starts with a free consultation.",
  alternates: { canonical: `${siteUrl()}/personal-trainer` },
  // See the note on the /hyrox-training hub: the layout defaults to
  // index: false and this hub never overrode it.
  robots: { index: true, follow: true },
};

export default function PersonalTrainerHub() {
  const regions = groupLocationsByRegion();
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <header className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
              [ Personal training · UK ]
            </p>
            <h1 className="mt-4 text-balance text-[34px] font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-[46px]">
              A personal trainer in your pocket.
            </h1>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              Personalised programming from a HYROX Elite 15 athlete, at a
              fraction of local PT rates. Pick your area or go straight to
              the quiz.
            </p>
            {/* `rail=beginner` runs the fitness flow rather than the HYROX
                one. Someone looking for a personal trainer has already told
                us what they want by being on this page, and the old link
                dropped them into a quiz that asked their race time. */}
            <div className="mt-7">
              <CtaButton href="/quiz?rail=beginner" size="lg">
                Build my free plan
              </CtaButton>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                3 minutes · Free · No card
              </p>
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
                    href={`/personal-trainer/in/${regionSlug(region)}`}
                    className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                  >
                    All {locs.length} in {region} →
                  </Link>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2.5">
                  {locs.slice(0, 18).map((l) => (
                    <li key={l.slug}>
                      <Link
                        href={`/personal-trainer/${l.slug}`}
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
          <GeoInternational base="/personal-trainer" />
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
