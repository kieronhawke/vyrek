import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/blog/urls";
import { collectRecordCandidates, RECORD_DEPTH } from "@/lib/results/records-source";
import {
  worldRecords,
  nationalRecords,
  ageGroupRecords,
  countriesWithRecords,
  freshRecords,
  NEW_RECORD_DAYS,
  isBlueRiband,
} from "@/lib/results/records";
import { breadcrumbList, jsonLd } from "@/lib/results/structured-data";
import { formatCount, countryName } from "@/lib/results/format";
import { RecordTable } from "@/components/results/rankings/record-table";
import { BlueRiband } from "@/components/results/rankings/blue-riband";
import { RecordBanner } from "@/components/results/rankings/record-banner";
import { FaqSection } from "@/components/results/ui/faq-section";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { MicroLabel, StatTile, Nationality } from "@/components/results/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * `/rankings/records` — the whole record book.
 *
 * World records, national records for every country that holds one, and every
 * division-and-age-group mark. It rebuilds from published results on every
 * revalidation, so a record set on Saturday is on this page — and announced at
 * the top of it — without anyone editing anything.
 */

export const revalidate = 1800;

/** Which national books get their own section, in order. */
const FEATURED_NATIONS = ["gb", "ie"];

export const metadata: Metadata = {
  title: "HYROX Records: World, National, Age Group",
  description:
    "The complete HYROX record book — world records in every division, national "
    + "records by country and every age-group mark, with what each one beat.",
  alternates: { canonical: "/rankings/records" },
  openGraph: {
    url: `${siteUrl()}/rankings/records`,
    type: "website",
    // These are the pages that travel: someone finds a record or a
    // report and sends the link on. A shared link with no card is a
    // link people scroll past.
    images: [{ url: "/media/images/track/og-default.jpg", width: 1200, height: 630, alt: "HYROX athletes racing" }],
  },
  twitter: { card: "summary_large_image", images: ["/media/images/track/og-default.jpg"] },
};

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country = "" } = await searchParams;
  const candidates = await collectRecordCandidates();
  const now = new Date();

  const world = worldRecords(candidates);
  const ageGroups = ageGroupRecords(candidates);
  const nations = countriesWithRecords(candidates);

  // A country picked from the URL wins; otherwise the featured ones that
  // actually have data. Filters are links, so every combination is a real URL.
  const selectedIso = country.toLowerCase();
  const nationalIsos = selectedIso
    ? [selectedIso]
    : FEATURED_NATIONS.filter((iso) => nations.includes(iso));

  const nationalBooks = nationalIsos.map((iso) => ({
    iso,
    name: countryName(iso) ?? iso.toUpperCase(),
    rows: nationalRecords(candidates, iso),
  })).filter((book) => book.rows.length > 0);

  // Freshness is judged across every scope, so a new age-group mark is
  // announced too — but a world record outranks it in the banner.
  const fresh = freshRecords([...world, ...ageGroups, ...nationalBooks.flatMap((b) => b.rows)], now)
    .sort((a, b) => scopeWeight(a.scope) - scopeWeight(b.scope)
      || (b.holder.date || "").localeCompare(a.holder.date || ""));

  const crumbsLd = breadcrumbList(siteUrl(), [
    { name: "Results", path: "/results" },
    { name: "Rankings", path: "/rankings" },
    { name: "Records", path: "/rankings/records" },
  ]);

  const datasetLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${siteUrl()}/rankings/records#dataset`,
    name: "HYROX record book",
    description:
      `Fastest recorded HYROX times: ${world.length} world records, `
      + `${ageGroups.length} age-group records and national records across `
      + `${nations.length} countries.`,
    url: `${siteUrl()}/rankings/records`,
    creator: { "@type": "Organization", name: "Suth Performance", url: siteUrl() },
    isAccessibleForFree: true,
  };

  const faqs = [
    {
      q: "What is the HYROX world record?",
      a: world.length
        ? `The fastest HYROX Men time in our records is held by `
          + `${world.find((r) => r.divisionCode === "hyrox-men")?.holder.athleteName ?? "—"}. `
          + `Every division has its own record, and all of them are listed on this page with `
          + `the athlete, the race and what the mark beat.`
        : "Records appear here as soon as results are published.",
    },
    {
      q: "How often are these records updated?",
      a: "They are recomputed from published results every half hour, so a record set at a "
        + "weekend race appears here without anyone editing anything. A record set in the last "
        + `${NEW_RECORD_DAYS} days is flagged as new and announced at the top of the page.`,
    },
    {
      q: "How is a national record decided?",
      a: `By the nationality on the athlete's own result, so a British athlete setting their `
        + `fastest time at a race in Germany still sets a British record. We read the top `
        + `${RECORD_DEPTH} finishers in every division at every race, which covers any time `
        + `that would be recognised as a record.`,
    },
    {
      q: "Are age-group records separate from the overall record?",
      a: "Yes. Each division has an overall record and a record for every age group within it, "
        + "so a 45-49 athlete is measured against their own bracket rather than against the "
        + "outright fastest time in the field.",
    },
  ];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(datasetLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbsLd) }} />

      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          <li><Link href="/results" className="hover:text-suth-accent">Results</Link></li>
          <li aria-hidden>/</li>
          <li><Link href="/rankings" className="hover:text-suth-accent">Rankings</Link></li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-suth-text-secondary">Records</li>
        </ol>
      </nav>

      <header className="mt-3">
        <MicroLabel>[ THE RECORD BOOK ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Records
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
          Every fastest time we hold — world, national and age group — with the athlete, the
          race, and what each mark beat. Rebuilt from published results every half hour, so a
          record set this weekend is here without anyone touching it.
        </p>
      </header>

      {fresh.length > 0 ? (
        <div className="mt-6">
          <RecordBanner rows={fresh} countryName={countryName(fresh[0].countryIso ?? "") ?? undefined} />
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="World records" value={String(world.length)} sub="one per division" />
        <StatTile label="Age-group records" value={String(ageGroups.length)} />
        <StatTile label="Countries holding records" value={String(nations.length)} />
        <StatTile
          label="Set recently"
          value={String(fresh.length)}
          sub={`last ${NEW_RECORD_DAYS} days`}
          tone={fresh.length > 0 ? "accent" : "default"}
        />
      </div>

      {/*
        ── World ───────────────────────────────────────────────────────
        Split in two. Sixteen identically-weighted cards in alphabetical order
        opened the record book on Adaptive Men and gave the fastest HYROX ever
        run exactly the same presentation as everything else — which is what
        made the page read as a list rather than a record book.

        The two outright bests come out into their own block; the remaining
        fourteen keep the existing card but now arrive in significance order
        (see `divisionRank`) rather than alphabetically.
      */}
      <BlueRiband rows={world.filter((r) => isBlueRiband(r.divisionCode))} now={now} />

      <section className="mt-12" aria-labelledby="world-heading">
        <h2 id="world-heading" className="text-lg font-semibold text-suth-text">
          Every division
        </h2>
        <p className="mb-4 mt-1 text-sm text-suth-text-secondary">
          The fastest time ever recorded in each division, anywhere.
        </p>
        <RecordTable
          rows={world.filter((r) => !isBlueRiband(r.divisionCode))}
          now={now}
          emptyTitle="No world records yet"
          emptyBody="Records appear as soon as a race is marked final."
        />
      </section>

      {/* ── National ──────────────────────────────────────────────── */}
      <section className="mt-12" aria-labelledby="national-heading">
        <h2 id="national-heading" className="text-lg font-semibold text-suth-text">
          National records
        </h2>
        <p className="mb-3 mt-1 text-sm text-suth-text-secondary">
          The fastest athlete of each nationality, in each division — wherever in the world they
          set it.
        </p>

        {nations.length > 1 ? (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="w-full font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary sm:w-auto">
              Country
            </span>
            <CountryChip href="/rankings/records" label="Featured" active={!selectedIso} />
            {nations.slice(0, 14).map((iso) => (
              <CountryChip
                key={iso}
                href={`/rankings/records?country=${iso}`}
                label={countryName(iso) ?? iso.toUpperCase()}
                iso={iso}
                active={selectedIso === iso}
              />
            ))}
          </div>
        ) : null}

        {nationalBooks.length === 0 ? (
          <RecordTable
            rows={[]}
            now={now}
            emptyTitle="No records for that country"
            emptyBody="Pick another country, or clear the filter to see the featured books."
          />
        ) : (
          <div className="space-y-8">
            {nationalBooks.map((book) => (
              <div key={book.iso}>
                <h3 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  <Nationality iso={book.iso} />
                  {book.name} records
                  {/* `text-suth-text-disabled` (#555553) is 2.9:1 on this surface and
                      fails AA. It is a count, not decoration — somebody scanning
                      the record book uses it to see which divisions are populated. */}
                  <span className="text-suth-text-tertiary">· {book.rows.length}</span>
                </h3>
                <RecordTable
                  rows={book.rows}
                  now={now}
                  showCountry={false}
                  emptyTitle="None yet"
                  emptyBody="Records appear as results publish."
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Age groups ────────────────────────────────────────────── */}
      <section className="mt-12" aria-labelledby="age-heading">
        <h2 id="age-heading" className="text-lg font-semibold text-suth-text">
          Age-group records
        </h2>
        <p className="mb-4 mt-1 text-sm text-suth-text-secondary">
          Every division broken down by bracket — {formatCount(ageGroups.length)} marks in all.
        </p>
        <RecordTable
          rows={ageGroups}
          now={now}
          showAgeGroup
          emptyTitle="No age-group records yet"
          emptyBody="These build as results publish."
        />
      </section>

      <FaqSection faqs={faqs} title="About these records" />

      <p className="mt-8 text-xs leading-relaxed text-suth-text-tertiary">
        Method: computed from the top {RECORD_DEPTH} finishers in every division at every race
        we hold, recomputed every half hour. A record with no published date is never flagged as
        new — we would rather show nothing than put an old mark under a fresh banner.
      </p>

      <RelatedLinks
        links={[
          { href: "/rankings/season-bests", label: "This season's bests" },
          { href: "/results/course-index", label: "Which courses run slowest" },
          { href: "/results/city", label: "Results by city" },
          { href: "/tools/good-hyrox-time", label: "Is my time good?" },
        ]}
      />
    </div>
  );
}

function scopeWeight(scope: string): number {
  return scope === "world" ? 0 : scope === "national" ? 1 : 2;
}

function CountryChip({
  href, label, iso, active,
}: {
  href: string;
  label: string;
  iso?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex min-h-[36px] items-center gap-1.5 rounded-pill border px-3 text-xs transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
        active
          ? "border-suth-accent bg-suth-accent/10 text-suth-accent"
          : "border-suth-border-subtle text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text",
      )}
    >
      {iso ? <Nationality iso={iso} /> : null}
      {label}
    </Link>
  );
}
