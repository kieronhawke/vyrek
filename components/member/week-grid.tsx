"use client";

import Link from "next/link";
import { SEED_WEEK, parseSession, type PlanWeek, type Slot } from "@/lib/plan/model";
import { useRecord } from "@/lib/control/store";

/**
 * The athlete's week — Ben's spreadsheet, live.
 *
 * WHY A GRID ON DESKTOP
 * ---------------------
 * The member area was a 760px column with a rail beside it, which is a phone
 * layout stretched onto a monitor: the same information, more slowly, with two
 * thirds of the screen empty. On a laptop an athlete wants what Ben has — the
 * whole week at once, so Thursday can be read against Saturday.
 *
 * So above 1024px this is a seven-column grid. Below it, the same data stacks
 * into day cards, because a week grid on a phone is an unreadable spreadsheet.
 * Both render from one component; there is no second implementation to drift.
 *
 * TICKING OFF
 * -----------
 * Completion persists per slot. It is the thing the athlete does most and the
 * signal Ben most needs back, so it is one tap on the session itself rather
 * than a separate logging screen.
 */

type Done = Record<string, boolean>;

function slotKey(date: string, slot: Slot) {
  return `${date}.${slot}`;
}

function SessionBody({ text }: { text: string }) {
  const lines = parseSession(text);
  return (
    <ol className="week-lines">
      {lines.map((l, i) =>
        l.connector ? (
          <li key={i} className="week-line week-line--connector">
            {l.raw}
          </li>
        ) : (
          <li key={i} className="week-line">
            {l.quantity ? <b className="num week-line__q">{l.quantity}</b> : null}
            <span>{l.quantity ? l.rest : l.raw}</span>
            {l.effort ? <span className="week-line__rpe num">{l.effort}</span> : null}
          </li>
        ),
      )}
    </ol>
  );
}

export function WeekGrid({
  planKey = "plan.haseeb",
  week: given,
  base = "/app",
}: {
  planKey?: string;
  week?: PlanWeek;
  /** Route prefix, so a day header links to its own session page. */
  base?: string;
}) {
  // Reads the same key the builder writes, so a plan written in the admin
  // shows up here without a second source of truth.
  const { value: stored } = useRecord<PlanWeek>(planKey, given ?? SEED_WEEK);
  const week = given ?? stored;
  const { value: done, save: saveDone } = useRecord<Done>(`${planKey}.done`, {});

  const total = week.days.reduce(
    (n, d) =>
      n +
      (d.am.trim() && d.am.trim().toLowerCase() !== "rest" ? 1 : 0) +
      (d.pm.trim() ? 1 : 0),
    0,
  );
  const completed = Object.values(done).filter(Boolean).length;

  function toggle(date: string, slot: Slot) {
    const k = slotKey(date, slot);
    saveDone({ ...done, [k]: !done[k] });
  }

  return (
    <div className="week">
      <div className="week__head">
        <span className="eyebrow">{week.label}</span>
        <span className="eyebrow">
          {completed} of {total} done · {week.runningVolume} running
        </span>
      </div>

      <div className="week__grid" role="list">
        {week.days.map((day) => {
          const rest =
            !day.am.trim() || day.am.trim().toLowerCase() === "rest";
          return (
            <section key={day.date} className="week__day" role="listitem">
              {/* The header is the way into the day's own page, which is where
                  the session detail and the feedback control live. The grid
                  answers "what is the week"; the page answers "what is this
                  session, and how did it go". */}
              <Link href={`${base}/plan/${day.date}`} className="week__dayhead">
                <span className="week__dow">{day.dayName.slice(0, 3)}</span>
                <span className="num week__date">{day.date.slice(8)}</span>
                <span className="sr-only">
                  Open {day.dayName} {day.date}
                </span>
              </Link>

              {rest && !day.pm.trim() ? (
                <p className="week__rest">Rest</p>
              ) : (
                (["am", "pm"] as Slot[]).map((slot) => {
                  const text = day[slot];
                  if (!text.trim() || text.trim().toLowerCase() === "rest")
                    return null;
                  const k = slotKey(day.date, slot);
                  const isDone = !!done[k];
                  return (
                    <div
                      key={slot}
                      className="week__session"
                      data-done={isDone || undefined}
                    >
                      <div className="week__slot">
                        <span className="eyebrow">{slot}</span>
                        <button
                          type="button"
                          className="week__tick"
                          aria-pressed={isDone}
                          aria-label={`Mark ${day.dayName} ${slot} ${isDone ? "not done" : "done"}`}
                          onClick={() => toggle(day.date, slot)}
                        >
                          {isDone ? "✓ Done" : "Mark done"}
                        </button>
                      </div>
                      <SessionBody text={text} />
                    </div>
                  );
                })
              )}
            </section>
          );
        })}
      </div>

      {week.notes.trim() ? (
        <div className="week__note">
          <p className="eyebrow">Ben&apos;s note for the week</p>
          <p>{week.notes}</p>
          {week.coachMedia ? (
            <button type="button" className="week__media">
              ▶ {week.coachMedia.label} ·{" "}
              {Math.floor(week.coachMedia.durationSec / 60)}:
              {String(week.coachMedia.durationSec % 60).padStart(2, "0")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
