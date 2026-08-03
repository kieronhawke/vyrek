import Link from "next/link";
import { formatTime, formatRelativeDate } from "@/lib/results/format";
import { Nationality, MicroLabel, EmptyState } from "../ui/primitives";
import { RankMark } from "../ui/rank-mark";
import type { RecordEntry } from "@/lib/results/source";

/**
 * A records board.
 *
 * The reference site's records page is a flat list of names and times. This
 * groups by division so a reader can find their own without scanning, and
 * every row routes onward — to the athlete, and to the event where it was set.
 * No dead ends (REFS.md §3).
 */
export function RecordsBoard({
  entries, emptyTitle, emptyBody, now,
}: {
  entries: RecordEntry[];
  emptyTitle: string;
  emptyBody: string;
  now: Date;
}) {
  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry, i) => (
        <li
          key={`${entry.divisionCode}-${entry.athleteSlug}`}
          className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <MicroLabel>{entry.divisionLabel.replace("HYROX ", "")}</MicroLabel>
            <span className="flex items-center gap-1.5 text-[11px] text-suth-text-tertiary">
              <RankMark rank={i + 1} />
              fastest
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="flex min-w-0 items-center gap-2">
              <Nationality iso={entry.countryIso} />
              <Link
                href={`/athlete/${entry.athleteSlug}`}
                data-inline-tap
                className="truncate text-base font-semibold text-suth-text hover:text-suth-accent
                           focus-visible:outline-2 focus-visible:outline-suth-accent"
              >
                {entry.athleteName}
              </Link>
            </span>
            <span className="results-num shrink-0 text-2xl text-suth-accent">
              {formatTime(entry.finishSeconds)}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] text-suth-text-tertiary">
            <Link
              href={`/event/${entry.eventSlug}`}
              data-inline-tap
              className="hover:text-suth-accent focus-visible:outline-2 focus-visible:outline-suth-accent"
            >
              {entry.eventName}
            </Link>
            {" · "}
            <time dateTime={entry.date}>{formatRelativeDate(entry.date, now)}</time>
          </p>
        </li>
      ))}
    </ul>
  );
}
