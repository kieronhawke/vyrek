/**
 * Member-side seed data. Replaced by real queries in Phase A; the accessors
 * are the seam. HARD-RULES §1: nothing here is presented as a real person.
 */

export type SessionStatus = "done" | "today" | "upcoming" | "missed";

export type PlanSession = {
  id: string;
  day: string;
  date: string;
  title: string;
  type: "Strength" | "Running" | "Hybrid" | "Rest";
  durationMin: number;
  status: SessionStatus;
  exercises: { name: string; detail: string }[];
};

export const MEMBER = {
  firstName: "Sample",
  tier: "programming" as const,
  coachNote:
    "Big week. Two easy runs and one hard one, and I want the sled work heavy rather than fast. If Thursday feels rough, drop the last interval and tell me.",
  coachNoteDate: "Sunday 26 July",
  programme: "Weight loss, 12 weeks",
  weekNumber: 4,
  totalWeeks: 12,
  nextRace: { name: "Hyrox London", inDays: 42 },
};

export const WEEK: PlanSession[] = [
  {
    id: "s1", day: "Mon", date: "27 Jul", title: "Lower strength", type: "Strength",
    durationMin: 45, status: "done",
    exercises: [
      { name: "Back squat", detail: "4 × 6 @ 70kg" },
      { name: "Sled push", detail: "6 × 20m" },
      { name: "Sandbag lunges", detail: "3 × 20" },
    ],
  },
  {
    id: "s2", day: "Tue", date: "28 Jul", title: "Easy run", type: "Running",
    durationMin: 30, status: "done",
    exercises: [{ name: "Easy pace", detail: "5km, conversational" }],
  },
  {
    id: "s3", day: "Wed", date: "29 Jul", title: "Rest", type: "Rest",
    durationMin: 0, status: "done", exercises: [],
  },
  {
    id: "s4", day: "Thu", date: "30 Jul", title: "Strength + intervals", type: "Hybrid",
    durationMin: 45, status: "today",
    exercises: [
      { name: "Wall balls", detail: "3 × 15 @ 6kg" },
      { name: "Sled push", detail: "3 × 25m @ 100kg" },
      { name: "Row", detail: "3 × 500m" },
      { name: "Sandbag lunges", detail: "3 × 20 @ 20kg" },
    ],
  },
  {
    id: "s5", day: "Fri", date: "31 Jul", title: "Rest", type: "Rest",
    durationMin: 0, status: "upcoming", exercises: [],
  },
  {
    id: "s6", day: "Sat", date: "1 Aug", title: "Long run", type: "Running",
    durationMin: 60, status: "upcoming",
    exercises: [{ name: "Steady", detail: "10km" }],
  },
  {
    id: "s7", day: "Sun", date: "2 Aug", title: "Upper strength", type: "Strength",
    durationMin: 45, status: "upcoming",
    exercises: [
      { name: "Bench press", detail: "4 × 8" },
      { name: "Pull-ups", detail: "4 × max" },
    ],
  },
];

/** Station benchmarks with a percentile against the field. spec/11 §7. */
export const BENCHMARKS = [
  { station: "SkiErg", value: "4:12", trend: -8, percentile: 62 },
  { station: "Sled push", value: "1:48", trend: -12, percentile: 71 },
  { station: "Sled pull", value: "2:31", trend: 4, percentile: 44 },
  { station: "Burpee broad jump", value: "4:55", trend: -3, percentile: 38 },
  { station: "Row", value: "4:05", trend: -6, percentile: 68 },
  { station: "Farmers carry", value: "1:52", trend: -2, percentile: 74 },
  { station: "Sandbag lunges", value: "4:40", trend: 6, percentile: 31 },
  { station: "Wall balls", value: "5:20", trend: -15, percentile: 55 },
];

export const PREDICTED = { current: "1:18:40", target: "1:12:00", startOfBlock: "1:24:10" };

export function weekDots() {
  return WEEK.map((s) => s.status);
}

export function todaySession(): PlanSession | undefined {
  return WEEK.find((s) => s.status === "today");
}
