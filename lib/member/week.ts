import { DEMO_WEEK, type WeekDay } from "@/lib/member/demo";

/**
 * The demo week, dated to whenever it is now.
 *
 * WHY
 * ---
 * DEMO_WEEK is hard-dated to 27 May - 2 Jun. The app renders "Sunday 2 August"
 * at the top and then a week from ten weeks ago underneath it, which is the
 * first thing anyone notices and it undermines everything around it. Fixtures
 * that go stale are worse than fixtures that are obviously fake.
 *
 * WHAT THIS DOES
 * --------------
 * Keeps DEMO_WEEK as the *pattern* — rest, hybrid, strength, run, rest,
 * simulation, long run — and maps it onto the Monday-to-Sunday containing the
 * given date. Sessions before today are marked done, today is today.
 *
 * `now` is a parameter rather than a call to new Date() inside, so tests can
 * pin it. Everything that renders these dates is force-dynamic, so this runs
 * per request rather than being frozen into a build.
 */

/** Monday of the week containing `d`, at local midnight. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // getDay(): 0 = Sunday. Shift so Monday is the first day.
  const shift = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - shift);
  return out;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** "28 May" — the format WeekDay.date already uses. */
export function shortDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(d);
}

/** A stable slug for a day, used by the session detail route. */
export function daySlug(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export type DatedDay = WeekDay & {
  /** URL-safe id: 2026-08-02 */
  slug: string;
  isToday: boolean;
  isPast: boolean;
};

export function weekFor(now: Date = new Date()): DatedDay[] {
  const monday = startOfWeek(now);
  const todayKey = daySlug(now);

  return DEMO_WEEK.map((pattern, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const slug = daySlug(date);
    const isToday = slug === todayKey;
    const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      ...pattern,
      day: DAY_NAMES[i],
      date: shortDate(date),
      slug,
      isToday,
      isPast,
      // A session in the past counts as done; today's has not happened yet.
      done: pattern.type === "rest" ? isPast || isToday : isPast,
    };
  });
}

export function todayFor(now: Date = new Date()): DatedDay {
  const week = weekFor(now);
  return week.find((d) => d.isToday) ?? week[0];
}

export function findDay(slug: string, now: Date = new Date()): DatedDay | undefined {
  return weekFor(now).find((d) => d.slug === slug);
}
