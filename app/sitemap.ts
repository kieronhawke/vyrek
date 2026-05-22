import type { MetadataRoute } from "next";
import { PROGRAMMES } from "@/lib/programmes";
import { listPostMeta, CATEGORIES } from "@/lib/blog/posts";
import { AUTHORS } from "@/lib/blog/authors";
import { UK_LOCATIONS } from "@/lib/uk-locations";
import { STATIONS } from "@/lib/hyrox-stations";
import { PLAN_TEMPLATES } from "@/lib/plan-templates";
import { COMPARISONS } from "@/lib/hyrox-comparisons";
import { HYROX_EVENTS } from "@/lib/hyrox-events";
import { GEAR_GUIDES } from "@/lib/hyrox-gear";
import { TOPIC_HUBS } from "@/lib/topic-hubs";

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
    { url: `${SITE_URL}/press/brand-guidelines`, lastModified: now, priority: 0.3, changeFrequency: "yearly" },
    { url: `${SITE_URL}/account/refer`, lastModified: now, priority: 0.4, changeFrequency: "monthly" },
    // Programmatic hubs
    { url: `${SITE_URL}/hyrox`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/hyrox/stations`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE_URL}/hyrox/events`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/hyrox/gear`, lastModified: now, priority: 0.8, changeFrequency: "monthly" },
    { url: `${SITE_URL}/plans`, lastModified: now, priority: 0.9, changeFrequency: "weekly" },
    { url: `${SITE_URL}/compare`, lastModified: now, priority: 0.7, changeFrequency: "monthly" },
    { url: `${SITE_URL}/tools`, lastModified: now, priority: 0.7, changeFrequency: "monthly" },
    { url: `${SITE_URL}/topics`, lastModified: now, priority: 0.8, changeFrequency: "weekly" },
    // Legal
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

  // ── Programmatic SEO routes ────────────────────────────────────
  const cityRoutes: MetadataRoute.Sitemap = UK_LOCATIONS.map((loc) => ({
    url: `${SITE_URL}/hyrox/${loc.slug}`,
    lastModified: now,
    priority: 0.7,
    changeFrequency: "weekly",
  }));

  const stationRoutes: MetadataRoute.Sitemap = STATIONS.map((s) => ({
    url: `${SITE_URL}/hyrox/stations/${s.slug}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "monthly",
  }));

  const planTemplateRoutes: MetadataRoute.Sitemap = PLAN_TEMPLATES.map((p) => ({
    url: `${SITE_URL}/plans/${p.slug}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "monthly",
  }));

  const comparisonRoutes: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${SITE_URL}/compare/${c.slug}`,
    lastModified: now,
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const toolRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/tools/pace-calculator`,
      lastModified: now,
      priority: 0.7,
      changeFrequency: "monthly",
    },
  ];

  const eventRoutes: MetadataRoute.Sitemap = HYROX_EVENTS.map((e) => ({
    url: `${SITE_URL}/hyrox/events/${e.slug}`,
    lastModified: now,
    priority: 0.75,
    changeFrequency: "weekly",
  }));

  const gearRoutes: MetadataRoute.Sitemap = GEAR_GUIDES.map((g) => ({
    url: `${SITE_URL}/hyrox/gear/${g.slug}`,
    lastModified: now,
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const topicRoutes: MetadataRoute.Sitemap = TOPIC_HUBS.map((t) => ({
    url: `${SITE_URL}/topics/${t.slug}`,
    lastModified: now,
    priority: 0.8,
    changeFrequency: "weekly",
  }));

  return [
    ...staticRoutes,
    ...programmeRoutes,
    ...programmeAnchorRoutes,
    ...postRoutes,
    ...categoryRoutes,
    ...authorRoutes,
    ...cityRoutes,
    ...stationRoutes,
    ...planTemplateRoutes,
    ...comparisonRoutes,
    ...toolRoutes,
    ...eventRoutes,
    ...gearRoutes,
    ...topicRoutes,
  ];
}
