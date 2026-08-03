import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { citySlug } from "@/lib/results/city";
import {
  courseBaseline, rateCourses, describeRating,
  type EditionSample, type CourseRating,
} from "@/lib/results/course-index";
import { breadcrumbList, jsonLd } from "@/lib/results/structured-data";
import { formatTime, formatCount } from "@/lib/results/format";
import { FaqSection } from "@/components/results/ui/faq-section";
import { MicroLabel, StatTile, Nationality, EmptyState } from "@/components/results/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * `/results/course-index` — which HYROX venues actually run slow.
 *
 * Nobody publishes this, because answering it requires joining the results of
 * every venue to every other. Athletes argue about it constantly. That
 * combination — high demand, real data barrier — is the whole reason this page
 * is worth building, and it is the one page here a competitor cannot copy
 * without the same corpus underneath it.
 *
 * The method, its limits, and why two columns rather than one are documented in
 * `lib/results/course-index.ts`. The short version: a median is a fact about
 * who entered as much as about the course, so the winner's time is shown beside
 * it and the page says plainly which pattern means what.
 */

export const revalidate = 86400;

const REFERENCE_DIVISION = "hyrox-men";

/**
 * How many editions to sample.
 *
 * One `getDivisionFinishTimes` call each, issued in bounded batches. Sixty is
 * comfortably enough for a stable pooled baseline and keeps a cold render to a
 * few seconds; with `revalidate` at a day, that cost is paid once.
 */
const MAX_EDITIONS = 60;
const BATCH = 8;

async function loadSamples(): Promise<EditionSample[]> {
  const source = getResultsSource();
  // No catch: an outage must surface as a 500, not as an empty state that
  // claims there is no data. A catalogue that is genuinely still filling up
  // returns an empty array *successfully*, and that case still renders the
  // empty state below — so nothing is lost by letting a real failure through.
  const events = (await source.listEvents())
    .filter((e) => e.status === "finished" && e.totalAthletes > 0)
    .sort((a, b) => (b.startDate || String(b.year)).localeCompare(a.startDate || String(a.year)))
    .slice(0, MAX_EDITIONS);

  const samples: EditionSample[] = [];
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH);
    const times = await Promise.all(
      batch.map((e) =>
        source.getDivisionFinishTimes(e.slug, REFERENCE_DIVISION).catch(() => [] as number[]),
      ),
    );
    batch.forEach((event, j) => {
      const finishTimes = times[j].filter((t) => t > 0);
      if (finishTimes.length === 0) return;
      samples.push({
        eventSlug: event.slug, eventName: event.name, city: event.city,
        citySlug: citySlug(event.city), country: event.country,
        countryIso: event.countryIso, venue: event.venue,
        season: event.season, year: event.year, finishTimes,
      });
    });
  }
  return samples;
}

export const metadata: Metadata = {
  title: "HYROX Course Speed Index: Which Races Run Slowest",
  description:
    "Every HYROX venue ranked by how fast its field actually ran. Median and "
    + "winning finish times measured against the global pool, so you can see "
    + "which courses cost time and which are quick. Free race analytics.",
  alternates: { canonical: "/results/course-index" },
  openGraph: { url: `${siteUrl()}/results/course-index`, type: "website" },
};

