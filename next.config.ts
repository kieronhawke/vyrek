import type { NextConfig } from "next";

/**
 * Baseline security headers. Applied to every route via `headers()`.
 *
 * - HSTS: force HTTPS on browsers for two years (and preload-eligible).
 * - X-Content-Type-Options: stop browsers from MIME-sniffing.
 * - Referrer-Policy: only leak the origin cross-site, never the path.
 * - Permissions-Policy: geolocation stays denied outright; camera and
 *   microphone are allowed for our own origin only.
 * - X-Frame-Options on `/admin/*` and `/app/*` (DENY) so the signed-in
 *   surfaces cannot be iframed for clickjacking. The marketing surface
 *   stays embeddable so press / preview tools can iframe a page.
 *
 * CSP is deliberately omitted for now because the JSON-LD inline
 * scripts on landing / blog / programmes would each need a nonce. A
 * follow-up pass can ship `script-src 'self' 'nonce-...'` once those
 * scripts are nonce-wired.
 */
const BASELINE_HEADERS = [
  // PRE-LAUNCH HARD RULE (Kieron, 2026-07-29): the site must NOT be
  // indexed by search engines until Kieron explicitly says so, and even
  // then only after re-confirming with him. This response header outranks
  // any per-page metadata, so nothing on the site can opt back in while
  // it is present. Remove this single entry to open indexing.
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    /**
     * `microphone=()` is an EMPTY allowlist, not "ask the user" — it denies
     * the microphone to every origin including this one, so the browser never
     * shows a prompt and getUserMedia rejects immediately with
     * NotAllowedError. Ben pressing "Record a voice note" got "microphone
     * permission refused" without ever being asked for it.
     *
     * This header predates both features that need the hardware: Ben's voice
     * notes on a plan, and the athlete filming a station for review. `(self)`
     * restores the normal prompt for our own pages while still denying every
     * embedded third party. Geolocation stays denied outright — nothing here
     * uses it.
     */
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  },
];

const PRIVATE_HEADERS = [
  ...BASELINE_HEADERS,
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'",
  },
];

/**
 * Routes that read the demo results corpus from disk at request time.
 *
 * `demo-source.ts` reaches the JSON through a lazy `require("node:fs")` and a
 * path built from `process.cwd()` — deliberately, because a static import pulls
 * `node:fs` into the client bundle and freezes the admin console. The cost is
 * that Next's file tracing cannot see the read, so `data/results-demo` was
 * never bundled into the serverless functions.
 *
 * The symptom was baffling until you line it up: every page rendered at *build*
 * time worked, because the whole repo is on disk then, and every page rendered
 * at *request* time 404'd, because the lambda only carries traced files. So
 * `/results/city` served a full list of cities while `/results/city/london`
 * did not exist, and `/events` reported zero events after its first
 * revalidation. Nothing in the logs said "file not found" — the source simply
 * returned empty and the pages faithfully rendered that.
 *
 * Scoped to the routes that actually read it. The corpus is 52 MB and there is
 * no reason for the marketing pages to carry it. It becomes unnecessary
 * entirely once NEXT_PUBLIC_DATA_MODE=live, when the engine reads the database.
 */
const RESULTS_DATA = ["./data/results-demo/**"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/result/[id]": RESULTS_DATA,
    "/report/[id]": RESULTS_DATA,
    "/ranking/[slug]": RESULTS_DATA,
    "/athlete/[slug]": RESULTS_DATA,
    "/event/[slug]": RESULTS_DATA,
    "/events": RESULTS_DATA,
    "/results": RESULTS_DATA,
    "/results/city": RESULTS_DATA,
    "/results/city/[slug]": RESULTS_DATA,
    "/results/course-index": RESULTS_DATA,
    "/results/compare": RESULTS_DATA,
    "/rankings": RESULTS_DATA,
    "/rankings/world-records": RESULTS_DATA,
    "/rankings/season-bests": RESULTS_DATA,
    "/starters/[event]": RESULTS_DATA,
    "/reports": RESULTS_DATA,
    "/reports/[event]": RESULTS_DATA,
    "/simulator": RESULTS_DATA,
    "/tools/good-hyrox-time": RESULTS_DATA,
    "/sitemap-results.xml": RESULTS_DATA,
    // Globs rather than an enumeration: the API surface has fifteen routes
    // across /api/results and five OG card routes, and a list would go stale
    // the first time one is added — silently, since the failure is an empty
    // response rather than an error.
    "/api/results/**": RESULTS_DATA,
    "/api/og/**": RESULTS_DATA,
  },

  async headers() {
    return [
      { source: "/:path*", headers: BASELINE_HEADERS },
      { source: "/admin/:path*", headers: PRIVATE_HEADERS },
      { source: "/app/:path*", headers: PRIVATE_HEADERS },
      { source: "/partners/dashboard/:path*", headers: PRIVATE_HEADERS },
      { source: "/partners/onboard/:path*", headers: PRIVATE_HEADERS },
    ];
  },
  async redirects() {
    return [
      // Safety net: people reflexively type /signin or /sign-in. Bounce
      // both to the canonical /login route so a typo never 404s.
      { source: "/signin", destination: "/login", permanent: true },
      { source: "/sign-in", destination: "/login", permanent: true },
      /* The kit post's slug was "hyrox-race-day-kit-checklist-2026": it did
         not match its own title, and the year would have read as stale from
         January. Renamed while nothing is indexed, which is the only cheap
         moment to do it. This keeps any existing link working. */
      {
        source: "/blog/hyrox-race-day-kit-checklist-2026",
        destination: "/blog/what-to-wear-for-hyrox",
        permanent: true,
      },
      /* "24/7 FITNESS HYROX Sanya" is at hyrox.com/event/30454/, so our
         mirrored slug was /hyrox/events/30454. See readableSlug in
         lib/hyrox/races.ts. */
      {
        source: "/hyrox/events/30454",
        destination: "/hyrox/events/hyrox-sanya",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
