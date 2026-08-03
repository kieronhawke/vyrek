import Link from "next/link";
import { Trophy } from "lucide-react";
import type { RecordRow } from "@/lib/results/records";
import { daysSince, isFresh } from "@/lib/results/records";
import { formatTime, formatSplit, formatRelativeDate } from "@/lib/results/format";
import { Nationality, MicroLabel, EmptyState } from "@/components/results/ui/primitives";
import { cn } from "@/lib/utils";

/**
 * The record book, rendered.
 *
 * A record is meant to be *celebrated*, which a plain table does not do — so
 * the mark itself is set at display size, the holder is named before anything
 * else, and what the record beat sits underneath as the story rather than as a
 * footnote. A freshly set record carries a marker, because the moment a record
 * falls is the only time most people look at a record book at all.
 */
export function RecordTable({
  rows, now, emptyTitle, emptyBody, showCountry = false, showAgeGroup = false,
}: {
  rows: RecordRow[];
  now: Date;
  emptyTitle: string;
  emptyBody: string;
  showCountry?: boolean;
  showAgeGroup?: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {rows.map((row) => {
        const fresh = isFresh(row, now);
        const age = daysSince(row.holder.date, now);
        return (
          <li key={row.key}>
            <article
              className={cn(
                "rounded-md border bg-suth-elevated p-4 transition-colors",
                fresh
                  ? "border-suth-accent/50 bg-suth-accent/[0.04]"
                  : "border-suth-border-subtle",
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <MicroLabel>
                    {row.divisionLabel.replace("HYROX ", "")}
                    {showAgeGroup && row.ageGroup ? ` · ${row.ageGroup}` : ""}
                  </MicroLabel>
                  {showCountry && row.countryIso ? (
                    <Nationality iso={row.countryIso} withCode />
                  ) : null}
                  {fresh ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-pill border border-suth-accent/50
                                 bg-suth-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase
                                 tracking-[0.16em] text-suth-accent"
                    >
                      <Trophy className="size-2.5" aria-hidden />
                      New
                    </span>
                  ) : null}
                </div>
                <span className="results-num text-2xl leading-none text-suth-accent md:text-3xl">
                  {formatTime(row.holder.finishSeconds)}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="text-sm">
                  <Link
                    href={`/athlete/${row.holder.athleteSlug}`}
                    data-inline-tap
                    className="font-semibold text-suth-text hover:text-suth-accent
                               focus-visible:outline-2 focus-visible:outline-suth-accent"
                  >
                    {row.holder.athleteName}
                  </Link>
                  {!showCountry && row.holder.countryIso ? (
                    <span className="ml-2 align-middle">
                      <Nationality iso={row.holder.countryIso} />
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-suth-text-tertiary">
                  <Link
                    href={`/event/${row.holder.eventSlug}`}
                    data-inline-tap
                    className="hover:text-suth-accent"
                  >
                    {row.holder.eventName}
                  </Link>
                  {row.holder.date ? (
                    <>
                      {" · "}
                      <time dateTime={row.holder.date}>
                        {formatRelativeDate(row.holder.date, now)}
                      </time>
                    </>
                  ) : null}
                </p>
              </div>

              {/* What it beat. The story, not a footnote — a record with no
                  history behind it is just a fast time. */}
              {row.previousSeconds && row.marginSeconds ? (
                <p className="mt-2 border-t border-suth-border-subtle pt-2 text-xs text-suth-text-secondary">
                  Took <strong className="text-suth-text">{formatSplit(row.marginSeconds)}</strong> off{" "}
                  {row.previousHolderName}&rsquo;s {formatTime(row.previousSeconds)}
                  {row.timesBroken > 1
                    ? ` · broken ${row.timesBroken} times in our records`
                    : ""}
                  {age != null && age > 400 ? " · has stood over a year" : ""}
                </p>
              ) : (
                <p className="mt-2 border-t border-suth-border-subtle pt-2 text-xs text-suth-text-tertiary">
                  The only mark we hold for this division — nothing to beat it yet.
                </p>
              )}

              <Link
                href={`/report/${row.holder.resultId}`}
                data-inline-tap
                className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.16em]
                           text-suth-accent hover:underline
                           focus-visible:outline-2 focus-visible:outline-suth-accent"
              >
                See the race report →
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
