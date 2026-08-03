import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { GeoSeo } from "@/lib/locations/seo";
import type { LocalisedCopy } from "@/lib/i18n/de";
import type { LocaleConfig } from "@/lib/i18n/config";

/**
 * The localised location page.
 *
 * A separate template from the English one on purpose. Retrofitting i18n into
 * `geo-landing.tsx` would mean extracting ~100 inline strings from a 700-line
 * component that two other lanes also touch, and the result would still be
 * translated English rather than German copy.
 *
 * This is shorter than the English page, and that is deliberate. It carries
 * the sections that survive the language barrier and earn the click — the
 * named gyms, the real race, the honest cost argument — and drops the ones
 * that are brand storytelling written for a UK reader.
 *
 * The data layer is shared: same `GeoSeo`, same gyms, same race calendar. Only
 * the words change, which is why one copy pack localises an entire market.
 */
export function LocalisedGeoPage({
  copy,
  locale,
  city,
  country,
  seo,
  englishHref,
  nearby,
}: {
  copy: LocalisedCopy;
  locale: LocaleConfig;
  city: string;
  country: string;
  seo: GeoSeo;
  /** The English equivalent, for the reader and for hreflang. */
  englishHref: string;
  nearby: { slug: string; name: string; km: number }[];
}) {
  const faqs = copy.faqs(city, seo);
  const note = copy.languageNote(englishHref);

  return (
    <>
      <MarketingNav />
      <main>
        <section
          aria-labelledby="geo-hero-heading"
          className="border-b border-suth-border-subtle"
        >
          <Container>
            <div className="mx-auto max-w-3xl pb-14 pt-32 md:pb-20 md:pt-36">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                [ {copy.eyebrow(city, country)} ]
              </p>
              <SplitHeading
                as="h1"
                id="geo-hero-heading"
                className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[44px] lg:text-[52px]"
              >
                {copy.h1(city)}
              </SplitHeading>
              <p className="mt-6 text-base leading-relaxed text-suth-text-secondary md:text-lg">
                {copy.sub(city, seo)}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <CtaButton href="/quiz" size="md">
                  {copy.ctaPrimary}
                </CtaButton>
                <Link
                  href="/free-consultation"
                  className="inline-flex h-12 items-center rounded-pill border border-suth-border bg-suth-elevated px-5 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                >
                  {copy.ctaSecondary}
                </Link>
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                {copy.ctaNote}
              </p>
              {/* The funnel beyond this page is still English. Saying so here
                  is more honest than letting a reader discover it at the quiz,
                  and it doubles as the hreflang partner link for a human. */}
              <p className="mt-6 text-sm text-suth-text-tertiary">
                {note.text}{" "}
                <Link
                  href={englishHref}
                  hrefLang="en"
                  className="text-suth-accent underline decoration-suth-accent/40 underline-offset-4"
                >
                  {note.linkText}
                </Link>
              </p>
            </div>
          </Container>
        </section>

        {seo.nearestRace ? (
          <section
            aria-labelledby="geo-race-heading"
            className="border-b border-suth-border-subtle py-14 md:py-20"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="geo-race-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ {copy.raceHeading} ]
                </h2>
                <p className="mt-4 text-2xl font-black leading-tight tracking-[-0.025em] text-suth-text">
                  {seo.nearestRace.venue}
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  {seo.nearestRace.city} ·{" "}
                  {new Date(`${seo.nearestRace.startDate}T00:00:00Z`).toLocaleDateString(
                    locale.hreflang,
                    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
                  )}
                </p>
                <p className="mt-5 text-sm leading-relaxed text-suth-text-secondary">
                  {seo.hostsRace
                    ? copy.raceHosts(city)
                    : copy.raceNear(
                        city,
                        seo.nearestRace.city,
                        seo.nearestRace.straightLineKm,
                      )}
                </p>
                <p className="mt-5 text-[11px] leading-relaxed text-suth-text-tertiary">
                  {copy.raceCaveat}
                </p>
              </div>
            </Container>
          </section>
        ) : null}

        {seo.gyms.length ? (
          <section
            aria-labelledby="geo-gyms-heading"
            className="border-b border-suth-border-subtle py-14 md:py-20"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="geo-gyms-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ {copy.gymsHeading(city)} ]
                </h2>
                <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                  {copy.gymsIntro(city, seo.gyms.length)}
                </p>
                <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
                  {seo.gyms.slice(0, 14).map((g) => (
                    <li key={g.name} className="text-sm text-suth-text-secondary">
                      {g.name}
                    </li>
                  ))}
                </ul>
                <p className="mt-7 text-[11px] leading-relaxed text-suth-text-tertiary">
                  {copy.gymsAttribution}
                </p>
              </div>
            </Container>
          </section>
        ) : null}

        <section
          aria-labelledby="geo-faq-heading"
          className="border-b border-suth-border-subtle py-14 md:py-20"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <h2
                id="geo-faq-heading"
                className="text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl"
              >
                {copy.faqHeading(city)}
              </h2>
              <Accordion className="mt-8 w-full">
                {faqs.map((f, i) => (
                  <AccordionItem
                    key={f.q}
                    value={`faq-${i}`}
                    className="border-b border-suth-border-subtle last:border-b-0"
                  >
                    <AccordionTrigger className="text-left text-base font-semibold text-suth-text">
                      {f.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-suth-text-secondary">
                      {f.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Container>
        </section>

        {nearby.length ? (
          <section
            aria-labelledby="geo-nearby-heading"
            className="border-b border-suth-border-subtle py-14 md:py-16"
          >
            <Container>
              <div className="mx-auto max-w-3xl">
                <h2
                  id="geo-nearby-heading"
                  className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
                >
                  [ {copy.nearbyHeading(city)} ]
                </h2>
                <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
                  {copy.nearbyIntro(country)}
                </p>
                <ul className="mt-5 flex flex-wrap gap-2.5">
                  {nearby.map((n) => (
                    <li key={n.slug}>
                      <Link
                        href={`/${locale.code}/hyrox-training/${n.slug}`}
                        className="inline-flex h-10 items-center gap-2 rounded-pill border border-suth-border bg-suth-elevated px-4 text-sm font-medium text-suth-text transition-colors hover:border-suth-border-strong"
                      >
                        {n.name}
                        <span className="font-mono text-[10px] tabular-nums text-suth-text-tertiary">
                          {n.km} km
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Container>
          </section>
        ) : null}

        <section className="py-16 md:py-24">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-black tracking-[-0.03em] text-suth-text md:text-4xl">
                {copy.closingHeading}
              </h2>
              <p className="mt-4 text-base text-suth-text-secondary md:text-lg">
                {copy.closingSub}
              </p>
              <div className="mt-8">
                <CtaButton href="/quiz" size="lg">
                  {copy.ctaPrimary}
                </CtaButton>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
