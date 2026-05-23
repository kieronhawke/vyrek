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

export const DEMO_COMMUNITY_EXTRA: CommunityPost[] = [
  {
    id: "c9",
    author: "Theo R.",
    badge: "Pro",
    city: "London",
    programme: "Pro",
    ago: "3 days",
    body: "Race-pace 1km repeats today, 3:18 average. First time under 3:20 on tired legs. The threshold work is paying off.",
    reactions: 58,
    comments: 7,
  },
  {
    id: "c10",
    author: "Priya S.",
    city: "Leeds",
    programme: "First Race",
    ago: "4 days",
    body: "Sled push at 40kg felt like a wall last week, this week it moved. Funny what 7 days of focused practice does.",
    reactions: 33,
    comments: 4,
  },
  {
    id: "c11",
    author: "Connor + Liam",
    badge: "Doubles",
    city: "Belfast",
    programme: "Doubles",
    ago: "5 days",
    body: "Switched up our wall ball strategy. Connor takes 50, I take 50, no swaps. Saved us 90 seconds versus splitting.",
    reactions: 27,
    comments: 11,
  },
  {
    id: "c12",
    author: "Coach Hannah",
    badge: "Elite 15",
    city: "Birmingham",
    programme: "Pro",
    ago: "5 days",
    body: "Reminder: the burpee broad jump is a transition station, not a strength station. If you're gassed coming out of it, your pacing on the previous run is wrong.",
    reactions: 96,
    comments: 18,
  },
  {
    id: "c13",
    author: "Tom B.",
    city: "Sheffield",
    programme: "Sub-90",
    ago: "6 days",
    body: "Week 8 simulation done, 88:42. Six weeks ago I couldn't break 100. Surreal.",
    reactions: 64,
    comments: 13,
  },
  {
    id: "c14",
    author: "Aisha M.",
    badge: "Masters 40+",
    city: "Cardiff",
    programme: "First Race",
    ago: "1 week",
    body: "Started this thing thinking I'd be the oldest in the room. Showed up to Hyrox Cardiff and there were three of us in our 50s. Find your people.",
    reactions: 142,
    comments: 24,
  },
  {
    id: "c15",
    author: "Reuben K.",
    city: "Newcastle",
    programme: "Sub-90",
    ago: "1 week",
    body: "First time deadlifting after a year off, started at 80kg as the programme suggested. Hit 100kg today. Slow build wins.",
    reactions: 38,
    comments: 6,
  },
  {
    id: "c16",
    author: "Coach James",
    badge: "Elite 15",
    city: "London",
    programme: "Pro",
    ago: "1 week",
    body: "If you're under 1:50 on your sled push you've earned the right to think about a faster sled push. Until then: technique.",
    reactions: 88,
    comments: 14,
  },
];

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

