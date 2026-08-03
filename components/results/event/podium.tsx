import Link from "next/link";
import { Time, Delta, MicroLabel, Nationality } from "../ui/primitives";
import { RankMark } from "../ui/rank-mark";
import type { RankingRow } from "@/lib/results/source";

/**
 * Podium module for a headline division.
 *
 * The first version of this card showed the winner and nothing else, which
 * left two thirds of it empty and told the reader less than the row on the
 * division list below. A real top three fills the space and answers the
 * question people actually arrive with: who won, and by how much.
 */
export function PodiumCard({
  divisionLabel, eventSlug, divisionCode, rows,
}: {
  divisionLabel: string;
  eventSlug: string;
  divisionCode: string;
  rows: RankingRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <MicroLabel>{divisionLabel.replace("HYROX ", "")}</MicroLabel>

      <ol className="mt-3 space-y-2.5">
        {rows.slice(0, 3).map((row, i) => (
          <li key={row.id} className="flex items-baseline gap-2.5">
            <RankMark rank={row.rank} />
            <Nationality iso={row.countryIso} />
            <Link
              href={`/result/${row.id}`}
              data-inline-tap
              className="min-w-0 flex-1 truncate text-sm leading-5 text-suth-text hover:text-suth-accent
                         focus-visible:outline-2 focus-visible:outline-suth-accent"
            >
              {row.athleteName}
            </Link>
            <Time
              seconds={row.finishSeconds}
              className={i === 0 ? "shrink-0 text-lg text-suth-accent" : "shrink-0 text-sm"}
            />
            {i > 0 ? (
              <Delta seconds={row.gapToLeaderSeconds} className="w-14 shrink-0 text-right text-[11px]" />
            ) : (
              <span className="w-14 shrink-0" aria-hidden />
            )}
          </li>
        ))}
      </ol>

      <Link
        href={`/ranking/${eventSlug}-${divisionCode}`}
        data-inline-tap
        className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.16em]
                   text-suth-text-tertiary hover:text-suth-accent
                   focus-visible:outline-2 focus-visible:outline-suth-accent"
      >
        Full ranking →
      </Link>
    </div>
  );
}
