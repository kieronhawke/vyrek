/**
 * THE DIARY.
 *
 * Ben's week is sessions, calls, races and the admin around them, and until
 * now the console showed it as a table of four columns. A table answers "what
 * is booked"; it cannot answer "when am I free on Thursday", which is the only
 * question anyone opens a calendar to ask.
 *
 * This is the model behind a real calendar: month, week and day, an event you
 * can put anywhere by tapping the place it goes, categories that carry colour,
 * and a reminder. Pure functions with no React and no storage, so the layout
 * maths — which is where calendars actually go wrong — is testable on its own.
 *
 * DATES ARE ISO STRINGS, NOT Date OBJECTS
 * A Date is a moment in time in the viewer's zone; a diary entry is a date in
 * Ben's. Storing "2026-08-11" and "09:30" separately means an entry cannot
 * drift a day because a phone is set to Los Angeles, which is the classic
 * calendar bug and is unfixable once the data has been written wrong.
 */

export type DiaryCategory = "session" | "call" | "race" | "admin" | "personal";

export type CategoryMeta = {
  key: DiaryCategory;
  label: string;
  /** A CSS colour token. Category colour is the fastest read in a week view. */
  colour: string;
};

/**
 * Five, deliberately. Enough that a week reads at a glance, few enough that
 * the colours stay distinguishable — the point at which a category system
 * stops working is when two of them look the same at 6px wide.
 */
export const DIARY_CATEGORIES: CategoryMeta[] = [
  { key: "session", label: "Session", colour: "var(--accent)" },
  { key: "call", label: "Call", colour: "var(--info)" },
  { key: "race", label: "Race", colour: "var(--danger)" },
  { key: "admin", label: "Admin", colour: "var(--text-faint)" },
  { key: "personal", label: "Personal", colour: "var(--ok)" },
];

export function categoryMeta(key: DiaryCategory): CategoryMeta {
  return DIARY_CATEGORIES.find((c) => c.key === key) ?? DIARY_CATEGORIES[0];
}

export type Appointment = {
  id: string;
  /** YYYY-MM-DD in Ben's own calendar, not a timestamp. */
  date: string;
  /** HH:MM, 24-hour. Ignored when allDay. */
  start: string;
  end: string;
  allDay: boolean;
  title: string;
  /** Optional — a dentist appointment has no client. */
  client: string;
  category: DiaryCategory;
  notes: string;
  /** Minutes before the start, or null for no reminder. */
  remindMin: number | null;
};

