"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WEEKDAY_NAMES,
  formatMinutes,
  parseMinutes,
  type Availability,
  type Weekday,
  type Window,
} from "@/lib/booking/availability";
import { formatBookingTime, type Booking } from "@/lib/booking/model";
import { cn } from "@/lib/utils";

/**
 * BEN'S DIARY.
 *
 * Two halves, in the order he uses them: what is booked, then when he is
 * free. The bookings come first because that is what he opens this page to
 * check nine times out of ten; availability is set once and then edited
 * rarely.
 *
 * THE WEEKLY EDITOR IS THE ONE FROM THE REFERENCE — a toggle per day, and
 * one or more time ranges behind it. It is the right model because it is
 * how somebody describes their own week out loud: "I'm free weekday
 * evenings, and Saturday mornings."
 *
 * NOTHING SAVES UNTIL HE PRESSES SAVE. An availability editor that
 * auto-saves means one mis-tap on a toggle silently closes a day, and the
 * only symptom is bookings that stop arriving.
 */

type Data = {
  availability: Availability;
  bookings: Booking[];
  durable: boolean;
};

const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export function BookingCalendar() {
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Split so the effect body does no synchronous setState: the spinner is
  // already on for the first load (useState(true)), and only a manual
  // reload — which always comes from an event handler — turns it back on.
  const fetchDiary = useCallback(() => {
    return fetch("/api/admin/booking")
      .then((r) => r.json())
      .then((d: Data & { ok: boolean }) => {
        setData(d);
        setDraft(d.availability);
        setError(d.ok ? null : "Couldn't load the diary.");
      })
      .catch(() => setError("Couldn't load the diary."))
      .finally(() => setLoading(false));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    void fetchDiary();
  }, [fetchDiary]);

  useEffect(() => {
    void fetchDiary();
  }, [fetchDiary]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/booking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = (await res.json()) as { ok: boolean; availability?: Availability; error?: string };
      if (!d.ok) {
        setError(d.error ?? "Couldn't save.");
        return;
      }
      // Re-read what the server actually kept: it drops windows that end
      // before they start, and Ben should see that rather than assume his
      // typo was saved.
      if (d.availability) setDraft(d.availability);
      setMessage("Saved.");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-suth-text-tertiary">Loading the diary…</p>;
  }
  if (!draft || !data) {
    return <p className="text-sm text-suth-danger">{error ?? "No diary."}</p>;
  }

  const now = new Date();
  const upcoming = data.bookings
    .filter((b) => b.status === "confirmed" && new Date(b.startISO) >= now)
    .sort((a, b) => a.startISO.localeCompare(b.startISO));
  const past = data.bookings
    .filter((b) => b.status !== "confirmed" || new Date(b.startISO) < now)
    .sort((a, b) => b.startISO.localeCompare(a.startISO))
    .slice(0, 10);

  const setDay = (day: Weekday, windows: Window[]) =>
    setDraft({ ...draft, weekly: { ...draft.weekly, [day]: windows } });

  return (
    <div className="space-y-12">
      {!data.durable ? (
        <p className="rounded-lg border border-suth-warning/40 bg-suth-warning/10 px-4 py-3 text-sm text-suth-text">
          <strong className="font-semibold">Bookings are not being stored.</strong>{" "}
          The database isn&apos;t configured, so nothing booked here survives.
          Fine for a look round; not fine for real bookings.
        </p>
      ) : null}

      <section aria-labelledby="diary-heading">
        <h2
          id="diary-heading"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
        >
          Coming up
        </h2>

        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-suth-text-secondary">
            Nothing booked in.
          </p>
        ) : (
          <ul role="list" className="mt-4 space-y-3">
            {upcoming.map((b) => (
              <BookingRow key={b.ref} booking={b} onChanged={load} />
            ))}
          </ul>
        )}

        {past.length > 0 ? (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-suth-text-tertiary">
              Past and cancelled ({past.length})
            </summary>
            <ul role="list" className="mt-3 space-y-2">
              {past.map((b) => (
                <li
                  key={b.ref}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-suth-text-tertiary"
                >
                  <span className="text-suth-text-secondary">{b.name}</span>
                  <span className="tabular-nums">
                    {formatBookingTime(b.startISO)}
                  </span>
                  {b.status === "cancelled" ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-danger">
                      Cancelled
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      <section aria-labelledby="hours-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2
            id="hours-heading"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
          >
            Weekly hours
          </h2>
          <div className="flex items-center gap-3">
            {message ? (
              <span aria-live="polite" className="text-sm text-suth-accent">
                {message}
              </span>
            ) : null}
            {error ? (
              <span role="alert" className="text-sm text-suth-danger">
                {error}
              </span>
            ) : null}
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-10 items-center rounded-pill bg-suth-accent px-5 text-sm font-medium text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save hours"}
            </button>
          </div>
        </div>

        <ul role="list" className="mt-5 divide-y divide-suth-border-subtle">
          {DAY_ORDER.map((day) => (
            <DayRow
              key={day}
              day={day}
              windows={draft.weekly[day] ?? []}
              onChange={(w) => setDay(day, w)}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="overrides-heading">
        <h2
          id="overrides-heading"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
        >
          Specific dates
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-suth-text-secondary">
          Overrides the weekly pattern for one day. Add a date with no times
          to block it out completely — a holiday, a race, a day off.
        </p>
        <Overrides
          overrides={draft.overrides}
          onChange={(overrides) => setDraft({ ...draft, overrides })}
        />
      </section>

      <section aria-labelledby="rules-heading">
        <h2
          id="rules-heading"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary"
        >
          Call settings
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="Call length"
            suffix="min"
            value={draft.slotMinutes}
            onChange={(v) => setDraft({ ...draft, slotMinutes: v })}
          />
          <NumberField
            label="Gap after"
            suffix="min"
            value={draft.bufferMinutes}
            onChange={(v) => setDraft({ ...draft, bufferMinutes: v })}
          />
          <NumberField
            label="Least notice"
            suffix="hours"
            value={draft.minNoticeHours}
            onChange={(v) => setDraft({ ...draft, minNoticeHours: v })}
          />
          <NumberField
            label="Book up to"
            suffix="days ahead"
            value={draft.horizonDays}
            onChange={(v) => setDraft({ ...draft, horizonDays: v })}
          />
        </div>
      </section>
    </div>
  );
}

/* ── Bookings ──────────────────────────────────────────────────────────── */

function BookingRow({
  booking,
  onChanged,
}: {
  booking: Booking;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<string | null>(null);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/booking/${booking.ref}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      if (!d.ok) {
        setError(d.error ?? "That didn't work.");
        return;
      }
      setOpen(false);
      onChanged();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="rounded-xl border border-suth-border bg-suth-elevated p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-base font-medium text-suth-text">{booking.name}</p>
          <p className="mt-1 text-sm tabular-nums text-suth-text-secondary">
            {formatBookingTime(booking.startISO)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {booking.phone ? (
            <a
              href={`tel:${booking.phone}`}
              className="text-suth-accent underline underline-offset-4"
            >
              {booking.phone}
            </a>
          ) : null}
          {/* THE STEP AFTER THE CALL. Ben rings them, they say yes, and
              this is the one button that turns the consultation into a
              client: it sends the onboarding link by email and text, and
              they set up the account and the card themselves. */}
          <button
            type="button"
            disabled={inviting}
            onClick={async () => {
              setInviting(true);
              setError(null);
              try {
                const res = await fetch("/api/onboarding/invite", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: booking.name,
                    email: booking.email,
                    phone: booking.phone,
                    kind: "full",
                    rail: booking.rail === "beginner" ? "beginner" : undefined,
                  }),
                });
                const d = (await res.json()) as { link?: string; error?: string };
                if (!res.ok || !d.link) {
                  setError(d.error ?? "Couldn't send the setup link.");
                  return;
                }
                setInvited(d.link);
              } catch {
                setError("Couldn't reach the server.");
              } finally {
                setInviting(false);
              }
            }}
            className="rounded-pill bg-suth-accent px-3 py-1.5 text-xs font-medium text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50"
          >
            {inviting ? "Sending…" : invited ? "Sent ✓" : "Send account setup"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-pill border border-suth-border px-3 py-1.5 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
          >
            {open ? "Close" : "Reschedule"}
          </button>
        </div>
      </div>

      {invited ? (
        // The link is shown as well as sent, because a delivery failure must
        // never leave Ben with no way to onboard somebody.
        <p
          aria-live="polite"
          className="mt-3 break-all rounded-lg border border-suth-accent/40 bg-suth-accent/10 px-3 py-2 font-mono text-xs text-suth-text"
        >
          Setup link sent. Copy if needed: {invited}
        </p>
      ) : null}

      {error && !open ? (
        <p role="alert" className="mt-3 text-sm text-suth-danger">
          {error}
        </p>
      ) : null}

      {booking.note ? (
        <p className="mt-3 border-t border-suth-border-subtle pt-3 text-sm leading-relaxed text-suth-text-secondary">
          {booking.note}
        </p>
      ) : null}

      {open ? (
        <div className="mt-4 border-t border-suth-border-subtle pt-4">
          <label
            htmlFor={`when-${booking.ref}`}
            className="block font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary"
          >
            New date and time (UK)
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <input
              id={`when-${booking.ref}`}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="h-11 rounded-lg border border-suth-border bg-suth-base px-3 text-sm text-suth-text outline-none focus:border-suth-accent"
            />
            <button
              type="button"
              disabled={busy || !when}
              onClick={() =>
                act({
                  action: "reschedule",
                  // datetime-local has no zone. The server reads the diary in
                  // Europe/London, so send the wall clock and let it resolve.
                  startISO: new Date(when).toISOString(),
                })
              }
              className="inline-flex h-11 items-center rounded-pill bg-suth-accent px-5 text-sm font-medium text-[#0A0A0A] disabled:opacity-50"
            >
              {busy ? "Moving…" : "Move and notify"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act({ action: "cancel" })}
              className="inline-flex h-11 items-center rounded-pill border border-suth-danger px-5 text-sm font-medium text-suth-text disabled:opacity-50"
            >
              Cancel and notify
            </button>
          </div>
          <p className="mt-2 text-xs text-suth-text-tertiary">
            Either one emails and texts them straight away.
          </p>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-suth-danger">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/* ── Availability editing ──────────────────────────────────────────────── */

function DayRow({
  day,
  windows,
  onChange,
}: {
  day: Weekday;
  windows: Window[];
  onChange: (w: Window[]) => void;
}) {
  const on = windows.length > 0;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${WEEKDAY_NAMES[day]}, ${on ? "available" : "unavailable"}`}
        onClick={() =>
          onChange(on ? [] : [{ start: 17 * 60, end: 20 * 60 }])
        }
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-pill transition-colors",
          on ? "bg-suth-accent" : "bg-suth-border-strong",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
            on ? "translate-x-[1.4rem]" : "translate-x-0.5",
          )}
        />
      </button>

      <span
        className={cn(
          "w-28 shrink-0 text-sm",
          on ? "text-suth-text" : "text-suth-text-tertiary",
        )}
      >
        {WEEKDAY_NAMES[day]}
      </span>

      {!on ? (
        <span className="text-sm text-suth-text-tertiary">Unavailable</span>
      ) : (
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {windows.map((w, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <TimeInput
                label={`${WEEKDAY_NAMES[day]} window ${i + 1} start`}
                value={w.start}
                onChange={(v) =>
                  onChange(windows.map((x, j) => (j === i ? { ...x, start: v } : x)))
                }
              />
              <span aria-hidden className="text-suth-text-tertiary">
                –
              </span>
              <TimeInput
                label={`${WEEKDAY_NAMES[day]} window ${i + 1} end`}
                value={w.end}
                onChange={(v) =>
                  onChange(windows.map((x, j) => (j === i ? { ...x, end: v } : x)))
                }
              />
              <button
                type="button"
                aria-label={`Remove ${WEEKDAY_NAMES[day]} window ${i + 1}`}
                onClick={() => onChange(windows.filter((_, j) => j !== i))}
                className="px-1 text-suth-text-tertiary hover:text-suth-danger"
              >
                ✕
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() =>
              onChange([...windows, { start: 9 * 60, end: 12 * 60 }])
            }
            aria-label={`Add another window on ${WEEKDAY_NAMES[day]}`}
            className="rounded-pill border border-suth-border px-3 py-1 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
          >
            + Add
          </button>
        </div>
      )}
    </li>
  );
}

function TimeInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  // Fully controlled by the prop. It used to keep a copy in state and sync
  // it from an effect, which is a cascading render for no gain: a
  // type="time" input only emits whole values, so there is no half-typed
  // state to preserve.
  return (
    <input
      type="time"
      aria-label={label}
      value={formatMinutes(value)}
      onChange={(e) => {
        const m = parseMinutes(e.target.value);
        if (m !== null) onChange(m);
      }}
      className="h-9 w-[6.5rem] rounded-lg border border-suth-border bg-suth-base px-2 text-sm tabular-nums text-suth-text outline-none focus:border-suth-accent"
    />
  );
}

function Overrides({
  overrides,
  onChange,
}: {
  overrides: Availability["overrides"];
  onChange: (o: Availability["overrides"]) => void;
}) {
  const [date, setDate] = useState("");
  return (
    <div className="mt-4">
      <ul role="list" className="space-y-3">
        {overrides.map((o, i) => (
          <li
            key={o.date}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-suth-border bg-suth-elevated p-3"
          >
            <span className="w-32 shrink-0 text-sm tabular-nums text-suth-text">
              {o.date}
            </span>
            {o.windows.length === 0 ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-danger">
                Blocked out
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {o.windows.map((w, j) => (
                  <span key={j} className="flex items-center gap-1.5">
                    <TimeInput
                      label={`${o.date} start`}
                      value={w.start}
                      onChange={(v) =>
                        onChange(
                          overrides.map((x, k) =>
                            k === i
                              ? {
                                  ...x,
                                  windows: x.windows.map((y, l) =>
                                    l === j ? { ...y, start: v } : y,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                    <span aria-hidden className="text-suth-text-tertiary">–</span>
                    <TimeInput
                      label={`${o.date} end`}
                      value={w.end}
                      onChange={(v) =>
                        onChange(
                          overrides.map((x, k) =>
                            k === i
                              ? {
                                  ...x,
                                  windows: x.windows.map((y, l) =>
                                    l === j ? { ...y, end: v } : y,
                                  ),
                                }
                              : x,
                          ),
                        )
                      }
                    />
                  </span>
                ))}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChange(
                    overrides.map((x, k) =>
                      k === i
                        ? {
                            ...x,
                            windows:
                              x.windows.length === 0
                                ? [{ start: 9 * 60, end: 12 * 60 }]
                                : [],
                          }
                        : x,
                    ),
                  )
                }
                className="rounded-pill border border-suth-border px-3 py-1 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
              >
                {o.windows.length === 0 ? "Add hours" : "Block out"}
              </button>
              <button
                type="button"
                aria-label={`Remove the override for ${o.date}`}
                onClick={() => onChange(overrides.filter((_, k) => k !== i))}
                className="px-1 text-suth-text-tertiary hover:text-suth-danger"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor="override-date" className="sr-only">
          Date to override
        </label>
        <input
          id="override-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 rounded-lg border border-suth-border bg-suth-base px-3 text-sm text-suth-text outline-none focus:border-suth-accent"
        />
        <button
          type="button"
          disabled={!date || overrides.some((o) => o.date === date)}
          onClick={() => {
            onChange([...overrides, { date, windows: [] }].sort((a, b) =>
              a.date.localeCompare(b.date),
            ));
            setDate("");
          }}
          className="inline-flex h-10 items-center rounded-pill border border-suth-border px-4 text-sm text-suth-text hover:border-suth-border-strong disabled:opacity-40"
        >
          Block this date
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix: string;
}) {
  const id = `set-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary"
      >
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-24 rounded-lg border border-suth-border bg-suth-base px-3 text-sm tabular-nums text-suth-text outline-none focus:border-suth-accent"
        />
        <span className="text-sm text-suth-text-tertiary">{suffix}</span>
      </div>
    </div>
  );
}
