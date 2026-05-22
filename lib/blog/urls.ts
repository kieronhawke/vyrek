/**
 * Canonical URL helpers for the blog. Centralised so every link
 * (canonical, OG image, sitemap, RSS, JSON-LD) agrees on the host.
 */

export function siteUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://vyrek.com");
  return env.replace(/\/$/, "");
}

export function postUrl(slug: string): string {
  return `${siteUrl()}/blog/${slug}`;
}

export function categoryUrl(slug: string): string {
  return `${siteUrl()}/blog/category/${slug}`;
}

export function authorUrl(slug: string): string {
  return `${siteUrl()}/blog/author/${slug}`;
}

export function ogImageUrl(slug: string): string {
  return `${siteUrl()}/api/og/blog/${slug}`;
}

export function blogIndexUrl(): string {
  return `${siteUrl()}/blog`;
}

export function rssUrl(): string {
  return `${siteUrl()}/blog/rss.xml`;
}
