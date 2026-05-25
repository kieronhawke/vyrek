import { listPostMeta, CATEGORIES } from "@/lib/blog/posts";
import { blogIndexUrl, postUrl, siteUrl } from "@/lib/blog/urls";

/**
 * llms.txt, an emerging convention (parallel to robots.txt) for AI agents
 * and LLM-driven search to discover the most useful documents on a site.
 * See https://llmstxt.org/ for the proposal.
 *
 * We surface a curated list of the most valuable URLs and a sentence on
 * what Vyrek is, formatted as a plain-text Markdown-style document.
 */

export const revalidate = 3600;

export async function GET() {
  const posts = await listPostMeta();
  const url = siteUrl();

  const lines: string[] = [
    "# Vyrek",
    "",
    "> Personalised Hyrox training programmes built by an Elite 15 coach. Members take a three-minute quiz, see a dated Week 1 before paying, then start a 7-day free trial. £8.99 a month after.",
    "",
    "## Primary pages",
    "",
    `- [Home](${url}/): What Vyrek is and the value proposition for Hyrox athletes`,
    `- [Quiz](${url}/quiz): Three-minute onboarding that produces a personalised plan`,
    `- [Programmes](${url}/programmes): The four programmes. First Race, Sub-90, Doubles, Pro`,
    `- [How it works](${url}/how-it-works): Four-step journey from quiz to first race`,
    `- [Pricing](${url}/pricing): £8.99/mo, 7-day free trial, cancel anytime`,
    "",
    "## Journal. Hyrox training content",
    "",
    `Index: ${blogIndexUrl()}`,
    `RSS feed: ${url}/blog/rss.xml`,
    "",
    "### Recent posts",
    "",
    ...posts.slice(0, 20).map((p) => {
      const cat = CATEGORIES[p.category]?.label ?? p.category;
      return `- [${p.title}](${postUrl(p.slug)}): ${p.excerpt} (${cat})`;
    }),
    "",
    "## Categories",
    "",
    ...Object.entries(CATEGORIES).map(
      ([slug, c]) => `- [${c.label}](${url}/blog/category/${slug}): ${c.description}`,
    ),
    "",
    "## About",
    "",
    "Vyrek is a UK-based Hyrox-first training platform. Founding coach James Wright races at Elite 15. Programmes recalibrate every Sunday based on logged sessions.",
    "",
    "## Contact",
    "",
    "- press@vyrek.com",
    "- hello@vyrek.com",
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
