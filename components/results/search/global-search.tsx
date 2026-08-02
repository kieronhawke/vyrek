"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, CornerDownLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { flagEmoji } from "@/lib/results/format";
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

  useEffect(() => {
    // After paint, so the mobile sheet animation does not fight the keyboard.
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
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
  const flat: Flat[] = showResults
    ? [
        ...results.athletes.map((a) => ({ kind: "athlete" as const, ...a })),
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

      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden
                   rounded-t-lg border border-suth-border bg-suth-elevated
                   shadow-2xl md:rounded-lg"
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
            className="min-h-[44px] flex-1 bg-transparent py-3 text-base text-suth-text
                       outline-none placeholder:text-suth-text-tertiary"
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
              {results.athletes.length > 0 ? (
                <Section title={`Athletes (${results.athletes.length})`}>
                  {results.athletes.map((a, i) => (
                    <Row
                      key={a.slug}
                      active={active === i}
                      onSelect={() => commit({ kind: "athlete", ...a })}
                      onHover={() => setActive(i)}
                    >
                      <span aria-hidden className="text-sm">{flagEmoji(a.countryIso)}</span>
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
                    const index = results.athletes.length + i;
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

/** Binds ⌘K / Ctrl+K anywhere in the Results section. */
export function useSearchHotkey(onOpen: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onOpen]);
}
