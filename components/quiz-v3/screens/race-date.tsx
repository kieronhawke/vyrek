"use client";

import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { QuestionHeader } from "@/components/quiz-v3/question-header";

/**
 * Screen 6. Race date picker. shadcn-style Calendar via react-day-picker,
 * already a dependency.
 */
export function RaceDateScreen({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (v: Date | undefined) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <QuestionHeader
        question="Got a race booked?"
        helper="We'll build your plan around the date. Or skip and we'll suggest one."
      />

      <div className="rdp-suth rounded-lg border border-suth-border-subtle bg-suth-elevated p-3">
        <DayPicker
          mode="single"
          selected={value}
          onSelect={onChange}
          startMonth={today}
          disabled={{ before: today }}
          weekStartsOn={1}
        />
      </div>

      {value ? (
        <div className="mt-4 space-y-2 text-center">
          <p className="text-sm text-suth-text-secondary">
            Race day:{" "}
            <span className="text-suth-text">
              {format(value, "EEEE d MMMM yyyy")}
            </span>
          </p>
          {(() => {
            const daysUntil = Math.round(
              (value.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
            );
            const weeksUntil = Math.round(daysUntil / 7);
            if (daysUntil < 7) {
              return (
                <p
                  role="alert"
                  className="mx-auto max-w-md rounded-md border border-suth-warning/40 bg-suth-warning/5 px-3 py-2 text-xs leading-relaxed text-suth-warning"
                >
                  Your race is in {daysUntil === 0 ? "less than a day" : `${daysUntil} day${daysUntil === 1 ? "" : "s"}`}. We&apos;ll switch into a short taper plan rather than a full 12-week block.
                </p>
              );
            }
            if (weeksUntil < 12) {
              return (
                <p className="mx-auto max-w-md rounded-md border border-suth-accent/30 bg-suth-accent/5 px-3 py-2 text-xs leading-relaxed text-suth-text-secondary">
                  Your race is in {weeksUntil} week{weeksUntil === 1 ? "" : "s"}. We&apos;ll compress the plan to fit — denser block, sharper taper.
                </p>
              );
            }
            return (
              <p className="text-xs text-suth-text-tertiary">
                {weeksUntil} weeks to race day. Plenty of runway for the full programme.
              </p>
            );
          })()}
        </div>
      ): null}

      <style jsx global>{`
        .rdp-suth .rdp-root {
          --rdp-accent-color: var(--suth-accent);
          --rdp-accent-background-color: rgba(163, 230, 53, 0.20);
          --rdp-today-color: var(--suth-accent);
          --rdp-range_start-color: #0a0a0a;
          --rdp-range_end-color: #0a0a0a;
          --rdp-selected-border: 2px solid var(--suth-accent);
          --rdp-day_button-width: 40px;
          --rdp-day_button-height: 40px;
          --rdp-day_button-border-radius: 999px;
          color: var(--suth-text-primary);
        }
        .rdp-suth .rdp-month_caption {
          color: var(--suth-text-primary);
          font-weight: 600;
        }
        .rdp-suth .rdp-weekday {
          color: var(--suth-text-tertiary);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        /* Selectors were compound (.rdp-suth.rdp-day_button) which only
           match when both classes sit on the same element. The wrapper
           carries .rdp-suth and the day cells carry .rdp-day_button on
           descendants — needed a space combinator. Browsers were
           falling back to react-day-picker's default blue. */
        .rdp-suth .rdp-day_button {
          color: var(--suth-text-primary);
          background: transparent;
        }
        .rdp-suth .rdp-day:not(.rdp-disabled) .rdp-day_button:hover {
          background: var(--suth-bg-overlay);
        }
        .rdp-suth .rdp-selected .rdp-day_button {
          background: var(--suth-accent) !important;
          color: #0a0a0a !important;
        }
        .rdp-suth .rdp-today .rdp-day_button {
          color: var(--suth-accent);
          font-weight: 700;
        }
        .rdp-suth .rdp-disabled .rdp-day_button {
          color: var(--suth-text-disabled);
          opacity: 0.4;
        }
        .rdp-suth .rdp-nav button,
        .rdp-suth .rdp-chevron {
          color: var(--suth-text-secondary);
          fill: var(--suth-text-secondary);
        }
        .rdp-suth .rdp-nav button:hover,
        .rdp-suth .rdp-nav button:hover .rdp-chevron {
          color: var(--suth-text-primary);
          fill: var(--suth-text-primary);
        }
      `}</style>
    </div>
  );
}
