"use client";

import { useMemo, useState } from "react";
import { useCollection, useRecord } from "@/lib/control/store";
import {
  DIARY_CATEGORIES,
  REMINDER_CHOICES,
  addDays,
  addMonths,
  categoryMeta,
  dayLabel,
  formatRange,
  fromMinutes,
  hourRange,
  isoOf,
  monthGrid,
  monthLabel,
  placeDay,
  sameMonth,
  seedAppointments,
  sortForDay,
  toMinutes,
  weekDays,
  weekLabel,
  weekdayIndex,
  type Appointment,
  type DiaryCategory,
} from "@/lib/control/diary";

/**
 * THE DIARY.
 *
 * Three views over the same entries, because they answer different questions.
 * Month: is anything happening on the 14th. Week: where are the gaps. Day: what
 * is today, in order, with room for the detail.
 *
 * TAP THE PLACE THE THING GOES. Every empty slot is a button that opens the
 * editor already filled in with that date and time — 09:00 on Thursday, rather
 * than a blank form and two more decisions. That is the whole reason a
 * calendar beats a list, and it is why every cell here is a real control
 * rather than a div with an onClick.
 *
 * Entries persist through the same store as the rest of the console: real on
 * this device, not yet shared. The reminder is stored and shown; nothing sends
 * it until Resend and Twilio are connected, and the editor says so rather than
 * implying an alert will arrive.
 */

type View = "month" | "week" | "day";

const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Height of one hour in the week and day grids. */
const HOUR_PX = 52;

