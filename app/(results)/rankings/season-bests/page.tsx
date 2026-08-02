import type { Metadata } from "next";
import { getResultsSource } from "@/lib/results";
import { siteUrl } from "@/lib/blog/urls";
import { RecordsBoard } from "@/components/results/rankings/records-board";
import { MicroLabel } from "@/components/results/ui/primitives";
import type { RecordEntry } from "@/lib/results/source";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Fastest HYROX Times This Season | Suth Performance",
  description:
    "The quickest HYROX time in every division this season, with the event and athlete "
    + "behind each one.",
  alternates: { canonical: "/rankings/season-bests" },
  openGraph: { url: `${siteUrl()}/rankings/season-bests`, type: "website" },
};

export default async function SeasonBestsPage() {
  const source = getResultsSource();
  const events = await source.listEvents({ status: "finished" });

  // Latest season present in the data, so this stays correct as seasons roll.
  const season = events.map((e) => e.season).sort().at(-1);
  const inSeason = new Set(events.filter((e) => e.season === season).map((e) => e.slug));

  const board = await source.getRecords();
  const entries: RecordEntry[] = board.entries.filter((e) => inSeason.has(e.eventSlug));

  return (
    <div className="mx-auto max-w-[900px] px-5 py-6 md:py-10">
      <header>
        <MicroLabel>[ {season ? season.toUpperCase() : "SEASON"} ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          Season bests
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          The fastest time in each division this season.
        </p>
      </header>

      <div className="mt-6">
        <RecordsBoard
          entries={entries}
          now={new Date()}
          emptyTitle="Nothing recorded this season yet"
          emptyBody="Season bests fill in as events finish."
        />
      </div>
    </div>
  );
}
