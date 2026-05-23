import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Breadcrumb } from "@/components/blog/breadcrumb";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { AuthorCard } from "@/components/blog/author-card";
import { ShareButtons } from "@/components/blog/share-buttons";
import { FaqSection } from "@/components/blog/faq-section";
import { RelatedPosts } from "@/components/blog/related-posts";
import { PostFinalCta } from "@/components/blog/post-final-cta";
import { proseComponents } from "@/components/blog/prose";
import {
  getPost,
  allSlugs,
  listRelatedPosts,
  CATEGORIES,
} from "@/lib/blog/posts";
import {
  postUrl,
  categoryUrl,
  ogImageUrl,
  siteUrl,
  rssUrl,
} from "@/lib/blog/urls";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  authorPersonJsonLd,
  faqPageJsonLd,
  organizationJsonLd,
  howToJsonLd,
  howToStepsFromMdx,
  JsonLd,
} from "@/lib/blog/jsonld";

export const revalidate = 3600;

// Block unknown slugs from rendering as dynamic 200s, a request for a
// slug that wasn't in generateStaticParams returns a real 404, not the
// not-found page with a 200 status (better for SEO + crawlers).
export const dynamicParams = false;

export async function generateStaticParams() {
  const slugs = await allSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not found" };

  const url = postUrl(post.slug);
  const og = ogImageUrl(post.slug);
  const title = post.seoTitle ?? `${post.title} | Vyrek Journal`;
  const description = post.seoDescription ?? post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": [{ url: rssUrl(), title: "Vyrek Journal RSS" }],
      },
    },
    keywords: post.tags,
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: "Vyrek",
      type: "article",
      locale: "en_GB",
      publishedTime: new Date(post.publishedAt).toISOString(),
      modifiedTime: new Date(
        post.updatedAt ?? post.publishedAt,
      ).toISOString(),
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: og,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [og],
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await listRelatedPosts(post.slug, 3);
  const categoryLabel = CATEGORIES[post.category]?.label ?? post.category;
  const url = postUrl(post.slug);
  const dateLabel = format(new Date(post.publishedAt), "d MMMM yyyy");

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={blogPostingJsonLd(post)} />
      <JsonLd data={authorPersonJsonLd(post.author)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: siteUrl() },
          { name: "Journal", url: `${siteUrl()}/blog` },
          { name: categoryLabel, url: categoryUrl(post.category) },
          { name: post.title, url },
        ])}
      />
      {post.faqs && post.faqs.length ? (
        <JsonLd data={faqPageJsonLd(post.faqs)} />
      ): null}
      {/* HowTo schema for technique posts. Google often shows HowTo
          schema as a featured rich-result for "how to <X>" queries;
          this is the highest-leverage schema for our station posts. */}
      {post.category === "technique" ? (() => {
        const steps = howToStepsFromMdx(post.content);
        if (steps.length < 3) return null;
        return (
          <JsonLd
            data={howToJsonLd({
              name: post.title,
              description: post.excerpt,
              image: post.heroImage.startsWith("http")
                ? post.heroImage
                : `${siteUrl()}${post.heroImage}`,
              totalTime: `PT${Math.max(5, Math.round(post.readingMinutes))}M`,
              steps,
            })}
          />
        );
      })(): null}

      <ReadingProgress />
      <MarketingNav />

      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <Breadcrumb
            trail={[
              { name: "Home", url: "/" },
              { name: "Journal", url: "/blog" },
              { name: categoryLabel, url: `/blog/category/${post.category}` },
              { name: post.title.slice(0, 30) + (post.title.length > 30 ? "...": ""), url: `/blog/${post.slug}` },
            ]}
          />

          <article className="mt-8">
            <header className="mx-auto max-w-3xl">
              <Link
                href={`/blog/category/${post.category}`}
                className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent transition-colors hover:text-vyrek-accent-hover"
              >
                [ {categoryLabel} ]
              </Link>
              <h1 className="mt-4 text-balance text-3xl font-black leading-[1.1] tracking-[-0.035em] text-vyrek-text md:text-5xl lg:text-6xl">
                {post.title}
              </h1>
              <p className="mt-5 text-balance text-base leading-relaxed text-vyrek-text-secondary md:text-xl">
                {post.excerpt}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-vyrek-text-tertiary">
                <div className="flex items-center gap-2">
                  <div className="size-7 overflow-hidden rounded-full bg-vyrek-overlay">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.author.photo}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span>{post.author.name}</span>
                </div>
                <span aria-hidden>·</span>
                <time dateTime={post.publishedAt}>{dateLabel}</time>
                <span aria-hidden>·</span>
                <span>{post.readingMinutes} min read</span>
                <span aria-hidden>·</span>
                <span>{post.words.toLocaleString()} words</span>
              </div>
            </header>

            <div className="mx-auto mt-10 aspect-[16/9] max-w-5xl overflow-hidden rounded-lg bg-vyrek-overlay md:mt-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.heroImage}
                alt={post.heroAlt}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_minmax(0,720px)_1fr]">
              <aside className="lg:col-start-1 lg:row-start-1">
                <TableOfContents />
              </aside>
              <div
                id="article-body"
                className="lg:col-start-2 lg:row-start-1"
              >
                <MDXRemote
                  source={post.content}
                  components={proseComponents}
                  options={{
                    mdxOptions: {
                      rehypePlugins: [
                        rehypeSlug,
                        [
                          rehypeAutolinkHeadings,
                          {
                            behavior: "wrap",
                            properties: { className: ["no-underline"] },
                          },
                        ],
                      ],
                    },
                  }}
                />

                {post.faqs && post.faqs.length ? (
                  <FaqSection faqs={post.faqs} />
                ): null}

                <div className="mt-12 border-t border-vyrek-border-subtle pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <ShareButtons url={url} title={post.title} />
                    {post.tags.length ? (
                      <ul className="flex flex-wrap items-center gap-2">
                        {post.tags.map((t) => (
                          <li key={t}>
                            <span className="inline-flex h-8 items-center rounded-pill border border-vyrek-border-subtle px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-vyrek-text-tertiary">
                              #{t}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ): null}
                  </div>
                </div>

                <div className="mt-10">
                  <AuthorCard author={post.author} />
                </div>

                <PostFinalCta />

                <RelatedPosts posts={related} />
              </div>
            </div>
          </article>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
