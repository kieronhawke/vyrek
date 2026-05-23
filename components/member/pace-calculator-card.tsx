"use client";

import { useMemo, useState } from "react";

/**
 * Simplified Hyrox finish-time predictor.
 *
 * Inputs:
 *  - average 1 km run pace (mm:ss)
 *  - estimated total time on the 8 functional stations (mm:ss)
 *
 * Output: predicted total finish time, broken into "run total + station total
 * + transition allowance".
 *
 * The standalone /tools/pace-calculator page has more depth; this is the
 * pocket version for inside the app.
 */
export function PaceCalculatorCard() {
  const [paceMin, setPaceMin] = useState("4");
  const [paceSec, setPaceSec] = useState("45");
  const [stationsMin, setStationsMin] = useState("32");
  const [stationsSec, setStationsSec] = useState("00");

  const result = useMemo(() => {
    const paceTotalSec = num(paceMin) * 60 + num(paceSec);
    const runSec = paceTotalSec * 8; // 8 km
    const stationSec = num(stationsMin) * 60 + num(stationsSec);
    // Standard Hyrox transition allowance: ~3-5 minutes total walking
    // between runs and stations on a real race floor.
    const transitionSec = 4 * 60;
    const total = runSec + stationSec + transitionSec;
    return { runSec, stationSec, transitionSec, total };
  }, [paceMin, paceSec, stationsMin, stationsSec]);

  return (
    <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        Project your finish time
      </p>

      <div className="mt-4 space-y-4">
        <Row label="Average 1 km run pace">
          <TimeInput minutes={paceMin} seconds={paceSec} onMin={setPaceMin} onSec={setPaceSec} />
        </Row>
        <Row label="Total station time (all 8)">
          <TimeInput
            minutes={stationsMin}
            seconds={stationsSec}
            onMin={setStationsMin}
            onSec={setStationsSec}
            maxMin={59}
          />
        </Row>
      </div>

      <div className="mt-5 rounded-md border border-vyrek-accent/30 bg-vyrek-accent/5 p-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Projected finish
        </p>
        <p className="mt-2 text-4xl font-black tabular-nums text-vyrek-text">
          {fmtClock(result.total)}
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          Runs {fmtClock(result.runSec)} · Stations {fmtClock(result.stationSec)} · Transitions {fmtClock(result.transitionSec)}
        </p>
      </div>

      <p className="mt-4 text-xs text-vyrek-text-tertiary">
        Realistic accuracy ±3 minutes. The biggest predictor of accuracy is
        whether you held the run pace honestly in your last race-simulation
        session.
      </p>
    </div>
  );
}

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function fmtClock(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-vyrek-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function TimeInput({
  minutes,
  seconds,
  onMin,
  onSec,
  maxMin = 15,
}: {
  minutes: string;
  seconds: string;
  onMin: (v: string) => void;
  onSec: (v: string) => void;
  maxMin?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={maxMin}
        value={minutes}
        onChange={(e) => onMin(e.target.value)}
        className="h-10 w-14 rounded-md border border-vyrek-border bg-vyrek-base text-center text-base font-bold tabular-nums text-vyrek-text"
      />
      <span className="font-mono text-vyrek-text-tertiary">:</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        max={59}
        value={seconds}
        onChange={(e) => onSec(e.target.value)}
        className="h-10 w-14 rounded-md border border-vyrek-border bg-vyrek-base text-center text-base font-bold tabular-nums text-vyrek-text"
      />
    </div>
  );
}
