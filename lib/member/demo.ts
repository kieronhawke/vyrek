/**
 * Demo content for the member app. Used as fallback when real data
 * isn't present (no Stripe sub yet, no logged sessions yet, etc.) and
 * for the always-mock surfaces: community feed, athlete database,
 * race results database.
 *
 * Everything here is deterministic so screenshots and tests are stable.
 */

// ─── Today's workout templates ──────────────────────────

export type TodayWorkout = {
  date: string; // "Tue 28 May"
  weekNumber: number;
  dayNumber: number;
  title: string;
  type: "run" | "intervals" | "strength" | "stations" | "simulation" | "recovery";
  durationMin: number;
  intensity: "easy" | "moderate" | "hard" | "race-pace";
  blocks: Array<{ label: string; detail: string; duration?: string }>;
  notes?: string;
};

export const DEMO_TODAY: TodayWorkout = {
  date: "Tue 28 May",
  weekNumber: 4,
  dayNumber: 2,
  title: "Hyrox hybrid: run + sled",
  type: "intervals",
  durationMin: 60,
  intensity: "moderate",
  blocks: [
    {
      label: "Warm-up",
      detail: "8 min easy run + dynamic mobility (leg swings, lunges, openers)",
      duration: "12 min",
    },
    {
      label: "Main block",
      detail:
        "6 rounds: 1 km run at threshold pace + 30 m sled push at 60% race weight + 90s easy",
      duration: "40 min",
    },
    {
      label: "Cool-down",
      detail: "5 min walk + breathing reset + lower-body stretch",
      duration: "8 min",
    },
  ],
  notes:
    "Pace the runs honestly. The sled pushes are technique reps, not max effort. Log RPE + how the sled felt.",
};

// ─── Week schedule ──────────────────────────────────────

export type WeekDay = {
  day: string;
  date: string;
  type: TodayWorkout["type"] | "rest";
  title: string;
  durationMin?: number;
  done?: boolean;
};

export const DEMO_WEEK: WeekDay[] = [
  { day: "Mon", date: "27 May", type: "rest", title: "Rest", done: true },
  {
    day: "Tue",
    date: "28 May",
    type: "intervals",
    title: "Hyrox hybrid: run + sled",
    durationMin: 60,
  },
  {
    day: "Wed",
    date: "29 May",
    type: "strength",
    title: "Strength A: hinge + pull",
    durationMin: 55,
  },
  {
    day: "Thu",
    date: "30 May",
    type: "run",
    title: "Easy aerobic, conversational pace",
    durationMin: 45,
  },
  {
    day: "Fri",
    date: "31 May",
    type: "rest",
    title: "Rest or mobility",
  },
  {
    day: "Sat",
    date: "1 Jun",
    type: "simulation",
    title: "Race simulation, 4 stations + 4 km",
    durationMin: 70,
  },
  {
    day: "Sun",
    date: "2 Jun",
    type: "run",
    title: "Long aerobic, 75-90 min",
    durationMin: 80,
  },
];

// ─── Programme map (12 weeks) ───────────────────────────

export type WeekSummary = {
  number: number;
  label: string;
  phase: "base" | "build" | "peak" | "taper";
  focus: string;
  sessionCount: number;
};

export const DEMO_WEEKS: WeekSummary[] = [
  { number: 1, label: "Week 1", phase: "base", focus: "Foundation + aerobic", sessionCount: 4 },
  { number: 2, label: "Week 2", phase: "base", focus: "Add a sled session", sessionCount: 4 },
  { number: 3, label: "Week 3", phase: "base", focus: "Run volume + strength", sessionCount: 5 },
  { number: 4, label: "Week 4", phase: "build", focus: "Threshold + hybrid", sessionCount: 5 },
  { number: 5, label: "Week 5", phase: "build", focus: "Sled + wall ball density", sessionCount: 5 },
  { number: 6, label: "Week 6", phase: "build", focus: "Deload + reset", sessionCount: 3 },
  { number: 7, label: "Week 7", phase: "build", focus: "Race-pace intervals", sessionCount: 5 },
  { number: 8, label: "Week 8", phase: "peak", focus: "Full race simulation", sessionCount: 6 },
  { number: 9, label: "Week 9", phase: "peak", focus: "Heavy sled + long run", sessionCount: 5 },
  { number: 10, label: "Week 10", phase: "peak", focus: "Station polish", sessionCount: 5 },
  { number: 11, label: "Week 11", phase: "taper", focus: "Volume down, intensity up", sessionCount: 4 },
  { number: 12, label: "Week 12", phase: "taper", focus: "Race week", sessionCount: 3 },
];