// Additional athletes (mock) — combined with DEMO_ATHLETES via DEMO_ATHLETES_ALL.
const DEMO_ATHLETES_EXTRA: Athlete[] = [
  {
    slug: "theo-richardson",
    name: "Theo Richardson",
    city: "London, GB",
    category: "Pro Men",
    pb: "01:03:08",
    raceCount: 11,
    recentRaces: [
      { date: "2026-04-12", event: "Hyrox London", time: "01:03:08", rank: "7 / 412" },
      { date: "2025-12-08", event: "Hyrox Birmingham", time: "01:04:22", rank: "11 / 290" },
      { date: "2025-09-20", event: "Hyrox World Champs", time: "01:05:14", rank: "62 / 1240" },
    ],
    splits: {
      skiErg: "3:48", sledPush: "1:52", sledPull: "2:01",
      burpee: "4:22", rower: "3:42", farmers: "1:28",
      sandbag: "3:55", wallBall: "4:02",
    },
  },
  {
    slug: "priya-sharma",
    name: "Priya Sharma",
    city: "Leeds, GB",
    category: "Open Women",
    pb: "01:28:45",
    raceCount: 3,
    recentRaces: [
      { date: "2026-04-12", event: "Hyrox London", time: "01:28:45", rank: "55 / 304" },
      { date: "2025-11-08", event: "Hyrox Manchester", time: "01:32:12", rank: "82 / 240" },
    ],
    splits: {
      skiErg: "4:32", sledPush: "2:48", sledPull: "3:02",
      burpee: "5:18", rower: "4:38", farmers: "2:04",
      sandbag: "4:55", wallBall: "6:08",
    },
  },
  {
    slug: "connor-osullivan",
    name: "Connor O'Sullivan",
    city: "Belfast, GB",
    category: "Open Men",
    pb: "01:18:22",
    raceCount: 6,
    recentRaces: [
      { date: "2026-03-08", event: "Hyrox Dublin", time: "01:18:22", rank: "34 / 280" },
      { date: "2025-12-08", event: "Hyrox Birmingham", time: "01:21:04", rank: "58 / 290" },
      { date: "2025-08-23", event: "Hyrox Glasgow", time: "01:24:18", rank: "72 / 188" },
    ],
    splits: {
      skiErg: "3:58", sledPush: "2:14", sledPull: "2:24",
      burpee: "5:08", rower: "4:02", farmers: "1:42",
      sandbag: "4:12", wallBall: "5:48",
    },
  },
  {
    slug: "yusra-khan",
    name: "Yusra Khan",
    city: "Glasgow, GB",
    category: "Open Women",
    pb: "01:24:12",
    raceCount: 4,
    recentRaces: [
      { date: "2026-02-15", event: "Hyrox Glasgow", time: "01:24:12", rank: "28 / 188" },
      { date: "2025-10-12", event: "Hyrox Edinburgh", time: "01:26:55", rank: "38 / 220" },
    ],
    splits: {
      skiErg: "4:22", sledPush: "2:38", sledPull: "2:52",
      burpee: "5:08", rower: "4:28", farmers: "2:02",
      sandbag: "4:42", wallBall: "5:32",
    },
  },
  {
    slug: "tom-bradshaw",
    name: "Tom Bradshaw",
    city: "Sheffield, GB",
    category: "Open Men",
    pb: "01:14:18",
    raceCount: 8,
    recentRaces: [
      { date: "2026-04-12", event: "Hyrox London", time: "01:14:18", rank: "29 / 412" },
      { date: "2025-12-08", event: "Hyrox Birmingham", time: "01:16:42", rank: "32 / 290" },
      { date: "2025-08-23", event: "Hyrox Glasgow", time: "01:18:55", rank: "41 / 188" },
    ],
    splits: {
      skiErg: "3:54", sledPush: "2:08", sledPull: "2:18",
      burpee: "4:48", rower: "3:58", farmers: "1:38",
      sandbag: "4:08", wallBall: "5:18",
    },
  },
  {
    slug: "aisha-mortimer",
    name: "Aisha Mortimer",
    city: "Cardiff, GB",
    category: "Masters 40+",
    pb: "01:38:42",
    raceCount: 5,
    recentRaces: [
      { date: "2026-03-22", event: "Hyrox Cardiff", time: "01:38:42", rank: "12 / 88" },
      { date: "2025-10-18", event: "Hyrox World Champs", time: "01:42:18", rank: "188 / 480" },
      { date: "2025-06-15", event: "Hyrox London", time: "01:44:28", rank: "98 / 240" },
    ],
    splits: {
      skiErg: "4:48", sledPush: "3:18", sledPull: "3:32",
      burpee: "6:08", rower: "4:58", farmers: "2:18",
      sandbag: "5:28", wallBall: "6:48",
    },
  },
  {
    slug: "niall-mcnamara",
    name: "Niall McNamara",
    city: "Dublin, IE",
    category: "Open Men",
    pb: "01:21:48",
    raceCount: 2,
    recentRaces: [
      { date: "2026-03-08", event: "Hyrox Dublin", time: "01:21:48", rank: "48 / 280" },
      { date: "2025-11-08", event: "Hyrox Manchester", time: "01:25:32", rank: "82 / 380" },
    ],
    splits: {
      skiErg: "4:08", sledPush: "2:32", sledPull: "2:48",
      burpee: "5:18", rower: "4:18", farmers: "1:52",
      sandbag: "4:32", wallBall: "5:55",
    },
  },
  {
    slug: "reuben-koffi",
    name: "Reuben Koffi",
    city: "Newcastle, GB",
    category: "Open Men",
    pb: "01:28:14",
    raceCount: 1,
    recentRaces: [
      { date: "2026-02-15", event: "Hyrox Bristol", time: "01:28:14", rank: "62 / 240" },
    ],
    splits: {
      skiErg: "4:18", sledPush: "2:48", sledPull: "3:02",
      burpee: "5:42", rower: "4:32", farmers: "2:04",
      sandbag: "4:48", wallBall: "6:18",
    },
  },
];

