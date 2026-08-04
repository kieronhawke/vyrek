"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * PICKING A TIME.
 *
 * The shape from the reference screenshots, because it is the shape people
 * have already learnt: a month on the left, the times for the chosen day on
 * the right, and the days with nothing free visibly dead rather than absent.
 *
 * ON A PHONE IT IS ONE COLUMN, month then times, and the times scroll into
 * view when a day is chosen — a two-pane layout at 390px puts four
 * characters on a line.
 *
 * THE TIMES ARE FETCHED PER DAY rather than all at once. The month only
 * needs to know which days have something; asking the server for every slot
 * in four weeks to render nine buttons is work nobody sees.
 *
 * EVERY LABEL COMES FROM THE SERVER. The server knows the diary is kept in
 * Europe/London; the browser knows only where the browser is. Formatting
 * "17:30" in the visitor's own zone is how somebody in Spain gets told to
 * expect a call an hour after Ben makes it.
 */

type Slot = { startISO: string; label: string };

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** YYYY-MM-DD for a local calendar date, without a timezone round-trip. */
function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthLabel(y: number, m: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m, 1)));
}

/** Monday-first offset for the 1st of a month. */
function leadingBlanks(y: number, m: number): number {
  const day = new Date(Date.UTC(y, m, 1)).getUTCDay(); // 0 = Sunday
  return (day + 6) % 7;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function BookingPicker({
  onChosen,
  initialISO,
  excludeRef,
}: {
  onChosen: (slot: Slot) => void;
  /** Highlights the current time when rescheduling. */
  initialISO?: string;
  excludeRef?: string;
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => ({
    y: today.getFullYear(),
    m: today.getMonth(),
  }));
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [chosen, setChosen] = useState<string | null>(initialISO ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // No setState before the fetch: `loadingMonth` already starts true, and
    // writing it again here is a synchronous state write inside an effect,
    // which costs a cascading render for nothing.
    fetch("/api/booking")
      .then((r) => r.json())
      .then((d: { ok: boolean; open?: string[] }) => {
        if (!live) return;
        setOpen(new Set(d.open ?? []));
        setError(d.ok ? null : "Couldn't load the calendar.");
      })
      .catch(() => live && setError("Couldn't load the calendar."))
      .finally(() => live && setLoadingMonth(false));
    return () => {
      live = false;
    };
  }, []);

  const pickDate = useCallback(
    (d: string) => {
      setDate(d);
      setSlots(null);
      setLoadingSlots(true);
      const q = new URLSearchParams({ date: d });
      if (excludeRef) q.set("exclude", excludeRef);
      fetch(`/api/booking?${q}`)
        .then((r) => r.json())
        .then((res: { slots?: Slot[] }) => setSlots(res.slots ?? []))
        .catch(() => setSlots([]))
        .finally(() => setLoadingSlots(false));
    },
    [excludeRef],
  );

  const { y, m } = cursor;
  const blanks = leadingBlanks(y, m);
  const total = daysInMonth(y, m);
  const todayISO = iso(today.getFullYear(), today.getMonth(), today.getDate());

  // Don't let somebody page back into months that can hold nothing.
  const canGoBack = y > today.getFullYear() || m > today.getMonth();

  return (
    /* THE CALENDAR HAS A MAXIMUM WIDTH, AND THAT IS THE WHOLE FIX.
       The day cells are square and were sized by whatever space the column
       happened to have. Inside a max-w-5xl page that is about 700px across
       seven columns, so every date became a hundred-pixel tile and the month
       looked like a wall of blocks rather than a calendar. Capping the grid
       at 21rem puts a cell at about 44px — a comfortable tap target and the
       size every calendar anybody has used is drawn at. */
    <div className="grid gap-8 lg:grid-cols-[21rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="w-full max-w-[21rem]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary">
            Pick a day
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setCursor(m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })
              }
              disabled={!canGoBack}
              aria-label="Previous month"
              className="inline-flex size-9 items-center justify-center rounded-full text-suth-text-secondary transition-colors hover:bg-suth-elevated hover:text-suth-text disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ←
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium text-suth-text">
              {monthLabel(y, m)}
            </span>
            <button
              type="button"
              onClick={() =>
                setCursor(m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })
              }
              aria-label="Next month"
              className="inline-flex size-9 items-center justify-center rounded-full text-suth-text-secondary transition-colors hover:bg-suth-elevated hover:text-suth-text"
            >
              →
            </button>
          </div>
        </div>

        {/* A group, not a grid.
            It carried role="grid", which is a promise: a grid must contain
            rows, and rows must contain gridcells, and it has neither — this
            is a flat set of buttons in a CSS grid, which is a different
            thing wearing the same word. axe flags it critical, and a screen
            reader announces a table with no rows.

            Every button already names its own date and says when nothing is
            free, so a labelled group is both honest and enough. The column
            headings are decoration for sighted users — the dates carry their
            weekday themselves. */}
        <div
          role="group"
          aria-label={`Choose a day in ${monthLabel(y, m)}`}
          className="grid grid-cols-7 gap-1"
        >
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              aria-hidden
              className="pb-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-suth-text-tertiary"
            >
              {d}
            </div>
          ))}

          {Array.from({ length: blanks }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden />
          ))}

          {Array.from({ length: total }, (_, i) => {
            const d = iso(y, m, i + 1);
            const bookable = open.has(d);
            const isToday = d === todayISO;
            const selected = d === date;
            return (
              <button
                key={d}
                type="button"
                disabled={!bookable}
                onClick={() => pickDate(d)}
                aria-pressed={selected}
                aria-label={`${new Intl.DateTimeFormat("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date(Date.UTC(y, m, i + 1)))}${
                  bookable ? "" : ", nothing available"
                }`}
                className={cn(
                  "relative flex aspect-square w-full items-center justify-center rounded-lg text-sm font-medium tabular-nums transition-[background,color,box-shadow] duration-fast",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
                  selected
                    ? "bg-suth-accent font-semibold text-[#0A0A0A]"
                    : bookable
                      ? "bg-suth-elevated text-suth-text hover:bg-suth-overlay"
                      : // Dead, not hidden: an empty grid reads as broken,
                        // a greyed one reads as "not that day".
                        "cursor-not-allowed text-suth-text-tertiary/40",
                  isToday && !selected && "ring-1 ring-inset ring-suth-border-strong",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {loadingMonth ? (
          <p className="mt-4 text-sm text-suth-text-tertiary">
            Loading the diary…
          </p>
        ) : error ? (
          <p className="mt-4 text-sm text-suth-warning">{error}</p>
        ) : open.size === 0 ? (
          <p className="mt-4 text-sm text-suth-text-secondary">
            Nothing free at the moment. Drop Ben a message and he&apos;ll sort
            something out.
          </p>
        ) : null}
      </div>

      <div>
        <h2 className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-suth-text-tertiary">
          {date ? "Pick a time" : "Times"}
        </h2>
        {/* Naming the chosen day here is what stops the two panes reading as
            two unrelated widgets — the times belong to a date, and on a wide
            screen that date is a long way to the left. */}
        {date ? (
          <p className="mb-4 text-sm font-medium text-suth-text">
            {new Intl.DateTimeFormat("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(`${date}T12:00:00Z`))}
          </p>
        ) : (
          <div className="mb-4" />
        )}

        {!date ? (
          <p className="text-sm leading-relaxed text-suth-text-secondary">
            Choose a day and the times Ben has free will appear here.
          </p>
        ) : loadingSlots ? (
          <p className="text-sm text-suth-text-tertiary">Loading…</p>
        ) : slots && slots.length === 0 ? (
          <p className="text-sm text-suth-text-secondary">
            Nothing left on that day. Try another.
          </p>
        ) : (
          <ul role="list" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots?.map((s) => (
              <li key={s.startISO}>
                <button
                  type="button"
                  onClick={() => {
                    setChosen(s.startISO);
                    onChosen(s);
                  }}
                  aria-pressed={chosen === s.startISO}
                  className={cn(
                    "w-full rounded-lg border px-4 py-3 text-sm font-medium tabular-nums transition-[border,background] duration-fast",
                    chosen === s.startISO
                      ? "border-suth-accent bg-suth-accent text-[#0A0A0A]"
                      : "border-suth-border bg-suth-elevated text-suth-text hover:border-suth-border-strong",
                  )}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {date ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
            UK time
          </p>
        ) : null}
      </div>
    </div>
  );
}
