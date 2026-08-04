import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  byCountry,
  byPage,
  excludeAdmin,
  formatDuration,
  inRange,
  intentOf,
  matchesFilter,
  project,
  quizFunnel,
  rangeBounds,
  relativeTime,
  sortSessions,
  totalSeconds,
  totals,
  worstStep,
  type Session,
} from "./activity";
import { sampleActivity } from "./activity-sample";

const TODAY = "2026-08-03";
const NOW = "2026-08-03T12:00:00.000Z";

function session(over: Partial<Session> = {}): Session {
  return {
    id: "x",
    startedAt: "2026-08-03T09:00:00.000Z",
    lastSeenAt: "2026-08-03T09:05:00.000Z",
    ip: "192.0.2.1",
    country: "United Kingdom",
    countryIso: "GB",
    city: "Manchester",
    lat: 53.48,
    lng: -2.24,
    timezone: "Europe/London",
    landing: "/",
    referrer: "direct",
    pages: [{ path: "/", seconds: 30 }],
    quizCompleted: false,
    quizAbandonedAt: null,
    formStarted: false,
    enquired: false,
    ...over,
  };
}

describe("ranges", () => {
  it("means what a person means by them", () => {
    expect(rangeBounds({ key: "today" }, TODAY)).toEqual({ from: TODAY, to: TODAY });
    // Today and the six before it — not "the seven days ending yesterday".
    expect(rangeBounds({ key: "7d" }, TODAY)).toEqual({ from: "2026-07-28", to: TODAY });
    expect(rangeBounds({ key: "30d" }, TODAY)).toEqual({ from: "2026-07-05", to: TODAY });
    expect(rangeBounds({ key: "all" }, TODAY)).toBeNull();
  });

  it("accepts a custom range typed backwards", () => {
    // Otherwise it silently shows nothing, which reads as "no traffic"
    // rather than "you typed the dates the wrong way round".
    expect(rangeBounds({ key: "custom", from: "2026-08-01", to: "2026-07-01" }, TODAY)).toEqual({
      from: "2026-07-01",
      to: "2026-08-01",
    });
  });

  it("treats an incomplete custom range as all time rather than nothing", () => {
    expect(rangeBounds({ key: "custom", from: "2026-08-01" }, TODAY)).toBeNull();
  });

  it("includes both ends of the range", () => {
    const early = session({ startedAt: "2026-07-28T23:00:00.000Z" });
    const late = session({ startedAt: "2026-08-03T00:30:00.000Z" });
    const before = session({ startedAt: "2026-07-27T23:00:00.000Z" });
    expect(inRange(early, { key: "7d" }, TODAY)).toBe(true);
    expect(inRange(late, { key: "7d" }, TODAY)).toBe(true);
    expect(inRange(before, { key: "7d" }, TODAY)).toBe(false);
  });
});

describe("intent", () => {
  it("is derived, so a rule change applies to history too", () => {
    expect(intentOf(session({ enquired: true }))).toBe("high");
    expect(intentOf(session({ formStarted: true }))).toBe("high");
    expect(intentOf(session({ quizCompleted: true }))).toBe("high");
    expect(intentOf(session({ quizAbandonedAt: "Email" }))).toBe("medium");
    expect(intentOf(session())).toBe("low");
    expect(intentOf(session({ pages: [{ path: "/", seconds: 4 }] }))).toBe("anonymous");
  });

  it("counts a long multi-page visit as medium even with no action", () => {
    const s = session({
      pages: [
        { path: "/", seconds: 40 },
        { path: "/a", seconds: 40 },
        { path: "/b", seconds: 40 },
        { path: "/c", seconds: 40 },
      ],
    });
    expect(intentOf(s)).toBe("medium");
  });
});

describe("filters", () => {
  it("form-started means started and did not send", () => {
    // Somebody who completed the form is a lead, and is on the leads page.
    // Leaving them here means chasing people who already got in touch.
    expect(matchesFilter(session({ formStarted: true }), "form-started")).toBe(true);
    expect(matchesFilter(session({ formStarted: true, enquired: true }), "form-started")).toBe(
      false,
    );
  });

  it("everyone means everyone", () => {
    expect(matchesFilter(session(), "all")).toBe(true);
  });
});

