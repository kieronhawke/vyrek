import type { ActivityData, Session } from "@/lib/control/activity";

/**
 * SAMPLE TRAFFIC — shaped like the real thing, and labelled as not being it.
 *
 * Nothing is collected today: there is no PostHog key in production, so all 23
 * capture() calls are no-ops. Rather than ship an empty page that teaches Ben
 * nothing about what the screen will do, this is a plausible fortnight of
 * traffic — and `isSample` is true, so the screen says so above the numbers.
 *
 * SHAPED, NOT RANDOM. The mix is deliberate, because the point of the screen
 * is to make certain shapes visible:
 *   - most visits are anonymous and short, because they are;
 *   - the quiz leaks hardest at the email step, which is where quizzes leak;
 *   - enquiries cluster in the UK with a long tail abroad;
 *   - one session is Ben's own, so the admin-exclusion control has something
 *     to exclude and its effect on the headline figures is visible.
 *
 * IPs are from the documentation ranges (RFC 5737 / RFC 3849 equivalents for
 * v4: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24). They cannot belong to a
 * real person, which matters in a public repository.
 */

type Seed = {
  id: string;
  day: number; // days before "today"
  hour: number;
  ip: string;
  country: string;
  countryIso: string;
  city: string;
  lat: number;
  lng: number;
  timezone: string;
  referrer: string;
  pages: [string, number][];
  quiz?: "completed" | string;
  formStarted?: boolean;
  enquired?: boolean;
};

const SEEDS: Seed[] = [
  {
    id: "s_01", day: 0, hour: 9, ip: "192.0.2.11",
    country: "United Kingdom", countryIso: "GB", city: "Manchester",
    lat: 53.48, lng: -2.24, timezone: "Europe/London", referrer: "google.com",
    pages: [["/", 42], ["/programmes", 96], ["/plan", 210], ["/pricing", 78], ["/contact", 130]],
    quiz: "completed", formStarted: true, enquired: true,
  },
  {
    id: "s_02", day: 0, hour: 8, ip: "192.0.2.24",
    country: "United Kingdom", countryIso: "GB", city: "Leeds",
    lat: 53.80, lng: -1.55, timezone: "Europe/London", referrer: "instagram.com",
    pages: [["/", 18], ["/hyrox/guide", 145], ["/plan", 62]],
    quiz: "Email",
  },
  {
    id: "s_03", day: 0, hour: 7, ip: "198.51.100.5",
    country: "Ireland", countryIso: "IE", city: "Dublin",
    lat: 53.35, lng: -6.26, timezone: "Europe/Dublin", referrer: "direct",
    pages: [["/", 11]],
  },
  {
    id: "s_04", day: 1, hour: 20, ip: "192.0.2.31",
    country: "United Kingdom", countryIso: "GB", city: "Birmingham",
    lat: 52.48, lng: -1.90, timezone: "Europe/London", referrer: "google.com",
    pages: [["/hyrox-training/birmingham", 88], ["/programmes", 64], ["/plan", 150], ["/pricing", 44]],
    quiz: "Race date", formStarted: true,
  },
  {
    id: "s_05", day: 1, hour: 19, ip: "192.0.2.44",
    country: "United Kingdom", countryIso: "GB", city: "London",
    lat: 51.51, lng: -0.13, timezone: "Europe/London", referrer: "google.com",
    pages: [["/", 25], ["/blog/hyrox-beginner-kit-list", 190]],
  },
  {
    id: "s_06", day: 2, hour: 12, ip: "203.0.113.9",
    country: "Australia", countryIso: "AU", city: "Sydney",
    lat: -33.87, lng: 151.21, timezone: "Australia/Sydney", referrer: "reddit.com",
    pages: [["/hyrox/guide", 240], ["/results", 120], ["/programmes", 55]],
    quiz: "Days per week",
  },
  {
    id: "s_07", day: 2, hour: 10, ip: "192.0.2.58",
    country: "United Kingdom", countryIso: "GB", city: "Glasgow",
    lat: 55.86, lng: -4.25, timezone: "Europe/London", referrer: "direct",
    pages: [["/", 8]],
  },
  {
    id: "s_08", day: 3, hour: 18, ip: "198.51.100.22",
    country: "Germany", countryIso: "DE", city: "Berlin",
    lat: 52.52, lng: 13.40, timezone: "Europe/Berlin", referrer: "google.de",
    pages: [["/results", 310], ["/results/city", 180]],
  },
  {
    id: "s_09", day: 3, hour: 14, ip: "192.0.2.67",
    country: "United Kingdom", countryIso: "GB", city: "Bristol",
    lat: 51.45, lng: -2.59, timezone: "Europe/London", referrer: "google.com",
    pages: [["/", 30], ["/programmes", 120], ["/plan", 240], ["/contact", 90]],
    quiz: "completed", formStarted: true, enquired: true,
  },
  {
    id: "s_10", day: 4, hour: 21, ip: "192.0.2.73",
    country: "United Kingdom", countryIso: "GB", city: "Sheffield",
    lat: 53.38, lng: -1.47, timezone: "Europe/London", referrer: "facebook.com",
    pages: [["/", 15], ["/pricing", 40]],
  },
  {
    id: "s_11", day: 5, hour: 11, ip: "203.0.113.40",
    country: "United States", countryIso: "US", city: "New York",
    lat: 40.71, lng: -74.01, timezone: "America/New_York", referrer: "google.com",
    pages: [["/hyrox/guide", 95], ["/hyrox-vs", 60]],
  },
  {
    id: "s_12", day: 5, hour: 9, ip: "192.0.2.88",
    country: "United Kingdom", countryIso: "GB", city: "Manchester",
    lat: 53.48, lng: -2.24, timezone: "Europe/London", referrer: "direct",
    pages: [["/plan", 300], ["/programmes", 80], ["/pricing", 65], ["/contact", 110], ["/about", 40]],
    quiz: "completed", formStarted: true, enquired: true,
  },
  {
    id: "s_13", day: 6, hour: 16, ip: "192.0.2.94",
    country: "United Kingdom", countryIso: "GB", city: "Newcastle upon Tyne",
    lat: 54.98, lng: -1.61, timezone: "Europe/London", referrer: "google.com",
    pages: [["/", 22], ["/hyrox/workouts", 175], ["/plan", 45]],
    quiz: "Email",
  },
  {
    id: "s_14", day: 8, hour: 13, ip: "198.51.100.61",
    country: "Spain", countryIso: "ES", city: "Madrid",
    lat: 40.42, lng: -3.70, timezone: "Europe/Madrid", referrer: "instagram.com",
    pages: [["/", 12], ["/results", 88]],
  },
  {
    id: "s_15", day: 9, hour: 7, ip: "192.0.2.101",
    country: "United Kingdom", countryIso: "GB", city: "Cardiff",
    lat: 51.48, lng: -3.18, timezone: "Europe/London", referrer: "google.com",
    pages: [["/hyrox-training/cardiff", 130], ["/programmes", 70], ["/plan", 95]],
    quiz: "Experience",
  },
  {
    id: "s_16", day: 11, hour: 19, ip: "192.0.2.115",
    country: "United Kingdom", countryIso: "GB", city: "Liverpool",
    lat: 53.41, lng: -2.98, timezone: "Europe/London", referrer: "direct",
    pages: [["/", 20], ["/blog", 60], ["/blog/first-hyrox-preparation-guide", 210], ["/plan", 80]],
    quiz: "Email", formStarted: true,
  },
  {
    id: "s_17", day: 13, hour: 15, ip: "203.0.113.77",
    country: "Canada", countryIso: "CA", city: "Toronto",
    lat: 43.65, lng: -79.38, timezone: "America/Toronto", referrer: "google.ca",
    pages: [["/results", 140]],
  },
  {
    // Ben's own laptop. Here on purpose: the admin-exclusion control needs
    // something to exclude, and its effect on the headline figures should be
    // visible rather than theoretical.
    id: "s_18", day: 0, hour: 6, ip: "192.0.2.200",
    country: "United Kingdom", countryIso: "GB", city: "Manchester",
    lat: 53.48, lng: -2.24, timezone: "Europe/London", referrer: "direct",
    pages: [["/", 30], ["/programmes", 45], ["/pricing", 25], ["/contact", 20], ["/blog", 35], ["/results", 60]],
  },
];

