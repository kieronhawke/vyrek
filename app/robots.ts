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
    "/plan",
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
    sitemap: [`${siteUrl}/sitemap.xml`],
    host: siteUrl,
  };
}
