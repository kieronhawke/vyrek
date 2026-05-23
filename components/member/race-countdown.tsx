"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SavedRace = { name: string; date: string };
type State = { ready: false } | { ready: true; race: SavedRace | null };

export function RaceCountdown() {
  // One state value -> one setState call -> one commit. Avoids the React 19
  // cascading-render lint that fires on consecutive sets inside an effect.
  const [state, setState] = useState<State>({ ready: false });

  useEffect(() => {
    let initial: SavedRace | null = null;
    try {
      const raw = window.localStorage.getItem("vyrek:my-race");
      if (raw) initial = JSON.parse(raw) as SavedRace;
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ ready: true, race: initial });
  }, []);

  if (!state.ready) return null;
  const race = state.race;

  if (!race) {
    return (
      <Link
        href="/app/analysis"
        className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-vyrek-border bg-transparent px-4 py-4 transition-colors hover:border-vyrek-accent"
      >
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            No race set
          </p>
          <p className="mt-1 text-sm font-medium text-vyrek-text">
            Add your race in Analysis to start the countdown.
          </p>
        </div>
        <span className="font-mono text-sm text-vyrek-accent">→</span>
      </Link>
    );
  }

  const { days, weeks } = countdown(race.date);
  const phase = phaseFor(weeks);

  return (
    <article className="rounded-2xl border border-vyrek-accent/40 bg-vyrek-accent/5 px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ Race countdown ]
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
          {phase}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-3">
        <p className="text-4xl font-black tabular-nums text-vyrek-text">
          {days}
        </p>
        <p className="text-sm text-vyrek-text-secondary">days to {race.name}</p>
      </div>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {prettyDate(race.date)} · {weeks}w {days % 7}d
      </p>
    </article>
  );
}

function countdown(iso: string): { days: number; weeks: number } {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return { days, weeks: Math.floor(days / 7) };
}

function phaseFor(weeks: number): string {
  if (weeks > 8) return "Base";
  if (weeks > 4) return "Build";
  if (weeks > 1) return "Peak";
  if (weeks > 0) return "Taper";
  return "Race week";
}

function prettyDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
