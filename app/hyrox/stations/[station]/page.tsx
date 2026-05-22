import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
  STATIONS,
  getStation,
  listStationSlugs,
} from "@/lib/hyrox-stations";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listStationSlugs().map((station) => ({ station }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ station: string }>;
}): Promise<Metadata> {
  const { station } = await params;
  const s = getStation(station);
  if (!s) return { title: "Not found" };
  const url = `${siteUrl()}/hyrox/stations/${s.slug}`;
  const title = `Hyrox ${s.name}: technique, splits, and training drills`;
  const description = `${s.summary} Coaching cues, common faults, goal splits, and training drills for the Hyrox ${s.name} station.`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Vyrek",
      type: "article",
      locale: "en_GB",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function StationPage({
  params,
}: {
  params: Promise<{ station: string }>;
}) {
  const { station } = await params;
  const s = getStation(station);
  if (!s) notFound();

  const url = `${siteUrl()}/hyrox/stations/${s.slug}`;

  // BreadcrumbList
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
      { "@type": "ListItem", position: 3, name: s.name, item: url },
    ],
  };

  // HowTo schema — the technique cues become steps.
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to perform the Hyrox ${s.name}`,
    description: s.oneLiner,
    totalTime: "PT5M",
    supply: [
      {
        "@type": "HowToSupply",
        name: `Race weight: ${s.spec.mensOpen} (men's open) · ${s.spec.womensOpen} (women's open)`,
      },
    ],
    step: s.cues.map((cue, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: `Step ${i + 1}`,
      text: cue,
    })),
  };

  // FAQPage schema
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: s.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
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
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <nav
            aria-label="Breadcrumb"
            className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary"
          >
            <Link href="/" className="hover:text-vyrek-text">
              Home
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <Link href="/hyrox/stations" className="hover:text-vyrek-text">
              Stations
            </Link>
            <span aria-hidden className="mx-2">/</span>
            <span className="text-vyrek-text">{s.name}</span>
          </nav>

          <div className="mx-auto max-w-3xl">
            <Eyebrow>Station {String(s.order).padStart(2, "0")} · {s.spec.distance ?? s.spec.reps}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox {s.name}
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              {s.oneLiner}
            </p>

            <div className="mt-6 inline-flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-vyrek-accent/40 bg-vyrek-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-accent">
                Men&apos;s open: {s.spec.mensOpen}
              </span>
              <span className="rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-secondary">
                Women&apos;s open: {s.spec.womensOpen}
              </span>
            </div>
          </div>

          {/* Goal splits */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Goal splits</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              What good looks like.
            </h2>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Sub-60", s.goalSplits.sub60, "Elite"],
                ["Sub-75", s.goalSplits.sub75, "Strong age-group"],
                ["Sub-90", s.goalSplits.sub90, "Solid age-group"],
                ["Finish your first", s.goalSplits.finishFirst, "First-time"],
              ].map(([label, split, sub]) => (
                <div
                  key={label}
                  className="rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4"
                >
                  <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    {label}
                  </dt>
                  <dd className="mt-2 text-2xl font-black tracking-[-0.04em] text-vyrek-text">
                    {split}
                  </dd>
                  <dd className="mt-1 text-xs text-vyrek-text-secondary">
                    {sub}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Cues */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Coaching cues</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              What to think about during the {s.name.toLowerCase()}.
            </h2>
            <ol role="list" className="mt-6 space-y-3">
              {s.cues.map((cue, i) => (
                <li
                  key={i}
                  className="flex gap-4 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                    0{i + 1}
                  </span>
                  <p className="flex-1 text-base leading-relaxed text-vyrek-text">
                    {cue}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          {/* Faults */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Common faults</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              What costs time.
            </h2>
            <ul role="list" className="mt-6 space-y-2 text-base leading-relaxed text-vyrek-text-secondary">
              {s.faults.map((f) => (
                <li key={f} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-vyrek-danger" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Drills */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Training drills</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              What to train this week.
            </h2>
            <ul role="list" className="mt-6 space-y-4">
              {s.drills.map((d) => (
                <li
                  key={d.name}
                  className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5"
                >
                  <p className="text-base font-bold text-vyrek-text">
                    {d.name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-vyrek-text-secondary">
                    {d.detail}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              {s.name} questions.
            </h2>
            <div className="mt-6">
              <Accordion>
                {s.faqs.map((f, i) => (
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

          {/* Next station */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10">
            <Eyebrow>Up next</Eyebrow>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(() => {
                const idx = STATIONS.findIndex((x) => x.slug === s.slug);
                const prev = idx > 0 ? STATIONS[idx - 1] : null;
                const next = idx < STATIONS.length - 1 ? STATIONS[idx + 1] : null;
                return (
                  <>
                    {prev ? (
                      <Link
                        href={`/hyrox/stations/${prev.slug}`}
                        className="lift-on-hover rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                          ← Previous station
                        </p>
                        <p className="mt-2 text-base font-bold text-vyrek-text">
                          {prev.name}
                        </p>
                      </Link>
                    ) : (
                      <span />
                    )}
                    {next ? (
                      <Link
                        href={`/hyrox/stations/${next.slug}`}
                        className="lift-on-hover rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 text-right"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                          Next station →
                        </p>
                        <p className="mt-2 text-base font-bold text-vyrek-text">
                          {next.name}
                        </p>
                      </Link>
                    ) : null}
                  </>
                );
              })()}
            </div>
          </section>

          {/* CTA */}
          <section className="mx-auto mt-16 max-w-3xl border-t border-vyrek-border-subtle pt-10 text-center">
            <Eyebrow>Train it properly</Eyebrow>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Build the {s.name.toLowerCase()} into your plan.
            </h2>
            <p className="mt-4 text-base text-vyrek-text-secondary">
              Vyrek programmes include station-specific drills in every week.
              Three-minute quiz, dated Week 1 before you pay.
            </p>
            <div className="mt-6">
              <CtaButton href="/quiz" size="lg">
                Find your plan →
              </CtaButton>
            </div>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
