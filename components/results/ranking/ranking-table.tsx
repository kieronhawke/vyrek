"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, X, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Time, Delta, Nationality, MicroLabel, Skeleton } from "../ui/primitives";
import { rankBand } from "@/lib/results/percentiles";
import { AGE_GROUPS, STATION_IDS, STATION_LABEL } from "@/lib/results/model";
import { formatSplit, formatCount } from "@/lib/results/format";
import type { CompactRow } from "@/app/api/results/ranking/[slug]/route";

/**
 * Division leaderboard.
 *
 * Two things the reference site does not do:
 *
 * 1. **Sort, filter and search happen locally.** The whole division arrives
 *    once as compact tuples, so every interaction is instant instead of a
 *    server round trip. On a 3,200-row field that is the difference between
 *    a tool and a form.
 * 2. **Splits expand in place.** Theirs makes you leave the board to see a
 *    breakdown; here the row opens and the splits draw against the division
 *    average, so you keep your position in the field.
 *
 * Only the visible window is in the DOM — roughly 30 rows plus overscan
 * regardless of field size.
 */

const ROW_HEIGHT = 44;
const OVERSCAN = 8;

type SortKey = "rank" | "name" | "time" | "ageGroup";
type SortDir = "asc" | "desc";

type Splits = {
  runs: number[];
  stations: number[];
  roxzoneSeconds: number;
  averageRuns: number[];
  averageStations: number[];
  averageRoxzone: number;
};

