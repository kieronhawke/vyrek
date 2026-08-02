"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Share2, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATION_IDS, STATION_LABEL, stationGuideHref, type StationId } from "@/lib/results/model";
import { formatTime, formatSplit, formatPercent } from "@/lib/results/format";
import { percentileFromLadder } from "@/lib/results/percentiles";
import { MicroLabel, Delta } from "../ui/primitives";

/**
 * Race simulator.
 *
 * The reference site's simulator is the best thing they have: a slider per
 * station sitting on that station's distribution, with a live percentile. This
 * keeps that and adds the half they are missing.
 *
 * Theirs answers **"what would I run?"** — you drag sliders and it totals them.
 * Ours also answers **"what must I hit?"**: set a goal time and it works
 * backwards to the split you need at every station, which is the question you
 * actually have on race morning. That is the Target mode below.
 *
 * State lives in the URL, so a plan is shareable as a link.
 */

type Mode = "build" | "target";

export type SimulatorReference = {
  division: string;
  label: string;
  stations: Record<StationId, number>;
  runs: number[];
  roxzoneSeconds: number;
  medianFinishSeconds: number;
  /** Percentile breakpoints, ascending time: [p99, p95, p90, p75, p50, p25, p10]. */
  finishBreakpoints: number[];
  sampleSize: number;
};

const PRESETS = [
  { key: "first", label: "First timer", target: 105 * 60 },
  { key: "sub90", label: "Sub 90", target: 89 * 60 + 30 },
  { key: "sub75", label: "Sub 75", target: 74 * 60 + 30 },
  { key: "elite", label: "Elite", target: 60 * 60 },
] as const;

