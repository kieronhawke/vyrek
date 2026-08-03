"use client";

import {
  SEED_WEEK,
  isRestDay,
  parseSession,
  sessionCount,
  planTitle,
  type PlanWeek,
  type Slot,
} from "@/lib/plan/model";
import { classifyLine, intensityOf, sessionStation, STATION_META } from "@/lib/plan/stations";
import { StationIcon } from "@/components/export/station-icon";
import { useRecord } from "@/lib/control/store";

/**
 * THE PLAN, VERSION 2 — the designed one.
 *
 * WHAT WAS WRONG WITH VERSION 1
 * Kieron's words: bare, plain, and it is not clear which week you are looking
 * at. Both are fair, and both come from the same decision — v1 is seven narrow
 * columns of undifferentiated grey text, so "20 mins ski / 20 mins row / 15
 * min EMOM" reads as one paragraph and a Tuesday looks like a Thursday.
 *
 * WHAT THIS DOES INSTEAD
 *
 * 1. THE WEEK IS UNMISTAKABLE. A masthead band in the brand's black and
 *    chartreuse carrying the athlete's name, the dates in full, and the week's
 *    own label. You can tell two printed weeks apart across a room.
 *
 * 2. EACH LINE IS AN ITEM, NOT A SENTENCE. Every line gets its station icon,
 *    its quantity set in the numeral face, and the rest of the text beside it.
 *    You can see Monday is two ergs and an EMOM without reading a word.
 *
 * 3. DAY CARDS, TWO UP. Seven columns on A4 gives each day 38mm. Cards in two
 *    columns give it 88mm, which is what makes room for the icons and the
 *    quantities to breathe. It costs a second page in a heavy week, and a
 *    second page is cheaper than an unreadable one.
 *
 * 4. MORE INFORMATION, NOT MORE DECORATION. Sessions, running volume, rest
 *    days, and an intensity mark per session — all derived from what Ben
 *    already wrote, never invented.
 *
 * V1 IS KEPT. It is the ink-saver: black on white, seven columns, one page.
 * This one has a solid masthead and accent chips, and is the one to send.
 *
 * NOTHING IS EVER DROPPED. parseSession keeps every line; an unclassified one
 * gets a neutral marker and its full text.
 */

const DAY_ORDER: Slot[] = ["am", "pm"];

function Session({ text, slot }: { text: string; slot: Slot }) {
  const lines = parseSession(text);
  if (!lines.length) return null;

  const station = sessionStation(text);
  const meta = STATION_META[station];
  const intensity = intensityOf(text);

  return (
    <section className="p2-session" data-tone={meta.tone}>
      <header className="p2-session__head">
        <span className="p2-session__slot">{slot === "am" ? "Morning" : "Afternoon"}</span>
        <span className="p2-session__station">
          <StationIcon station={station} size={13} />
          {meta.label}
        </span>
        <span className="p2-pips" aria-label={`Intensity ${intensity} of 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className="p2-pip" data-on={n <= intensity || undefined} />
          ))}
        </span>
        {/* A box to tick with a pen. The athlete's app has its own tick; on
            paper this is the only way to mark a session done. */}
        <span className="p2-tick" aria-hidden />
      </header>

      <ul className="p2-lines">
        {lines.map((l, i) => {
          if (l.connector) {
            return (
              <li key={i} className="p2-line p2-line--connector">
                {l.raw}
              </li>
            );
          }
          const kind = classifyLine(l.raw);
          return (
            <li key={i} className="p2-line" data-tone={STATION_META[kind].tone}>
              <span className="p2-line__icon">
                <StationIcon station={kind} size={14} />
              </span>
              <span className="p2-line__text">
                {l.quantity ? <b className="num p2-qty">{l.quantity}</b> : null}
                {l.quantity ? ` ${l.rest}` : l.raw}
              </span>
              {l.effort ? <span className="p2-effort num">{l.effort}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function PrintablePlanV2({ athlete }: { athlete: string }) {
  const slug = athlete.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const { value: week } = useRecord<PlanWeek>(`plan.${slug}`, SEED_WEEK);
  // A standalone plan carries its own recipient; a client's plan takes the
  // name from the route. Never "New" at the top of a training plan.
  const name = planTitle(week, athlete);

  const sessions = sessionCount(week);
  const restDays = week.days.filter(isRestDay).length;

  return (
    <>
      <div className="p2-actions" data-print-hide>
        <button type="button" onClick={() => window.print()}>
          Save as PDF
        </button>
        <a href={`/api/export/${slug}/xlsx-v2`}>Download Excel</a>
        <a href={`/print/plan/${slug}`}>Plain version</a>
      </div>

      <article className="p2">
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <header className="p2-head">
          <div className="p2-head__brand">
            <span className="p2-wordmark">
              SUTH<span className="p2-wordmark__dot">.</span>
            </span>
            <span className="p2-head__kicker">Performance</span>
          </div>
          <div className="p2-head__who">
            <p className="p2-head__label">Training plan</p>
            <h1 className="p2-head__name">{name}</h1>
          </div>
          <div className="p2-head__when">
            <p className="p2-head__label">Week of</p>
            <p className="num p2-head__dates">{week.label}</p>
            <p className="num p2-head__range">
              {week.days[0]?.date} → {week.days[6]?.date}
            </p>
          </div>
        </header>

        {/* ── What this week is ────────────────────────────────────────── */}
        <section className="p2-summary" aria-label="This week">
          <div className="p2-fact">
            <span className="num p2-fact__v">{sessions}</span>
            <span className="p2-fact__k">sessions</span>
          </div>
          <div className="p2-fact">
            <span className="num p2-fact__v">{week.runningVolume || "—"}</span>
            <span className="p2-fact__k">running volume</span>
          </div>
          <div className="p2-fact">
            <span className="num p2-fact__v">{restDays}</span>
            <span className="p2-fact__k">rest {restDays === 1 ? "day" : "days"}</span>
          </div>
          <div className="p2-fact p2-fact--wide">
            <span className="p2-fact__k">Coach</span>
            <span className="p2-fact__v p2-fact__v--sm">Ben Sutherland</span>
          </div>
        </section>

        {/* ── The note. Above the week, because it is why the week is
             what it is — and HARD-RULES §3 means it always exists. ────── */}
        {week.notes.trim() ? (
          <section className="p2-note">
            <p className="p2-note__label">Note for the week</p>
            <p className="p2-note__body">{week.notes}</p>
          </section>
        ) : null}

        {/* ── The days ─────────────────────────────────────────────────── */}
        <div className="p2-days">
          {week.days.map((day) => {
            const rest = isRestDay(day);
            return (
              <section className="p2-day" key={day.date} data-rest={rest || undefined}>
                <header className="p2-day__head">
                  <h2 className="p2-day__name">{day.dayName}</h2>
                  <span className="num p2-day__date">
                    {day.date.slice(8)}/{day.date.slice(5, 7)}
                  </span>
                </header>

                {rest ? (
                  <p className="p2-rest">
                    <StationIcon station="rest" size={15} /> Rest day
                  </p>
                ) : (
                  DAY_ORDER.map((slot) => (
                    <Session key={slot} text={day[slot]} slot={slot} />
                  ))
                )}
              </section>
            );
          })}
        </div>

        <footer className="p2-foot">
          <span>Suth Performance · suthperformance.com</span>
          <span className="num">{week.label}</span>
        </footer>
      </article>
    </>
  );
}