export function DiaryCalendar({ today }: { today: string }) {
  const { items, add, update, remove } = useCollection<Appointment>(
    "diary.appointments",
    useMemo(() => seedAppointments(today), [today]),
  );

  /**
   * Remembered, not reset every visit. Ben works in week at a desk and almost
   * always in day on a phone; making him re-pick on every navigation is the
   * kind of small friction that stops a tool being used.
   */
  const { value: view, save: setView } = useRecord<View>("diary.view", "week");
  const [cursor, setCursor] = useState(today);
  const [editing, setEditing] = useState<Appointment | null>(null);
  /** True when the editor is creating rather than changing. */
  const [isNew, setIsNew] = useState(false);

  function openNew(date: string, start = "09:00") {
    setEditing({
      id: `ap_${Date.parse(`${date}T${start}`)}_${items.length + 1}`,
      date,
      start,
      end: fromMinutes(toMinutes(start) + 60),
      allDay: false,
      title: "",
      client: "",
      category: "session",
      notes: "",
      remindMin: null,
    });
    setIsNew(true);
  }

  function openExisting(a: Appointment) {
    setEditing(a);
    setIsNew(false);
  }

  function save(a: Appointment) {
    if (isNew) add(a);
    else update(a.id, a);
    setEditing(null);
  }

  const step = (n: number) =>
    setCursor(view === "month" ? addMonths(cursor, n) : addDays(cursor, view === "week" ? 7 * n : n));

  const label =
    view === "month" ? monthLabel(cursor) : view === "week" ? weekLabel(cursor) : dayLabel(cursor);

  return (
    <div className="dc">
      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="dc-bar">
        <div className="dc-nav">
          <button type="button" className="dc-step" onClick={() => step(-1)} aria-label="Previous">
            ‹
          </button>
          <button type="button" className="dc-today" onClick={() => setCursor(today)}>
            Today
          </button>
          <button type="button" className="dc-step" onClick={() => step(1)} aria-label="Next">
            ›
          </button>
        </div>

        <h2 className="dc-label" aria-live="polite">
          {label}
        </h2>

        <div className="dc-views" role="tablist" aria-label="View">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === view}
              className="dc-view"
              data-on={v === view || undefined}
              onClick={() => setView(v)}
            >
              {v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <button type="button" className="dc-add" onClick={() => openNew(cursor)}>
          + New
        </button>
      </div>

      {view === "month" ? (
        <MonthView
          cursor={cursor}
          today={today}
          items={items}
          onPickDay={(iso) => {
            setCursor(iso);
            setView("day");
          }}
          onNew={(iso) => openNew(iso)}
        />
      ) : view === "week" ? (
        <TimeGrid
          days={weekDays(cursor)}
          today={today}
          items={items}
          onSlot={openNew}
          onOpen={openExisting}
        />
      ) : (
        <TimeGrid
          days={[cursor]}
          today={today}
          items={items}
          onSlot={openNew}
          onOpen={openExisting}
        />
      )}

      {editing ? (
        <Editor
          value={editing}
          isNew={isNew}
          onChange={setEditing}
          onSave={save}
          onDelete={
            isNew
              ? undefined
              : () => {
                  remove(editing.id);
                  setEditing(null);
                }
          }
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Key />
    </div>
  );
}

/* ── Month ─────────────────────────────────────────────────────────────── */

function MonthView({
  cursor,
  today,
  items,
  onPickDay,
  onNew,
}: {
  cursor: string;
  today: string;
  items: Appointment[];
  onPickDay: (iso: string) => void;
  onNew: (iso: string) => void;
}) {
  const grid = monthGrid(cursor);
  return (
    <div className="dc-month">
      <div className="dc-month__head" aria-hidden>
        {DAY_INITIALS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="dc-month__grid">
        {grid.map((iso) => {
          const day = sortForDay(items.filter((a) => a.date === iso));
          return (
            <button
              key={iso}
              type="button"
              className="dc-day"
              data-today={iso === today || undefined}
              data-outside={!sameMonth(iso, cursor) || undefined}
              onClick={() => (day.length ? onPickDay(iso) : onNew(iso))}
              aria-label={`${dayLabel(iso)}, ${day.length} ${day.length === 1 ? "entry" : "entries"}`}
            >
              <span className="num dc-day__n">{Number(iso.slice(8))}</span>
              {/* Two chips then a count. Four chips in a 90px cell is a
                  smudge, and the month view is a "what sort of day is it"
                  question, not a reading exercise. */}
              <span className="dc-day__chips">
                {day.slice(0, 2).map((a) => (
                  <span
                    key={a.id}
                    className="dc-chip"
                    style={{ background: categoryMeta(a.category).colour }}
                    title={a.title}
                  />
                ))}
                {day.length > 2 ? (
                  <span className="num dc-day__more">+{day.length - 2}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week and day ──────────────────────────────────────────────────────── */

function TimeGrid({
  days,
  today,
  items,
  onSlot,
  onOpen,
}: {
  days: string[];
  today: string;
  items: Appointment[];
  onSlot: (iso: string, start: string) => void;
  onOpen: (a: Appointment) => void;
}) {
  const visible = items.filter((a) => days.includes(a.date));
  const [from, to] = hourRange(visible);
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const allDay = visible.filter((a) => a.allDay);

  return (
    <div className="dc-grid" data-cols={days.length}>
      {/* Day headings */}
      <div className="dc-grid__head">
        <span className="dc-gutter" aria-hidden />
        {days.map((iso) => (
          <span key={iso} className="dc-col__head" data-today={iso === today || undefined}>
            <span className="eyebrow">{DAY_SHORT[weekdayIndex(iso)]}</span>
            <span className="num dc-col__n">{Number(iso.slice(8))}</span>
          </span>
        ))}
      </div>

      {/* All-day band. Absent when empty rather than a permanent empty strip. */}
      {allDay.length ? (
        <div className="dc-allday">
          <span className="dc-gutter eyebrow">All day</span>
          {days.map((iso) => (
            <span key={iso} className="dc-allday__col">
              {allDay
                .filter((a) => a.date === iso)
                .map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="dc-event dc-event--allday"
                    style={{ borderColor: categoryMeta(a.category).colour }}
                    onClick={() => onOpen(a)}
                  >
                    {a.title || "Untitled"}
                  </button>
                ))}
            </span>
          ))}
        </div>
      ) : null}

      <div className="dc-grid__body" style={{ height: hours.length * HOUR_PX }}>
        <div className="dc-hours" aria-hidden>
          {hours.map((h) => (
            <span key={h} className="num dc-hour" style={{ height: HOUR_PX }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((iso) => {
          const placed = placeDay(items.filter((a) => a.date === iso));
          return (
            <div key={iso} className="dc-col" data-today={iso === today || undefined}>
              {/* One button an hour. Tapping 14:00 on Thursday should open an
                  editor that already says 14:00 on Thursday. */}
              {hours.map((h) => (
                <button
                  key={h}
                  type="button"
                  className="dc-slot"
                  style={{ height: HOUR_PX }}
                  onClick={() => onSlot(iso, `${String(h).padStart(2, "0")}:00`)}
                  aria-label={`New at ${String(h).padStart(2, "0")}:00 on ${dayLabel(iso)}`}
                />
              ))}

              {placed.map((a) => {
                const startMin = toMinutes(a.start) - from * 60;
                const height = Math.max(
                  22,
                  ((Math.max(toMinutes(a.end), toMinutes(a.start) + 15) - toMinutes(a.start)) / 60) *
                    HOUR_PX,
                );
                const colour = categoryMeta(a.category).colour;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className="dc-event"
                    onClick={() => onOpen(a)}
                    style={{
                      top: (startMin / 60) * HOUR_PX,
                      height,
                      left: `calc(${(a.column / a.columns) * 100}% + 2px)`,
                      width: `calc(${100 / a.columns}% - 4px)`,
                      borderColor: colour,
                    }}
                  >
                    {/* A 30-minute entry is a 26px box, which at the 12px
                        floor holds one line. The title is the line worth
                        keeping — where the box sits already says when it is. */}
                    {height >= 34 ? (
                      <span className="dc-event__time num">{a.start}</span>
                    ) : null}
                    <span className="dc-event__title">{a.title || "Untitled"}</span>
                    {/* A 30-minute box is 26px. Time, title and client do not
                        fit in it, and half a name clipped by an overflow rule
                        reads as a broken layout rather than a short entry. */}
                    {a.client && height >= 58 ? (
                      <span className="dc-event__who">{a.client}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Editor ────────────────────────────────────────────────────────────── */

function Editor({
  value,
  isNew,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  value: Appointment;
  isNew: boolean;
  onChange: (a: Appointment) => void;
  onSave: (a: Appointment) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Appointment>(k: K, v: Appointment[K]) =>
    onChange({ ...value, [k]: v });

  /** An end before its start is the one bit of nonsense a form can prevent. */
  const invalidTimes = !value.allDay && toMinutes(value.end) <= toMinutes(value.start);

  return (
    <div className="dc-editor" role="dialog" aria-modal="true" aria-label={isNew ? "New entry" : "Edit entry"}>
      <button type="button" className="dc-editor__scrim" aria-label="Close" onClick={onClose} />
      <form
        className="dc-editor__panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalidTimes) onSave(value);
        }}
      >
        <div className="dc-editor__grip" aria-hidden />
        <h3 className="dc-editor__title">{isNew ? "New entry" : "Edit entry"}</h3>

        <label className="dc-field">
          <span className="eyebrow">What</span>
          <input
            autoFocus
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Track session"
            className="dc-input"
          />
        </label>

        <div className="dc-cats" role="group" aria-label="Category">
          {DIARY_CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className="dc-cat"
              data-on={c.key === value.category || undefined}
              onClick={() => set("category", c.key as DiaryCategory)}
            >
              <span className="dc-cat__dot" style={{ background: c.colour }} />
              {c.label}
            </button>
          ))}
        </div>

        <label className="dc-field">
          <span className="eyebrow">Who (optional)</span>
          <input
            value={value.client}
            onChange={(e) => set("client", e.target.value)}
            placeholder="Amelia Fraser"
            className="dc-input"
          />
        </label>

        <label className="dc-field">
          <span className="eyebrow">Date</span>
          <input
            type="date"
            value={value.date}
            onChange={(e) => set("date", e.target.value)}
            className="dc-input"
          />
        </label>

        <label className="dc-check">
          <input
            type="checkbox"
            checked={value.allDay}
            onChange={(e) => set("allDay", e.target.checked)}
          />
          All day
        </label>

        {!value.allDay ? (
          <div className="dc-times">
            <label className="dc-field">
              <span className="eyebrow">From</span>
              <input
                type="time"
                value={value.start}
                onChange={(e) => {
                  const start = e.target.value;
                  // Drag the end with the start, the way every calendar does —
                  // otherwise moving a 09:00 entry to 11:00 silently makes it
                  // negative and the save button just stops working.
                  const length = Math.max(15, toMinutes(value.end) - toMinutes(value.start));
                  onChange({
                    ...value,
                    start,
                    end: fromMinutes(toMinutes(start) + length),
                  });
                }}
                className="dc-input"
              />
            </label>
            <label className="dc-field">
              <span className="eyebrow">To</span>
              <input
                type="time"
                value={value.end}
                onChange={(e) => set("end", e.target.value)}
                className="dc-input"
              />
            </label>
          </div>
        ) : null}

        <label className="dc-field">
          <span className="eyebrow">Reminder</span>
          <select
            value={value.remindMin === null ? "" : String(value.remindMin)}
            onChange={(e) => set("remindMin", e.target.value === "" ? null : Number(e.target.value))}
            className="dc-input"
          >
            {REMINDER_CHOICES.map((c) => (
              <option key={c.label} value={c.value === null ? "" : String(c.value)}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {value.remindMin !== null ? (
          <p className="dc-hint">
            Saved with the entry. Nothing sends it yet — reminders need Resend
            and Twilio connecting.
          </p>
        ) : null}

        <label className="dc-field">
          <span className="eyebrow">Notes</span>
          <textarea
            value={value.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className="dc-input"
          />
        </label>

        {invalidTimes ? (
          <p role="alert" className="dc-error">
            The end has to be after the start.
          </p>
        ) : null}

        <div className="dc-editor__actions">
          {onDelete ? (
            <button type="button" className="dc-delete" onClick={onDelete}>
              Delete
            </button>
          ) : null}
          <button type="button" className="dc-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="dc-save" disabled={invalidTimes}>
            {isNew ? "Add" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Key() {
  return (
    <ul className="dc-key" aria-label="Categories">
      {DIARY_CATEGORIES.map((c) => (
        <li key={c.key}>
          <span className="dc-cat__dot" style={{ background: c.colour }} />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

/** Today, as an ISO date in the viewer's own zone. */
export function todayIso(): string {
  const now = new Date();
  return isoOf(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** Re-exported so the page can label an entry without importing the model. */
export { formatRange };
