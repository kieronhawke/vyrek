"use client";

import Link from "next/link";
import { useState } from "react";
import type { Race } from "@/lib/member/demo";

export function RaceList({ races }: { races: Race[] }) {
  const [myRaceOpen, setMyRaceOpen] = useState(false);
  const [myRaceName, setMyRaceName] = useState("");
  const [myRaceDate, setMyRaceDate] = useState("");
  const [myRaceSaved, setMyRaceSaved] = useState<
    { name: string; date: string } | null
  >(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!myRaceName.trim() || !myRaceDate) return;
    setMyRaceSaved({ name: myRaceName.trim(), date: myRaceDate });
    setMyRaceOpen(false);
    // Persist client-side. Replace with /api/account/save-race when ready.
    try {
      window.localStorage.setItem(
        "suth:my-race",
        JSON.stringify({ name: myRaceName.trim(), date: myRaceDate }),
      );
    } catch {
      /* private mode */
    }
  }

  return (
    <div>
      {/* User's own race */}
      {myRaceSaved ? (
        <div className="mb-4 rounded-lg border border-suth-accent/40 bg-suth-accent/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ YOUR NEXT RACE ]
          </p>
          <p className="mt-2 text-base font-semibold text-suth-text">
            {myRaceSaved.name}
          </p>
          <p className="mt-1 text-sm text-suth-text-secondary">
            {formatDate(myRaceSaved.date)} ·{" "}
            {weeksUntil(myRaceSaved.date)} weeks away
          </p>
          <button
            type="button"
            onClick={() => {
              setMyRaceSaved(null);
              setMyRaceOpen(true);
              setMyRaceName(myRaceSaved.name);
              setMyRaceDate(myRaceSaved.date);
            }}
            className="mt-3 inline-flex h-9 items-center rounded-pill border border-suth-border bg-suth-elevated px-3 text-xs text-suth-text-secondary"
          >
            Edit
          </button>
        </div>
      ) : myRaceOpen ? (
        <form
          onSubmit={save}
          className="mb-4 rounded-lg border border-suth-accent/40 bg-suth-elevated p-4"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
            [ ADD YOUR RACE ]
          </p>
          <label className="mt-3 block">
            <span className="block text-xs text-suth-text-tertiary">
              Event
            </span>
            <input
              type="text"
              value={myRaceName}
              onChange={(e) => setMyRaceName(e.target.value)}
              placeholder="Hyrox London"
              required
              className="mt-1 block h-10 w-full rounded-md border border-suth-border bg-suth-base px-3 text-sm text-suth-text"
            />
          </label>
          <label className="mt-3 block">
            <span className="block text-xs text-suth-text-tertiary">
              Date
            </span>
            <input
              type="date"
              value={myRaceDate}
              onChange={(e) => setMyRaceDate(e.target.value)}
              required
              className="mt-1 block h-10 w-full rounded-md border border-suth-border bg-suth-base px-3 text-sm text-suth-text"
            />
          </label>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="inline-flex h-10 flex-1 items-center justify-center rounded-pill bg-suth-accent px-4 text-sm font-semibold text-[#0A0A0A]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setMyRaceOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-pill border border-suth-border bg-suth-base px-4 text-sm text-suth-text"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setMyRaceOpen(true)}
          className="mb-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-suth-border bg-transparent text-sm font-medium text-suth-text-secondary hover:border-suth-accent hover:text-suth-accent"
        >
          + Add your race
        </button>
      )}

      {/* Race list */}
      <ul role="list" className="space-y-2">
        {races.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/app/analysis/race/${r.slug}`}
              className="flex items-center gap-3 rounded-lg border border-suth-border-subtle bg-suth-elevated/60 px-3 py-3 transition-colors hover:border-suth-border-strong active:scale-[0.99]"
            >
              <div className="shrink-0 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-suth-accent">
                  {monthShort(r.date)}
                </p>
                <p className="text-lg font-black tabular-nums leading-none text-suth-text">
                  {dayOfMonth(r.date)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-suth-text">
                  {r.event}
                </p>
                <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  {r.city}, {r.country} · {r.weeksFromNow}w
                </p>
                <p className="mt-1 truncate text-xs text-suth-text-tertiary">
                  {r.categories.join(" · ")}
                </p>
              </div>
              {r.registrationOpen ? (
                <span className="shrink-0 inline-flex h-9 items-center rounded-pill border border-suth-accent/40 bg-suth-accent/10 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-accent">
                  Open
                </span>
              ) : (
                <span className="shrink-0 inline-flex h-9 items-center rounded-pill border border-suth-border bg-suth-elevated px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                  Soon
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function monthShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short" });
}

function dayOfMonth(iso: string): number {
  return new Date(iso).getDate();
}

function weeksUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / (7 * 24 * 60 * 60 * 1000)));
}
