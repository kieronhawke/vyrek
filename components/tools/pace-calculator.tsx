"use client";

import { useMemo, useState } from "react";
import { Eyebrow } from "@/components/shared/eyebrow";

/** Default station splits at the "finish your first" target. */
const DEFAULT_STATIONS = [
  { name: "Ski Erg", seconds: 290 },
  { name: "Sled Push", seconds: 150 },
  { name: "Sled Pull", seconds: 180 },
  { name: "Burpee Broad Jumps", seconds: 330 },
  { name: "Rowing", seconds: 290 },
  { name: "Farmers Carry", seconds: 150 },
  { name: "Sandbag Lunges", seconds: 360 },
  { name: "Wall Balls", seconds: 420 },
] as const;

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatHMMSS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  return h > 0
    ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    : `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parsePace(input: string): number | null {
  // Accept "4:30" or "4.5" (minutes) or "270" (seconds)
  if (!input) return null;
  if (input.includes(":")) {
    const [m, s] = input.split(":").map((n) => parseInt(n, 10));
    if (Number.isFinite(m) && Number.isFinite(s)) return m * 60 + s;
    return null;
  }
  const n = parseFloat(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Heuristic: under 15 is minutes, otherwise seconds.
  return n < 15 ? n * 60 : n;
}

export function PaceCalculator() {
  const [paceInput, setPaceInput] = useState("4:30");
  const [stations, setStations] = useState<{ name: string; seconds: number }[]>(
    () => DEFAULT_STATIONS.map((s) => ({ ...s })),
  );
  const [fadePct, setFadePct] = useState(5);

  const paceSecondsPerKm = parsePace(paceInput);

  const projection = useMemo(() => {
    if (paceSecondsPerKm === null) return null;

    const stationTotal = stations.reduce((n, s) => n + s.seconds, 0);
    const baseRunTotal = paceSecondsPerKm * 8;
    // Apply progressive fade: km 1 = 0%, km 8 = full fade.
    const fadeFactor = 1 + (fadePct / 100) * 0.5; // avg multiplier across 8 km
    const adjustedRunTotal = baseRunTotal * fadeFactor;
    const total = stationTotal + adjustedRunTotal;
    const perKm: number[] = [];
    for (let i = 0; i < 8; i++) {
      const f = 1 + (fadePct / 100) * (i / 7);
      perKm.push(paceSecondsPerKm * f);
    }

    return {
      total,
      baseRunTotal,
      adjustedRunTotal,
      stationTotal,
      perKm,
    };
  }, [paceSecondsPerKm, stations, fadePct]);

  const updateStation = (i: number, value: number) => {
    setStations((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], seconds: Math.max(0, value) };
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-6">
        <Eyebrow>Inputs</Eyebrow>
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-vyrek-text-tertiary">
              1 km running pace
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={paceInput}
              onChange={(e) => setPaceInput(e.target.value)}
              placeholder="4:30"
              className="h-14 w-full rounded-md border border-vyrek-border bg-vyrek-base px-4 text-lg font-medium text-vyrek-text outline-none transition-colors focus:border-vyrek-accent"
            />
            <span className="mt-1 block text-xs text-vyrek-text-tertiary">
              MM:SS format (e.g. 4:30) or decimal (4.5)
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-[0.15em] text-vyrek-text-tertiary">
              Second-half fade
            </span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={20}
                step={1}
                value={fadePct}
                onChange={(e) => setFadePct(parseInt(e.target.value))}
                className="flex-1 accent-vyrek-accent"
                aria-label="Second-half fade percentage"
              />
              <span className="w-16 text-right font-mono text-sm font-medium text-vyrek-text">
                +{fadePct}%
              </span>
            </div>
            <span className="mt-1 block text-xs text-vyrek-text-tertiary">
              How much your km pace slows by km 8. Most age-group athletes fade
              5-10%.
            </span>
          </label>
        </div>
      </div>

      {/* Stations */}
      <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-6">
        <Eyebrow>Station splits (seconds)</Eyebrow>
        <ul role="list" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {stations.map((s, i) => (
            <li key={s.name} className="flex items-center justify-between gap-3">
              <span className="text-sm text-vyrek-text-secondary">{s.name}</span>
              <input
                type="number"
                min={0}
                value={s.seconds}
                onChange={(e) => updateStation(i, parseInt(e.target.value, 10))}
                className="h-10 w-24 rounded-md border border-vyrek-border bg-vyrek-base px-3 text-right font-mono text-sm text-vyrek-text outline-none focus:border-vyrek-accent"
              />
            </li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          Defaults reflect a first-time finisher pace.
        </p>
      </div>

      {/* Output */}
      {projection ? (
        <div className="rounded-lg border border-vyrek-accent/40 bg-vyrek-accent/[0.04] p-6">
          <Eyebrow>Projected finish</Eyebrow>
          <p className="mt-3 font-mono text-5xl font-black tracking-[-0.04em] text-vyrek-text md:text-6xl">
            {formatHMMSS(projection.total)}
          </p>
          <p className="mt-2 text-sm text-vyrek-text-secondary">
            Running time: {formatHMMSS(projection.adjustedRunTotal)} ·
            Stations: {formatHMMSS(projection.stationTotal)}
          </p>

          <div className="mt-6">
            <Eyebrow>Per-km projection</Eyebrow>
            <ol role="list" className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {projection.perKm.map((sec, i) => (
                <li
                  key={i}
                  className="rounded-md border border-vyrek-border bg-vyrek-base p-3 text-center"
                >
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    km {i + 1}
                  </span>
                  <span className="mt-1 block font-mono text-sm text-vyrek-text">
                    {formatMMSS(sec)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated p-6">
          <p className="text-sm text-vyrek-text-secondary">
            Enter a valid 1 km pace to see your projection.
          </p>
        </div>
      )}
    </div>
  );
}
