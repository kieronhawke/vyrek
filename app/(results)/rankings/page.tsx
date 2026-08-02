import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/blog/urls";
import { getResultsSource } from "@/lib/results";
import { formatTime, formatCount } from "@/lib/results/format";
import { MicroLabel } from "@/components/results/ui/primitives";
import { Trophy, CalendarRange } from "lucide-react";

/** `/rankings` — index of the global boards. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "HYROX Rankings: Records, Season Bests & Division Boards | Suth Performance",
  description:
    "Global HYROX rankings — all-time records and current season bests by division, "
    + "with every result linked to its full splits.",
  alternates: { canonical: "/rankings" },
  openGraph: { url: `${siteUrl()}/rankings`, type: "website" },
};

export default async function RankingsIndex() {
  const board = await getResultsSource().getRecords();
  const fastest = board.entries.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-6 md:py-10">
      <header>
        <MicroLabel>[ RANKINGS ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Rankings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-suth-text-secondary">
          The fastest times recorded in each division, and how this season compares.
        </p>
      </header>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <BoardLink
          href="/rankings/world-records"
          icon={<Trophy className="size-5" aria-hidden />}
          title="All-time records"
          detail={`Fastest ever in each of ${formatCount(board.entries.length)} divisions`}
        />
        <BoardLink
          href="/rankings/season-bests"
          icon={<CalendarRange className="size-5" aria-hidden />}
          title="Season bests"
          detail="The quickest times of the current season"
        />
      </div>

      <section className="mt-8" aria-labelledby="fastest">
        <h2 id="fastest" className="mb-3 text-lg font-semibold text-suth-text">
          Fastest times on record
        </h2>
        <ul className="divide-y divide-suth-border-subtle overflow-hidden rounded-md border border-suth-border-subtle">
          {fastest.map((entry) => (
            <li key={entry.divisionCode}>
              <Link
                href={`/athlete/${entry.athleteSlug}`}
                data-inline-tap
                className="flex min-h-[56px] items-center gap-4 bg-suth-elevated px-4 py-2.5
                           transition-colors hover:bg-suth-overlay
                           focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-suth-accent"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-suth-text">{entry.athleteName}</span>
                  <span className="block truncate text-[11px] text-suth-text-tertiary">
                    {entry.divisionLabel.replace("HYROX ", "")} · {entry.eventName}
                  </span>
                </span>
                <span className="results-num shrink-0 text-sm text-suth-accent">
                  {formatTime(entry.finishSeconds)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BoardLink({
  href, icon, title, detail,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-md border border-suth-border-subtle bg-suth-elevated p-4
                 transition-colors hover:border-suth-border-strong
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
    >
      <span className="text-suth-text-tertiary transition-colors group-hover:text-suth-accent">
        {icon}
      </span>
      <h2 className="mt-3 text-sm font-semibold text-suth-text">{title}</h2>
      <p className="mt-1 text-xs text-suth-text-secondary">{detail}</p>
    </Link>
  );
}
