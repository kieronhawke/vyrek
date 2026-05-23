"use client";

import { useMemo, useState } from "react";
import type { Athlete } from "@/lib/member/demo";

export function AthleteSearch({ athletes }: { athletes: Athlete[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Athlete | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return athletes.slice(0, 4);
    return athletes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }, [athletes, query]);

  if (selected) {
    return <AthleteDetail athlete={selected} onBack={() => setSelected(null)} />;
  }

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
              <button
                type="button"
                onClick={() => setSelected(a)}
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
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function AthleteDetail({ athlete, onBack }: { athlete: Athlete; onBack: () => void }) {
  return (
    <div className="rounded-lg border border-vyrek-border bg-vyrek-elevated">
      <header className="flex items-center gap-3 border-b border-vyrek-border-subtle p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="inline-flex size-9 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-base text-vyrek-text"
        >
          ←
        </button>
        <div className="flex size-12 items-center justify-center rounded-full border border-vyrek-border bg-vyrek-base text-base font-semibold uppercase text-vyrek-text">
          {athlete.name
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-vyrek-text">
            {athlete.name}
          </p>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
            {athlete.category} · {athlete.city}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-vyrek-border-subtle">
        <Stat label="Personal best" value={athlete.pb} />
        <Stat label="Total races" value={String(athlete.raceCount)} />
      </div>

      <section className="p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Station splits (PB race)
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Split label="Ski erg" v={athlete.splits.skiErg} />
          <Split label="Sled push" v={athlete.splits.sledPush} />
          <Split label="Sled pull" v={athlete.splits.sledPull} />
          <Split label="Burpees" v={athlete.splits.burpee} />
          <Split label="Rower" v={athlete.splits.rower} />
          <Split label="Farmer&apos;s" v={athlete.splits.farmers} />
          <Split label="Sandbag" v={athlete.splits.sandbag} />
          <Split label="Wall ball" v={athlete.splits.wallBall} />
        </div>
      </section>

      <section className="border-t border-vyrek-border-subtle p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          Recent races
        </p>
        <ul role="list" className="mt-3 space-y-2">
          {athlete.recentRaces.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-vyrek-text">
                  {r.event}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
                  {r.date}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm tabular-nums text-vyrek-text">
                  {r.time}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-accent">
                  {r.rank}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-vyrek-elevated p-4 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tabular-nums text-vyrek-text">{value}</p>
    </div>
  );
}

function Split({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-2 text-center">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm tabular-nums text-vyrek-text">{v}</p>
    </div>
  );
}