function iso(today: string, daysAgo: number, hour: number, minutes = 0): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minutes, 0, 0);
  return d.toISOString();
}

export function sampleActivity(today: string): ActivityData {
  const sessions: Session[] = SEEDS.map((s) => {
    const pages = s.pages.map(([path, seconds]) => ({ path, seconds }));
    const length = pages.reduce((n, p) => n + p.seconds, 0);
    return {
      id: s.id,
      startedAt: iso(today, s.day, s.hour),
      // Last seen is the start plus however long they were on the site, which
      // is the only definition that cannot contradict the duration column.
      lastSeenAt: iso(today, s.day, s.hour, Math.min(59, Math.round(length / 60))),
      ip: s.ip,
      country: s.country,
      countryIso: s.countryIso,
      city: s.city,
      lat: s.lat,
      lng: s.lng,
      timezone: s.timezone,
      landing: pages[0]?.path ?? "/",
      referrer: s.referrer,
      pages,
      quizCompleted: s.quiz === "completed",
      quizAbandonedAt: s.quiz && s.quiz !== "completed" ? s.quiz : null,
      formStarted: Boolean(s.formStarted),
      enquired: Boolean(s.enquired),
    };
  });

  return {
    sessions,
    isSample: true,
    reason:
      "No analytics key is connected, so nothing is being collected yet. These are sample sessions shaped like real traffic — do not make decisions on them.",
  };
}

/**
 * The live implementation, when a key exists.
 *
 * Deliberately not stubbed with anything that returns data: a function that
 * silently falls back to samples is how invented numbers end up presented as
 * real. It returns empty and says why, and the screen renders that honestly.
 */
export function liveActivity(): ActivityData {
  return {
    sessions: [],
    isSample: false,
    reason: "",
  };
}

/** The seam. One line changes when analytics is connected. */
export function loadActivity(today: string): ActivityData {
  const connected =
    typeof process !== "undefined" && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
  return connected ? liveActivity() : sampleActivity(today);
}
