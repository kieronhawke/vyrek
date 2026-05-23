/**
 * Single source of truth for the canonical site URL.
 *
 * Order of precedence:
 *   1. NEXT_PUBLIC_SITE_URL  — set this in Vercel to the production
 *      canonical (currently https://vyrek.vercel.app; flip to
 *      https://vyrek.com once that domain is wired up).
 *   2. VERCEL_PROJECT_PRODUCTION_URL — automatically set on production
 *      Vercel deploys.
 *   3. VERCEL_URL — preview deploy URL.
 *   4. Fallback: localhost for dev.
 *
 * Every robots.txt host, sitemap URL, JSON-LD @id, canonical link,
 * og:url and internal absolute URL flows through this helper. When
 * the domain changes, you change one env var; nothing else breaks.
 */
export function siteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
  return env.replace(/\/$/, "");
}

/** Just the host (no scheme, no trailing slash). Used in robots.txt
 *  `Host:` directive + IndexNow `host` field. */
export function siteHost(): string {
  return siteUrl().replace(/^https?:\/\//, "");
}