describe("sorting", () => {
  const a = session({ id: "a", lastSeenAt: "2026-08-03T09:00:00.000Z", pages: [{ path: "/", seconds: 300 }] });
  const b = session({
    id: "b",
    lastSeenAt: "2026-08-03T11:00:00.000Z",
    pages: [
      { path: "/", seconds: 10 },
      { path: "/x", seconds: 10 },
      { path: "/y", seconds: 10 },
    ],
  });
  const c = session({ id: "c", lastSeenAt: "2026-08-02T09:00:00.000Z", enquired: true, pages: [{ path: "/", seconds: 20 }] });

  it("orders by each key", () => {
    expect(sortSessions([a, b, c], "last-seen").map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(sortSessions([a, b, c], "longest").map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(sortSessions([a, b, c], "most-pages").map((s) => s.id)).toEqual(["b", "a", "c"]);
    expect(sortSessions([a, b, c], "intent")[0].id).toBe("c");
  });

  it("does not mutate the array it was given", () => {
    const list = [a, b, c];
    sortSessions(list, "longest");
    expect(list.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });
});

describe("admin exclusion", () => {
  it("removes the traffic before anything is counted", () => {
    // Filtering the table alone leaves the headline figures counting Ben's
    // own visits while the list claims they are gone — invisible and
    // self-consistent, which is the worst kind of wrong.
    const mine = session({ id: "mine", ip: "192.0.2.200" });
    const theirs = session({ id: "theirs", ip: "192.0.2.1" });
    const kept = excludeAdmin([mine, theirs], ["192.0.2.200"]);
    expect(kept.map((s) => s.id)).toEqual(["theirs"]);
    expect(totals(kept).sessions).toBe(1);
  });

  it("is a no-op with an empty list", () => {
    const list = [session()];
    expect(excludeAdmin(list, [])).toBe(list);
  });
});

describe("totals", () => {
  it("uses a median, because one long visit ruins a mean", () => {
    const list = [
      session({ pages: [{ path: "/", seconds: 10 }] }),
      session({ pages: [{ path: "/", seconds: 20 }] }),
      session({ pages: [{ path: "/", seconds: 2400 }] }),
    ];
    expect(totals(list).medianSeconds).toBe(20);
  });

  it("is all zeroes for no traffic rather than dividing by nothing", () => {
    expect(totals([])).toEqual({
      sessions: 0,
      pageViews: 0,
      quizStarted: 0,
      quizCompleted: 0,
      quizAbandoned: 0,
      enquiries: 0,
      medianSeconds: 0,
    });
  });
});

describe("quiz funnel", () => {
  const list = [
    session({ quizCompleted: true }),
    session({ quizCompleted: true }),
    session({ quizAbandonedAt: "Email" }),
    session({ quizAbandonedAt: "Email" }),
    session({ quizAbandonedAt: "Email" }),
    session({ quizAbandonedAt: "Experience" }),
    session(), // never started the quiz
  ];

  it("counts reached cumulatively from the top", () => {
    const funnel = quizFunnel(list);
    expect(funnel[0]).toMatchObject({ step: "Goal", reached: 6, abandoned: 0 });
    expect(funnel[1]).toMatchObject({ step: "Experience", reached: 6, abandoned: 1 });
    // One left at Experience, so five got to the next step.
    expect(funnel[2]).toMatchObject({ step: "Days per week", reached: 5 });
    expect(funnel[4]).toMatchObject({ step: "Email", reached: 5, abandoned: 3 });
    expect(funnel.at(-1)).toMatchObject({ step: "Completed", reached: 2 });
  });

  it("names where it leaks worst", () => {
    expect(worstStep(quizFunnel(list))?.step).toBe("Email");
  });

  it("names nothing when nobody abandoned", () => {
    expect(worstStep(quizFunnel([session({ quizCompleted: true })]))).toBeNull();
  });
});

describe("breakdowns", () => {
  it("groups by country, busiest first, and counts enquiries separately", () => {
    const rows = byCountry([
      session({ countryIso: "GB" }),
      session({ countryIso: "GB", enquired: true }),
      session({ countryIso: "IE", country: "Ireland" }),
    ]);
    expect(rows[0]).toMatchObject({ countryIso: "GB", sessions: 2, enquiries: 1 });
    expect(rows[1]).toMatchObject({ countryIso: "IE", sessions: 1, enquiries: 0 });
  });

  it("groups by page across sessions", () => {
    const rows = byPage([
      session({ pages: [{ path: "/", seconds: 10 }, { path: "/plan", seconds: 100 }] }),
      session({ pages: [{ path: "/plan", seconds: 50 }] }),
    ]);
    expect(rows[0]).toMatchObject({ path: "/plan", views: 2, seconds: 150 });
  });
});

describe("formatting", () => {
  it("reads as a person would say it", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(45)).toBe("45s");
    expect(formatDuration(150)).toBe("2m 30s");
    expect(relativeTime("2026-08-03T11:59:40.000Z", NOW)).toBe("just now");
    expect(relativeTime("2026-08-03T11:30:00.000Z", NOW)).toBe("30 min ago");
    expect(relativeTime("2026-08-03T09:00:00.000Z", NOW)).toBe("3 hours ago");
    expect(relativeTime("2026-08-01T12:00:00.000Z", NOW)).toBe("2 days ago");
    expect(relativeTime("nonsense", NOW)).toBe("—");
  });
});

describe("projection", () => {
  it("puts the corners where they belong", () => {
    expect(project(0, 0)).toEqual({ x: 0.5, y: 0.5 });
    expect(project(90, -180)).toEqual({ x: 0, y: 0 });
    expect(project(-90, 180)).toEqual({ x: 1, y: 1 });
  });

  it("puts Manchester in the top-left quadrant and Sydney in the bottom-right", () => {
    const manchester = project(53.48, -2.24);
    const sydney = project(-33.87, 151.21);
    expect(manchester.x).toBeLessThan(0.5);
    expect(manchester.y).toBeLessThan(0.5);
    expect(sydney.x).toBeGreaterThan(0.5);
    expect(sydney.y).toBeGreaterThan(0.5);
  });
});

describe("the sample set", () => {
  const data = sampleActivity(TODAY);

  it("says it is sample data", () => {
    // HARD-RULES §1. A beautiful analytics page quietly full of made-up
    // numbers is the exact failure that rule exists for.
    expect(data.isSample).toBe(true);
    expect(data.reason).toMatch(/sample/i);
  });

  it("uses documentation IP ranges only", () => {
    // A public repository must not carry anything that could be a real
    // person's address. RFC 5737 reserves these for exactly this.
    for (const s of data.sessions) {
      expect(s.ip).toMatch(/^(192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/);
    }
  });

  it("never claims a visit lasted longer than the session", () => {
    for (const s of data.sessions) {
      expect(Date.parse(s.lastSeenAt)).toBeGreaterThanOrEqual(Date.parse(s.startedAt));
    }
  });

  it("has a shape worth looking at", () => {
    const t = totals(data.sessions);
    expect(t.sessions).toBeGreaterThan(10);
    expect(t.enquiries).toBeGreaterThan(0);
    // The funnel has to leak somewhere or the funnel chart proves nothing.
    expect(worstStep(quizFunnel(data.sessions))).not.toBeNull();
    // And more than one country, or the map is a single dot.
    expect(byCountry(data.sessions).length).toBeGreaterThan(3);
  });

  it("includes one of Ben's own visits, so exclusion has an effect to see", () => {
    const before = totals(data.sessions).sessions;
    const after = totals(excludeAdmin(data.sessions, ["192.0.2.200"])).sessions;
    expect(after).toBe(before - 1);
  });

  it("every session's landing page is the first page it recorded", () => {
    for (const s of data.sessions) {
      expect(s.landing).toBe(s.pages[0].path);
    }
  });

  it("totals its own durations consistently", () => {
    for (const s of data.sessions) {
      expect(totalSeconds(s)).toBe(s.pages.reduce((n, p) => n + p.seconds, 0));
    }
  });
});

describe("the sampled pages are pages that exist", () => {
  /**
   * The sample referenced /journal, /journal/first-hyrox,
   * /journal/what-to-wear-for-hyrox and /results/rankings. All four were
   * 404s: the blog lives at /blog and the rankings route was never built.
   *
   * Analytics that name a page nobody can open is worse than analytics with
   * no page names in it. Ben reads "most-read pages", clicks one, and gets a
   * 404 — at which point the honest "sample data" banner above it stops being
   * the reason to distrust the screen and the numbers start looking made up
   * too.
   *
   * This walks the app directory rather than hitting a server, so it runs in
   * the same suite as everything else. Dynamic segments are matched by shape,
   * because /blog/[slug] cannot be resolved without reading every post.
   */
  const APP = join(process.cwd(), "app");

  /** Every static route the app directory defines. */
  function staticRoutes(dir: string, prefix = ""): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      // Route groups "(x)" and private folders "_x" do not appear in the URL.
      if (name.startsWith("_") || name.startsWith(".")) continue;
      const next = join(dir, name);
      const path = name.startsWith("(") ? prefix : `${prefix}/${name}`;
      if (existsSync(join(next, "page.tsx")) || existsSync(join(next, "page.ts"))) {
        out.push(path);
      }
      out.push(...staticRoutes(next, path));
    }
    return out;
  }

  it("every page in the sample resolves to a route", () => {
    const routes = new Set(staticRoutes(APP));
    routes.add("/"); // app/page.tsx is the root, which the walk cannot name
    const dynamic = [...routes].filter((r) => r.includes("["));

    /* Every path in the sample comes from a session's page list; the
       "most-read pages" table is derived from exactly these. */
    const sampled = new Set<string>();
    for (const session of sampleActivity("2026-08-04").sessions) {
      for (const hit of session.pages) sampled.add(hit.path);
      sampled.add(session.landing);
    }

    expect(sampled.size).toBeGreaterThan(0);
    for (const path of sampled) {
      if (routes.has(path)) continue;
      // Fall back to a dynamic segment: /blog/anything matches /blog/[slug].
      const matched = dynamic.some((r) => {
        const parts = r.split("/");
        const got = path.split("/");
        return (
          parts.length === got.length &&
          parts.every((seg, i) => seg.startsWith("[") || seg === got[i])
        );
      });
      expect(matched, `${path} is not a route this app serves`).toBe(true);
    }
  });
});