export function RankingTable({
  slug, initialRows, leaderTimeSeconds, fieldSize,
}: {
  slug: string;
  initialRows: CompactRow[];
  leaderTimeSeconds: number;
  fieldSize: number;
}) {
  const [rows, setRows] = useState<CompactRow[]>(initialRows);
  const [complete, setComplete] = useState(initialRows.length >= fieldSize);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "rank", dir: "asc" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  /** Measured height of the open splits panel, fed back into the row offsets. */
  const [panelHeight, setPanelHeight] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);

  // Pull the rest of the division after first paint. The SSR'd first page is
  // what search engines and no-JS visitors see; this upgrades it.
  useEffect(() => {
    if (complete) return;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/results/ranking/${slug}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { rows: CompactRow[] };
        setRows(data.rows);
        setComplete(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [slug, complete]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setViewportHeight(el.clientHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visible = useMemo(() => {
    let out = rows;
    if (ageGroup) out = out.filter((r) => r[5] === ageGroup);
    if (query.trim().length > 0) {
      const needle = query.trim().toLowerCase();
      out = out.filter((r) => r[3].toLowerCase().includes(needle));
    }
    const dir = sort.dir === "asc" ? 1 : -1;
    const sorted = [...out];
    sorted.sort((a, b) => {
      switch (sort.key) {
        case "name": return a[3].localeCompare(b[3]) * dir;
        case "time": return (a[6] - b[6]) * dir;
        case "ageGroup": return (a[5].localeCompare(b[5]) || a[1] - b[1]) * dir;
        default: return (a[1] - b[1]) * dir;
      }
    });
    return sorted;
  }, [rows, query, ageGroup, sort]);

  /**
   * Windowing has to account for the one row that can be expanded: its splits
   * panel is far taller than ROW_HEIGHT, so a naive `index * ROW_HEIGHT` puts
   * every row below it underneath the panel. Because at most one row is open,
   * the correction is a single offset applied to everything after it.
   */
  const expandedIndex = expanded ? visible.findIndex((r) => r[0] === expanded) : -1;
  const offsetAfter = expandedIndex >= 0 ? panelHeight : 0;
  const totalHeight = visible.length * ROW_HEIGHT + offsetAfter;

  const topFor = useCallback(
    (index: number) =>
      index * ROW_HEIGHT + (expandedIndex >= 0 && index > expandedIndex ? panelHeight : 0),
    [expandedIndex, panelHeight],
  );

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    visible.length,
    Math.ceil((scrollTop + viewportHeight + offsetAfter) / ROW_HEIGHT) + OVERSCAN,
  );
  const window_ = visible.slice(startIndex, endIndex);

  const toggleSort = useCallback((key: SortKey) => {
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key, dir: key === "name" || key === "ageGroup" ? "asc" : "asc" }));
  }, []);

  const jumpToRank = useCallback((rank: number) => {
    const index = visible.findIndex((r) => r[1] === rank);
    if (index >= 0 && scrollerRef.current) {
      scrollerRef.current.scrollTop = Math.max(0, index * ROW_HEIGHT - viewportHeight / 3);
    }
  }, [visible, viewportHeight]);

  return (
    <div>
      <Controls
        query={query}
        onQuery={setQuery}
        ageGroup={ageGroup}
        onAgeGroup={setAgeGroup}
        shown={visible.length}
        total={rows.length}
        fieldSize={fieldSize}
        complete={complete}
        failed={failed}
        onJump={jumpToRank}
      />

      {/* Desktop: semantic table, windowed. */}
      <div className="mt-3 hidden overflow-hidden rounded-md border border-suth-border-subtle md:block">
        {/* No role="row"/"columnheader" here: the virtualised body rows are
            absolutely positioned divs and cannot form a valid table, so a
            partial ARIA table is worse than none — axe flags the orphaned row.
            The sort controls carry their state in aria-label instead. */}
        <div className="flex items-center gap-3 border-b border-suth-border bg-suth-overlay px-4 py-2">
          <SortHeader className="w-12" label="#" active={sort} sortKey="rank" onSort={toggleSort} />
          <SortHeader className="flex-1" label="Athlete" active={sort} sortKey="name" onSort={toggleSort} />
          <SortHeader className="w-20" label="Age" active={sort} sortKey="ageGroup" onSort={toggleSort} />
          <SortHeader className="w-24 justify-end" label="Time" active={sort} sortKey="time" onSort={toggleSort} />
          <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            Gap
          </span>
          <span className="w-8" aria-hidden />
        </div>

        <div
          ref={scrollerRef}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          aria-label="Division results"
          className="max-h-[70vh] overflow-y-auto"
        >
          {visible.length === 0 ? (
            <EmptyRows query={query} ageGroup={ageGroup} />
          ) : (
            <div style={{ height: totalHeight, position: "relative" }}>
              {window_.map((row, i) => (
                <div
                  key={row[0]}
                  style={{ position: "absolute", top: topFor(startIndex + i), left: 0, right: 0 }}
                >
                  <Row
                    row={row}
                    leaderTimeSeconds={leaderTimeSeconds}
                    fieldSize={fieldSize}
                    expanded={expanded === row[0]}
                    onToggle={() => {
                      setPanelHeight(0);
                      setExpanded((id) => (id === row[0] ? null : row[0]));
                    }}
                    onPanelResize={setPanelHeight}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: the same data as cards. Not a squeezed table. */}
      <ul className="mt-3 space-y-2 md:hidden">
        {visible.length === 0 ? (
          <li><EmptyRows query={query} ageGroup={ageGroup} /></li>
        ) : (
          visible.slice(0, 60).map((row) => (
            <MobileCard
              key={row[0]}
              row={row}
              leaderTimeSeconds={leaderTimeSeconds}
              fieldSize={fieldSize}
              expanded={expanded === row[0]}
              onToggle={() => setExpanded((id) => (id === row[0] ? null : row[0]))}
            />
          ))
        )}
        {visible.length > 60 ? (
          <li className="pt-2 text-center text-xs text-suth-text-tertiary">
            Showing the first 60 of {formatCount(visible.length)}. Use search or the age filter to
            narrow it down.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/* ─── Controls ─────────────────────────────────────────────────────── */

function Controls({
  query, onQuery, ageGroup, onAgeGroup, shown, total, fieldSize, complete, failed, onJump,
}: {
  query: string;
  onQuery: (v: string) => void;
  ageGroup: string;
  onAgeGroup: (v: string) => void;
  shown: number;
  total: number;
  fieldSize: number;
  complete: boolean;
  failed: boolean;
  onJump: (rank: number) => void;
}) {
  const [rankInput, setRankInput] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex min-w-[12rem] flex-1 items-center md:max-w-xs">
        <Search className="pointer-events-none absolute left-3 size-4 text-suth-text-tertiary" aria-hidden />
        <span className="sr-only">Search this division by name</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Find an athlete"
          className="min-h-[40px] w-full rounded-sm border border-suth-border bg-suth-elevated
                     pl-9 pr-8 text-sm text-suth-text outline-none
                     placeholder:text-suth-text-tertiary focus-visible:border-suth-accent"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="absolute right-2 rounded-sm p-1 text-suth-text-tertiary hover:text-suth-text"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </label>

      <label className="relative">
        <span className="sr-only">Filter by age group</span>
        <select
          value={ageGroup}
          onChange={(e) => onAgeGroup(e.target.value)}
          className="min-h-[40px] appearance-none rounded-sm border border-suth-border
                     bg-suth-elevated pl-3 pr-8 text-sm text-suth-text outline-none
                     focus-visible:border-suth-accent"
        >
          <option value="">All ages</option>
          {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-suth-text-tertiary" aria-hidden />
      </label>

      {/* "Jump to rank" — a 3,200-row board is unusable without it, and no
          competitor offers it. */}
      <form
        className="hidden items-center gap-1.5 md:flex"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(rankInput);
          if (Number.isFinite(n) && n > 0) onJump(n);
        }}
      >
        <label className="sr-only" htmlFor="jump-rank">Jump to rank</label>
        <input
          id="jump-rank"
          inputMode="numeric"
          value={rankInput}
          onChange={(e) => setRankInput(e.target.value.replace(/\D/g, ""))}
          placeholder="Rank"
          className="results-num min-h-[40px] w-20 rounded-sm border border-suth-border
                     bg-suth-elevated px-3 text-sm text-suth-text outline-none
                     placeholder:text-suth-text-tertiary focus-visible:border-suth-accent"
        />
        <button
          type="submit"
          aria-label="Jump to rank"
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-sm border
                     border-suth-border bg-suth-elevated px-3 text-xs text-suth-text-secondary
                     hover:text-suth-text focus-visible:outline-2 focus-visible:outline-suth-accent"
        >
          <LocateFixed className="size-3.5" aria-hidden />
          Jump
        </button>
      </form>

      <p className="results-num ml-auto text-xs text-suth-text-tertiary" aria-live="polite">
        {failed
          ? `Showing ${formatCount(total)} of ${formatCount(fieldSize)} — reload for the rest`
          : !complete
            ? `Loading all ${formatCount(fieldSize)}…`
            : `${formatCount(shown)} of ${formatCount(total)}`}
      </p>
    </div>
  );
}

function SortHeader({
  label, sortKey, active, onSort, className,
}: {
  label: string;
  sortKey: SortKey;
  active: { key: SortKey; dir: SortDir };
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  const isActive = active.key === sortKey;
  return (
    <span className={cn("flex", className)}>
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}${isActive ? (active.dir === "asc" ? ", currently ascending" : ", currently descending") : ""}`}
      className={cn(
        "flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
        "focus-visible:outline-2 focus-visible:outline-suth-accent",
        isActive ? "text-suth-accent" : "text-suth-text-tertiary hover:text-suth-text-secondary",
        "w-full",
      )}
    >
      {label}
      <span aria-hidden className={cn("text-[8px]", !isActive && "opacity-0")}>
        {active.dir === "asc" ? "▲" : "▼"}
      </span>
    </button>
    </span>
  );
}

/* ─── Rows ─────────────────────────────────────────────────────────── */

function Row({
  row, leaderTimeSeconds, fieldSize, expanded, onToggle, onPanelResize,
}: {
  row: CompactRow;
  leaderTimeSeconds: number;
  fieldSize: number;
  expanded: boolean;
  onToggle: () => void;
  onPanelResize?: (height: number) => void;
}) {
  const [id, rank, , name, iso, ageGroup, finishSeconds] = row;
  const band = rankBand(rank, fieldSize);

  return (
    <div className={cn("border-b border-suth-border-subtle bg-suth-base", `results-band-${band}`)}>
      <div className="flex h-11 items-center gap-3 overflow-hidden px-4">
        <span className="results-num w-12 shrink-0 self-center text-sm leading-4 text-suth-text-tertiary">
          {rank}
        </span>
        <span className="flex min-w-0 flex-1 select-none items-center gap-2 self-center">
          <Nationality iso={iso} />
          {/* data-inline-tap opts out of the global 48px tap-target floor in
              globals.css. Correct here: this is a dense desktop table row, and
              the whole row is the touch affordance on mobile via the card. */}
          <Link
            href={`/result/${id}`}
            data-inline-tap
            className="truncate text-sm leading-4 text-suth-text hover:text-suth-accent
                       focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            {name}
          </Link>
        </span>
        <span className="results-num w-20 shrink-0 self-center text-xs leading-4 text-suth-text-secondary">
          {ageGroup}
        </span>
        <Time seconds={finishSeconds} className="w-24 shrink-0 self-center text-right text-sm leading-4" />
        <span className="w-20 shrink-0 self-center text-right leading-4">
          {rank > 1
            ? <Delta seconds={finishSeconds - leaderTimeSeconds} className="text-xs" />
            : <span className="results-num text-xs text-suth-text-tertiary">leader</span>}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? `Hide splits for ${name}` : `Show splits for ${name}`}
          data-inline-tap
          className="flex size-8 shrink-0 items-center justify-center self-center rounded-sm
                     text-suth-text-tertiary hover:text-suth-accent
                     focus-visible:outline-2 focus-visible:outline-suth-accent"
        >
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden />
        </button>
      </div>
      {expanded ? <SplitPanel id={id} onResize={onPanelResize} /> : null}
    </div>
  );
}

function MobileCard({
  row, leaderTimeSeconds, fieldSize, expanded, onToggle,
}: {
  row: CompactRow;
  leaderTimeSeconds: number;
  fieldSize: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [id, rank, , name, iso, ageGroup, finishSeconds] = row;
  const band = rankBand(rank, fieldSize);

  return (
    <li
      className={cn(
        "rounded-md border border-suth-border-subtle bg-suth-elevated",
        `results-band-${band}`,
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2.5 text-left
                   focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-suth-accent"
      >
        <span className="results-num w-8 shrink-0 text-sm text-suth-text-tertiary">{rank}</span>
        <Nationality iso={iso} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-suth-text">{name}</span>
          {/* Secondary, not tertiary: the percentile band tint behind the top
              rows lifts the background enough that tertiary drops under 4.5:1. */}
          <span className="results-num text-[11px] text-suth-text-secondary">{ageGroup}</span>
        </span>
        <span className="shrink-0 text-right">
          <Time seconds={finishSeconds} className="block text-sm" />
          {rank > 1
            ? <Delta seconds={finishSeconds - leaderTimeSeconds} className="text-[11px]" />
            : <span className="results-num text-[11px] text-suth-accent">leader</span>}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-suth-text-tertiary transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="px-3 pb-3">
          <SplitPanel id={id} />
          <Link
            href={`/result/${id}`}
            className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.16em] text-suth-accent"
          >
            Full breakdown →
          </Link>
        </div>
      ) : null}
    </li>
  );
}

/* ─── Inline splits ────────────────────────────────────────────────── */

function SplitPanel({ id, onResize }: { id: string; onResize?: (h: number) => void }) {
  const [data, setData] = useState<Splits | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/results/result/${id}`, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        setData((await res.json()) as Splits);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setFailed(true);
      }
    })();
    return () => controller.abort();
  }, [id]);

  // Report height back so the windowed list can offset the rows below. Without
  // this the panel renders underneath them.
  useEffect(() => {
    const el = ref.current;
    if (!el || !onResize) return;
    const report = () => onResize(el.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      observer.disconnect();
      onResize(0);
    };
  }, [onResize, data]);

  if (failed) {
    return (
      <div ref={ref} className="px-4 py-3">
        <p className="text-xs text-suth-text-secondary">Splits unavailable for this race.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div ref={ref} className="space-y-1.5 px-4 py-3">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-3 w-full" />)}
      </div>
    );
  }

  // Stations only, so the bars share one honest scale. A runs total on the same
  // axis is five times any station and flattens every other bar.
  const stationMax = Math.max(...data.stations, ...data.averageStations, data.roxzoneSeconds, 1);
  const runTotal = data.runs.reduce((s, v) => s + v, 0);
  const runAverage = data.averageRuns.reduce((s, v) => s + v, 0);

  return (
    <div ref={ref} className="border-t border-suth-border-subtle bg-suth-base/60 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <MicroLabel>Splits vs division average</MicroLabel>
        <span className="text-[11px] text-suth-text-tertiary">
          Runs{" "}
          <span className="results-num text-suth-text">{formatSplit(runTotal)}</span>{" "}
          <Delta seconds={runTotal - runAverage} className="text-[11px]" />
        </span>
      </div>

      <ul className="mt-2 grid gap-x-8 gap-y-1.5 lg:grid-cols-2">
        {STATION_IDS.map((station, i) => (
          <SplitBar
            key={station}
            label={STATION_LABEL[station]}
            seconds={data.stations[i]}
            average={data.averageStations[i]}
            max={stationMax}
          />
        ))}
        <SplitBar
          label="Roxzone"
          seconds={data.roxzoneSeconds}
          average={data.averageRoxzone}
          max={stationMax}
        />
      </ul>

      <Link
        href={`/result/${id}`}
        data-inline-tap
        className="mt-2.5 inline-block font-mono text-[10px] uppercase tracking-[0.16em]
                   text-suth-text-tertiary hover:text-suth-accent
                   focus-visible:outline-2 focus-visible:outline-suth-accent"
      >
        Full race breakdown →
      </Link>
    </div>
  );
}

function SplitBar({
  label, seconds, average, max,
}: {
  label: string;
  seconds: number;
  average: number;
  max: number;
}) {
  const delta = seconds - average;
  const width = Math.max(2, (seconds / max) * 100);
  const averageMark = Math.max(0, Math.min(100, (average / max) * 100));

  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span className="w-28 shrink-0 truncate text-suth-text-secondary">{label}</span>
      <span className="relative h-2.5 flex-1 overflow-hidden rounded-sm bg-suth-overlay">
        <span
          className={cn(
            "absolute inset-y-0 left-0 rounded-sm",
            delta <= 0 ? "bg-[var(--results-faster-bar)]" : "bg-[var(--results-slower-bar)]",
          )}
          style={{ width: `${width}%` }}
        />
        {/* Division average marker — the bar is meaningless without it. */}
        <span
          className="absolute inset-y-0 w-px bg-suth-text-secondary"
          style={{ left: `${averageMark}%` }}
          aria-hidden
        />
      </span>
      <span className="results-num w-12 shrink-0 text-right text-suth-text">{formatSplit(seconds)}</span>
      <Delta seconds={delta} className="w-12 shrink-0 text-right" />
    </li>
  );
}

function EmptyRows({ query, ageGroup }: { query: string; ageGroup: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="text-sm text-suth-text-secondary">
        No athletes match
        {query ? <> &ldquo;<span className="text-suth-text">{query}</span>&rdquo;</> : null}
        {query && ageGroup ? " in " : null}
        {ageGroup ? <span className="text-suth-text">{ageGroup}</span> : null}.
      </p>
    </div>
  );
}
