"use client";

import { useState } from "react";
import type { TodayWorkout } from "@/lib/member/demo";

const INTENSITY_TONES: Record<string, string> = {
  easy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  moderate: "border-vyrek-accent/30 bg-vyrek-accent/10 text-vyrek-accent",
  hard: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "race-pace": "border-red-500/30 bg-red-500/10 text-red-300",
};

export function TodayWorkoutCard({ workout }: { workout: TodayWorkout }) {
  const [done, setDone] = useState(false);

  return (
    <article className="rounded-2xl border border-vyrek-border bg-vyrek-elevated shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]">
      <div className="border-b border-vyrek-border-subtle px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
            [ TODAY · DAY {workout.dayNumber} ]
          </p>
          <span
            className={`inline-flex items-center rounded-pill border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${
              INTENSITY_TONES[workout.intensity] ?? INTENSITY_TONES.moderate
            }`}
          >
            {workout.intensity}
          </span>
        </div>
        <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text md:text-3xl">
          {workout.title}
        </h2>
        <p className="mt-2 text-sm text-vyrek-text-secondary">
          {workout.date} · {workout.durationMin} min
        </p>
      </div>

      <ol role="list" className="space-y-3 px-5 py-5 md:px-6">
        {workout.blocks.map((b, i) => (
          <li
            key={i}
            className="rounded-md border border-vyrek-border-subtle bg-vyrek-base/40 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                [ {String(i + 1).padStart(2, "0")} ] {b.label}
              </p>
              {b.duration ? (
                <span className="font-mono text-xs text-vyrek-text-secondary">
                  {b.duration}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-vyrek-text">
              {b.detail}
            </p>
          </li>
        ))}
      </ol>

      {workout.notes ? (
        <div className="border-t border-vyrek-border-subtle bg-vyrek-base/20 px-5 py-4 md:px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            Coach&apos;s note
          </p>
          <p className="mt-2 text-sm leading-relaxed text-vyrek-text-secondary">
            {workout.notes}
          </p>
        </div>
      ) : null}

      <div className="border-t border-vyrek-border-subtle p-4 md:p-5">
        {done ? (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            Logged. Sunday&apos;s recalibration will pick this up.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setDone(true)}
            className="inline-flex h-12 w-full items-center justify-center rounded-pill bg-vyrek-accent px-5 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover active:scale-[0.98]"
          >
            Mark complete →
          </button>
        )}
      </div>
    </article>
  );
}