export function Simulator({
  references, initialDivision,
}: {
  references: SimulatorReference[];
  initialDivision: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [division, setDivision] = useState(initialDivision);
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) ?? "build");

  const reference = references.find((r) => r.division === division) ?? references[0];

  // Build mode: one editable value per segment, seeded from the division median.
  const seed = useCallback((ref: SimulatorReference) => ({
    runs: [...ref.runs],
    stations: { ...ref.stations },
    roxzone: ref.roxzoneSeconds,
  }), []);

  const [values, setValues] = useState(() => seed(reference));
  const [goalSeconds, setGoalSeconds] = useState(() => {
    const fromUrl = Number(params.get("goal"));
    return Number.isFinite(fromUrl) && fromUrl > 0 ? fromUrl : reference.medianFinishSeconds;
  });
  const [copied, setCopied] = useState(false);

  const switchDivision = (next: string) => {
    const ref = references.find((r) => r.division === next);
    if (!ref) return;
    setDivision(next);
    setValues(seed(ref));
    setGoalSeconds(ref.medianFinishSeconds);
  };

  const runTotal = values.runs.reduce((s, v) => s + v, 0);
  const stationTotal = STATION_IDS.reduce((s, id) => s + values.stations[id], 0);
  const projected = runTotal + stationTotal + values.roxzone;

  /* Target mode scales the division median profile to hit the goal, so the
     required splits stay in believable proportion to each other. */
  const targetPlan = useMemo(() => {
    const base = reference.runs.reduce((s, v) => s + v, 0)
      + STATION_IDS.reduce((s, id) => s + reference.stations[id], 0)
      + reference.roxzoneSeconds;
    const scale = base > 0 ? goalSeconds / base : 1;
    const runs = reference.runs.map((r) => Math.round(r * scale));
    const stations = {} as Record<StationId, number>;
    for (const id of STATION_IDS) stations[id] = Math.round(reference.stations[id] * scale);
    return { runs, stations, roxzone: Math.round(reference.roxzoneSeconds * scale), scale };
  }, [goalSeconds, reference]);

  const activeFinish = mode === "build" ? projected : goalSeconds;
  const percentile = percentileFromLadder(reference.finishBreakpoints, activeFinish);

  const shareState = () => {
    const qs = new URLSearchParams({
      division,
      mode,
      ...(mode === "target" ? { goal: String(goalSeconds) } : {}),
    });
    const url = `${window.location.origin}/simulator?${qs}`;
    router.replace(`/simulator?${qs}`, { scroll: false });
    navigator.clipboard?.writeText(url).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => { /* clipboard blocked; the URL is now in the address bar anyway */ },
    );
  };

  return (
    <div>
      {/* Division + mode */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="sim-division">Division</label>
        <select
          id="sim-division"
          value={division}
          onChange={(e) => switchDivision(e.target.value)}
          className="min-h-[40px] rounded-sm border border-suth-border bg-suth-elevated px-3
                     text-sm text-suth-text outline-none focus-visible:border-suth-accent"
        >
          {references.map((r) => (
            <option key={r.division} value={r.division}>{r.label.replace("HYROX ", "")}</option>
          ))}
        </select>

        <div className="inline-flex rounded-sm border border-suth-border bg-suth-elevated p-0.5">
          {(["build", "target"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                "min-h-[36px] rounded-sm px-3 text-xs transition-colors",
                mode === m ? "bg-suth-accent text-suth-base" : "text-suth-text-secondary hover:text-suth-text",
              )}
            >
              {m === "build" ? "Build a race" : "Hit a target"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setValues(seed(reference))}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-sm border border-suth-border
                     bg-suth-elevated px-3 text-xs text-suth-text-secondary hover:text-suth-text
                     focus-visible:outline-2 focus-visible:outline-suth-accent"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Reset
        </button>

        <button
          type="button"
          onClick={shareState}
          className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-sm border
                     border-suth-accent/40 bg-suth-accent/10 px-3 text-xs text-suth-accent
                     focus-visible:outline-2 focus-visible:outline-suth-accent"
        >
          {copied
            ? <><Check className="size-3.5" aria-hidden /> Link copied</>
            : <><Share2 className="size-3.5" aria-hidden /> Share this plan</>}
        </button>
      </div>

      {/* Headline */}
      <div className="mt-4 rounded-md border border-suth-border-subtle bg-suth-elevated p-5">
        <MicroLabel>{mode === "build" ? "[ PROJECTED FINISH ]" : "[ TARGET FINISH ]"}</MicroLabel>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          <span className="results-num text-4xl text-suth-accent md:text-6xl">
            {formatTime(activeFinish)}
          </span>
          <span className="text-sm text-suth-text-secondary">
            Faster than{" "}
            <span className="results-num text-suth-text">{formatPercent(percentile)}</span>{" "}
            of {reference.label.replace("HYROX ", "")}
          </span>
        </div>

        {mode === "target" ? (
          <div className="mt-4">
            <label htmlFor="goal" className="text-xs text-suth-text-secondary">
              Goal time
            </label>
            <input
              id="goal"
              type="range"
              min={Math.round(reference.medianFinishSeconds * 0.55)}
              max={Math.round(reference.medianFinishSeconds * 1.5)}
              step={30}
              value={goalSeconds}
              onChange={(e) => setGoalSeconds(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--suth-accent)]"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setGoalSeconds(preset.target)}
                  className={cn(
                    "min-h-[36px] rounded-pill border px-3 text-xs transition-colors",
                    Math.abs(goalSeconds - preset.target) < 20
                      ? "border-suth-accent/40 bg-suth-accent/10 text-suth-accent"
                      : "border-suth-border text-suth-text-secondary hover:text-suth-text",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-suth-border-subtle pt-3 text-xs">
            <Breakdown label="Running" seconds={runTotal} total={projected} />
            <Breakdown label="Stations" seconds={stationTotal} total={projected} />
            <Breakdown label="Roxzone" seconds={values.roxzone} total={projected} />
          </div>
        )}
      </div>

      {/* Segments */}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {STATION_IDS.map((station, i) => (
          <SegmentRow
            key={station}
            label={`Run ${i + 1}`}
            stationLabel={STATION_LABEL[station]}
            stationHref={stationGuideHref(station)}
            runSeconds={mode === "build" ? values.runs[i] : targetPlan.runs[i]}
            stationSeconds={mode === "build" ? values.stations[station] : targetPlan.stations[station]}
            referenceRun={reference.runs[i]}
            referenceStation={reference.stations[station]}
            editable={mode === "build"}
            onRun={(v) => setValues((s) => {
              const runs = [...s.runs];
              runs[i] = v;
              return { ...s, runs };
            })}
            onStation={(v) => setValues((s) => ({
              ...s, stations: { ...s.stations, [station]: v },
            }))}
          />
        ))}
      </div>

      <div className="mt-3 rounded-md border border-suth-border-subtle bg-suth-elevated p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-suth-text">Roxzone (transitions)</span>
          <span className="flex items-baseline gap-2.5">
            <span className="results-num text-sm text-suth-text">
              {formatSplit(mode === "build" ? values.roxzone : targetPlan.roxzone)}
            </span>
            <Delta
              seconds={(mode === "build" ? values.roxzone : targetPlan.roxzone) - reference.roxzoneSeconds}
              className="w-14 text-right text-xs"
            />
          </span>
        </div>
        {mode === "build" ? (
          <input
            type="range"
            aria-label="Roxzone total"
            min={120}
            max={900}
            step={5}
            value={values.roxzone}
            onChange={(e) => setValues((s) => ({ ...s, roxzone: Number(e.target.value) }))}
            className="mt-2 w-full accent-[var(--suth-accent)]"
          />
        ) : null}
      </div>

      <p className="mt-4 text-xs text-suth-text-tertiary">
        Reference splits are the median of {reference.sampleSize.toLocaleString("en-GB")}{" "}
        {reference.label.replace("HYROX ", "")} races in the demo dataset.
        {mode === "target"
          ? " Target splits scale that profile to your goal, so they stay in realistic proportion."
          : " Drag any segment to model a change."}
      </p>
    </div>
  );
}

function Breakdown({ label, seconds, total }: { label: string; seconds: number; total: number }) {
  return (
    <div>
      <div className="text-suth-text-tertiary">{label}</div>
      <div className="results-num mt-0.5 text-suth-text">{formatSplit(seconds)}</div>
      <div className="results-num text-[11px] text-suth-text-tertiary">
        {total > 0 ? formatPercent((seconds / total) * 100) : "—"}
      </div>
    </div>
  );
}

function SegmentRow({
  label, stationLabel, stationHref, runSeconds, stationSeconds,
  referenceRun, referenceStation, editable, onRun, onStation,
}: {
  label: string;
  stationLabel: string;
  stationHref: string;
  runSeconds: number;
  stationSeconds: number;
  referenceRun: number;
  referenceStation: number;
  editable: boolean;
  onRun: (v: number) => void;
  onStation: (v: number) => void;
}) {
  return (
    <div className="rounded-md border border-suth-border-subtle bg-suth-elevated p-3">
      <Segment
        label={label}
        seconds={runSeconds}
        reference={referenceRun}
        editable={editable}
        min={Math.round(referenceRun * 0.5)}
        max={Math.round(referenceRun * 2)}
        onChange={onRun}
      />
      <div className="mt-2.5 border-t border-suth-border-subtle pt-2.5">
        <Segment
          label={stationLabel}
          href={stationHref}
          seconds={stationSeconds}
          reference={referenceStation}
          editable={editable}
          min={Math.round(referenceStation * 0.4)}
          max={Math.round(referenceStation * 2.2)}
          onChange={onStation}
        />
      </div>
    </div>
  );
}

function Segment({
  label, href, seconds, reference, editable, min, max, onChange,
}: {
  label: string;
  href?: string;
  seconds: number;
  reference: number;
  editable: boolean;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        {href ? (
          <Link
            href={href}
            data-inline-tap
            className="text-xs text-suth-text hover:text-suth-accent
                       focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            {label}
          </Link>
        ) : (
          <span className="text-xs text-suth-text-secondary">{label}</span>
        )}
        <span className="flex items-baseline gap-2.5">
          <span className="results-num text-sm text-suth-text">{formatSplit(seconds)}</span>
          <Delta seconds={seconds - reference} className="w-14 text-right text-[11px]" />
        </span>
      </div>
      {editable ? (
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={1}
          value={seconds}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1.5 w-full accent-[var(--suth-accent)]"
        />
      ) : (
        <div className="relative mt-2 h-1.5 overflow-hidden rounded-sm bg-suth-overlay">
          <div
            className="absolute inset-y-0 left-0 rounded-sm bg-suth-accent/60"
            style={{ width: `${Math.min(100, (seconds / (reference * 1.6)) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
