"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft, Clock, Percent, Target, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/results/format";
import { Flag } from "../ui/flag";
import { detectIntent } from "@/lib/results/search";
import { instantSearch, mergeResults, type PopularAthlete } from "@/lib/results/search/instant";
import type { SearchResults } from "@/lib/results/source";

/**
 * Global search — ⌘K on desktop, a bottom sheet on mobile.
 *
 * The reference site treats search as a header afterthought. For a results
 * site it is the primary navigation method: most arrivals are looking for one
 * name. So this is fully keyboard-navigable, groups athletes and events, and
 * remembers recent searches locally.
 *
 * The panel is mounted only while open. That is deliberate: it means query,
 * results and selection state initialise fresh on every open with no
 * reset-on-close effects to keep in sync.
 */

const RECENT_KEY = "suth:results:recent-searches";
const MAX_RECENT = 6;

/**
 * The prefetched name list, held for the lifetime of the tab.
 *
 * Module scope, not React state: the palette unmounts on close, and a visitor
 * who opens search three times should download this once. The promise itself is
 * cached so two rapid opens share one request rather than racing.
 */
let popularIndex: PopularAthlete[] | null = null;
let popularRequest: Promise<PopularAthlete[]> | null = null;

export function prefetchPopular(): Promise<PopularAthlete[]> {
  if (popularIndex) return Promise.resolve(popularIndex);
  popularRequest ??= fetch("/api/results/search/popular")
    .then((res) => (res.ok ? res.json() : { athletes: [] }))
    .then((data: { athletes?: PopularAthlete[] }) => {
      popularIndex = data.athletes ?? [];
      return popularIndex;
    })
    .catch(() => {
      // Never fatal. Without it the palette behaves exactly as it did before:
      // every query answered by the server.
      popularRequest = null;
      return [];
    });
  return popularRequest;
}

