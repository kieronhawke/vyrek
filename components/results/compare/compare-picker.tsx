"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { SearchResults } from "@/lib/results/source";

/**
 * Two athlete pickers that write to the URL.
 *
 * Keeping the selection in the URL means a comparison is a shareable link,
 * which is the whole point of building one — you make it to send it to someone.
 */
export function ComparePicker({
  initialA, initialB,
}: {
  initialA: string;
  initialB: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);

  const go = (nextA: string, nextB: string) => {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    const qs = params.toString();
    router.push(qs ? `/results/compare?${qs}` : "/results/compare");
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AthleteField
        label="First athlete"
        value={a}
        onPick={(slug) => { setA(slug); go(slug, b); }}
        onClear={() => { setA(""); go("", b); }}
      />
      <AthleteField
        label="Second athlete"
        value={b}
        onPick={(slug) => { setB(slug); go(a, slug); }}
        onClear={() => { setB(""); go(a, ""); }}
      />
    </div>
  );
}

function AthleteField({
  label, value, onPick, onClear,
}: {
  label: string;
  value: string;
  onPick: (slug: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults["athletes"]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    // Clearing on a short query happens in the change handler, not here — a
    // synchronous setState inside an effect cascades renders.
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/results/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as SearchResults;
        if (!cancelled) setResults(data.athletes);
      } catch { /* aborted or offline */ }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [query]);

  return (
    <div className="relative">
      <label className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
        {label}
      </label>

      {value ? (
        <div className="mt-1.5 flex min-h-[44px] items-center gap-2 rounded-sm border
                        border-suth-accent/40 bg-suth-accent/10 px-3">
          <span className="flex-1 truncate text-sm text-suth-text">{value.replace(/-/g, " ")}</span>
          <button
            type="button"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            data-inline-tap
            className="rounded-sm p-1.5 text-suth-text-tertiary hover:text-suth-text
                       focus-visible:outline-2 focus-visible:outline-suth-accent"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="relative mt-1.5">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-suth-text-tertiary" aria-hidden />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              if (e.target.value.trim().length < 2) setResults([]);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search an athlete"
            aria-label={label}
            className="min-h-[44px] w-full rounded-sm border border-suth-border bg-suth-elevated
                       pl-9 pr-3 text-sm text-suth-text outline-none
                       placeholder:text-suth-text-tertiary focus-visible:border-suth-accent"
          />
          {open && results.length > 0 ? (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-sm
                           border border-suth-border bg-suth-elevated shadow-xl">
              {results.map((athlete) => (
                <li key={athlete.slug}>
                  <button
                    type="button"
                    onClick={() => { onPick(athlete.slug); setQuery(""); setOpen(false); }}
                    className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3
                               text-left text-sm text-suth-text hover:bg-suth-overlay"
                  >
                    <span className="truncate">{athlete.name}</span>
                    <span className="results-num shrink-0 text-[11px] text-suth-text-tertiary">
                      {athlete.raceCount} races
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}
