import type { MetadataRoute } from "next";
import { siteUrl as canonicalSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  // Pull from the shared canonical so robots.txt's Host: + Sitemap:
  // always match the live production host. Critical for indexing:
  // Google fetches robots.txt first; if Host: disagrees with the
  // host serving pages, indexing collapses.
  const siteUrl = canonicalSiteUrl();

  // Private surfaces that should never appear in search results. The
  // per-page Metadata.robots.index=false is the primary defence (search
  // engines respect that even without robots.txt); this is the belt to
  // its braces.
  const PRIVATE_PATHS = [
    "/api/",
    "/account/",
    "/admin/",
    "/admin",
    "/checkout/",
    "/login",
    "/partners/dashboard",
    "/partners/onboard",
    "/p/",
    /* "/plan" alone was a prefix match, and robots.txt prefix matching does
       not stop at a path segment: it blocked /plans/ and all eight public
       plan pages too. The wildcard group happened to survive on the
       longest-match rule because it carries an explicit "Allow: /plans/",
       but the Googlebot and Bingbot groups do not, so for Google and Bing
       every /plans page was disallowed while sitting in the sitemap and
       serving "index, follow". The $ anchors the exact path; the trailing
       slash entry keeps /plan/share/* blocked. */
    "/plan$",
    "/plan/",
    "/studio/",
    "/welcome",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        // /account/refer is a public landing page, explicitly allow.
        // Other /account/* paths (billing, settings) stay disallowed.
        allow: [
          "/",
          "/blog/",
          "/blog/rss.xml",
          "/hyrox/",
          "/plans/",
          "/compare/",
          "/tools/",
          "/partners",
          "/partners/apply",
        ],
        disallow: PRIVATE_PATHS,
      },
      // Be explicit for the bigger crawlers, gives faster indexing and stops
      // overly cautious robots.txt parsers from defaulting to deny.
      {
        userAgent: "Googlebot",
        allow: ["/", "/blog/"],
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/blog/"],
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "SemrushBot",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: "AhrefsBot",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    // Results has its own sitemap: it adds thousands of URLs on a different
    // cadence and app/sitemap.ts is shared across lanes.
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap-results.xml`],
    host: siteUrl,
  };
}
