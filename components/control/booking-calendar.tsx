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
  leadIdByEmail?: Record<string, string>;
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
              {past.map((b) => {
                const leadId =
                  data.leadIdByEmail?.[b.email.trim().toLowerCase()];
                const inner = (
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-suth-text-secondary">{b.name}</span>
                    <span className="tabular-nums">
                      {formatBookingTime(b.startISO)}
                    </span>
                    {b.status === "cancelled" ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-danger">
                        Cancelled
                      </span>
                    ) : null}
                    {leadId ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-accent">
                        View enquiry →
                      </span>
                    ) : null}
                  </span>
                );
                return (
                  <li key={b.ref} className="text-sm text-suth-text-tertiary">
                    {leadId ? (
                      <a
                        href={`/l/${leadId}`}
                        className="block rounded-md px-2 py-1 -mx-2 transition-colors hover:bg-suth-elevated"
                      >
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </li>
                );
              })}
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
              onCopyTo={(targets) =>
                setDraft({
                  ...draft,
                  weekly: {
                    ...draft.weekly,
                    ...Object.fromEntries(
                      targets.map((t) => [
                        t,
                        (draft.weekly[day] ?? []).map((w) => ({ ...w })),
                      ]),
                    ),
                  },
                })
              }
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
        <div className="mt-4 space-y-3 rounded-xl border border-suth-border-subtle bg-suth-elevated p-4">
          <SettingSentence
            before="Each call lasts"
            value={draft.slotMinutes}
            onChange={(v) => setDraft({ ...draft, slotMinutes: v })}
            options={[
              [15, "15 minutes"],
              [20, "20 minutes"],
              [30, "30 minutes"],
              [45, "45 minutes"],
              [60, "1 hour"],
            ]}
          />
          <SettingSentence
            before="Keep"
            after="free after every call"
            value={draft.bufferMinutes}
            onChange={(v) => setDraft({ ...draft, bufferMinutes: v })}
            options={[
              [0, "no time"],
              [5, "5 minutes"],
              [10, "10 minutes"],
              [15, "15 minutes"],
              [30, "30 minutes"],
            ]}
          />
          <SettingSentence
            before="People must book at least"
            after="before the call"
            value={draft.minNoticeHours}
            onChange={(v) => setDraft({ ...draft, minNoticeHours: v })}
            options={[
              [0, "no notice"],
              [2, "2 hours"],
              [4, "4 hours"],
              [12, "12 hours"],
              [24, "1 day"],
              [48, "2 days"],
            ]}
          />
          <SettingSentence
            before="The diary is open"
            after="ahead"
            value={draft.horizonDays}
            onChange={(v) => setDraft({ ...draft, horizonDays: v })}
            options={[
              [7, "1 week"],
              [14, "2 weeks"],
              [21, "3 weeks"],
              [30, "1 month"],
              [60, "2 months"],
              [90, "3 months"],
            ]}
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
  onCopyTo,
}: {
  day: Weekday;
  windows: Window[];
  onChange: (w: Window[]) => void;
  onCopyTo: (targets: Weekday[]) => void;
}) {
  const on = windows.length > 0;
  const [copying, setCopying] = useState(false);
  const [copyTargets, setCopyTargets] = useState<Weekday[]>([]);

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* Open/Closed said in words, not guessed from a coloured dot. */}
        <div
          role="group"
          aria-label={`${WEEKDAY_NAMES[day]} availability`}
          className="flex shrink-0 overflow-hidden rounded-pill border border-suth-border"
        >
          <button
            type="button"
            aria-pressed={on}
            onClick={() => {
              if (!on) onChange([{ start: 17 * 60, end: 20 * 60 }]);
            }}
            className={cn(
              "h-9 px-3.5 text-xs font-medium transition-colors",
              on
                ? "bg-suth-accent text-[#0A0A0A]"
                : "text-suth-text-tertiary hover:text-suth-text",
            )}
          >
            Open
          </button>
          <button
            type="button"
            aria-pressed={!on}
            onClick={() => {
              if (on) onChange([]);
              setCopying(false);
            }}
            className={cn(
              "h-9 px-3.5 text-xs font-medium transition-colors",
              !on
                ? "bg-suth-border-strong text-suth-text"
                : "text-suth-text-tertiary hover:text-suth-text",
            )}
          >
            Closed
          </button>
        </div>

        <span
          className={cn(
            "w-24 shrink-0 text-sm font-medium",
            on ? "text-suth-text" : "text-suth-text-tertiary",
          )}
        >
          {WEEKDAY_NAMES[day]}
        </span>

        {!on ? (
          <span className="text-sm text-suth-text-tertiary">
            No calls this day
          </span>
        ) : (
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {windows.map((w, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-lg border border-suth-border-subtle bg-suth-elevated px-2 py-1"
              >
                <TimeInput
                  label={`${WEEKDAY_NAMES[day]} hours ${i + 1} start`}
                  value={w.start}
                  onChange={(v) =>
                    onChange(windows.map((x, j) => (j === i ? { ...x, start: v } : x)))
                  }
                />
                <span aria-hidden className="text-suth-text-tertiary">
                  to
                </span>
                <TimeInput
                  label={`${WEEKDAY_NAMES[day]} hours ${i + 1} end`}
                  value={w.end}
                  onChange={(v) =>
                    onChange(windows.map((x, j) => (j === i ? { ...x, end: v } : x)))
                  }
                />
                <button
                  type="button"
                  aria-label={`Remove ${WEEKDAY_NAMES[day]} hours ${i + 1}`}
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
              className="rounded-pill border border-suth-border px-3 py-1.5 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
            >
              + Add hours
            </button>
            <button
              type="button"
              onClick={() => {
                setCopying(!copying);
                setCopyTargets([]);
              }}
              aria-expanded={copying}
              className="rounded-pill border border-suth-border px-3 py-1.5 text-xs text-suth-text-secondary hover:border-suth-border-strong hover:text-suth-text"
            >
              Copy to…
            </button>
          </div>
        )}
      </div>

      {/* Duplicate this day's hours onto other days in two taps. */}
      {on && copying ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-suth-border-subtle bg-suth-elevated p-3">
          <span className="text-xs text-suth-text-tertiary">
            Copy {WEEKDAY_NAMES[day]}&apos;s hours to:
          </span>
          {DAY_ORDER.filter((d) => d !== day).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={copyTargets.includes(d)}
              onClick={() =>
                setCopyTargets((prev) =>
                  prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                )
              }
              className={cn(
                "rounded-pill border px-3 py-1.5 text-xs transition-colors",
                copyTargets.includes(d)
                  ? "border-suth-accent bg-suth-accent/15 text-suth-accent"
                  : "border-suth-border text-suth-text-secondary hover:border-suth-border-strong",
              )}
            >
              {WEEKDAY_NAMES[d].slice(0, 3)}
            </button>
          ))}
          <button
            type="button"
            disabled={copyTargets.length === 0}
            onClick={() => {
              onCopyTo(copyTargets);
              setCopying(false);
              setCopyTargets([]);
            }}
            className="ml-auto rounded-pill bg-suth-accent px-4 py-1.5 text-xs font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50"
          >
            Copy
          </button>
        </div>
      ) : null}
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
            <span className="w-40 shrink-0 text-sm text-suth-text">
              {new Date(`${o.date}T12:00:00`).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
            {o.windows.length === 0 ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-danger">
                Blocked all day
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
                {o.windows.length === 0 ? "Open for part of the day instead" : "Block the whole day instead"}
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

      <div className="mt-4 rounded-xl border border-suth-border-subtle bg-suth-elevated p-4">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-text-tertiary">
          Block out or change a date
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="override-date" className="sr-only">
            Date to change
          </label>
          <input
            id="override-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-lg border border-suth-border bg-suth-base px-3 text-sm text-suth-text outline-none focus:border-suth-accent"
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
            className="inline-flex h-11 items-center rounded-pill border border-suth-danger/40 bg-suth-danger/10 px-4 text-sm text-suth-danger hover:bg-suth-danger/20 disabled:opacity-40"
          >
            Block the whole day
          </button>
          <button
            type="button"
            disabled={!date || overrides.some((o) => o.date === date)}
            onClick={() => {
              onChange(
                [...overrides, { date, windows: [{ start: 9 * 60, end: 12 * 60 }] }].sort(
                  (a, b) => a.date.localeCompare(b.date),
                ),
              );
              setDate("");
            }}
            className="inline-flex h-11 items-center rounded-pill border border-suth-border px-4 text-sm text-suth-text hover:border-suth-border-strong disabled:opacity-40"
          >
            Different hours that day
          </button>
        </div>
        <p className="mt-2 text-xs text-suth-text-tertiary">
          Blocking a day removes every slot on it: holidays, races, days off.
          Different hours replaces the usual pattern for that one date.
        </p>
      </div>
    </div>
  );
}

/**
 * A setting written as the sentence Ben would say out loud, with the number
 * as a dropdown in the middle. "Slot minutes: 30" needs translating in your
 * head; "Each call lasts 30 minutes" doesn't.
 *
 * The saved value might not be one of the listed choices (an old install,
 * or someone who typed 25 into the previous number box). It still has to
 * show honestly, so an off-list value gets its own option rather than the
 * select silently snapping to something else.
 */
function SettingSentence({
  before,
  after,
  value,
  onChange,
  options,
}: {
  before: string;
  after?: string;
  value: number;
  onChange: (v: number) => void;
  options: Array<[number, string]>;
}) {
  const id = `set-${before.replace(/\s+/g, "-").toLowerCase()}`;
  const listed = options.some(([v]) => v === value);
  return (
    <label
      htmlFor={id}
      className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-suth-text-secondary"
    >
      <span>{before}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 rounded-lg border border-suth-border bg-suth-base px-3 text-sm font-medium text-suth-text outline-none focus:border-suth-accent"
      >
        {!listed ? <option value={value}>{String(value)}</option> : null}
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
      {after ? <span>{after}</span> : null}
    </label>
  );
}
