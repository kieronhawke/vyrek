"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/results/format";
import { Nationality, MicroLabel } from "../ui/primitives";
import type { StartListWave } from "@/lib/results/source";

/**
 * Start list, filtered by division and searchable by name.
 *
 * Search filters across every division at once, not just the selected one —
 * on race morning you are looking for a name and you may not know which wave
 * it is in, which is the whole reason you are looking.
 */
export function StartersList({
  waves, divisions, initialDivision, eventFinished, eventSlug,
}: {
  waves: StartListWave[];
  divisions: { code: string; label: string }[];
  initialDivision: string;
  eventFinished: boolean;
  eventSlug: string;
}) {
  const [division, setDivision] = useState(initialDivision);
  const [query, setQuery] = useState("");

  const searching = query.trim().length >= 2;

  const shown = useMemo(() => {
    if (searching) {
      const needle = query.trim().toLowerCase();
      return waves
        .map((wave) => ({
          ...wave,
          athletes: wave.athletes.filter((a) => a.name.toLowerCase().includes(needle)),
        }))
        .filter((wave) => wave.athletes.length > 0);
    }
    return waves.filter((wave) => wave.divisionCode === division);
  }, [waves, division, query, searching]);

  const total = shown.reduce((sum, w) => sum + w.athletes.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[14rem] flex-1 items-center md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 size-4 text-suth-text-tertiary" aria-hidden />
          <span className="sr-only">Search every division by name</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a name in any wave"
            className="min-h-[44px] w-full rounded-sm border border-suth-border bg-suth-elevated
                       pl-9 pr-9 text-sm text-suth-text outline-none
                       placeholder:text-suth-text-tertiary focus-visible:border-suth-accent"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              data-inline-tap
              className="absolute right-2 rounded-sm p-1.5 text-suth-text-tertiary hover:text-suth-text"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </label>
        <p className="results-num text-xs text-suth-text-tertiary" aria-live="polite">
          {formatCount(total)} {total === 1 ? "athlete" : "athletes"}
          {searching ? " matching" : ""}
        </p>
      </div>

      {!searching ? (
        <div className="-mx-5 mt-3 flex snap-x gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          {divisions.map((d) => (
            <button
              key={d.code}
              type="button"
              onClick={() => setDivision(d.code)}
              aria-pressed={division === d.code}
              className={cn(
                "min-h-[36px] shrink-0 snap-start rounded-pill border px-3 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
                division === d.code
                  ? "border-suth-accent/40 bg-suth-accent/10 text-suth-accent"
                  : "border-suth-border bg-suth-elevated text-suth-text-secondary hover:text-suth-text",
              )}
            >
              {d.label.replace("HYROX ", "")}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {shown.map((wave) => (
          <section
            key={`${wave.divisionCode}-${wave.wave}`}
            className="overflow-hidden rounded-md border border-suth-border-subtle"
          >
            <div className="flex items-baseline justify-between gap-3 bg-suth-overlay px-4 py-2">
              <MicroLabel>
                {searching ? `${wave.divisionLabel.replace("HYROX ", "")} · ` : ""}
                Wave {wave.wave}
              </MicroLabel>
              <span className="results-num text-xs text-suth-accent">{wave.time}</span>
            </div>
            <ul className="divide-y divide-suth-border-subtle">
              {wave.athletes.map((athlete) => (
                <li
                  key={athlete.slug}
                  className="flex min-h-[44px] items-center gap-3 bg-suth-elevated px-4 py-2"
                >
                  <Nationality iso={athlete.countryIso} />
                  <span className="min-w-0 flex-1 truncate text-sm text-suth-text">
                    {athlete.name}
                  </span>
                  <span className="results-num shrink-0 text-[11px] text-suth-text-tertiary">
                    {athlete.ageGroup}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-suth-text-secondary">
            No athletes match &ldquo;{query.trim()}&rdquo;.
          </p>
        ) : null}
      </div>

      {eventFinished ? (
        <div className="mt-6 rounded-md border border-suth-accent/25 bg-suth-accent/[0.04] p-4">
          <MicroLabel className="text-suth-accent">[ RACED HERE? ]</MicroLabel>
          <p className="mt-1.5 text-sm text-suth-text-secondary">
            Claim your profile to keep your splits, track them across seasons, and see where the
            time went.
          </p>
          <Link
            href={`/event/${eventSlug}`}
            className="mt-3 inline-flex min-h-[44px] items-center rounded-sm bg-suth-accent px-4
                       text-sm font-semibold text-suth-base hover:bg-suth-accent-hover
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
          >
            See the results
          </Link>
        </div>
      ) : null}
    </div>
  );
}
