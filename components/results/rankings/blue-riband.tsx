import Link from "next/link";
import { formatTime, nationCode } from "@/lib/results/format";
import { Flag } from "../ui/flag";
import type { RecordRow } from "@/lib/results/records";

/**
 * THE TWO FASTEST HYROX TIMES EVER RUN.
 *
 * The record book presented sixteen world records as sixteen identical cards,
 * ordered alphabetically, so it opened on Adaptive Men and the outright world
 * best sat somewhere in the middle looking exactly like everything around it.
 * A record book whose every entry has the same weight is a list, not a record
 * book — which is what "it doesn't show the significance of things" means.
 *
 * These two get a different treatment, because they are a different kind of
 * fact: not "the fastest in this category" but "the fastest, full stop".
 *
 * Only two. Six would recreate the original problem with larger type — the
 * whole point is that something has to be ordinary for something else to read
 * as exceptional. Everything below this block keeps its existing card, in
 * significance order rather than alphabetical.
 */

export function BlueRiband({ rows, now }: { rows: RecordRow[]; now: Date }) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-10" aria-labelledby="outright-heading">
      <h2
        id="outright-heading"
        className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent"
      >
        [ THE OUTRIGHT WORLD BESTS ]
      </h2>
      <p className="mb-5 mt-2 max-w-2xl text-sm text-suth-text-secondary">
        The fastest HYROX ever run, by anybody, anywhere. Every other record on
        this page is the fastest within a category — these two are simply the
        fastest.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <BlueRibandCard key={row.divisionCode} row={row} now={now} />
        ))}
      </div>
    </section>
  );
}

function BlueRibandCard({ row, now }: { row: RecordRow; now: Date }) {
  const { holder } = row;
  // `marginSeconds` is precomputed upstream; deriving it here again would be a
  // second source of truth for the same number.
  const margin = row.marginSeconds ?? null;

  return (
    <article
      className="relative overflow-hidden rounded-lg border border-suth-accent/40 bg-suth-elevated p-6
                 md:p-8"
    >
      {/*
        A single soft accent bloom from the top-left rather than a filled panel.
        A solid accent card would shout, and it would also be the only element
        on the page that could not carry body text at contrast.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(163,230,53,0.12)_0%,rgba(10,10,10,0)_58%)]"
      />

      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
          {row.divisionLabel}
        </p>

        {/*
          Sized by how long the string actually is, not by breakpoint alone.

          `54:05` and `1:01:00` are five characters and seven, and at a single
          `text-6xl` the hour-long time ran straight off the right edge of the
          card — the women's world record was rendered as "1:01:0". Which digit
          gets clipped is the last one, so the number stayed plausible while
          being wrong, and that is the worst way for this to fail.
        */}
        <p
          className={
            "results-num mt-3 leading-none text-suth-accent "
            + (formatTime(holder.finishSeconds).length > 5
              // An hour-plus time is seven characters. At 320px the card's
              // inner width is about 230px, which a 36px monospace string of
              // that length overruns by 30px — measured, not estimated.
              ? "text-[26px] sm:text-4xl md:text-5xl"
              : "text-4xl sm:text-5xl md:text-6xl")
          }
        >
          {formatTime(holder.finishSeconds)}
        </p>

        <p className="mt-4 text-xl font-black tracking-[-0.03em] text-suth-text">
          {holder.athleteName}{" "}
          {/* ⚠️ The drawn flag, not the emoji one.
              `flagEmoji` returns its input unchanged for anything that is not
              exactly two letters, and the results source speaks IOC — so this
              rendered the literal text "GBR" beside the record holder. Emoji
              flags are also blank on Windows, which is why every other surface
              already uses this component. */}
          <Flag iso={holder.countryIso} className="ml-1 inline-block align-[-2px]" />
          <span className="sr-only">({nationCode(holder.countryIso)})</span>
        </p>

        <p className="mt-1 text-sm text-suth-text-secondary">
          {holder.eventName}
          {holder.date ? ` · ${standing(holder.date, now)}` : null}
        </p>

        {/*
          The margin is what makes a record a story rather than a number. "Took
          1:37 off" tells you whether this was an inevitability or an
          earthquake, and it is the one thing a bare leaderboard never says.
        */}
        {margin !== null && margin > 0 && row.previousHolderName && row.previousSeconds ? (
          <p className="mt-4 border-t border-suth-border-subtle pt-4 text-sm text-suth-text-secondary">
            Took <strong className="text-suth-text">{formatTime(margin)}</strong> off{" "}
            {row.previousHolderName}&apos;s {formatTime(row.previousSeconds)}.
          </p>
        ) : (
          <p className="mt-4 border-t border-suth-border-subtle pt-4 text-sm text-suth-text-tertiary">
            The first mark we hold in this division.
          </p>
        )}

        <Link
          href={`/report/${holder.resultId}`}
          className="mt-4 inline-flex font-mono text-[11px] uppercase tracking-[0.18em] text-suth-accent hover:underline"
        >
          See the race report →
        </Link>
      </div>
    </article>
  );
}

/**
 * How long the record has stood, in words.
 *
 * "Set 2025-02-14" makes a reader do arithmetic to answer the only question
 * they actually have, which is whether this is old news or this weekend's.
 */
function standing(date: string, now: Date): string {
  const set = new Date(date);
  if (Number.isNaN(set.getTime())) return date;

  const days = Math.floor((now.getTime() - set.getTime()) / 86_400_000);
  if (days < 0) return date;
  if (days < 1) return "set today";
  if (days < 14) return `set ${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 60) return `has stood ${Math.floor(days / 7)} weeks`;
  if (days < 365) return `has stood ${Math.floor(days / 30)} months`;
  const years = Math.floor(days / 365);
  return `has stood ${years === 1 ? "over a year" : `over ${years} years`}`;
}
