"use client";

import {
  SEED_WEEK,
  isRestDay,
  parseSession,
  sessionCount,
  type PlanWeek,
  type Slot,
} from "@/lib/plan/model";
import { useRecord } from "@/lib/control/store";

/**
 * The printable week.
 *
 * Reads the same store the builder writes, so printing gives you the plan as
 * it stands rather than a stale copy. Black on white with the brand carried by
 * the masthead, the condensed face and one chartreuse rule — an athlete
 * printing a week should not empty a cartridge on a solid black A4.
 */

function Lines({ text }: { text: string }) {
  return (
    <ul className="print__lines">
      {parseSession(text).map((l, i) =>
        l.connector ? (
          <li key={i} className="print__line print__line--connector">
            {l.raw}
          </li>
        ) : (
          <li key={i} className="print__line">
            {l.quantity ? <b>{l.quantity}</b> : null}
            {l.quantity ? ` ${l.rest}` : l.raw}
          </li>
        ),
      )}
    </ul>
  );
}

export function PrintablePlan({ athlete }: { athlete: string }) {
  const planKey = `plan.${athlete.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const { value: week } = useRecord<PlanWeek>(planKey, SEED_WEEK);

  return (
    <>
      <div className="print__actions">
        <button type="button" onClick={() => window.print()}>
          Save as PDF
        </button>
        <a
          href={`/api/export/${athlete.toLowerCase().replace(/[^a-z0-9]+/g, "-")}/xlsx`}
        >
          Download Excel
        </a>
      </div>

      <article className="print">
        <header className="print__head">
          <p className="print__brand">
            Suth<span>.</span>
          </p>
          <div className="print__who">
            <strong>{athlete}</strong>
            {week.label}
          </div>
        </header>

        <div className="print__meta">
          <span>
            <b>{sessionCount(week)}</b> sessions
          </span>
          <span>
            <b>{week.runningVolume}</b> running
          </span>
          <span>
            Programmed by <b>Ben Sutherland</b>
          </span>
          <span style={{ marginInlineStart: "auto" }}>
            Week commencing <b>{week.weekOf}</b>
          </span>
        </div>

        <div className="print__grid">
          {week.days.map((day) => (
            <section key={day.date} className="print__day">
              <header className="print__dayhead">
                <span className="print__dow">{day.dayName.slice(0, 3)}</span>
                <span className="print__date">
                  {day.date.slice(8)}/{day.date.slice(5, 7)}
                </span>
              </header>

              {isRestDay(day) ? (
                <p className="print__rest">Rest</p>
              ) : (
                (["am", "pm"] as Slot[]).map((slot) => {
                  const text = day[slot];
                  if (!text.trim() || text.trim().toLowerCase() === "rest")
                    return null;
                  return (
                    <div key={slot}>
                      <p className="print__slot">{slot}</p>
                      <Lines text={text} />
                    </div>
                  );
                })
              )}
            </section>
          ))}
        </div>

        {week.notes.trim() ? (
          <div className="print__note">
            <p className="print__slot">Note from Ben</p>
            <p>{week.notes}</p>
          </div>
        ) : null}

        <footer className="print__foot">
          <span>suthperformance.com</span>
          <span>
            Tick each session as you go. Log how it felt in the app — Ben reads
            it before he writes the next week.
          </span>
        </footer>
      </article>
    </>
  );
}