export const DEMO_ATHLETES_ALL: Athlete[] = [...DEMO_ATHLETES, ...DEMO_ATHLETES_EXTRA];

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

const DEMO_RACES_EXTRA: Race[] = [
  {
    slug: "hyrox-dublin-jul-2026",
    date: "2026-07-12",
    event: "Hyrox Dublin",
    city: "Dublin",
    country: "Ireland",
    categories: ["Open", "Doubles", "Pro"],
    registrationOpen: true,
    registrationUrl: "https://hyrox.com/event/dublin",
    weeksFromNow: 7,
  },
  {
    slug: "hyrox-edinburgh-aug-2026",
    date: "2026-08-30",
    event: "Hyrox Edinburgh",
    city: "Edinburgh",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro", "Masters"],
    registrationOpen: true,
    weeksFromNow: 14,
  },
  {
    slug: "hyrox-cardiff-sep-2026",
    date: "2026-09-27",
    event: "Hyrox Cardiff",
    city: "Cardiff",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Masters"],
    registrationOpen: true,
    weeksFromNow: 18,
  },
  {
    slug: "hyrox-bristol-nov-2026",
    date: "2026-11-01",
    event: "Hyrox Bristol",
    city: "Bristol",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Pro"],
    registrationOpen: false,
    weeksFromNow: 23,
  },
  {
    slug: "hyrox-newcastle-dec-2026",
    date: "2026-12-06",
    event: "Hyrox Newcastle",
    city: "Newcastle",
    country: "United Kingdom",
    categories: ["Open", "Doubles", "Masters"],
    registrationOpen: false,
    weeksFromNow: 28,
  },
  {
    slug: "hyrox-european-finals-2027",
    date: "2027-03-14",
    event: "Hyrox European Championships",
    city: "Berlin",
    country: "Germany",
    categories: ["Open", "Pro", "Age Group"],
    registrationOpen: false,
    weeksFromNow: 42,
  },
];

export const DEMO_RACES_ALL: Race[] = [...DEMO_RACES, ...DEMO_RACES_EXTRA].sort(
  (a, b) => a.date.localeCompare(b.date),
);

export function findRace(slug: string): Race | undefined {
  return DEMO_RACES_ALL.find((r) => r.slug === slug);
}

export function findAthlete(slug: string): Athlete | undefined {
  return DEMO_ATHLETES_ALL.find((a) => a.slug === slug);
}

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

const DEMO_VIDEOS_EXTRA: WorkoutVideo[] = [
  {
    id: "v7",
    title: "SkiErg: hip drive vs arm pull, the 60/40 rule",
    durationSec: 145,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/programme-sub-90.jpg",
  },
  {
    id: "v8",
    title: "Sled pull: 3 grip options for when your forearms blow",
    durationSec: 165,
    category: "Technique",
    coach: "Hannah Ward",
    thumbnail: "/media/images/programme-pro.jpg",
  },
  {
    id: "v9",
    title: "Burpee broad jump: chest-to-floor without losing height",
    durationSec: 110,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/programme-first-race.jpg",
  },
  {
    id: "v10",
    title: "Rowing 1000m: the 2-3-2 split strategy",
    durationSec: 135,
    category: "Technique",
    coach: "Hannah Ward",
    thumbnail: "/media/images/programme-doubles.jpg",
  },
  {
    id: "v11",
    title: "Farmer's carry: handle position for grip endurance",
    durationSec: 85,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/coach-james-wright.jpg",
  },
  {
    id: "v12",
    title: "Race-day fuelling: the 90 minutes before the gun",
    durationSec: 420,
    category: "Race day",
    coach: "Hannah Ward",
    thumbnail: "/media/images/bento-progress.jpg",
  },
  {
    id: "v13",
    title: "Recovery: 10-minute breathing reset post-race",
    durationSec: 600,
    category: "Recovery",
    coach: "James Wright",
    thumbnail: "/media/images/programme-pro.jpg",
  },
  {
    id: "v14",
    title: "Wall ball: when to switch from rebound to catch-throw",
    durationSec: 125,
    category: "Technique",
    coach: "James Wright",
    thumbnail: "/media/images/programme-sub-90.jpg",
  },
];

