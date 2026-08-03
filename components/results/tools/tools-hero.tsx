import Link from "next/link";
import { FileText, Search, Printer, Share2 } from "lucide-react";

/**
 * SELLING THE RACE REPORT.
 *
 * The tools page listed nine cards in a three-up grid, and the full race
 * report — twelve sections of analysis on a single race, laid out as an A4
 * document, free — was one of them. It had a thin accent border and a small
 * "Free" chip and was otherwise indistinguishable from "Race calendar".
 *
 * That is the whole problem with the page: it is an accurate inventory and a
 * terrible shop window. Somebody landing here cannot tell which of nine things
 * is worth their next thirty seconds, so they scan all nine and open none.
 *
 * This is the one thing worth leading with, so it gets:
 *
 *   • **Room.** A band across the top rather than a third of a row.
 *   • **The contents,** listed. "Twelve sections" is a claim; naming four of
 *     them is evidence, and it is what makes somebody click.
 *   • **The three steps to get one**, because the most common reason people
 *     do not have a race report is that they do not realise it already exists
 *     for a race they have already run.
 *   • **"Free" said once, plainly.** No comparison to what anyone else
 *     charges — anchoring on somebody else's price makes free read as a
 *     discount rather than as the offer.
 *
 * Everything else stays in the grid below. Promoting a second tool here would
 * put the page back where it started.
 */

const CONTAINS = [
  "Every station against your own standard, with the bands to read it",
  "The story of your pacing, checkpoint by checkpoint",
  "What the same legs were worth to the winner",
  "Split targets to take into the next one",
];

const STEPS = [
  { icon: Search, label: "Search your name" },
  { icon: FileText, label: "Open your result" },
  { icon: Printer, label: "Press “Full race report”" },
];

export function ToolsHero() {
  return (
    <section
      aria-labelledby="flagship-heading"
      className="relative mt-8 overflow-hidden rounded-lg border border-suth-accent/40 bg-suth-elevated"
    >
      {/* Soft bloom rather than a filled accent panel — a solid block would be
          the only element on the page unable to carry body text at contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_100%_at_0%_0%,rgba(163,230,53,0.14)_0%,rgba(10,10,10,0)_62%)]"
      />

      <div className="relative grid gap-8 p-6 md:grid-cols-[1.15fr_1fr] md:p-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ THE ONE TO START WITH · FREE ]
          </p>

          <h2
            id="flagship-heading"
            className="mt-3 text-2xl font-black leading-[1.05] tracking-[-0.03em] text-suth-text md:text-4xl"
          >
            The full race report
          </h2>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-suth-text-secondary">
            Twelve sections on one race, built from published results and laid
            out as a document you can print, keep or send to a coach. No
            account, no email, no payment — for any HYROX result we hold.
          </p>

          <ul className="mt-5 space-y-2">
            {CONTAINS.map((item) => (
              <li
                key={item}
                className="flex gap-3 text-sm leading-relaxed text-suth-text-secondary"
              >
                <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-suth-accent" />
                {item}
              </li>
            ))}
          </ul>

          {/*
            One button, not two.

            The second was "What is in it", pointing at `#example` — an anchor
            that does not exist on this page, so it did nothing at all. Worse,
            what it promised is already sitting immediately above it as a list.
            A dead link next to a live one also makes the live one less
            trustworthy.
          */}
          <div className="mt-6">
            <Link
              href="/results"
              className="inline-flex min-h-[48px] items-center rounded-pill bg-suth-accent px-6 text-sm font-bold text-suth-base transition-colors hover:bg-suth-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
            >
              Find your race
            </Link>
          </div>
        </div>

        {/*
          How to get one. This is here because the most common reason somebody
          does not have a race report is not price or interest — it is that
          they do not know one already exists for a race they ran last year.
        */}
        <div className="rounded-lg border border-suth-border-subtle bg-suth-base/40 p-5 md:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-text-tertiary">
            Three steps, about twenty seconds
          </p>
          <ol className="mt-4 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.label} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full border border-suth-accent/40 font-mono text-[11px] text-suth-accent"
                >
                  {i + 1}
                </span>
                <span className="flex items-center gap-2 pt-1 text-sm text-suth-text">
                  <step.icon className="size-4 shrink-0 text-suth-text-tertiary" aria-hidden />
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <p className="mt-5 flex items-start gap-2 border-t border-suth-border-subtle pt-4 text-xs leading-relaxed text-suth-text-tertiary">
            <Share2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Works for any race in the database, including ones you ran years
            ago. Share the link and whoever opens it sees the whole thing.
          </p>
        </div>
      </div>
    </section>
  );
}
