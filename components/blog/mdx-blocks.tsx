"use client";

import type { ReactNode } from "react";
import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Stage 9 (PART 8) modular blog blocks.
 *
 * Six MDX components authors drop into posts:
 *   <RaceAnalytics>       — splits table for a single race
 *   <Leaderboard>         — top-N rows for an event/division
 *   <TipCallout>          — dedicated "trainer tip" block, distinct from
 *                           the generic <Callout tone="tip">
 *   <ComparisonTable>     — side-by-side comparison (programmes, kit, etc)
 *   <WorkoutDemoVideo>    — embedded demo video with safe loading
 *   <SledCalculator>      — interactive sled load picker (kg, division
 *                           multiplier, percentage of bodyweight)
 *
 * All client-only because at least the calculator needs state; the others
 * are stateless but live alongside in this file for one-line import.
 */

// ─────────────────────────────────────────────────────────────
// 1. RaceAnalytics — per-race splits table
// ─────────────────────────────────────────────────────────────

export type RaceSplit = { station: string; split: string; cumulative?: string };

export function RaceAnalytics({
  athlete,
  event,
  totalTime,
  splits,
}: {
  athlete: string;
  event: string;
  totalTime: string;
  splits?: RaceSplit[];
}) {
  const rows = Array.isArray(splits) ? splits : [];
  if (!rows.length) return null;
  return (
    <figure className="mt-10 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-vyrek-border-subtle px-5 py-4 md:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ RACE ANALYTICS ]
          </p>
          <p className="mt-1 text-base font-bold text-vyrek-text md:text-lg">
            {athlete} · {event}
          </p>
        </div>
        <p className="font-mono text-lg font-bold tabular-nums text-vyrek-text md:text-xl">
          {totalTime}
        </p>
      </header>
      <table className="w-full text-sm md:text-base">
        <thead>
          <tr className="border-b border-vyrek-border-subtle text-left">
            <th className="px-5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary md:px-6">
              Station
            </th>
            <th className="px-5 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary md:px-6">
              Split
            </th>
            <th className="hidden px-5 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary md:table-cell md:px-6">
              Cumulative
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.station}
              className="border-b border-vyrek-border-subtle last:border-b-0"
            >
              <td className="px-5 py-3 text-vyrek-text md:px-6">{s.station}</td>
              <td className="px-5 py-3 text-right font-mono tabular-nums text-vyrek-text md:px-6">
                {s.split}
              </td>
              <td className="hidden px-5 py-3 text-right font-mono tabular-nums text-vyrek-text-secondary md:table-cell md:px-6">
                {s.cumulative ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Leaderboard — top-N athlete rows for an event/division
// ─────────────────────────────────────────────────────────────

export type LeaderboardRow = {
  rank: number;
  name: string;
  time: string;
  nationality?: string;
};

export function Leaderboard({
  event,
  division,
  rows,
  caption,
}: {
  event: string;
  division: string;
  rows?: LeaderboardRow[];
  caption?: string;
}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return null;
  return (
    <figure className="mt-10 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated">
      <header className="border-b border-vyrek-border-subtle px-5 py-4 md:px-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ LEADERBOARD · {division} ]
        </p>
        <p className="mt-1 text-base font-bold text-vyrek-text md:text-lg">
          {event}
        </p>
      </header>
      <ol role="list" className="divide-y divide-vyrek-border-subtle">
        {list.map((r) => (
          <li
            key={`${r.rank}-${r.name}`}
            className="grid grid-cols-[40px_1fr_auto] items-center gap-3 px-5 py-3 md:px-6"
          >
            <span className="font-mono text-sm font-bold tabular-nums text-vyrek-accent">
              {String(r.rank).padStart(2, "0")}
            </span>
            <span className="text-base font-medium text-vyrek-text">
              {r.name}
              {r.nationality ? (
                <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  {r.nationality}
                </span>
              ) : null}
            </span>
            <span className="font-mono text-base font-bold tabular-nums text-vyrek-text">
              {r.time}
            </span>
          </li>
        ))}
      </ol>
      {caption ? (
        <figcaption className="border-t border-vyrek-border-subtle px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary md:px-6">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. TipCallout — dedicated trainer tip
// ─────────────────────────────────────────────────────────────

export function TipCallout({
  coach,
  title,
  children,
}: {
  coach?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <aside
      role="note"
      className={cn(
        "mt-10 grid gap-4 rounded-lg border border-vyrek-accent/30 bg-vyrek-accent/5 p-5 md:grid-cols-[120px_1fr] md:gap-6 md:p-6",
      )}
    >
      <div className="flex items-start gap-3 md:flex-col">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full border border-vyrek-accent/40 bg-vyrek-base/40 font-mono text-base font-bold text-vyrek-accent md:size-16 md:text-lg"
        >
          T
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent md:mt-2">
          [ COACH TIP ]
        </p>
      </div>
      <div>
        <p className="text-lg font-bold leading-tight text-vyrek-text md:text-xl">
          {title}
        </p>
        <div className="mt-3 text-base leading-relaxed text-vyrek-text [&>p:first-child]:mt-0 [&>p]:mt-3">
          {children}
        </div>
        {coach ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            {coach}
          </p>
        ) : null}
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. ComparisonTable — side-by-side comparison
// ─────────────────────────────────────────────────────────────

export type ComparisonRow = {
  label: string;
  values: string[];
};

export function ComparisonTable({
  columns,
  rows,
  caption,
}: {
  columns?: string[];
  rows?: ComparisonRow[];
  caption?: string;
}) {
  const cols = Array.isArray(columns) ? columns : [];
  const rs = Array.isArray(rows) ? rows : [];
  if (!cols.length || !rs.length) return null;
  return (
    <figure className="mt-10 overflow-x-auto">
      <table className="w-full min-w-[480px] overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated text-sm md:text-base">
        <thead>
          <tr className="border-b border-vyrek-border-subtle bg-vyrek-base/40">
            <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary md:px-5" />
            {cols.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-left font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text md:px-5"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rs.map((r) => (
            <tr
              key={r.label}
              className="border-b border-vyrek-border-subtle last:border-b-0"
            >
              <th
                scope="row"
                className="px-4 py-3 text-left text-sm font-bold text-vyrek-text-secondary md:px-5"
              >
                {r.label}
              </th>
              {(Array.isArray(r.values) ? r.values : []).map((v, i) => (
                <td
                  key={`${r.label}-${i}`}
                  className="px-4 py-3 align-top text-vyrek-text md:px-5"
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption ? (
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. WorkoutDemoVideo — embed YouTube/Vimeo/MP4 with poster
// ─────────────────────────────────────────────────────────────

export function WorkoutDemoVideo({
  title,
  src,
  poster,
  duration,
  coach,
}: {
  title: string;
  src: string;
  poster?: string;
  duration?: string;
  coach?: string;
}) {
  const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");
  const isVimeo = src.includes("vimeo.com");
  const isFile = !isYouTube && !isVimeo;
  // Defer iframe load until the user clicks. YouTube + Vimeo iframes
  // each ship 400-800 KB of JS that wreck Lighthouse perf even with
  // loading="lazy"; the play-poster pattern delays that cost to user
  // intent.
  const [playing, setPlaying] = useState(false);
  // Auto-extract a YouTube thumbnail from the embed URL when no
  // explicit poster is provided.
  const ytId = isYouTube
    ? src.match(/(?:embed\/|v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1]
    : null;
  const computedPoster =
    poster ?? (ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : null);

  return (
    <figure className="mt-10 overflow-hidden rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-vyrek-border-subtle px-5 py-4 md:px-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ WORKOUT DEMO ]
          </p>
          <p className="mt-1 text-base font-bold text-vyrek-text md:text-lg">
            {title}
          </p>
        </div>
        {duration ? (
          <p className="font-mono text-sm tabular-nums text-vyrek-text-secondary">
            {duration}
          </p>
        ) : null}
      </header>
      <div className="relative aspect-video bg-vyrek-base">
        {isFile ? (
          <video
            src={src}
            poster={poster}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : playing ? (
          <iframe
            src={`${src}${src.includes("?") ? "&" : "?"}autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play ${title}`}
            className="group absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            {computedPoster ? (
              <img
                src={computedPoster}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => {
                  // YouTube maxresdefault sometimes 404s — fall back to hqdefault.
                  if (ytId && !e.currentTarget.dataset.fellback) {
                    e.currentTarget.dataset.fellback = "1";
                    e.currentTarget.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
                  }
                }}
              />
            ) : null}
            <div
              aria-hidden
              className="absolute inset-0 bg-vyrek-base/40 transition-colors group-hover:bg-vyrek-base/20"
            />
            <span
              aria-hidden
              className="relative flex size-16 items-center justify-center rounded-full bg-vyrek-accent text-[#0A0A0A] transition-transform duration-base group-hover:scale-110 md:size-20"
            >
              <svg viewBox="0 0 24 24" className="size-7 md:size-9" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      {coach ? (
        <figcaption className="border-t border-vyrek-border-subtle px-5 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary md:px-6">
          Demonstrated by {coach}
        </figcaption>
      ) : null}
    </figure>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. SledCalculator — interactive sled load picker
// ─────────────────────────────────────────────────────────────

type Division = "mens-open" | "mens-pro" | "womens-open" | "womens-pro";

const DIVISION_LOADS: Record<Division, { push: number; pull: number; label: string }> = {
  "mens-open": { push: 152, pull: 103, label: "Men's Open" },
  "mens-pro": { push: 202, pull: 153, label: "Men's Pro" },
  "womens-open": { push: 102, pull: 78, label: "Women's Open" },
  "womens-pro": { push: 152, pull: 103, label: "Women's Pro" },
};

export function SledCalculator({
  defaultBodyweight = 75,
}: {
  defaultBodyweight?: number;
}) {
  const id = useId();
  const [bodyweight, setBodyweight] = useState<number>(defaultBodyweight);
  const [division, setDivision] = useState<Division>("mens-open");

  const stats = useMemo(() => {
    const d = DIVISION_LOADS[division];
    const pushPct = bodyweight > 0 ? Math.round((d.push / bodyweight) * 100) : 0;
    const pullPct = bodyweight > 0 ? Math.round((d.pull / bodyweight) * 100) : 0;
    return { push: d.push, pull: d.pull, pushPct, pullPct, label: d.label };
  }, [bodyweight, division]);

  return (
    <figure className="mt-10 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
        [ SLED CALCULATOR ]
      </p>
      <p className="mt-1 text-base font-bold text-vyrek-text md:text-lg">
        Race-day sled load vs your bodyweight
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <label
          className="flex flex-col gap-2 text-sm text-vyrek-text-secondary"
          htmlFor={`${id}-bw`}
        >
          Bodyweight (kg)
          <input
            id={`${id}-bw`}
            type="number"
            min={30}
            max={200}
            step={1}
            value={bodyweight}
            onChange={(e) => setBodyweight(Number(e.target.value) || 0)}
            className="rounded-md border border-vyrek-border bg-vyrek-base px-3 py-2 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
          />
        </label>
        <label
          className="flex flex-col gap-2 text-sm text-vyrek-text-secondary"
          htmlFor={`${id}-div`}
        >
          Division
          <select
            id={`${id}-div`}
            value={division}
            onChange={(e) => setDivision(e.target.value as Division)}
            className="rounded-md border border-vyrek-border bg-vyrek-base px-3 py-2 text-base text-vyrek-text outline-none focus:border-vyrek-accent"
          >
            {(Object.keys(DIVISION_LOADS) as Division[]).map((k) => (
              <option key={k} value={k}>
                {DIVISION_LOADS[k].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-4">
          <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Sled push
          </dt>
          <dd className="mt-2 text-2xl font-black tabular-nums text-vyrek-text md:text-3xl">
            {stats.push} kg
          </dd>
          <dd className="mt-1 font-mono text-xs text-vyrek-accent">
            {stats.pushPct}% of bodyweight
          </dd>
        </div>
        <div className="rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-4">
          <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Sled pull
          </dt>
          <dd className="mt-2 text-2xl font-black tabular-nums text-vyrek-text md:text-3xl">
            {stats.pull} kg
          </dd>
          <dd className="mt-1 font-mono text-xs text-vyrek-accent">
            {stats.pullPct}% of bodyweight
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-vyrek-text-tertiary">
        Calibrate your training loads from this baseline. Most members start
        at 80% of race weight in week one and progress to 100% by week six.
      </p>
    </figure>
  );
}
