import type { MetadataRoute } from "next";
import { PROGRAMMES } from "@/lib/programmes";
import { listPostMeta, CATEGORIES } from "@/lib/blog/posts";
import { AUTHORS } from "@/lib/blog/authors";

const SITE_URL = "https://vyrek.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${SITE_URL}/quiz`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE_URL}/programmes`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/pricing`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/blog`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/about`, lastModified: now, priority: 0.6, changeFrequency: "monthly" },
    { url: `${SITE_URL}/contact`, lastModified: now, priority: 0.5, changeFrequency: "yearly" },
    { url: `${SITE_URL}/press`, lastModified: now, priority: 0.4, changeFrequency: "monthly" },
    { url: `${SITE_URL}/legal/privacy`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    { url: `${SITE_URL}/legal/terms`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    { url: `${SITE_URL}/legal/cookies`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    { url: `${SITE_URL}/legal/refunds`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
  ];

  const programmeRoutes: MetadataRoute.Sitemap = PROGRAMMES.map((p) => ({
    url: `${SITE_URL}/quiz?program=${p.slug}`,
    lastModified: now,
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const programmeAnchorRoutes: MetadataRoute.Sitemap = PROGRAMMES.map((p) => ({
    url: `${SITE_URL}/programmes#${p.slug}`,
    lastModified: now,
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const posts = await listPostMeta();
  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt ?? p.publishedAt),
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(CATEGORIES).map(
    (slug) => ({
      url: `${SITE_URL}/blog/category/${slug}`,
      lastModified: now,
      priority: 0.5,
      changeFrequency: "weekly",
    }),
  );

  const authorRoutes: MetadataRoute.Sitemap = Object.keys(AUTHORS).map(
    (slug) => ({
      url: `${SITE_URL}/blog/author/${slug}`,
      lastModified: now,
      priority: 0.4,
      changeFrequency: "monthly",
    }),
  );

  return [
    ...staticRoutes,
    ...programmeRoutes,
    ...programmeAnchorRoutes,
    ...postRoutes,
    ...categoryRoutes,
    ...authorRoutes,
  ];
}