export const REMINDER_CHOICES: { value: number | null; label: string }[] = [
  { value: null, label: "No reminder" },
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

/* ── Dates ─────────────────────────────────────────────────────────────── */

/** Parsed as UTC throughout, so arithmetic never crosses a DST boundary. */
function parse(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
}

export function addMonths(iso: string, n: number): string {
  const d = parse(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  // Clamp: 31 January plus one month is 28 February, not 3 March. Every
  // calendar that skips this shows the wrong month after pressing next twice.
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return isoOf(d);
}

/** Monday index, 0–6. UK weeks start on Monday; getUTCDay puts Sunday first. */
export function weekdayIndex(iso: string): number {
  return (parse(iso).getUTCDay() + 6) % 7;
}

export function startOfWeek(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function weekDays(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/**
 * Six rows of seven, always.
 *
 * A grid that is five rows in one month and six in the next makes the whole
 * page jump on every press of next — the single most irritating thing a month
 * view can do. Fixed height costs one row of grey dates.
 */
export function monthGrid(iso: string): string[] {
  const first = startOfWeek(startOfMonth(iso));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function monthLabel(iso: string): string {
  return `${MONTHS[parse(iso).getUTCMonth()]} ${iso.slice(0, 4)}`;
}

export function dayLabel(iso: string): string {
  return `${DAYS[weekdayIndex(iso)]} ${Number(iso.slice(8))} ${MONTHS[parse(iso).getUTCMonth()].slice(0, 3)}`;
}

export function weekLabel(iso: string): string {
  const days = weekDays(iso);
  const a = days[0];
  const b = days[6];
  const m = (d: string) => MONTHS[parse(d).getUTCMonth()].slice(0, 3);
  return sameMonth(a, b)
    ? `${Number(a.slice(8))}–${Number(b.slice(8))} ${m(a)} ${a.slice(0, 4)}`
    : `${Number(a.slice(8))} ${m(a)} – ${Number(b.slice(8))} ${m(b)} ${b.slice(0, 4)}`;
}

/* ── Times ─────────────────────────────────────────────────────────────── */

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The hours a coaching day actually occupies.
 *
 * Rendering all twenty-four means two thirds of the grid is empty and every
 * real session is off the bottom of a phone screen. The range widens if an
 * entry falls outside it, so a 05:30 track session is never hidden.
 */
export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 21;

export function hourRange(items: Appointment[]): [number, number] {
  let from = DAY_START_HOUR;
  let to = DAY_END_HOUR;
  for (const a of items) {
    if (a.allDay) continue;
    from = Math.min(from, Math.floor(toMinutes(a.start) / 60));
    to = Math.max(to, Math.ceil(toMinutes(a.end) / 60));
  }
  return [Math.max(0, from), Math.min(24, Math.max(to, from + 1))];
}

export function formatTime(hhmm: string): string {
  return hhmm;
}

export function formatRange(a: Appointment): string {
  return a.allDay ? "All day" : `${a.start}–${a.end}`;
}

/* ── Queries ───────────────────────────────────────────────────────────── */

export function onDate(items: Appointment[], iso: string): Appointment[] {
  return items
    .filter((a) => a.date === iso)
    .sort((x, y) =>
      x.allDay === y.allDay
        ? toMinutes(x.start) - toMinutes(y.start)
        : Number(x.allDay) - Number(y.allDay) * -1,
    );
}

/** All-day first, then by start time. */
export function sortForDay(items: Appointment[]): Appointment[] {
  return [...items].sort((x, y) => {
    if (x.allDay !== y.allDay) return x.allDay ? -1 : 1;
    return toMinutes(x.start) - toMinutes(y.start);
  });
}

/**
 * Side-by-side placement for overlapping entries.
 *
 * Two things at 09:00 must not be drawn on top of each other — the one
 * underneath is invisible and Ben double-books. Each entry gets a column
 * index and the width of its overlapping cluster, which is what every real
 * calendar does and what a naive absolute-positioned week view forgets.
 *
 * Returns entries in their original order, each with `column` and `columns`.
 */
export type Placed = Appointment & { column: number; columns: number };

export function placeDay(items: Appointment[]): Placed[] {
  const timed = items
    .filter((a) => !a.allDay)
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start) || toMinutes(a.end) - toMinutes(b.end));

  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    const width = cluster.reduce((n, p) => Math.max(n, p.column + 1), 0);
    cluster.forEach((p) => (p.columns = width));
    cluster = [];
  };

  /**
   * The extent a box actually occupies, which is what can collide.
   *
   * A 09:00–09:00 entry still draws at the minimum height, so it overlaps a
   * 09:05 one on screen even though its end time does not. Placing on the
   * stored end rather than the drawn one puts them in the same column, one
   * on top of the other.
   */
  const extent = (a: Appointment) =>
    Math.max(toMinutes(a.end), toMinutes(a.start) + 15);

  for (const a of timed) {
    const from = toMinutes(a.start);
    const to = extent(a);
    if (from >= clusterEnd && cluster.length) closeCluster();

    // Lowest free column within the live cluster.
    const taken = new Set(
      cluster.filter((p) => extent(p) > from).map((p) => p.column),
    );
    let column = 0;
    while (taken.has(column)) column++;

    const entry: Placed = { ...a, column, columns: 1 };
    cluster.push(entry);
    placed.push(entry);
    clusterEnd = Math.max(clusterEnd, to);
  }
  if (cluster.length) closeCluster();
  return placed;
}

/** Does the day hold anything at all — the dot under a month cell. */
export function busy(items: Appointment[], iso: string): boolean {
  return items.some((a) => a.date === iso);
}

/* ── Seed ──────────────────────────────────────────────────────────────── */

/**
 * Sample entries, anchored to a fixed week so the screen is never empty on a
 * first visit. Names are placeholders: this repository is public, and a real
 * client's name and session time is exactly what must never be committed.
 */
export function seedAppointments(today: string): Appointment[] {
  const monday = startOfWeek(today);
  const at = (dayOffset: number, id: string, rest: Partial<Appointment>): Appointment => ({
    id,
    date: addDays(monday, dayOffset),
    start: "09:00",
    end: "10:00",
    allDay: false,
    title: "",
    client: "",
    category: "session",
    notes: "",
    remindMin: null,
    ...rest,
  });

  return [
    at(0, "ap_1", { start: "07:00", end: "08:00", title: "Track session", client: "Amelia Fraser", category: "session" }),
    at(0, "ap_2", { start: "12:30", end: "13:00", title: "Check-in call", client: "Marcus Bell", category: "call", remindMin: 30 }),
    at(1, "ap_3", { start: "07:00", end: "08:15", title: "Strength", client: "Priya Raman", category: "session" }),
    at(1, "ap_4", { start: "07:30", end: "08:30", title: "Consultation", client: "Tom Whitaker", category: "call" }),
    at(2, "ap_5", { start: "18:00", end: "19:30", title: "Group session", category: "session" }),
    at(3, "ap_6", { start: "09:00", end: "11:00", title: "Write next block", category: "admin", notes: "Four plans due Friday." }),
    at(4, "ap_7", { start: "06:30", end: "07:30", title: "Track session", client: "Amelia Fraser", category: "session" }),
    at(5, "ap_8", { allDay: true, title: "HYROX Manchester", category: "race", remindMin: 1440 }),
  ];
}