export const DEMO_VIDEOS_ALL: WorkoutVideo[] = [...DEMO_VIDEOS, ...DEMO_VIDEOS_EXTRA];

// ─── Hyrox stations library ─────────────────────────────

export type Station = {
  slug: string;
  number: number;
  name: string;
  spec: string;
  goldStandard: string;
  technique: string[];
  failurePattern: string;
  videoId?: string;
};

export const DEMO_STATIONS: Station[] = [
  {
    slug: "ski-erg",
    number: 1,
    name: "SkiErg",
    spec: "1000 m on a Concept 2 SkiErg",
    goldStandard: "Open Men 3:40-4:00 · Open Women 4:10-4:40",
    technique: [
      "Hip drive, not arm pull. Think 'sit down and stand up' not 'pull and yank'.",
      "Handles to mid-thigh, then a clean release. Re-grip at the top.",
      "Damper setting 5-6 for most. Higher only if you are big and powerful.",
    ],
    failurePattern: "Goes too hard in the first 250m, blows up the forearms, has to take 10-second pauses.",
    videoId: "v7",
  },
  {
    slug: "sled-push",
    number: 2,
    name: "Sled push",
    spec: "50 m, weight scales by category",
    goldStandard: "Open Men 1:30-1:50 · Open Women 2:00-2:40",
    technique: [
      "Hands low, hips low, head over the bar. Drive through the legs.",
      "Short choppy steps for the first 5m to break inertia, then lengthen.",
      "Breathe out hard on every push. Two breaths per 5m of work.",
    ],
    failurePattern: "Stands too tall, pushes with the arms, sled stalls. Reset and start again costs 20s.",
    videoId: "v1",
  },
  {
    slug: "sled-pull",
    number: 3,
    name: "Sled pull",
    spec: "50 m, weight scales by category",
    goldStandard: "Open Men 1:50-2:10 · Open Women 2:30-3:00",
    technique: [
      "Heels back, hips low, pull hand over hand. Don't grip the rope, hook it.",
      "Walk the sled back to start — don't run, you'll trip.",
      "Switch grip every 5-6 pulls to spread the forearm load.",
    ],
    failurePattern: "Death-grip on the rope, forearms cook by metre 25, has to drop the rope.",
    videoId: "v8",
  },
  {
    slug: "burpee-broad-jump",
    number: 4,
    name: "Burpee broad jump",
    spec: "80 m of burpee broad jumps",
    goldStandard: "Open Men 4:20-4:50 · Open Women 5:00-5:30",
    technique: [
      "Chest to floor every rep. The judge will count it, you won't.",
      "Jump for distance, not height. Land soft, drop straight into the next burpee.",
      "Find a rhythm: down-jump-up, down-jump-up, no pauses.",
    ],
    failurePattern: "Treats it as a strength station. Goes too slow on the burpee, jumps too short.",
    videoId: "v9",
  },
  {
    slug: "rowing",
    number: 5,
    name: "Rowing",
    spec: "1000 m on a Concept 2 rower",
    goldStandard: "Open Men 3:30-3:50 · Open Women 4:00-4:30",
    technique: [
      "Legs-back-arms on the drive. Arms-back-legs on the recovery. Don't skip the order.",
      "Stroke rate 26-28 for most. Higher rate, lighter pull.",
      "2-3-2 strategy: 250m at target +2s, 500m at target -3s, 250m at target +2s.",
    ],
    failurePattern: "Stroke rate at 32+, all arms, drops 8s/500m in the middle.",
    videoId: "v10",
  },
  {
    slug: "farmers-carry",
    number: 6,
    name: "Farmer's carry",
    spec: "200 m carry, weight scales by category",
    goldStandard: "Open Men 1:20-1:35 · Open Women 1:50-2:10",
    technique: [
      "Handles in the meat of the hand, not the fingers. Wrists straight.",
      "Walk tall, ribs down, breathe rhythmically. Don't hold breath.",
      "One drop is allowed, but it costs you 8-12s. Train past the point you want to drop.",
    ],
    failurePattern: "Grip fails at metre 120. The drop, reset, and re-grip costs more than slowing down would have.",
    videoId: "v11",
  },
  {
    slug: "sandbag-lunges",
    number: 7,
    name: "Sandbag lunges",
    spec: "100 m walking lunges with sandbag",
    goldStandard: "Open Men 3:40-4:15 · Open Women 4:20-5:00",
    technique: [
      "Bag on the shoulders, not the neck. Hands hooked over the top.",
      "Knee taps the floor lightly — don't crash it.",
      "When the legs start to lock, shorten the stride by 10cm. Cadence stays the same.",
    ],
    failurePattern: "Has to stop and rest the legs because the early stride was too long.",
    videoId: "v5",
  },
  {
    slug: "wall-balls",
    number: 8,
    name: "Wall balls",
    spec: "100 reps, ball weight scales by category",
    goldStandard: "Open Men 3:30-4:20 · Open Women 4:30-5:30",
    technique: [
      "Squat depth: hip crease below the knee. The judge sees it.",
      "Catch the ball lower than you think. Use the bounce off the chest.",
      "Count down from 100, not up from 0. Same reps, lighter brain.",
    ],
    failurePattern: "No-reps from shallow squats. Each no-rep is +3-5 seconds.",
    videoId: "v2",
  },
];

