/**
 * ACTIVITY — who came, what they did, and where they stopped.
 *
 * THE HONEST POSITION, STATED IN THE MODEL RATHER THAN THE UI
 * ----------------------------------------------------------
 * Nothing is being collected. There are 23 `capture()` calls wired through
 * lib/posthog.ts and no NEXT_PUBLIC_POSTHOG_KEY in production, so every one of
 * them is a no-op and there is no visitor data anywhere.
 *
 * So `loadActivity` is a seam with two implementations and a flag saying which
 * ran. The screen renders the flag. HARD-RULES §1 forbids presenting anything
 * invented as real, and a beautiful analytics page quietly full of made-up
 * numbers is the exact failure that rule exists for — a founder would make
 * decisions on it.
 *
 * When a key arrives, `liveActivity` is the only thing that has to be written;
 * every filter, sort, funnel and map below already works on the shape.
 *
 * IP ADDRESSES ARE PERSONAL DATA
 * An IP is personal data under UK GDPR even before it is joined to anything.
 * Two consequences carried here rather than improvised in the component: the
 * admin-exclusion list is the only place raw IPs are stored, and excluded
 * traffic is removed before any figure is computed, not filtered out of the
 * table afterwards — otherwise the headline numbers count Ben's own visits
 * while the table claims not to.
 */

export type Intent = "high" | "medium" | "low" | "anonymous";

export type PageHit = {
  path: string;
  /** Seconds on that page. Zero for a bounce with no second event. */
  seconds: number;
};

export type Session = {
  id: string;
  /** ISO datetime the session started. */
  startedAt: string;
  /** ISO datetime of the last event. */
  lastSeenAt: string;
  ip: string;
  country: string;
  countryIso: string;
  city: string;
  lat: number;
  lng: number;
  timezone: string;
  /** The first page of the visit. */
  landing: string;
  /** Where they came from — "google.com", "direct", "instagram.com". */
  referrer: string;
  pages: PageHit[];
  /** Reached the end of the quiz. */
  quizCompleted: boolean;
  /** Started the quiz and did not finish — the step they stopped at. */
  quizAbandonedAt: string | null;
  /** Started an enquiry form. */
  formStarted: boolean;
  /** Sent an enquiry. */
  enquired: boolean;
};

export type ActivityData = {
  sessions: Session[];
  /**
   * False when the numbers are real. The screen says so either way, because a
   * reader cannot tell by looking and would assume they are real.
   */
  isSample: boolean;
  /** Why they are sample, in one sentence, shown to the reader. */
  reason: string;
};

/* ── Ranges ────────────────────────────────────────────────────────────── */

export type RangeKey = "today" | "7d" | "30d" | "all" | "custom";

export type Range = { key: RangeKey; from?: string; to?: string };

export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
  custom: "Custom",
};

function shiftDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * The inclusive date bounds a range covers, or null for all time.
 *
 * "Last 7 days" means today and the six before it, which is what a person
 * means by it — not "the seven days ending yesterday", and not 168 hours ago.
 */
export function rangeBounds(range: Range, today: string): { from: string; to: string } | null {
  switch (range.key) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: shiftDays(today, -6), to: today };
    case "30d":
      return { from: shiftDays(today, -29), to: today };
    case "custom": {
      if (!range.from || !range.to) return null;
      // Accept the dates either way round rather than silently showing
      // nothing, which reads as "no traffic" instead of "you typed it
      // backwards".
      return range.from <= range.to
        ? { from: range.from, to: range.to }
        : { from: range.to, to: range.from };
    }
    case "all":
    default:
      return null;
  }
}

export function inRange(s: Session, range: Range, today: string): boolean {
  const bounds = rangeBounds(range, today);
  if (!bounds) return true;
  const day = s.startedAt.slice(0, 10);
  return day >= bounds.from && day <= bounds.to;
}

/* ── Filters ───────────────────────────────────────────────────────────── */

