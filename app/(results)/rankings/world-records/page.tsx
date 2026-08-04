import type { Metadata } from "next";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { RecordsBoard } from "@/components/results/rankings/records-board";
import { MicroLabel } from "@/components/results/ui/primitives";
import { Breadcrumbs } from "@/components/results/ui/breadcrumbs";
import { RelatedLinks } from "@/components/results/ui/related-links";
import { ogImages } from "@/lib/seo/og";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "HYROX World Records by Division",
  description:
    "The fastest HYROX time recorded in every division — Open, Pro, Doubles, Relay and "
    + "Adaptive — with the event and athlete behind each one.",
  alternates: { canonical: "/rankings/world-records" },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(), url: `${siteUrl()}/rankings/world-records`, type: "website" },
};

export default async function WorldRecordsPage() {
  const board = await getResultsSource().getRecords();

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <Breadcrumbs trail={[{ name: "Results", path: "/results" }, { name: "Rankings", path: "/rankings" }, { name: "All-time records", path: "/rankings/world-records" }]} />

      <header>
        <MicroLabel>[ ALL-TIME ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Records
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          The fastest time recorded in each division across every event in the dataset.
        </p>
      </header>

      <div className="mt-6">
        <RecordsBoard
          entries={board.entries}
          now={new Date()}
          emptyTitle="No records yet"
          emptyBody="Records appear once events are marked final."
        />
      </div>
      <RelatedLinks
        links={[
          { href: "/rankings/records", label: "National and age-group records" },
          { href: "/rankings/season-bests", label: "This season's bests" },
          { href: "/events", label: "Full race calendar" },
        ]}
      />

    </div>
  );
}
