import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { buildReportInput } from "@/lib/results/build-report-input";
import { generateRaceReport, AUTOMATED_LABEL } from "@/lib/results/report-generator";
import { buildRankingSlug } from "@/lib/results/slugs";
import { formatTime, formatCount } from "@/lib/results/format";
import { MicroLabel, Nationality, StatTile } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";

/**
 * `/reports/{event}` — the automated race report.
 *
 * Every sentence on this page is generated from race data by a pure function.
 * The label at the top says so, plainly, before anything else.
 *
 * There is a "Ben's Take" slot below the generated content. It renders only
 * when a human has written something for this specific event, and there is no
 * AI-assist button attached to it — house policy (brief §2). Right now nothing
 * is written for any event, so the slot never appears.
 */

export const revalidate = 3600;

/** Human-written takes, keyed by event slug. Empty by design. */
const HUMAN_TAKES: Record<string, string> = {};

export async function generateStaticParams() {
  const events = await getResultsSource().listEvents({ status: "finished" });
  return events.map((e) => ({ event: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ event: string }>;
}): Promise<Metadata> {
  const { event: slug } = await params;
  const event = await getResultsSource().getEvent(slug);
  if (!event) return { title: "Report not found | Suth Performance" };

  return {
    title: `HYROX ${event.city} ${event.year} Race Report: Winners, Records & Standout Times`,
    description:
      `Who won what at HYROX ${event.city} ${event.year}, the fastest station splits of the `
      + `weekend, and the standout age-group results — generated from the full results data.`,
    alternates: { canonical: `/reports/${slug}` },
    openGraph: {
      title: `HYROX ${event.city} ${event.year} race report`,
      url: `${siteUrl()}/reports/${slug}`,
      type: "article",
      images: [{ url: `${siteUrl()}/api/og/event/${slug}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [`${siteUrl()}/api/og/event/${slug}`] },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ event: string }> }) {
  const { event: slug } = await params;
  const input = await buildReportInput(slug);
  if (!input) notFound();

  const report = generateRaceReport(input);
  const humanTake = HUMAN_TAKES[slug];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.headline,
    datePublished: input.startDate,
    url: `${siteUrl()}/reports/${slug}`,
    author: { "@type": "Organization", name: "Suth Performance" },
    publisher: { "@type": "Organization", name: "Suth Performance" },
  };

  return (
    <article className="mx-auto max-w-[820px] px-5 py-6 md:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/event/${slug}`} className="hover:text-suth-accent">
              {input.eventCity} {input.year}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">Report</li>
        </ol>
      </nav>

      {/* The label goes first. Nobody should have to scroll to learn this was
          not written by a person. */}
      <p className="rounded-sm border border-suth-border bg-suth-elevated px-3 py-2
                    font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
        {AUTOMATED_LABEL}
      </p>

      <header className="mt-4">
        <h1 className="text-2xl font-black leading-tight tracking-[-0.02em] text-suth-text md:text-4xl">
          {report.headline}
        </h1>
        <p className="mt-3 text-sm text-suth-text-secondary md:text-base">{report.standfirst}</p>
      </header>

      {report.statOfTheRace ? (
        <div className="mt-6">
          <StatTile
            label={report.statOfTheRace.label}
            value={report.statOfTheRace.value}
            sub={report.statOfTheRace.detail}
            tone="accent"
          />
        </div>
      ) : null}

      {report.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="text-lg font-semibold text-suth-text">{section.heading}</h2>
          <div className="mt-2 space-y-2">
            {section.paragraphs.map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-suth-text-secondary">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-suth-text">Podiums</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {report.podiums.filter((d) => d.headline).map((division) => (
            <div
              key={division.divisionCode}
              className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4"
            >
              <MicroLabel>{division.label.replace("HYROX ", "")}</MicroLabel>
              <ol className="mt-2 space-y-1.5">
                {division.podium.map((entry) => (
                  <li key={entry.resultId} className="flex items-baseline gap-2.5 text-xs">
                    <span className="results-num w-3 text-suth-text-tertiary">{entry.rank}</span>
                    <Nationality iso={entry.countryIso} />
                    <Link
                      href={`/result/${entry.resultId}`}
                      data-inline-tap
                      className="min-w-0 flex-1 truncate text-suth-text hover:text-suth-accent
                                 focus-visible:outline-2 focus-visible:outline-suth-accent"
                    >
                      {entry.athleteName}
                    </Link>
                    <span className="results-num shrink-0 text-suth-accent">
                      {formatTime(entry.finishSeconds)}
                    </span>
                  </li>
                ))}
              </ol>
              <Link
                href={`/ranking/${buildRankingSlug(slug, division.divisionCode)}`}
                data-inline-tap
                className="mt-2.5 inline-block font-mono text-[10px] uppercase tracking-[0.16em]
                           text-suth-text-tertiary hover:text-suth-accent
                           focus-visible:outline-2 focus-visible:outline-suth-accent"
              >
                All {formatCount(division.finisherCount)} results →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Human-content slot. Renders only when someone has actually written
          something. Never auto-filled. */}
      {humanTake ? (
        <section className="mt-10 rounded-md border border-suth-accent/25 bg-suth-accent/[0.04] p-5">
          <MicroLabel className="text-suth-accent">[ BEN&apos;S TAKE ]</MicroLabel>
          <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">{humanTake}</p>
          <p className="mt-3 text-[11px] text-suth-text-tertiary">
            Benjamin Sutherland, Elite 15
          </p>
        </section>
      ) : null}

      <CoachingCta
        className="mt-10"
        headline={`Racing ${input.eventCity} next season?`}
        body="These are the times to beat. A plan built around this course starts with knowing where yours went."
      />
    </article>
  );
}
