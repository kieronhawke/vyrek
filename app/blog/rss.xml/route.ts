import { listPostMeta } from "@/lib/blog/posts";
import { blogIndexUrl, postUrl, siteUrl } from "@/lib/blog/urls";

/**
 * RSS 2.0 feed for the Vyrek Journal. Discoverable via the
 * `<link rel="alternate" type="application/rss+xml">` in blog metadata,
 * and indexable by Feedly, Substack imports, Semrush content monitoring,
 * Google's content-freshness signals, and any standard feed reader.
 */

export const revalidate = 3600;

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = await listPostMeta();
  const items = posts
    .map((p) => {
      const url = postUrl(p.slug);
      const pub = new Date(p.publishedAt).toUTCString();
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <description>${escape(p.excerpt)}</description>
      <author>noreply@vyrek.com (${escape(p.author.name)})</author>
      <category>${escape(p.category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Vyrek Journal</title>
    <link>${blogIndexUrl()}</link>
    <description>Practical Hyrox training, technique and race-day guides from Elite 15 coaches.</description>
    <language>en-GB</language>
    <atom:link href="${siteUrl()}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
