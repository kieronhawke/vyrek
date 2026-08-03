"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  STATION_IDS, STATION_LABEL, STATION_SHORT, stationGuideHref, type StationId,
} from "@/lib/results/model";
import { formatSplit, formatPercent } from "@/lib/results/format";
import { MicroLabel, Delta } from "../ui/primitives";

/**
 * The race strip — the signature element of the section.
 *
 * The first version was a row of proportional blocks with a colour legend and
 * nothing else, and the feedback was fair: it looked decorative and told you
 * almost nothing. Colour alone cannot say *which* station is which, and an SVG
 * `<title>` tooltip does not exist on a phone at all.
 *
 * So it is a control now, not a picture. Every segment is a button: select one
 * and the panel underneath reads out its time, the division average, the
 * delta, its share of the race, and a link to the guide. The whole race stays
 * visible while you interrogate one part of it, which is the thing a table of
 * splits cannot do.
 *
 * Selection defaults to the segment where the most time was lost, because that
 * is what the reader came to find.
 */

type Segment = {
  key: string;
  label: string;
  short: string;
  kind: "run" | "station" | "roxzone";
  station?: StationId;
  seconds: number;
  average: number;
};

export function RaceStrip({
  runs, stations, roxzoneSeconds, averageRuns, averageStations, averageRoxzone,
}: {
  runs: number[];
  stations: Record<StationId, number>;
  roxzoneSeconds: number;
  averageRuns: number[];
  averageStations: Record<StationId, number>;
  averageRoxzone: number;
}) {
  const segments: Segment[] = [];
  STATION_IDS.forEach((station, i) => {
    segments.push({
      key: `run-${i + 1}`, label: `Run ${i + 1}`, short: `R${i + 1}`, kind: "run",
      seconds: runs[i] ?? 0, average: averageRuns[i] ?? 0,
    });
    segments.push({
      key: station,
      label: STATION_LABEL[station],
      short: STATION_SHORT[station],
      kind: "station",
      station,
      seconds: stations[station] ?? 0,
      average: averageStations[station] ?? 0,
    });
  });
  segments.push({
    key: "roxzone", label: "Roxzone", short: "RX", kind: "roxzone",
    seconds: roxzoneSeconds, average: averageRoxzone,
  });

  const total = segments.reduce((sum, s) => sum + s.seconds, 0);

  const worst = segments.reduce(
    (a, b) => (b.seconds - b.average > a.seconds - a.average ? b : a),
    segments[0],
  );
  const [selectedKey, setSelectedKey] = useState(worst.key);
  const selected = segments.find((s) => s.key === selectedKey) ?? worst;

  if (total <= 0) return null;

  const share = (s: Segment) => (s.seconds / total) * 100;
  const delta = selected.seconds - selected.average;

  return (
    <figure className="rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>[ THE RACE ]</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">
          Width is time · tap a segment
        </span>
      </figcaption>

      {/* Runs run full height, stations sit inset, so the alternating rhythm of
          the race reads before you look at a single label. */}
      <div
        className="mt-3 flex h-16 w-full items-stretch gap-px md:h-20"
        role="group"
        aria-label="Race segments"
      >
        {segments.map((segment) => {
          const faster = segment.average > 0 && segment.seconds < segment.average;
          const isSelected = segment.key === selected.key;
          return (
            <button
              key={segment.key}
              type="button"
              data-inline-tap
              onClick={() => setSelectedKey(segment.key)}
              aria-pressed={isSelected}
              aria-label={`${segment.label}, ${formatSplit(segment.seconds)}`}
              title={`${segment.label} · ${formatSplit(segment.seconds)}`}
              style={{ width: `${share(segment)}%` }}
              className={cn(
                "group relative min-w-[3px] rounded-[2px] transition-opacity",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
                segment.kind === "run" ? "self-stretch" : "my-2",
                faster
                  ? "bg-[var(--results-segment-fast)]"
                  : segment.kind === "run"
                    ? "bg-[var(--results-run)]"
                    : segment.kind === "roxzone"
                      ? "bg-[var(--results-roxzone)]"
                      : "bg-[var(--results-station)]",
                isSelected ? "ring-2 ring-inset ring-suth-text" : "opacity-80 hover:opacity-100",
              )}
            >
              {/* Labels are rotated to run down the segment.
               *
               * Horizontally they never fit: a station is 3–6% of the race, so
               * "PUSH" clipped to "PUS" and read as a different station.
               * Estimating a character count from the width does not work
               * either — glyph widths differ. Vertical text uses the one axis
               * these blocks actually have, and `truncate` lets the browser
               * measure rather than guessing. The readout below names the
               * segment in full regardless. */}
              {share(segment) > 2.6 ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  <span
                    className="max-h-full truncate font-mono text-[8px] uppercase leading-none
                               tracking-[0.08em] text-black/65
                               [writing-mode:vertical-rl] [text-orientation:mixed]"
                  >
                    {segment.short}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-sm border border-suth-border-subtle bg-suth-base/60 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-semibold text-suth-text">{selected.label}</span>
          <span className="flex items-baseline gap-3">
            <span className="results-num text-lg text-suth-text">
              {formatSplit(selected.seconds)}
            </span>
            <Delta seconds={delta} className="text-xs" />
          </span>
        </div>

        <dl className="mt-2 grid grid-cols-3 gap-3 text-[11px]">
          <div>
            <dt className="text-suth-text-tertiary">Division average</dt>
            <dd className="results-num mt-0.5 text-suth-text-secondary">
              {formatSplit(selected.average)}
            </dd>
          </div>
          <div>
            <dt className="text-suth-text-tertiary">Share of race</dt>
            <dd className="results-num mt-0.5 text-suth-text-secondary">
              {formatPercent(share(selected), 1)}
            </dd>
          </div>
          <div>
            <dt className="text-suth-text-tertiary">Verdict</dt>
            <dd className="mt-0.5 text-suth-text-secondary">
              {delta <= -5 ? "Gained time" : delta >= 5 ? "Lost time" : "On par"}
            </dd>
          </div>
        </dl>

        {selected.station ? (
          <Link
            href={stationGuideHref(selected.station)}
            data-inline-tap
            className="mt-2.5 inline-block font-mono text-[10px] uppercase tracking-[0.16em]
                       text-suth-accent hover:underline
                       focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            How to fix {selected.label} →
          </Link>
        ) : null}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-suth-text-tertiary">
        <LegendKey className="bg-[var(--results-segment-fast)]" label="Beat the average" />
        <LegendKey className="bg-[var(--results-run)]" label="Run" />
        <LegendKey className="bg-[var(--results-station)]" label="Station" />
        <LegendKey className="bg-[var(--results-roxzone)]" label="Roxzone" />
      </ul>
    </figure>
  );
}

function LegendKey({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-[2px] ${className}`} aria-hidden />
      {label}
    </li>
  );
}
