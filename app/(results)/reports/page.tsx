import type { Metadata } from "next";
import Link from "next/link";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { formatCount, formatRelativeDate } from "@/lib/results/format";
import { MicroLabel, EmptyState } from "@/components/results/ui/primitives";
import { AUTOMATED_LABEL } from "@/lib/results/report-generator";
import { Breadcrumbs } from "@/components/results/ui/breadcrumbs";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { ogImages } from "@/lib/seo/og";

/** `/reports` — index of automated race reports. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "HYROX Race Reports",
  description:
    "A report for every finished HYROX event — winners, podiums, the fastest station splits "
    + "of the weekend and standout age-group results.",
  alternates: { canonical: "/reports" },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(), url: `${siteUrl()}/reports`, type: "website" },
};

export default async function ReportsIndex() {
  const events = await getResultsSource().listEvents({ status: "finished" });
  const now = new Date();

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <Breadcrumbs trail={[{ name: "Results", path: "/results" }, { name: "Race reports", path: "/reports" }]} />

      <header>
        <MicroLabel>[ REPORTS ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          Race reports
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          One per finished event, written the moment results go final.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
          {AUTOMATED_LABEL}
        </p>
      </header>

      <div className="mt-6">
        {events.length === 0 ? (
          <EmptyState
            title="No reports yet"
            body="A report is generated as soon as an event is marked final."
          />
        ) : (
          <ul className="divide-y divide-suth-border-subtle overflow-hidden rounded-md border border-suth-border-subtle">
            {events.map((event) => (
              <li key={event.slug}>
                <Link
                  href={`/reports/${event.slug}`}
                  data-inline-tap
                  className="flex min-h-[64px] items-center justify-between gap-4 bg-suth-elevated
                             px-4 py-3 transition-colors hover:bg-suth-overlay
                             focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-suth-accent"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-suth-text">{event.name}</span>
                    <span className="block text-[11px] text-suth-text-tertiary">
                      {formatCount(event.totalAthletes)} athletes ·{" "}
                      {formatRelativeDate(event.startDate, now, String(event.year))}
                    </span>
                  </span>
                  <span aria-hidden className="shrink-0 text-suth-accent">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <RelatedLinks
        links={[
          { href: "/events", label: "Full race calendar" },
          { href: "/rankings/records", label: "The record book" },
          { href: "/results/city", label: "Results by city" },
        ]}
      />

    </div>
  );
}
