import type { NextConfig } from "next";

/**
 * Baseline security headers. Applied to every route via `headers()`.
 *
 * - HSTS: force HTTPS on browsers for two years (and preload-eligible).
 * - X-Content-Type-Options: stop browsers from MIME-sniffing.
 * - Referrer-Policy: only leak the origin cross-site, never the path.
 * - Permissions-Policy: deny camera / mic / geolocation we never use.
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
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
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

const nextConfig: NextConfig = {
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
    ];
  },
};

export default nextConfig;
