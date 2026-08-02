import type { DatedDay } from "@/lib/member/week";

/**
 * Seven columns, weekday initial over date, a state mark underneath, today
 * boxed. Lifted from MarchOn (teardown §2.7) because it answers "where am I in
 * the week" in one glance, which a list of session cards does not.
 *
 * The mark is a shape as well as a colour — an outline for rest, a fill for
 * done — so it does not rely on colour alone to carry state.
 *
 * It takes dated days rather than raw fixtures: "today" used to be a hardcoded
 * string in this file, which meant the strip highlighted 28 May forever.
 */

type DayState = "done" | "today" | "rest" | "upcoming";

function stateOf(day: DatedDay): DayState {
  if (day.isToday) return "today";
  if (day.type === "rest") return "rest";
  if (day.done) return "done";
  return "upcoming";
}

const LABEL: Record<DayState, string> = {
  done: "completed",
  today: "today",
  rest: "rest day",
  upcoming: "scheduled",
};

export function WeekStrip({
  days,
  base = "/app",
}: {
  days: DatedDay[];
  base?: string;
}) {
  return (
    <ol className="member-weekstrip" role="list">
      {days.map((day) => {
        const state = stateOf(day);
        return (
          <li key={day.slug}>
            <a
              href={`${base}/plan/${day.slug}`}
              className="member-weekstrip__day"
              data-today={day.isToday || undefined}
            >
              <span className="member-weekstrip__dow">{day.day.slice(0, 1)}</span>
              <span
                className="num"
                style={{ fontSize: "var(--text-sm)", fontWeight: 650 }}
              >
                {day.date.split(" ")[0]}
              </span>
              <span
                className="member-weekstrip__mark"
                data-state={state}
                aria-hidden
              />
              <span className="sr-only">
                {day.day} {day.date}, {day.title}, {LABEL[state]}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
