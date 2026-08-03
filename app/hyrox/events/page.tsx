import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { RaceCard } from "@/components/hyrox/race-card";
import { homeRaces, upcoming } from "@/lib/hyrox/races";
import { siteUrl } from "@/lib/blog/urls";

/**
 * The HYROX race calendar — every upcoming race, from HYROX's own pages.
 *
 * This page listed four races with invented dates. It now lists the real
 * calendar, grouped so a UK athlete finds their race first: home races, then
 * everything else by continent.
 */
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HYROX race calendar: dates and venues",
  description:
    "Every upcoming HYROX race with a confirmed date and venue: ExCeL London, the NEC, Manchester Central, the SEC and Cardiff, plus the international calendar.",
  alternates: { canonical: `${siteUrl()}/hyrox/events` },
  robots: { index: true, follow: true },
};

export default function EventsIndex() {
  const races = upcoming();
  const home = homeRaces();
  const homeSlugs = new Set(home.map((r) => r.slug));
  const abroad = races.filter((r) => !homeSlugs.has(r.slug));

  const byContinent = abroad.reduce<Record<string, typeof abroad>>((acc, r) => {
    const key = r.continent ?? "Elsewhere";
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "HYROX race calendar",
    numberOfItems: races.length,
    itemListElement: races.slice(0, 50).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/hyrox/events/${r.slug}`,
      name: r.name,
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
            <Eyebrow>Race calendar</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Find your race.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              Every upcoming HYROX race with a confirmed date and venue, read
              from HYROX&apos;s own event pages. {races.length} races,{" "}
              {home.length} of them in the UK and Ireland. Pick one and we will
              tell you when a twelve-week build has to start.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="md">
                Build a plan for your race →
              </CtaButton>
            </div>
          </div>

          <section className="mx-auto mt-14 max-w-5xl">
            <h2 className="mb-3 text-xl font-black tracking-[-0.03em] text-suth-text">
              UK &amp; Ireland{" "}
              <span className="text-suth-text-tertiary">({home.length})</span>
            </h2>
            <ul role="list" className="race-grid">
              {home.map((race) => (
                <li key={race.slug}>
                  <RaceCard race={race} />
                </li>
              ))}
            </ul>
          </section>

          {Object.entries(byContinent)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([continent, list]) => (
              <section key={continent} className="mx-auto mt-12 max-w-5xl">
                <h2 className="mb-3 text-xl font-black tracking-[-0.03em] text-suth-text">
                  {continent}{" "}
                  <span className="text-suth-text-tertiary">
                    ({list.length})
                  </span>
                </h2>
                <ul role="list" className="race-grid">
                  {list.map((race) => (
                    <li key={race.slug}>
                      <RaceCard race={race} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

          <p className="mx-auto mt-12 max-w-3xl text-sm text-suth-text-secondary">
            Dates and venues are read from{" "}
            <Link
              href="https://hyrox.com/find-my-race/"
              rel="nofollow"
              /* Underlined: inside a paragraph, colour alone is not a
                 sufficient cue (WCAG 1.4.1). */
              className="text-suth-accent underline underline-offset-4"
            >
              hyrox.com
            </Link>
            . Always check the official page before booking travel.
          </p>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
