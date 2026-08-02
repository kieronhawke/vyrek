import type { Metadata } from "next";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { RecordsBoard } from "@/components/results/rankings/records-board";
import { MicroLabel } from "@/components/results/ui/primitives";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "HYROX World Records by Division | Suth Performance",
  description:
    "The fastest HYROX time recorded in every division — Open, Pro, Doubles, Relay and "
    + "Adaptive — with the event and athlete behind each one.",
  alternates: { canonical: "/rankings/world-records" },
  openGraph: { url: `${siteUrl()}/rankings/world-records`, type: "website" },
};

export default async function WorldRecordsPage() {
  const board = await getResultsSource().getRecords();

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:py-10">
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
    </div>
  );
}
