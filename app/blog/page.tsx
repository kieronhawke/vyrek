import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { PostCard } from "@/components/blog/post-card";
import { Breadcrumb } from "@/components/blog/breadcrumb";
import { JournalHero } from "@/components/blog/journal-hero";
import { PostFinalCta } from "@/components/blog/post-final-cta";
import {
  listPostMeta,
  listFeaturedPosts,
  CATEGORIES,
  type Category,
} from "@/lib/blog/posts";
import {
  blogIndexUrl,
  categoryUrl,
  rssUrl,
  siteUrl,
} from "@/lib/blog/urls";
import {
  collectionPageJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  JsonLd,
} from "@/lib/blog/jsonld";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Journal: HYROX training and race guides",
  description:
    "Practical Hyrox content from an Elite 15 coach. Training plans, station-by-station technique, nutrition, and race-day pacing. Plain English, no fluff.",
  alternates: {
    canonical: blogIndexUrl(),
    types: {
      "application/rss+xml": [{ url: rssUrl(), title: "Suth Performance Journal RSS" }],
    },
  },
  openGraph: {
    title: "Suth Performance Journal",
    description:
      "Practical Hyrox content from an Elite 15 coach. Training, technique, race-day, recovery.",
    url: blogIndexUrl(),
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
    images: [
      {
        url: `${siteUrl()}/media/images/track/straight-elevated-bw.jpg`,
        width: 1200,
        height: 630,
        alt: "Suth Performance Journal. Hyrox training insights",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Suth Performance Journal",
    description:
      "Practical Hyrox training, technique and race-day guides from an Elite 15 coach.",
  },
  robots: { index: true, follow: true },
};

export default async function BlogIndexPage() {
  const all = await listPostMeta();
  const featured = (await listFeaturedPosts(1))[0];
  const rest = all.filter((p) => p.slug !== featured?.slug);
  const categories = Object.entries(CATEGORIES) as [
    Category,
    (typeof CATEGORIES)[Category],
  ][];

  // Build category → post counts
  const counts: Record<string, number> = {};
  for (const p of all) counts[p.category] = (counts[p.category] ?? 0) + 1;

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={collectionPageJsonLd(all)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: siteUrl() },
          { name: "Journal", url: blogIndexUrl() },
        ])}
      />
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          {/* Brief 7.1: Home / Journal tabs live in the mobile hamburger;
              keep desktop breadcrumb only */}
          <div className="hidden md:block">
            <Breadcrumb
              trail={[
                { name: "Home", url: "/" },
                { name: "Journal", url: "/blog" },
              ]}
            />
          </div>
          <JournalHero postCount={all.length} />

          {featured ? (
            <section className="mt-14">
              <PostCard post={featured} variant="featured" />
            </section>
          ): null}

          <section className="mt-14">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Eyebrow>All guides</Eyebrow>
              <nav
                aria-label="Filter by category"
                className="flex flex-wrap items-center gap-2"
              >
                {categories.map(([slug, c]) =>
                  (counts[slug] ?? 0) > 0 ? (
                    <Link
                      key={slug}
                      href={`/blog/category/${slug}`}
                      className="inline-flex h-9 items-center rounded-pill border border-suth-border bg-suth-elevated px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text"
                    >
                      {c.label} · {counts[slug]}
                    </Link>
                  ): null,
                )}
              </nav>
            </div>

            <ul role="list" className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <li key={p.slug}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-16">
            <PostFinalCta />
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
