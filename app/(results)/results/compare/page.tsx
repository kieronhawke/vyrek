import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { STATION_IDS, STATION_LABEL } from "@/lib/results/model";
import { formatTime, formatSplit, formatOrdinal } from "@/lib/results/format";
import { MicroLabel, Delta, Nationality, EmptyState } from "@/components/results/ui/primitives";
import { ComparePicker } from "@/components/results/compare/compare-picker";
import { CumulativeGap } from "@/components/results/compare/cumulative-gap";
import type { ResultDetail } from "@/lib/results/source";
import { Breadcrumbs } from "@/components/results/ui/breadcrumbs";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { ogImages } from "@/lib/seo/og";

/**
 * `/compare` — two athletes, side by side.
 *
 * The reference site compares career averages. Averages hide the thing you
 * want: *where* the race was won. This compares two specific races segment by
 * segment and draws the cumulative gap, so the moment one pulled away is
 * visible rather than inferred.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Compare HYROX Athletes & Races",
  description:
    "Put two HYROX races side by side — segment by segment, with a cumulative gap chart "
    + "showing exactly where the race was won.",
  alternates: { canonical: "/results/compare" },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(), url: `${siteUrl()}/results/compare`, type: "website" },
};

/** Most recent finished race for an athlete, which is what people mean by "their race". */
async function latestResult(slug: string): Promise<ResultDetail | null> {
  const source = getResultsSource();
  const athlete = await source.getAthlete(slug);
  if (!athlete) return null;
  const finished = athlete.races
    .filter((r) => r.finishSeconds > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (finished.length === 0) return null;
  return source.getResult(finished[0].resultId);
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const [left, right] = await Promise.all([
    a ? latestResult(a) : Promise.resolve(null),
    b ? latestResult(b) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <Breadcrumbs trail={[{ name: "Results", path: "/results" }, { name: "Compare", path: "/results/compare" }]} />

      <header>
        <MicroLabel>[ COMPARE ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          Where the race was won
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          Two races, segment by segment. The cumulative gap shows the exact point one pulled away.
        </p>
      </header>

      <div className="mt-6">
        <ComparePicker initialA={a ?? ""} initialB={b ?? ""} />
      </div>

      {!left || !right ? (
        <div className="mt-8">
          <EmptyState
            headingLevel={2}
            title={a || b ? "Pick a second athlete" : "Pick two athletes"}
            body="Search above, or open any athlete profile and press Compare."
            action={
              <Link href="/results" className="text-sm text-suth-accent underline">
                Browse results
              </Link>
            }
          />
        </div>
      ) : (
        <Comparison left={left} right={right} />
      )}
      <RelatedLinks
        links={[
          { href: "/tools/good-hyrox-time", label: "Is my time good?" },
          { href: "/simulator", label: "Model your next race" },
          { href: "/rankings/records", label: "The record book" },
        ]}
      />

    </div>
  );
}

function Comparison({ left, right }: { left: ResultDetail; right: ResultDetail }) {
  const segments = STATION_IDS.flatMap((station, i) => [
    {
      key: `run-${i + 1}`,
      label: `Run ${i + 1}`,
      a: left.runs[i] ?? 0,
      b: right.runs[i] ?? 0,
    },
    {
      key: station,
      label: STATION_LABEL[station],
      a: left.stations[station] ?? 0,
      b: right.stations[station] ?? 0,
    },
  ]);
  segments.push({
    key: "roxzone",
    label: "Roxzone",
    a: left.roxzoneSeconds,
    b: right.roxzoneSeconds,
  });

  const totalDelta = left.finishSeconds - right.finishSeconds;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <AthleteColumn result={left} />
        <AthleteColumn result={right} align="right" />
      </div>

      <div className="mt-4 rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <MicroLabel>[ CUMULATIVE GAP ]</MicroLabel>
          <span className="text-[11px] text-suth-text-tertiary">
            Above the line, {left.athleteName.split(" ")[0]} is ahead
          </span>
        </div>
        <CumulativeGap
          segments={segments}
          leftName={left.athleteName}
          rightName={right.athleteName}
        />
      </div>

      <section className="mt-4 overflow-hidden rounded-md border border-suth-border-subtle">
        <div className="flex items-center gap-3 bg-suth-overlay px-4 py-2">
          <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            Segment
          </span>
          <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            {left.athleteName.split(" ")[0]}
          </span>
          <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            {right.athleteName.split(" ")[0]}
          </span>
          <span className="w-16 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            Diff
          </span>
        </div>
        <ul className="divide-y divide-suth-border-subtle">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-3 bg-suth-elevated px-4 py-2">
              <span className="flex-1 truncate text-xs text-suth-text-secondary">
                {segment.label}
              </span>
              <span className="results-num w-20 text-right text-xs text-suth-text">
                {formatSplit(segment.a)}
              </span>
              <span className="results-num w-20 text-right text-xs text-suth-text">
                {formatSplit(segment.b)}
              </span>
              <Delta seconds={segment.a - segment.b} className="w-16 text-right text-[11px]" />
            </li>
          ))}
          <li className="flex items-center gap-3 bg-suth-overlay px-4 py-2.5">
            <span className="flex-1 text-xs font-semibold text-suth-text">Finish</span>
            <span className="results-num w-20 text-right text-xs text-suth-text">
              {formatTime(left.finishSeconds)}
            </span>
            <span className="results-num w-20 text-right text-xs text-suth-text">
              {formatTime(right.finishSeconds)}
            </span>
            <Delta seconds={totalDelta} className="w-16 text-right text-[11px]" />
          </li>
        </ul>
      </section>
    </>
  );
}

function AthleteColumn({
  result, align = "left",
}: {
  result: ResultDetail;
  align?: "left" | "right";
}) {
  return (
    <div
      className={
        "rounded-md border border-suth-border-subtle bg-suth-elevated p-4 "
        + (align === "right" ? "text-right" : "")
      }
    >
      <div
        className={
          "flex items-center gap-2 " + (align === "right" ? "justify-end" : "")
        }
      >
        <Nationality iso={result.countryIso} />
        <Link
          href={`/athlete/${result.athleteSlug}`}
          data-inline-tap
          className="truncate text-sm font-semibold text-suth-text hover:text-suth-accent
                     focus-visible:outline-2 focus-visible:outline-suth-accent"
        >
          {result.athleteName}
        </Link>
      </div>
      <p className="results-num mt-2 text-2xl text-suth-accent">
        {formatTime(result.finishSeconds)}
      </p>
      <p className="mt-1 text-[11px] text-suth-text-tertiary">
        {result.eventName} · {result.divisionLabel.replace("HYROX ", "")}
      </p>
      <p className="results-num mt-0.5 text-[11px] text-suth-text-secondary">
        {formatOrdinal(result.rank)} of {result.fieldSize.toLocaleString("en-GB")}
      </p>
    </div>
  );
}