// ─── Recent sessions (logs) ─────────────────────────────

export type LoggedSession = {
  id: string;
  date: string;
  title: string;
  durationMin: number;
  rpe: number; // 1-10
  splitVsPrev?: string; // "-12s" or "+8s"
  notes?: string;
};

export const DEMO_RECENT_SESSIONS: LoggedSession[] = [
  {
    id: "s1",
    date: "26 May",
    title: "Long aerobic, 75 min",
    durationMin: 75,
    rpe: 6,
    splitVsPrev: "-8s",
    notes: "Felt strong. Cadence high through the back half.",
  },
  {
    id: "s2",
    date: "24 May",
    title: "Race simulation, 4 stations + 4 km",
    durationMin: 68,
    rpe: 9,
    splitVsPrev: "-22s",
    notes: "Wall ball broken into 25s — held the cadence.",
  },
  {
    id: "s3",
    date: "23 May",
    title: "Easy aerobic, 45 min",
    durationMin: 45,
    rpe: 4,
  },
  {
    id: "s4",
    date: "21 May",
    title: "Strength: hinge + pull",
    durationMin: 55,
    rpe: 7,
    notes: "Trap-bar +5kg vs last week.",
  },
];

// ─── Nutrition ──────────────────────────────────────────

export type FoodEntry = {
  id: string;
  time: string; // "07:30"
  name: string;
  amount?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const DEMO_FOOD_LOG: FoodEntry[] = [
  {
    id: "f1",
    time: "07:30",
    name: "Porridge with banana + whey",
    amount: "80g oats, 1 banana, 30g whey",
    kcal: 540,
    protein: 35,
    carbs: 75,
    fat: 9,
  },
  {
    id: "f2",
    time: "12:30",
    name: "Chicken rice bowl",
    amount: "200g chicken, 150g rice, veg",
    kcal: 620,
    protein: 52,
    carbs: 78,
    fat: 8,
  },
  {
    id: "f3",
    time: "15:30",
    name: "Greek yoghurt + berries",
    amount: "200g yoghurt, 80g blueberries",
    kcal: 240,
    protein: 22,
    carbs: 18,
    fat: 8,
  },
  {
    id: "f4",
    time: "19:00",
    name: "Salmon + sweet potato",
    amount: "180g salmon, 300g sweet potato",
    kcal: 720,
    protein: 42,
    carbs: 64,
    fat: 28,
  },
];

export const DEMO_TARGETS = {
  kcal: 2800,
  protein: 165, // 1.8 g/kg for a ~92kg athlete
  carbs: 350,
  fat: 80,
};

// ─── Community ──────────────────────────────────────────

export type CommunityPost = {
  id: string;
  author: string;
  badge?: string;
  city: string;
  programme: "First Race" | "Sub-90" | "Doubles" | "Pro";
  ago: string;
  body: string;
  reactions: number;
  comments: number;
};

export const DEMO_COMMUNITY: CommunityPost[] = [
  {
    id: "c1",
    author: "Marcus T.",
    badge: "Sub-90 graduate",
    city: "Manchester",
    programme: "Sub-90",
    ago: "12 min",
    body: "Broke 85 today. Three years stuck at 95, six weeks in to the Sub-90 programme. The Wednesday strength block is the secret.",
    reactions: 47,
    comments: 9,
  },
  {
    id: "c2",
    author: "Sarah B.",
    badge: "First Race graduate",
    city: "Bristol",
    programme: "First Race",
    ago: "2 h",
    body: "First Hyrox done. 92 minutes when I'd planned for 105. Sled push felt heavy at metre 18 but the cadence cue from the app saved me.",
    reactions: 84,
    comments: 14,
  },
  {
    id: "c3",
    author: "Alex + Jamie",
    badge: "Doubles",
    city: "Edinburgh",
    programme: "Doubles",
    ago: "5 h",
    body: "Knocked 11 minutes off our doubles PB. Practising the handoff every Tuesday was the difference.",
    reactions: 31,
    comments: 4,
  },
  {
    id: "c4",
    author: "Olu A.",
    city: "London",
    programme: "First Race",
    ago: "yesterday",
    body: "Week 4 long run today. First time I've run 75 minutes without checking my watch.",
    reactions: 22,
    comments: 3,
  },
  {
    id: "c5",
    author: "Hannah W.",
    badge: "Masters 40+",
    city: "Birmingham",
    programme: "Sub-90",
    ago: "yesterday",
    body: "Race in 4 weeks. Taper plan dropped today. Less volume, same intensity. Scary but right.",
    reactions: 18,
    comments: 6,
  },
  {
    id: "c6",
    author: "Coach James",
    badge: "Elite 15",
    city: "London",
    programme: "Pro",
    ago: "2 days",
    body: "Tip for the wall ball: count down from 75, not up from 0. Same reps, different brain.",
    reactions: 132,
    comments: 21,
  },
  {
    id: "c7",
    author: "Niall M.",
    city: "Dublin",
    programme: "First Race",
    ago: "2 days",
    body: "Signed up for London 2026. Programme starts Monday. Nervous + excited.",
    reactions: 26,
    comments: 8,
  },
  {
    id: "c8",
    author: "Yusra K.",
    badge: "Sub-90",
    city: "Glasgow",
    programme: "Sub-90",
    ago: "3 days",
    body: "Logged the sled push split today: 1:48. Three weeks ago it was 2:35. The drills work.",
    reactions: 41,
    comments: 5,
  },
];

// ─── Athlete database (mock) ────────────────────────────

export type Athlete = {
  slug: string;
  name: string;
  city: string;
  category: "Open Men" | "Open Women" | "Pro Men" | "Pro Women" | "Masters 40+";
  pb: string;
  raceCount: number;
  recentRaces: Array<{
    date: string;
    event: string;
    time: string;
    rank: string;
  }>;
  splits: {
    skiErg: string;
    sledPush: string;
    sledPull: string;
    burpee: string;
    rower: string;
    farmers: string;
    sandbag: string;
    wallBall: string;
  };
};

export const DEMO_ATHLETES: Athlete[] = [
  {
    slug: "james-wright",
    name: "James Wright",
    city: "London, GB",
    category: "Pro Men",
    pb: "01:01:22",
    raceCount: 14,
    recentRaces: [
      { date: "2026-04-12", event: "Hyrox London", time: "01:01:22", rank: "4 / 412" },
      { date: "2026-01-20", event: "Hyrox Manchester", time: "01:02:48", rank: "6 / 380" },
      { date: "2025-10-18", event: "Hyrox World Champs", time: "01:03:11", rank: "47 / 1240" },
      { date: "2025-09-05", event: "Hyrox Birmingham", time: "01:04:02", rank: "8 / 290" },
    ],
    splits: {
      skiErg: "3:42", sledPush: "1:48", sledPull: "1:55",
      burpee: "4:12", rower: "3:38", farmers: "1:25",
      sandbag: "3:48", wallBall: "3:55",
    },
  },
  {
    slug: "hannah-ward",
    name: "Hannah Ward",
    city: "Birmingham, GB",
    category: "Open Women",
    pb: "01:18:44",
    raceCount: 7,
    recentRaces: [
      { date: "2026-04-12", event: "Hyrox London", time: "01:18:44", rank: "22 / 304" },
      { date: "2025-12-08", event: "Hyrox Birmingham", time: "01:21:18", rank: "29 / 240" },
      { date: "2025-08-23", event: "Hyrox Glasgow", time: "01:23:55", rank: "34 / 188" },
    ],
    splits: {
      skiErg: "4:18", sledPush: "2:34", sledPull: "2:48",
      burpee: "5:02", rower: "4:24", farmers: "1:58",
      sandbag: "4:32", wallBall: "5:48",
    },
  },
  {
    slug: "marcus-thompson",
    name: "Marcus Thompson",
    city: "Manchester, GB",
    category: "Open Men",
    pb: "01:24:52",
    raceCount: 5,
    recentRaces: [
      { date: "2026-05-04", event: "Hyrox Manchester", time: "01:24:52", rank: "78 / 410" },
      { date: "2026-01-20", event: "Hyrox Manchester", time: "01:29:18", rank: "112 / 380" },
      { date: "2025-10-25", event: "Hyrox London", time: "01:31:45", rank: "188 / 480" },
    ],
    splits: {
      skiErg: "4:02", sledPush: "2:22", sledPull: "2:34",
      burpee: "5:48", rower: "4:08", farmers: "1:48",
      sandbag: "4:18", wallBall: "6:32",
    },
  },
  {
    slug: "sarah-bell",
    name: "Sarah Bell",
    city: "Bristol, GB",
    category: "Open Women",
    pb: "01:32:12",
    raceCount: 2,
    recentRaces: [
      { date: "2026-04-12", event: "Hyrox London", time: "01:32:12", rank: "98 / 304" },
      { date: "2026-02-15", event: "Hyrox Bristol", time: "01:34:08", rank: "44 / 120" },
    ],
    splits: {
      skiErg: "4:42", sledPush: "3:08", sledPull: "3:22",
      burpee: "5:55", rower: "4:48", farmers: "2:14",
      sandbag: "5:18", wallBall: "6:42",
    },
  },
];

// ─── Race database (mock) ───────────────────────────────

export type Race = {
  slug: string;
  date: string;
  event: string;
  city: string;
  country: string;
  categories: string[];
  registrationOpen: boolean;
  registrationUrl?: string;
  weeksFromNow: number;
};

export const DEMO_RACES: Race[] = [
  {
    slug: "hyrox-london-jun-2026",
    date: "2026-06-21",
    event: "Hyrox London",
    city: "London",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro", "Masters"],
    registrationOpen: true,
    registrationUrl: "https://hyrox.com/event/london",
    weeksFromNow: 4,
  },
  {
    slug: "hyrox-manchester-aug-2026",
    date: "2026-08-09",
    event: "Hyrox Manchester",
    city: "Manchester",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro", "Masters"],
    registrationOpen: true,
    registrationUrl: "https://hyrox.com/event/manchester",
    weeksFromNow: 11,
  },
  {
    slug: "hyrox-glasgow-sep-2026",
    date: "2026-09-13",
    event: "Hyrox Glasgow",
    city: "Glasgow",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro"],
    registrationOpen: true,
    weeksFromNow: 16,
  },
  {
    slug: "hyrox-birmingham-oct-2026",
    date: "2026-10-04",
    event: "Hyrox Birmingham",
    city: "Birmingham",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro", "Masters"],
    registrationOpen: false,
    weeksFromNow: 19,
  },
  {
    slug: "hyrox-london-nov-2026",
    date: "2026-11-15",
    event: "Hyrox London",
    city: "London",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro", "Masters"],
    registrationOpen: false,
    weeksFromNow: 25,
  },
  {
    slug: "hyrox-world-finals-2027",
    date: "2027-05-22",
    event: "Hyrox World Championships",
    city: "Stockholm",
    country: "Sweden",
    categories: ["Pro", "Elite 15", "Age Group Finals"],
    registrationOpen: false,
    weeksFromNow: 52,
  },
];

// ─── Workout videos (mock thumbnails) ───────────────────

export type WorkoutVideo = {
  id: string;
  title: string;
  durationSec: number;
  category: "Technique" | "Recovery" | "Warm-up" | "Cool-down" | "Race day";
  coach: string;
  thumbnail: string; // path under /public or empty (renders as block)
};

export const DEMO_VIDEOS: WorkoutVideo[] = [
  {
    id: "v1",
    title: "Sled push: body position fix in 90 seconds",
    durationSec: 90,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/programme-pro.jpg",
  },
  {
    id: "v2",
    title: "Wall ball cadence: breath-out-throw rhythm",
    durationSec: 120,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/programme-sub-90.jpg",
  },
  {
    id: "v3",
    title: "Pre-race 30-minute warm-up",
    durationSec: 1800,
    category: "Warm-up",
    coach: "Hannah Ward",
    thumbnail: "/media/images/programme-first-race.jpg",
  },
  {
    id: "v4",
    title: "Post-session 10-minute mobility",
    durationSec: 600,
    category: "Cool-down",
    coach: "James Wright",
    thumbnail: "/media/images/bento-progress.jpg",
  },
  {
    id: "v5",
    title: "Sandbag lunge: 4-step recovery if you stop",
    durationSec: 95,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/programme-doubles.jpg",
  },
  {
    id: "v6",
    title: "Race day timeline: -3 hours to start gun",
    durationSec: 480,
    category: "Race day",
    coach: "Hannah Ward",
    thumbnail: "/media/images/coach-james-wright.jpg",
  },
];

// ─── Helpers ────────────────────────────────────────────

export function programmeLabel(p: string | null): string {
  if (!p) return "First Race";
  return (
    {
      "first-race": "First Race",
      "sub-90": "Sub-90",
      doubles: "Doubles",
      pro: "Pro",
    }[p] ?? "First Race"
  );
}

export function programmeAccent(p: string | null): string {
  // All four programmes use the same accent colour for now. Reserved
  // for future per-programme theming if we want it.
  return "vyrek-accent";
}