export default async function CourseIndexPage() {
  const samples = await loadSamples();
  const baseline = courseBaseline(samples);
  const ratings = rateCourses(samples, baseline);

  const slowest = ratings[0] ?? null;
  const fastest = ratings[ratings.length - 1] ?? null;
  const courseSignals = ratings.filter((r) => r.signal === "course");

  const faqs: { q: string; a: string }[] = [];
  if (slowest && fastest && ratings.length > 2) {
    faqs.push({
      q: "Which HYROX race is the hardest?",
      a: `By finish time, ${slowest.eventName} is the slowest of the `
        + `${ratings.length} editions measured — its field ran `
        + `${Math.abs(slowest.medianIndex)}% ${slowest.medianIndex > 0 ? "slower" : "faster"} `
        + `than the pooled median. ${describeRating(slowest)}`,
    });
    faqs.push({
      q: "Which HYROX race is the fastest?",
      a: `${fastest.eventName} posted the quickest field of those measured, `
        + `${Math.abs(fastest.medianIndex)}% ${fastest.medianIndex < 0 ? "faster" : "slower"} `
        + `than the pooled median, with a winning time of `
        + `${formatTime(fastest.winnerSeconds)}.`,
    });
  }
  faqs.push({
    q: "Are all HYROX races the same distance?",
    a: "Yes. Every HYROX race is eight 1km runs and the same eight stations at "
      + "the same weights, so a finish time means the same thing wherever it was "
      + "set. What differs is the building: roxzone length, lap layout, floor "
      + "surface and hall temperature all move the clock without changing the "
      + "workout. This page measures that difference rather than assuming it away.",
  });
  faqs.push({
    q: "How is the course speed index calculated?",
    a: "For each edition we take the HYROX Men field's median finish and the "
      + "winner's time, then express both as a percentage against the same two "
      + "statistics pooled across every edition measured. The pool is a median of "
      + "per-edition medians, so a single huge race cannot define what normal "
      + "means. Fields under 100 finishers are excluded as too small to be stable.",
  });
  faqs.push({
    q: "Does a slow median mean the course was hard?",
    a: "Not on its own — a median reflects who entered as much as where they "
      + "raced. That is why the winning time is shown beside it. When the front "
      + "of the field and the middle both move the same way, the venue is the "
      + "likelier explanation. When only the median moves, the entry list is.",
  });

  const crumbsLd = breadcrumbList(siteUrl(), [
    { name: "Results", path: "/results" },
    { name: "Course speed index", path: "/results/course-index" },
  ]);

  // A ranked table of measurements is a dataset, and saying so is a rich-result
  // route the competitor leaves entirely unused.
  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${siteUrl()}/results/course-index#dataset`,
    name: "HYROX course speed index",
    description:
      `Median and winning HYROX finish times for ${ratings.length} race editions, `
      + `each indexed against the pooled global median for the same division.`,
    url: `${siteUrl()}/results/course-index`,
    creator: { "@type": "Organization", name: "Suth Performance", url: siteUrl() },
    isAccessibleForFree: true,
    variableMeasured: [
      { "@type": "PropertyValue", name: "Median finish time", unitText: "seconds" },
      { "@type": "PropertyValue", name: "Winning finish time", unitText: "seconds" },
      { "@type": "PropertyValue", name: "Speed index vs pooled median", unitText: "percent" },
    ],
  };

  return (
    <div className="mx-auto max-w-[1400px] px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(datasetLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">Course speed index</li>
        </ol>
      </nav>

      <header className="mt-3">
        <MicroLabel>[ ANALYTICS ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Course Speed Index
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
          Every HYROX race is the same eight runs and the same eight stations —
          and every athlete who has raced more than one venue knows they do not
          feel the same. This ranks{" "}
          {ratings.length === 0
            ? "every measured edition"
            : ratings.length === 1
              ? "one edition"
              : `${ratings.length} editions`}{" "}
          by how fast its field actually ran, measured against the global pool.
        </p>
      </header>

      {ratings.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Not enough finished races yet"
            body="The index needs finished editions with at least 100 finishers in the reference division. It fills in as results are ingested."
            action={<Link href="/events" className="text-sm text-suth-accent underline">See the calendar</Link>}
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Editions measured" value={String(ratings.length)} />
            <StatTile
              label="Pooled median"
              value={formatTime(baseline.medianSeconds)}
              sub="HYROX Men"
            />
            <StatTile
              label="Slowest course"
              value={slowest ? `+${slowest.medianIndex}%` : "—"}
              sub={slowest?.city}
            />
            <StatTile
              label="Fastest course"
              value={fastest ? `${fastest.medianIndex}%` : "—"}
              sub={fastest?.city}
              tone="accent"
            />
          </div>

          <section className="mt-8" aria-labelledby="how-heading">
            <h2
              id="how-heading"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
            >
              How to read this
            </h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <ReadingNote
                signal="course"
                title="Both columns moved"
                body="The winner and the median ran slow together. The front of the field is
                      the part least sensitive to who else entered, so when it agrees with the
                      middle, the venue is the likelier explanation."
              />
              <ReadingNote
                signal="field"
                title="Only the median moved"
                body="A slow middle with a normal winning time is what a shallower entry list
                      looks like — a first-time host city, or a date with no championship
                      qualifying on the line."
              />
              <ReadingNote
                signal="par"
                title="Neither moved"
                body="Within 1.5% of the pool on both measures — roughly a minute either way
                      on a ninety-minute race, which is inside the noise. An ordinary race."
              />
            </div>
          </section>

          <section className="mt-8" aria-labelledby="table-heading">
            <h2
              id="table-heading"
              className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
            >
              Every measured edition, slowest first
            </h2>

            <div className="overflow-x-auto rounded-md border border-suth-border-subtle">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <caption className="sr-only">
                  HYROX editions ranked by field median finish time against the pooled global median
                </caption>
                <thead>
                  <tr className="border-b border-suth-border-subtle bg-suth-elevated text-left">
                    <Th className="w-10">#</Th>
                    <Th>Race</Th>
                    <Th className="text-right">Field</Th>
                    <Th className="text-right">Median</Th>
                    <Th className="text-right">vs pool</Th>
                    <Th className="text-right">Winner</Th>
                    <Th className="text-right">vs pool</Th>
                    <Th>Signal</Th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((rating, i) => (
                    <tr
                      key={rating.eventSlug}
                      className="border-b border-suth-border-subtle last:border-0 hover:bg-suth-overlay"
                    >
                      <Td className="results-num text-suth-text-tertiary">{i + 1}</Td>
                      <Td>
                        <Link
                          href={`/event/${rating.eventSlug}`}
                          data-inline-tap
                          className="font-semibold text-suth-text hover:text-suth-accent"
                        >
                          {rating.eventName}
                        </Link>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-suth-text-tertiary">
                          <Nationality iso={rating.countryIso} />
                          <Link
                            href={`/results/city/${rating.citySlug}`}
                            data-inline-tap
                            className="hover:text-suth-accent"
                          >
                            {rating.city}
                          </Link>
                          {rating.venue ? <>· {rating.venue}</> : null}
                        </span>
                      </Td>
                      <Td className="results-num text-right text-suth-text-tertiary">
                        {formatCount(rating.fieldSize)}
                      </Td>
                      <Td className="results-num text-right text-suth-text-secondary">
                        {formatTime(rating.medianSeconds)}
                      </Td>
                      <Td className="text-right">
                        <IndexCell value={rating.medianIndex} />
                      </Td>
                      <Td className="results-num text-right text-suth-text-secondary">
                        {formatTime(rating.winnerSeconds)}
                      </Td>
                      <Td className="text-right">
                        <IndexCell value={rating.winnerIndex} />
                      </Td>
                      <Td>
                        <SignalPill signal={rating.signal} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 max-w-3xl text-xs leading-relaxed text-suth-text-tertiary">
              HYROX Men only, fields of 100+ finishers, {ratings.length} editions
              pooled from the {MAX_EDITIONS} most recent races with published
              results. Positive means slower than the pool. A median describes who
              entered as much as where they raced, which is why the winning time is
              measured beside it —{" "}
              {courseSignals.length > 0
                ? `${courseSignals.length} of these editions show both moving together.`
                : "no edition here shows both moving together."}
            </p>
          </section>

          {slowest && slowest.signal === "course" ? (
            <section className="mt-8" aria-labelledby="verdict-heading">
              <h2
                id="verdict-heading"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary"
              >
                The standout
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
                {describeRating(slowest)}
              </p>
            </section>
          ) : null}
        </>
      )}

      <FaqSection faqs={faqs} title="Course speed: common questions" />

      <nav className="mt-10 border-t border-suth-border-subtle pt-5" aria-label="Related">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
          Keep going
        </h2>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <li><Link href="/results/city" className="text-suth-accent hover:underline">Results by city</Link></li>
          <li><Link href="/tools/good-hyrox-time" className="text-suth-accent hover:underline">Is my HYROX time good?</Link></li>
          <li><Link href="/simulator" className="text-suth-accent hover:underline">Race time simulator</Link></li>
          <li><Link href="/rankings/world-records" className="text-suth-accent hover:underline">World records</Link></li>
        </ul>
      </nav>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-suth-text-tertiary",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

/** A signed percentage. Slower is the warning direction, faster is the accent. */
function IndexCell({ value }: { value: number }) {
  if (value === 0) {
    return <span className="results-num text-suth-text-tertiary">—</span>;
  }
  return (
    <span
      className={cn(
        "results-num",
        value > 0 ? "text-suth-warning" : "text-suth-accent",
      )}
    >
      {value > 0 ? "+" : ""}{value}%
    </span>
  );
}

const SIGNAL_TEXT: Record<CourseRating["signal"], string> = {
  course: "Course",
  field: "Field",
  par: "Par",
};

function SignalPill({ signal }: { signal: CourseRating["signal"] }) {
  return (
    <span
      className={cn(
        "inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        signal === "course"
          ? "border-suth-warning/40 text-suth-warning"
          : signal === "field"
            ? "border-suth-border text-suth-text-secondary"
            : "border-suth-border-subtle text-suth-text-tertiary",
      )}
    >
      {SIGNAL_TEXT[signal]}
    </span>
  );
}

function ReadingNote({
  signal, title, body,
}: {
  signal: CourseRating["signal"];
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-3">
      <div className="flex items-center gap-2">
        <SignalPill signal={signal} />
        <span className="text-sm font-semibold text-suth-text">{title}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-suth-text-secondary">{body}</p>
    </div>
  );
}