// ─── Personal records ───────────────────────────────────

export type PrEntry = {
  id: string;
  category: "Strength" | "Cardio" | "Hyrox";
  lift: string;
  value: string;
  unit: string;
  date: string;
  previous?: string;
};

export const DEMO_PRS: PrEntry[] = [
  { id: "pr1", category: "Strength", lift: "Back squat", value: "140", unit: "kg", date: "2026-04-22", previous: "135 kg" },
  { id: "pr2", category: "Strength", lift: "Trap-bar deadlift", value: "180", unit: "kg", date: "2026-05-10", previous: "172.5 kg" },
  { id: "pr3", category: "Strength", lift: "Bench press", value: "100", unit: "kg", date: "2026-03-18", previous: "97.5 kg" },
  { id: "pr4", category: "Strength", lift: "Push press", value: "75", unit: "kg", date: "2026-04-08", previous: "72.5 kg" },
  { id: "pr5", category: "Strength", lift: "Strict pull-up x5", value: "+15", unit: "kg loaded", date: "2026-05-02", previous: "+12.5 kg" },
  { id: "pr6", category: "Cardio", lift: "1 km run", value: "3:18", unit: "min/km", date: "2026-04-30", previous: "3:24" },
  { id: "pr7", category: "Cardio", lift: "5 km run", value: "18:42", unit: "total", date: "2026-04-15", previous: "19:08" },
  { id: "pr8", category: "Cardio", lift: "1000 m row", value: "3:38", unit: "total", date: "2026-05-12", previous: "3:44" },
  { id: "pr9", category: "Cardio", lift: "1000 m SkiErg", value: "3:42", unit: "total", date: "2026-05-08", previous: "3:48" },
  { id: "pr10", category: "Hyrox", lift: "Sled push 50m", value: "1:48", unit: "race weight", date: "2026-05-04" },
  { id: "pr11", category: "Hyrox", lift: "Wall balls 100", value: "3:55", unit: "9kg/6kg", date: "2026-04-12" },
  { id: "pr12", category: "Hyrox", lift: "Full race PB", value: "1:14:22", unit: "Open", date: "2026-04-12", previous: "1:18:42" },
];

// ─── Weekly volume (for chart) ──────────────────────────

export type WeekVolume = {
  weekNumber: number;
  runningKm: number;
  strengthMin: number;
  stationsMin: number;
};

export const DEMO_VOLUME: WeekVolume[] = [
  { weekNumber: 1, runningKm: 18, strengthMin: 110, stationsMin: 0 },
  { weekNumber: 2, runningKm: 22, strengthMin: 110, stationsMin: 30 },
  { weekNumber: 3, runningKm: 26, strengthMin: 130, stationsMin: 45 },
  { weekNumber: 4, runningKm: 30, strengthMin: 130, stationsMin: 60 },
  { weekNumber: 5, runningKm: 34, strengthMin: 130, stationsMin: 75 },
  { weekNumber: 6, runningKm: 18, strengthMin: 80, stationsMin: 30 },
  { weekNumber: 7, runningKm: 36, strengthMin: 130, stationsMin: 90 },
  { weekNumber: 8, runningKm: 40, strengthMin: 110, stationsMin: 120 },
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
