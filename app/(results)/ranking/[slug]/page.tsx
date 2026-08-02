import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getResultsSource } from "@/lib/results";
import { parseRankingSlug, buildRankingSlug } from "@/lib/results/slugs";
import { siteUrl } from "@/lib/blog/urls";
import { formatCount } from "@/lib/results/format";
import { RankingTable } from "@/components/results/ranking/ranking-table";
import { DivisionTabs } from "@/components/results/ranking/division-tabs";
import { StatusBadge, MicroLabel, StatTile } from "@/components/results/ui/primitives";
import { CoachingCta } from "@/components/results/coaching-cta";
import type { CompactRow } from "@/app/api/results/ranking/[slug]/route";

/**
 * `/ranking/{event}-{division}` — the full division leaderboard.
 *
 * The first 100 rows server-render so the page is indexable and useful without
 * JavaScript; the table then loads the rest and takes over sorting, filtering
 * and windowing locally.
 */

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseRankingSlug(slug);
  if (!parsed) return { title: "Ranking not found | Suth Performance" };

  const source = getResultsSource();
  const [event, page] = await Promise.all([
    source.getEvent(parsed.eventSlug),
    source.getRanking(parsed.eventSlug, parsed.division, { limit: 1 }),
  ]);
  if (!event || !page) return { title: "Ranking not found | Suth Performance" };

  const division = page.divisionLabel.replace("HYROX ", "");
  return {
    title: `HYROX ${event.city} ${event.year} ${division}: Full Results & Rankings`,
    description:
      `Every ${division} result from HYROX ${event.city} ${event.year} — `
      + `${formatCount(page.fieldSize)} finishers with full splits, gaps and age-group ranks.`,
    alternates: { canonical: `/ranking/${slug}` },
    openGraph: { url: `${siteUrl()}/ranking/${slug}`, type: "website" },
  };
}

export default async function RankingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parsed = parseRankingSlug(slug);
  if (!parsed) notFound();

  const source = getResultsSource();
  const [event, page] = await Promise.all([
    source.getEvent(parsed.eventSlug),
    source.getRanking(parsed.eventSlug, parsed.division, { limit: 100 }),
  ]);
  if (!event || !page) notFound();

  const initialRows: CompactRow[] = page.rows.map((r) => [
    r.id, r.rank, r.ageGroupRank, r.athleteName, r.countryIso, r.ageGroup, r.finishSeconds,
  ]);

  const divisionLabel = page.divisionLabel.replace("HYROX ", "");
  const medianSeconds = page.rows.length > 0
    ? page.rows[Math.floor(page.rows.length / 2)].finishSeconds
    : 0;

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li>
            <Link href={`/event/${event.slug}`} className="hover:text-suth-accent">
              {event.city} {event.year}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">{divisionLabel}</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-black tracking-[-0.02em] text-suth-text md:text-3xl">
              HYROX {event.city} {event.year} · {divisionLabel}
            </h1>
            <StatusBadge status={event.status} />
          </div>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            {formatCount(page.fieldSize)} finishers. Tap any row for splits against the division
            average.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Winner" value={<TimeText seconds={page.leaderTimeSeconds} />} tone="accent" />
          <StatTile label="Median" value={<TimeText seconds={medianSeconds} />} />
        </div>
      </header>

      <div className="mt-5">
        <MicroLabel>Switch division</MicroLabel>
        <DivisionTabs
          className="mt-1.5"
          eventSlug={event.slug}
          activeDivision={parsed.division}
          divisions={event.divisions.map((d) => ({
            code: d.divisionCode,
            label: d.label.replace("HYROX ", ""),
            href: `/ranking/${buildRankingSlug(event.slug, d.divisionCode)}`,
            count: d.finisherCount ?? d.athleteCount,
          }))}
        />
      </div>

      <div className="mt-5">
        <RankingTable
          slug={slug}
          initialRows={initialRows}
          leaderTimeSeconds={page.leaderTimeSeconds}
          fieldSize={page.fieldSize}
        />
      </div>

      <CoachingCta
        className="mt-8"
        headline={`Racing ${divisionLabel}?`}
        body="Every row here is a race someone paced. Build the next block around where yours actually went, not a template."
      />
    </div>
  );
}

/** Server-side time text, so the stat tiles do not need the client Time component. */
function TimeText({ seconds }: { seconds: number }) {
  if (!seconds) return <>—</>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return <>{h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`}</>;
}
