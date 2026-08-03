/**
 * HOW LONG THEY'VE BEEN HERE, AND WHERE THEY CAME IN.
 *
 * Ben asked for this so a lead alert says something about the person
 * before he rings them: somebody who landed on /hyrox/leeds and read for
 * twenty minutes is a different phone call from somebody who hit the
 * consultation form from an ad and left after ninety seconds.
 *
 * SESSION STORAGE, NOT A COOKIE. It is not tracking, it never leaves the
 * tab, and it is only read at the moment somebody submits a form they have
 * chosen to submit. That also means no consent banner question: the data
 * lives and dies with the tab and is only transmitted as part of an
 * enquiry the person is deliberately sending.
 *
 * NOTHING HERE IS TRUSTED AT THE OTHER END. It comes from the browser, so
 * `cleanSessionContext` in lib/geo/request-location.ts re-checks every
 * field before it reaches an email.
 */

const KEY = "suth:session-context";

type Stored = {
  landingPath: string;
  referrer: string;
  startedAt: number;
  pageViews: number;
};

function read(): Stored | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    // Safari private mode throws on sessionStorage. Losing this is fine;
    // breaking the page over it is not.
    return null;
  }
}

function write(value: Stored): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* see read() */
  }
}

/**
 * Call once per page view. The first call in a tab records the landing
 * page and the referrer; every call after it just counts.
 */
export function recordPageView(path: string): void {
  if (typeof window === "undefined") return;
  const existing = read();
  if (!existing) {
    write({
      landingPath: path,
      // Only an external referrer is worth keeping — an internal one is
      // just the previous page, which the page count already implies.
      referrer:
        document.referrer && !document.referrer.startsWith(window.location.origin)
          ? document.referrer
          : "",
      startedAt: Date.now(),
      pageViews: 1,
    });
    return;
  }
  write({ ...existing, pageViews: existing.pageViews + 1 });
}

/** The shape posted alongside a lead. Empty object when there is nothing. */
export function sessionContext(): {
  landingPath?: string;
  referrer?: string;
  secondsOnSite?: number;
  pageViews?: number;
} {
  const s = read();
  if (!s) return {};
  return {
    landingPath: s.landingPath,
    referrer: s.referrer || undefined,
    secondsOnSite: Math.round((Date.now() - s.startedAt) / 1000),
    pageViews: s.pageViews,
  };
}