export type FilterKey =
  | "all"
  | "high-intent"
  | "enquired"
  | "form-started"
  | "anonymous";

export const FILTER_LABEL: Record<FilterKey, string> = {
  all: "Everyone",
  "high-intent": "High intent",
  enquired: "Enquired",
  "form-started": "Form started",
  anonymous: "Anonymous",
};

export function matchesFilter(s: Session, filter: FilterKey): boolean {
  switch (filter) {
    case "high-intent":
      return intentOf(s) === "high";
    case "enquired":
      return s.enquired;
    case "form-started":
      // Started and did not send: the ones worth chasing. Somebody who
      // completed the form is on the leads page, not here.
      return s.formStarted && !s.enquired;
    case "anonymous":
      return intentOf(s) === "anonymous";
    case "all":
    default:
      return true;
  }
}

/**
 * Intent, derived rather than stored.
 *
 * Stored intent goes stale the moment the rules change and cannot be
 * recomputed for past sessions. Derived, a rule change applies to everything.
 */
export function intentOf(s: Session): Intent {
  if (s.enquired) return "high";
  if (s.formStarted || s.quizCompleted) return "high";
  const time = totalSeconds(s);
  if (s.quizAbandonedAt || (s.pages.length >= 4 && time >= 120)) return "medium";
  if (s.pages.length >= 2 || time >= 30) return "low";
  return "anonymous";
}

export function totalSeconds(s: Session): number {
  return s.pages.reduce((n, p) => n + p.seconds, 0);
}

/* ── Sorts ─────────────────────────────────────────────────────────────── */

export type SortKey = "last-seen" | "longest" | "most-pages" | "intent";

export const SORT_LABEL: Record<SortKey, string> = {
  "last-seen": "Last seen",
  longest: "Longest on site",
  "most-pages": "Most pages",
  intent: "Highest intent",
};

const INTENT_ORDER: Record<Intent, number> = { high: 0, medium: 1, low: 2, anonymous: 3 };

export function sortSessions(sessions: Session[], key: SortKey): Session[] {
  const out = [...sessions];
  switch (key) {
    case "longest":
      return out.sort((a, b) => totalSeconds(b) - totalSeconds(a));
    case "most-pages":
      return out.sort((a, b) => b.pages.length - a.pages.length);
    case "intent":
      return out.sort(
        (a, b) =>
          INTENT_ORDER[intentOf(a)] - INTENT_ORDER[intentOf(b)] ||
          (a.lastSeenAt < b.lastSeenAt ? 1 : -1),
      );
    case "last-seen":
    default:
      return out.sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1));
  }
}

/* ── Admin exclusion ───────────────────────────────────────────────────── */

export const ADMIN_IPS_KEY = "activity.adminIps";

/**
 * Removed before anything is counted, not filtered out of the table.
 *
 * Filtering the table alone leaves every headline figure counting Ben's own
 * visits while the list below claims they are gone — the worst kind of wrong,
 * because it is invisible and self-consistent.
 */
export function excludeAdmin(sessions: Session[], adminIps: string[]): Session[] {
  if (!adminIps.length) return sessions;
  const set = new Set(adminIps);
  return sessions.filter((s) => !set.has(s.ip));
}

/* ── Aggregates ────────────────────────────────────────────────────────── */

export type Totals = {
  sessions: number;
  pageViews: number;
  quizStarted: number;
  quizCompleted: number;
  quizAbandoned: number;
  enquiries: number;
  /** Median rather than mean: one 40-minute session skews a mean badly. */
  medianSeconds: number;
};