type Flat =
  | { kind: "athlete"; slug: string; name: string; countryIso: string; raceCount: number }
  | { kind: "event"; slug: string; name: string; city: string; year: number };

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SearchPanel onClose={onClose} />;
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    // A corrupt or blocked localStorage must never break search.
    return [];
  }
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ athletes: [], events: [] });
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  // Lazy initialiser: this component only ever mounts client-side, so
  // localStorage is available and no effect is needed to hydrate it.
  const [recent, setRecent] = useState<string[]>(readRecent);

  // The prefetched names, once they arrive. Held in state so the first render
  // after the download re-matches whatever has already been typed — a fast
  // typist can be three characters in before this lands.
  const [popular, setPopular] = useState<PopularAthlete[]>(() => popularIndex ?? []);

  useEffect(() => {
    // After paint, so the mobile sheet animation does not fight the keyboard.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let live = true;
    prefetchPopular().then((index) => {
      if (live) setPopular(index);
    });
    return () => {
      live = false;
    };
  }, []);

  // Debounced fetch. Aborts in-flight requests so a fast typist never sees an
  // older response overwrite a newer one.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/results/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SearchResults;
        if (!cancelled) {
          setResults(data);
          setFailed(false);
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 140);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const trimmed = query.trim();
  const showResults = trimmed.length >= 2;

  /**
   * Not every search is a name.
   *
   * People type their finish time to see where it places them, or "sub 90"
   * because that is how a goal is spoken. Recognising those turns a dead end
   * ("no athletes match 1:31:30") into the tool they actually wanted.
   */
  const intent = detectIntent(trimmed);

  /**
   * Matched against the prefetched list on every render, with no effect and no
   * state of its own — so it is already on screen in the same frame as the
   * keystroke that produced it.
   *
   * 5,000 names scored takes well under a millisecond; putting it behind a
   * `useMemo` would cost more in cache bookkeeping than it saves.
   */
  const instant = showResults ? instantSearch(popular, trimmed) : [];
  const athletes = mergeResults(instant, results.athletes);

  const flat: Flat[] = showResults
    ? [
        ...athletes.map((a) => ({ kind: "athlete" as const, ...a })),
        ...results.events.map((e) => ({ kind: "event" as const, ...e })),
      ]
    : [];

  const commit = useCallback((item: Flat) => {
    const term = query.trim();
    if (term) {
      const next = [term, ...recent.filter((r) => r !== term)].slice(0, MAX_RECENT);
      setRecent(next);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch { /* non-fatal */ }
    }
    onClose();
    router.push(item.kind === "athlete" ? `/athlete/${item.slug}` : `/event/${item.slug}`);
  }, [query, recent, onClose, router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && flat[active]) { e.preventDefault(); commit(flat[active]); }
  };

  const onChange = (value: string) => {
    setQuery(value);
    setActive(0);
    if (value.trim().length < 2) {
      setResults({ athletes: [], events: [] });
      setLoading(false);
      setFailed(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-start md:pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search athletes and events"
    >
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* The focus treatment lives on *this* element, and that is the whole
       * point: it is the one that owns the border radius.
       *
       * Two earlier attempts put it further in and both failed the same way.
       * An outline on the input was clipped on three sides by this sheet's
       * `overflow-hidden`. Moving it to the input's row fixed the sides but
       * not the corners — the row is a square-cornered box sitting flush in a
       * rounded, clipping parent, so its top two corners were sliced off and
       * the sheet's dark corner showed through. A straight green line with
       * black notches bitten out of each end.
       *
       * A ring can only follow a curve if it is drawn on the element that has
       * the curve. Border and box-shadow on the sheet both inherit its radius
       * exactly, and an element's own shadow is not clipped by its own
       * `overflow-hidden` — that clips children. So the edge is continuous the
       * whole way round.
       *
       * It reads as a glow rather than a hard rule because the input is
       * autofocused on open: this is the palette's resting state, not a
       * transient highlight, and it should look deliberate. */}
      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden
                   rounded-t-2xl border border-suth-border bg-suth-elevated
                   shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)]
                   transition-[border-color,box-shadow] duration-200
                   focus-within:border-suth-accent/60
                   focus-within:shadow-[0_0_0_3px_rgba(163,230,53,0.16),0_24px_60px_-12px_rgba(0,0,0,0.75)]
                   md:rounded-xl"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-suth-border-subtle px-4">
          <Search className="size-4 shrink-0 text-suth-text-tertiary" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search athletes and events"
            aria-label="Search athletes and events"
            /* globals.css paints a box-shadow ring outside every focused input.
               On a full-bleed field inside this overflow-hidden sheet that ring
               was clipped on three sides and sat against the caret. The row
               above owns the focus state instead, so the input's own ring is
               suppressed rather than drawn and cut. */
            className="results-search-field min-h-[52px] flex-1 bg-transparent py-3
                       text-base text-suth-text placeholder:text-suth-text-tertiary"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-sm p-2 text-suth-text-tertiary hover:text-suth-text
                       focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
          {!showResults && recent.length > 0 ? (
            <Section title="Recent">
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => onChange(term)}
                  className="flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm
                             text-suth-text-secondary hover:bg-suth-overlay hover:text-suth-text"
                >
                  <Clock className="size-3.5 text-suth-text-tertiary" aria-hidden />
                  {term}
                </button>
              ))}
            </Section>
          ) : null}

          {intent.type !== "text" ? (
            <Section title="Jump to">
              {intent.type === "time" ? (
                <IntentRow
                  href={`/tools/good-hyrox-time?t=${intent.seconds}`}
                  onGo={onClose}
                  icon={<Percent className="size-3.5" aria-hidden />}
                  label={`See where ${formatTime(intent.seconds)} places you`}
                  detail="Percentile against every division"
                />
              ) : null}
              {intent.type === "goal" ? (
                <IntentRow
                  href={`/simulator?mode=target&goal=${intent.seconds}`}
                  onGo={onClose}
                  icon={<Target className="size-3.5" aria-hidden />}
                  label={`Build a ${intent.label} race`}
                  detail="The split you need at every station"
                />
              ) : null}
              {intent.type === "year" ? (
                <IntentRow
                  href={`/events`}
                  onGo={onClose}
                  icon={<CalendarDays className="size-3.5" aria-hidden />}
                  label={`Events in ${intent.year}`}
                  detail="Season calendar"
                />
              ) : null}
            </Section>
          ) : null}

          {failed ? (
            <p className="px-4 py-8 text-center text-sm text-suth-text-secondary">
              Search is unavailable right now. Try again in a moment.
            </p>
          ) : null}

          {!failed && showResults && !loading && flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-suth-text-secondary">
              No athletes or events match{" "}
              <span className="text-suth-text">&ldquo;{trimmed}&rdquo;</span>.
            </p>
          ) : null}

          {loading && flat.length === 0 ? (
            <div className="space-y-px p-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="results-skeleton h-11 w-full rounded-sm" aria-hidden />
              ))}
              <span className="sr-only">Searching</span>
            </div>
          ) : null}

          {flat.length > 0 ? (
            <div role="listbox" aria-label="Search results">
              {athletes.length > 0 ? (
                <Section title={`Athletes (${athletes.length})`}>
                  {athletes.map((a, i) => (
                    <Row
                      key={a.slug}
                      active={active === i}
                      onSelect={() => commit({ kind: "athlete", ...a })}
                      onHover={() => setActive(i)}
                    >
                      <Flag iso={a.countryIso} />
                      <span className="flex-1 truncate text-suth-text">{a.name}</span>
                      <span className="results-num text-[11px] text-suth-text-tertiary">
                        {a.raceCount} {a.raceCount === 1 ? "race" : "races"}
                      </span>
                    </Row>
                  ))}
                </Section>
              ) : null}

              {results.events.length > 0 ? (
                <Section title={`Events (${results.events.length})`}>
                  {results.events.map((e, i) => {
                    const index = athletes.length + i;
                    return (
                      <Row
                        key={e.slug}
                        active={active === index}
                        onSelect={() => commit({ kind: "event", ...e })}
                        onHover={() => setActive(index)}
                      >
                        <span className="flex-1 truncate text-suth-text">{e.name}</span>
                        <span className="results-num text-[11px] uppercase tracking-wider text-suth-text-tertiary">
                          {e.status === "finished" ? "FINAL" : e.status === "live" ? "LIVE" : "UPCOMING"}
                        </span>
                      </Row>
                    );
                  })}
                </Section>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="hidden items-center gap-4 border-t border-suth-border-subtle px-4 py-2
                        font-mono text-[10px] uppercase tracking-[0.14em]
                        text-suth-text-tertiary md:flex">
          <span className="inline-flex items-center gap-1.5">
            <CornerDownLeft className="size-3" aria-hidden /> open
          </span>
          <span>↑↓ navigate</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

function IntentRow({
  href, onGo, icon, label, detail,
}: {
  href: string;
  onGo: () => void;
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => { onGo(); router.push(href); }}
      className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left
                 hover:bg-suth-overlay focus-visible:outline-2 focus-visible:outline-suth-accent"
    >
      <span className="text-suth-accent">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-suth-text">{label}</span>
        <span className="block truncate text-[11px] text-suth-text-tertiary">{detail}</span>
      </span>
      <span aria-hidden className="text-suth-accent">→</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  active, onSelect, onHover, children,
}: {
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="option"
      aria-selected={active}
      tabIndex={-1}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-4 text-left text-sm transition-colors",
        active ? "bg-suth-overlay" : "hover:bg-suth-overlay/60",
      )}
    >
      {children}
    </div>
  );
}

/**
 * Binds ⌘K / Ctrl+K inside the Results section.
 *
 * The site already has its own `CommandPalette` bound to the same combination
 * in the root layout, and it was opening *on top of* this one — two stacked
 * dialogs, the marketing palette (z-80) covering the results search (z-50).
 *
 * Registered in the capture phase so this runs before the root listener, and
 * `stopImmediatePropagation` stops the other palette opening at all. Capture
 * rather than ordering luck: the root layout mounts first, so its listener
 * would otherwise always win. Outside the Results section nothing changes —
 * this hook is only mounted here.
 */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopImmediatePropagation();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [onOpen]);
}
