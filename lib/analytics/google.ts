import { readConsent } from "@/lib/consent";

/**
 * Google Analytics 4, consent-gated, loaded only after opt-in.
 *
 * Mirrors lib/posthog.ts deliberately: same consent gate, same lazy load,
 * same silent no-op when there is no key. Two analytics tags that behave
 * differently around consent is how one of them ends up firing before the
 * banner is answered.
 *
 * WHAT LINKING GA WILL AND WILL NOT GIVE THE ACTIVITY SCREEN
 *
 * This matters more than the wiring, so it is written down here rather than
 * discovered later.
 *
 * GA4 will give us, through the Data API: sessions and users by country and
 * city, realtime active users, landing pages, sources, and any event we send
 * (so the quiz funnel works). That is most of the top of the Activity screen.
 *
 * GA4 will NOT give us the visitor table at the bottom. There is no per-user
 * IP address in the Data API and there never will be: GA discards the IP
 * after deriving geography, and its reporting surface is aggregate by design.
 * Nothing in the API returns "this session, from this IP, read these six
 * pages in this order".
 *
 * So the session-level view needs either PostHog, which is already wired here
 * and does expose session-level data, or our own first-party endpoint writing
 * to our own database. GA can sit alongside either; it cannot replace them.
 *
 * The Activity screen should therefore read aggregate figures from GA when it
 * is connected, and keep sourcing the session table from PostHog or
 * first-party data. lib/control/activity-sample.ts is where that choice is
 * made.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function measurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return id && id.trim() ? id.trim() : null;
}

/** True when a GA property is configured. Does not imply consent. */
export function gaConfigured(): boolean {
  return measurementId() !== null;
}

/* Same test as lib/posthog.ts: a decision must have been made AND analytics
   accepted. Checking only the category would treat an undecided visitor as
   consenting, because the default category value is false but `decided` is
   what says the banner was answered. */
function consented(): boolean {
  try {
    const c = readConsent();
    return c.decided && c.categories.analytics === true;
  } catch {
    return false;
  }
}

let loaded = false;

/**
 * Injects gtag.js once, if there is a key and consent. Safe to call as often
 * as you like; everything after the first successful load is a no-op.
 */
export function loadGoogleAnalytics(): void {
  if (typeof window === "undefined" || loaded) return;
  const id = measurementId();
  if (!id || !consented()) return;

  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  /* Consent is handled by our own banner before this file runs at all, so
     the tag never loads without opt-in. anonymize_ip is on regardless: GA4
     does it by default and stating it here means a future config change
     cannot quietly turn it off. */
  window.gtag("config", id, { anonymize_ip: true, send_page_view: true });

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/** A page view on client-side navigation, which gtag does not send itself. */
export function gaPageView(path: string): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path });
}

/** An event, for anything the funnel already reports to PostHog. */
export function gaEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params ?? {});
}
