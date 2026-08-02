"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTime, formatPercent } from "@/lib/results/format";
import { percentileFromLadder } from "@/lib/results/percentiles";
import { MicroLabel } from "../ui/primitives";
import type { SimulatorReference } from "../simulator/simulator";

/**
 * Enter a time, get a percentile.
 *
 * Uses the same precomputed ladder as the simulator and result pages, so all
 * three agree — the brief's one-percentile-engine rule.
 *
 * The ladder is drawn as a scale with the entered time marked on it, because a
 * bare "top 34%" tells you where you are but not what the field looks like
 * around you.
 */
export function PercentileTool({ references }: { references: SimulatorReference[] }) {
  const [division, setDivision] = useState(references[0]?.division ?? "");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("30");
  const [seconds, setSeconds] = useState("00");

  const reference = references.find((r) => r.division === division) ?? references[0];

  const entered = useMemo(() => {
    const h = Number(hours) || 0;
    const m = Number(minutes) || 0;
    const s = Number(seconds) || 0;
    return h * 3600 + m * 60 + s;
  }, [hours, minutes, seconds]);

  const percentile = reference && entered > 0
    ? percentileFromLadder(reference.finishBreakpoints, entered)
    : 0;

  const ladder = [99, 95, 90, 75, 50, 25, 10];

  return (
    <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="pct-division"
            className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary"
          >
            Division
          </label>
          <select
            id="pct-division"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="mt-1.5 block min-h-[44px] rounded-sm border border-suth-border
                       bg-suth-base px-3 text-sm text-suth-text outline-none
                       focus-visible:border-suth-accent"
          >
            {references.map((r) => (
              <option key={r.division} value={r.division}>
                {r.label.replace("HYROX ", "")}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            Your finish time
          </legend>
          <div className="mt-1.5 flex items-center gap-1.5">
            <TimeInput label="Hours" value={hours} onChange={setHours} max={5} />
            <span className="text-suth-text-tertiary">:</span>
            <TimeInput label="Minutes" value={minutes} onChange={setMinutes} max={59} pad />
            <span className="text-suth-text-tertiary">:</span>
            <TimeInput label="Seconds" value={seconds} onChange={setSeconds} max={59} pad />
          </div>
        </fieldset>
      </div>

      <div className="mt-5 border-t border-suth-border-subtle pt-4">
        <MicroLabel>[ WHERE THAT PLACES YOU ]</MicroLabel>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="results-num text-4xl text-suth-accent md:text-5xl">
            {entered > 0 ? formatPercent(percentile) : "—"}
          </span>
          <span className="text-sm text-suth-text-secondary">
            {entered > 0 && reference
              ? `Faster than ${Math.round(percentile)}% of ${reference.label.replace("HYROX ", "")}`
              : "Enter a time above"}
          </span>
        </p>

        {reference ? (
          <div className="mt-5">
            <ul className="space-y-1.5">
              {ladder.map((p, i) => {
                const time = reference.finishBreakpoints[i];
                const isYou = entered > 0
                  && entered <= time
                  && (i === 0 || entered > reference.finishBreakpoints[i - 1]);
                return (
                  <li
                    key={p}
                    className={cn(
                      "flex items-center gap-3 rounded-sm px-2 py-1.5 text-xs",
                      isYou ? "bg-suth-accent/10" : "",
                    )}
                  >
                    <span className={cn("results-num w-14", isYou ? "text-suth-text-secondary" : "text-suth-text-tertiary")}>
                      Top {100 - p}%
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-sm bg-suth-overlay">
                      <span
                        className={isYou ? "block h-full bg-suth-accent" : "block h-full bg-suth-border-strong"}
                        style={{ width: `${((ladder.length - i) / ladder.length) * 100}%` }}
                      />
                    </span>
                    <span
                      className={cn(
                        "results-num w-20 text-right",
                        isYou ? "text-suth-accent" : "text-suth-text-secondary",
                      )}
                    >
                      {formatTime(time)}
                    </span>
                    {isYou ? (
                      <span className="w-10 font-mono text-[10px] uppercase tracking-wider text-suth-accent">
                        you
                      </span>
                    ) : (
                      <span className="w-10" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-suth-text-tertiary">
              Based on {reference.sampleSize.toLocaleString("en-GB")} finishes in the demo dataset.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TimeInput({
  label, value, onChange, max, pad,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  pad?: boolean;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          const n = Number(digits);
          onChange(digits === "" ? "" : String(Math.min(n, max)));
        }}
        onBlur={() => { if (pad && value.length === 1) onChange(value.padStart(2, "0")); }}
        className="results-num min-h-[44px] w-14 rounded-sm border border-suth-border bg-suth-base
                   text-center text-lg text-suth-text outline-none focus-visible:border-suth-accent"
      />
    </label>
  );
}
