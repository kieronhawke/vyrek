import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = "https://vyrek.com";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog/", "/blog/rss.xml"],
        disallow: ["/api/", "/account/", "/checkout/", "/studio/", "/welcome"],
      },
      // Be explicit for the bigger crawlers — gives faster indexing and stops
      // overly cautious robots.txt parsers from defaulting to deny.
      {
        userAgent: "Googlebot",
        allow: ["/", "/blog/"],
        disallow: ["/api/", "/studio/", "/welcome"],
      },
      {
        userAgent: "Bingbot",
        allow: ["/", "/blog/"],
        disallow: ["/api/", "/studio/", "/welcome"],
      },
      {
        userAgent: "SemrushBot",
        allow: "/",
        disallow: ["/api/", "/studio/"],
      },
      {
        userAgent: "AhrefsBot",
        allow: "/",
        disallow: ["/api/", "/studio/"],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`],
    host: siteUrl,
  };
}
