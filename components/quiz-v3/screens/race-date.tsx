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

      <div className="rdp-vyrek rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-3">
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
        <p className="mt-4 text-center text-sm text-vyrek-text-secondary">
          Race day:{" "}
          <span className="text-vyrek-text">
            {format(value, "EEEE d MMMM yyyy")}
          </span>
        </p>
      ): null}

      <style jsx global>{`
        .rdp-vyrek .rdp-root {
          --rdp-accent-color: var(--vyrek-accent);
          --rdp-accent-background-color: rgba(163, 230, 53, 0.20);
          --rdp-today-color: var(--vyrek-accent);
          --rdp-range_start-color: #0a0a0a;
          --rdp-range_end-color: #0a0a0a;
          --rdp-selected-border: 2px solid var(--vyrek-accent);
          --rdp-day_button-width: 40px;
          --rdp-day_button-height: 40px;
          --rdp-day_button-border-radius: 999px;
          color: var(--vyrek-text-primary);
        }
        .rdp-vyrek .rdp-month_caption {
          color: var(--vyrek-text-primary);
          font-weight: 600;
        }
        .rdp-vyrek .rdp-weekday {
          color: var(--vyrek-text-tertiary);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        /* Selectors were compound (.rdp-vyrek.rdp-day_button) which only
           match when both classes sit on the same element. The wrapper
           carries .rdp-vyrek and the day cells carry .rdp-day_button on
           descendants — needed a space combinator. Browsers were
           falling back to react-day-picker's default blue. */
        .rdp-vyrek .rdp-day_button {
          color: var(--vyrek-text-primary);
          background: transparent;
        }
        .rdp-vyrek .rdp-day:not(.rdp-disabled) .rdp-day_button:hover {
          background: var(--vyrek-bg-overlay);
        }
        .rdp-vyrek .rdp-selected .rdp-day_button {
          background: var(--vyrek-accent) !important;
          color: #0a0a0a !important;
        }
        .rdp-vyrek .rdp-today .rdp-day_button {
          color: var(--vyrek-accent);
          font-weight: 700;
        }
        .rdp-vyrek .rdp-disabled .rdp-day_button {
          color: var(--vyrek-text-disabled);
          opacity: 0.4;
        }
        .rdp-vyrek .rdp-nav button,
        .rdp-vyrek .rdp-chevron {
          color: var(--vyrek-text-secondary);
          fill: var(--vyrek-text-secondary);
        }
        .rdp-vyrek .rdp-nav button:hover,
        .rdp-vyrek .rdp-nav button:hover .rdp-chevron {
          color: var(--vyrek-text-primary);
          fill: var(--vyrek-text-primary);
        }
      `}</style>
    </div>
  );
}
