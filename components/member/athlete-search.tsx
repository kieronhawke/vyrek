"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Athlete } from "@/lib/member/demo";

export function AthleteSearch({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes.slice(0, 6);
    return athletes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [athletes, query]);

  return (
    <div>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, city, or category"
          className="block h-11 w-full rounded-pill border border-vyrek-border bg-vyrek-elevated pl-10 pr-4 text-sm text-vyrek-text outline-none focus:border-vyrek-accent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-vyrek-text-tertiary"
        >
          🔍
        </span>
      </div>

      <ul role="list" className="mt-3 space-y-2">
        {results.length === 0 ? (
          <li className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/40 p-5 text-center text-sm text-vyrek-text-tertiary">
            No athletes match &ldquo;{query}&rdquo;. Try a city or category.
          </li>
        ) : (
          results.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/app/analysis/athlete/${a.slug}`}
                className="flex w-full items-center gap-3 rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated/60 px-3 py-3 text-left transition-colors hover:border-vyrek-border-strong active:scale-[0.99]"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-base text-sm font-semibold uppercase text-vyrek-text">
                  {a.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-vyrek-text">
                    {a.name}
                  </p>
                  <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    {a.category} · {a.city}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm tabular-nums text-vyrek-accent">
                    {a.pb}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                    PB · {a.raceCount} races
                  </p>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
