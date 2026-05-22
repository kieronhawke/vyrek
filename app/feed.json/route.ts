import { NextResponse } from "next/server";
import { listPostMeta } from "@/lib/blog/posts";
import { siteUrl, postUrl } from "@/lib/blog/urls";

/**
 * JSON Feed v1.1 — modern alternative to RSS. Consumed by Feedbin,
 * NetNewsWire, and other contemporary readers. Mirrors the RSS feed
 * content but in spec-compliant JSON.
 *
 * https://www.jsonfeed.org/version/1.1/
 */

export const revalidate = 3600;

export async function GET() {
  const posts = await listPostMeta();
  const items = posts.slice(0, 50).map((p) => ({
    id: postUrl(p.slug),
    url: postUrl(p.slug),
    title: p.title,
    summary: p.excerpt,
    content_html: p.excerpt,
    date_published: new Date(p.publishedAt).toISOString(),
    date_modified: new Date(p.updatedAt ?? p.publishedAt).toISOString(),
    tags: p.tags,
    image: p.heroImage.startsWith("http") ? p.heroImage : `${siteUrl()}${p.heroImage}`,
    authors: [{ name: p.author.name }],
  }));
  const body = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Vyrek Journal",
    description:
      "Practical Hyrox content from Elite 15 athletes. Training, technique, race-day, recovery.",
    home_page_url: `${siteUrl()}/blog`,
    feed_url: `${siteUrl()}/feed.json`,
    language: "en-GB",
    icon: `${siteUrl()}/icon-512.png`,
    favicon: `${siteUrl()}/icon.svg`,
    authors: [{ name: "Vyrek", url: siteUrl() }],
    items,
  };
  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/feed+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
