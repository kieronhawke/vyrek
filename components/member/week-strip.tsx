import type { WeekDay } from "@/lib/member/demo";

/**
 * Seven columns, weekday initial over date, a state mark underneath, today
 * boxed. Lifted from MarchOn (teardown §2.7) because it answers "where am I in
 * the week" in one glance, which a list of session cards does not.
 *
 * The mark is a shape as well as a colour — an outline for rest, a fill for
 * done — so it does not rely on colour alone to carry state.
 */

type DayState = "done" | "today" | "rest" | "upcoming" | "missed";

function stateOf(day: WeekDay, todayDate: string): DayState {
  if (day.date === todayDate) return "today";
  if (day.type === "rest") return "rest";
  if (day.done) return "done";
  return "upcoming";
}

const LABEL: Record<DayState, string> = {
  done: "completed",
  today: "today",
  rest: "rest day",
  upcoming: "scheduled",
  missed: "missed",
};

export function WeekStrip({
  days,
  todayDate,
}: {
  days: WeekDay[];
  /** Defaults to the demo's current day. */
  todayDate?: string;
}) {
  const today = todayDate ?? "28 May";

  return (
    <ol className="member-weekstrip" role="list">
      {days.map((day) => {
        const state = stateOf(day, today);
        return (
          <li key={day.date}>
            <div
              className="member-weekstrip__day"
              data-today={state === "today" || undefined}
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
                {day.day}, {day.title}, {LABEL[state]}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
