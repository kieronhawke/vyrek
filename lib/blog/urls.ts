/**
 * Canonical URL helpers for the blog. Re-exports the shared
 * `siteUrl()` from lib/site-url so every link (canonical, OG image,
 * sitemap, RSS, JSON-LD, robots) agrees on the host. Change the
 * NEXT_PUBLIC_SITE_URL env var to flip the canonical host.
 */
export { siteUrl } from "@/lib/site-url";
import { siteUrl } from "@/lib/site-url";

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
