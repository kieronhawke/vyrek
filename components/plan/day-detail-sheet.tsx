"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { displayWeight, type Workout, type WorkoutSection } from "@/lib/plan-generator";
import type { WeightUnit } from "@/lib/quiz-flow";

const SECTION_TAG: Record<WorkoutSection["section"], string> = {
  warmup: "WARM-UP",
  main: "MAIN",
  cooldown: "COOL-DOWN",
};

export function DayDetailSheet({
  workout,
  unit,
  open,
  onClose,
  onShare,
}: {
  workout: Workout | null;
  unit: WeightUnit;
  open: boolean;
  onClose: () => void;
  onShare: (workout: Workout) => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while open + focus the close button
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!workout) return null;

  const date = new Date(workout.date);

  return (
    <div
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-sheet-title"
      className="fixed inset-0 z-50"
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 transition-opacity"
        style={{ opacity: open ? 1 : 0 }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-vyrek-border-default bg-vyrek-base shadow-2xl transition-transform"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transitionDuration: "320ms",
          transitionTimingFunction: "var(--ease-out)",
        }}
      >
        <header className="grid h-14 shrink-0 grid-cols-[1fr_auto] items-center gap-3 px-5">
          <span aria-hidden className="mx-auto h-1 w-10 rounded-pill bg-vyrek-border-default" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close workout details"
            className="-mr-2 inline-flex h-10 items-center justify-center px-3 text-vyrek-text-secondary transition-colors hover:text-vyrek-text"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 pb-[max(2rem,var(--safe-bottom))]">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            {workout.day} · {format(date, "d MMM yyyy")}
          </p>
          <h2
            id="day-sheet-title"
            className="mt-2 text-2xl font-black leading-tight tracking-[-0.02em] text-vyrek-text"
          >
            {workout.title}
          </h2>
          <p className="mt-2 text-sm text-vyrek-text-secondary">
            {workout.durationMin} min
            {workout.intensityZone ? ` · ${workout.intensityZone}` : ""}
            {workout.type === "hyrox" ? " · Race-specific" : ""}
          </p>

          <div className="my-6 h-px w-full bg-vyrek-border-subtle" />

          <div className="space-y-7">
            {workout.structure.map((section) => (
              <section key={section.section}>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                  {SECTION_TAG[section.section]} · {section.durationMin} min
                </p>
                <ul className="mt-3 space-y-3">
                  {section.blocks.map((block, i) => (
                    <li
                      key={`${section.section}-${i}`}
                      className="rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-3"
                    >
                      <p className="text-base font-medium text-vyrek-text">
                        {block.name}
                      </p>
                      <p className="mt-0.5 text-sm text-vyrek-text-secondary">
                        {[block.reps, block.duration].filter(Boolean).join(" · ")}
                      </p>
                      {block.load ? (
                        <p className="mt-2 inline-block rounded-pill border border-vyrek-accent/40 bg-vyrek-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-accent">
                          {displayWeight(block.load.weight, unit)}
                        </p>
                      ) : null}
                      {block.notes ? (
                        <p className="mt-2 text-sm leading-snug text-vyrek-text-secondary">
                          {block.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => onShare(workout)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
            >
              Share workout ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