export function totals(sessions: Session[]): Totals {
  const started = sessions.filter((s) => s.quizCompleted || s.quizAbandonedAt);
  const times = sessions.map(totalSeconds).sort((a, b) => a - b);
  const median = times.length
    ? times.length % 2
      ? times[(times.length - 1) / 2]
      : Math.round((times[times.length / 2 - 1] + times[times.length / 2]) / 2)
    : 0;

  return {
    sessions: sessions.length,
    pageViews: sessions.reduce((n, s) => n + s.pages.length, 0),
    quizStarted: started.length,
    quizCompleted: sessions.filter((s) => s.quizCompleted).length,
    quizAbandoned: sessions.filter((s) => s.quizAbandonedAt).length,
    enquiries: sessions.filter((s) => s.enquired).length,
    medianSeconds: median,
  };
}

/** The quiz, in order. Abandonment is counted against the step they left on. */
export const QUIZ_STEPS = [
  "Goal",
  "Experience",
  "Days per week",
  "Race date",
  "Email",
] as const;

export type FunnelStep = {
  step: string;
  reached: number;
  abandoned: number;
};

export function quizFunnel(sessions: Session[]): FunnelStep[] {
  const abandonedAt = new Map<string, number>();
  let started = 0;
  let completed = 0;

  for (const s of sessions) {
    if (s.quizCompleted) {
      started++;
      completed++;
    } else if (s.quizAbandonedAt) {
      started++;
      abandonedAt.set(s.quizAbandonedAt, (abandonedAt.get(s.quizAbandonedAt) ?? 0) + 1);
    }
  }

  // Reached is cumulative from the top: everyone who did not drop out before
  // this step got here. That is what makes the shape of a funnel readable.
  let remaining = started;
  const steps: FunnelStep[] = QUIZ_STEPS.map((step) => {
    const reached = remaining;
    const lost = abandonedAt.get(step) ?? 0;
    remaining -= lost;
    return { step, reached, abandoned: lost };
  });
  return steps.concat(
    completed || started
      ? [{ step: "Completed", reached: completed, abandoned: 0 }]
      : [],
  );
}

/** Where the funnel leaks most. Null when nobody abandoned anywhere. */
export function worstStep(funnel: FunnelStep[]): FunnelStep | null {
  const worst = funnel.reduce<FunnelStep | null>(
    (acc, f) => (!acc || f.abandoned > acc.abandoned ? f : acc),
    null,
  );
  return worst && worst.abandoned > 0 ? worst : null;
}

export type CountryCount = {
  country: string;
  countryIso: string;
  sessions: number;
  enquiries: number;
};

export function byCountry(sessions: Session[]): CountryCount[] {
  const map = new Map<string, CountryCount>();
  for (const s of sessions) {
    const row = map.get(s.countryIso) ?? {
      country: s.country,
      countryIso: s.countryIso,
      sessions: 0,
      enquiries: 0,
    };
    row.sessions++;
    if (s.enquired) row.enquiries++;
    map.set(s.countryIso, row);
  }
  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}

/** The pages people actually looked at, most-viewed first. */
export function byPage(sessions: Session[]): { path: string; views: number; seconds: number }[] {
  const map = new Map<string, { path: string; views: number; seconds: number }>();
  for (const s of sessions) {
    for (const p of s.pages) {
      const row = map.get(p.path) ?? { path: p.path, views: 0, seconds: 0 };
      row.views++;
      row.seconds += p.seconds;
      map.set(p.path, row);
    }
  }
  return [...map.values()].sort((a, b) => b.views - a.views);
}

/* ── Formatting ────────────────────────────────────────────────────────── */

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

/** "3 hours ago", against a fixed now so it is testable. */
export function relativeTime(iso: string, now: string): string {
  const then = Date.parse(iso);
  const at = Date.parse(now);
  if (!Number.isFinite(then) || !Number.isFinite(at)) return "—";
  const mins = Math.round((at - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * Equirectangular projection into a 0–1 box.
 *
 * Not a cartographic projection with country outlines — it places a pin at the
 * right latitude and longitude on a graticule. Honest about what it is: a
 * coordinate plot, which answers "where are they" without pretending to be a
 * map it is not.
 */
export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: (lng + 180) / 360,
    y: (90 - lat) / 180,
  };
}
