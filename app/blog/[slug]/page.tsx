import type { Metadata } from "next";
import Image from "next/image";
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
  const title = post.seoTitle ?? `${post.title} | Suth Performance Journal`;
  const description = post.seoDescription ?? post.excerpt;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": [{ url: rssUrl(), title: "Suth Performance Journal RSS" }],
      },
    },
    keywords: post.tags,
    authors: [{ name: post.author.name }],
    openGraph: {
      title: post.title,
      description,
      url,
      siteName: "Suth Performance",
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
            {/* Split header on desktop: title block left, hero image right,
                both inside the first fold. NOTE the design-system type scale
                is remapped for marketing heroes (text-6xl = 128px), so the
                article H1 uses explicit editorial sizes instead. Mobile keeps
                the stacked order that already works. */}
            <header className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <Link
                  href={`/blog/category/${post.category}`}
                  className="inline-block font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent transition-colors hover:text-suth-accent-hover"
                >
                  [ {categoryLabel} ]
                </Link>
                <h1 className="mt-4 text-balance text-[34px] font-black leading-[1.06] tracking-[-0.03em] text-suth-text md:text-[40px] lg:text-[44px]">
                  {post.title}
                </h1>
                <p className="mt-5 text-balance text-base leading-relaxed text-suth-text-secondary md:text-lg">
                  {post.excerpt}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-suth-text-tertiary">
                  <div className="flex items-center gap-2">
                    <div className="relative size-7 overflow-hidden rounded-full bg-suth-overlay">
                      <Image
                        src={post.author.photo}
                        alt={`Portrait of ${post.author.name}`}
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </div>
                    <span>{post.author.name}</span>
                  </div>
                  <span aria-hidden>·</span>
                  <time dateTime={post.publishedAt}>{dateLabel}</time>
                  <span aria-hidden>·</span>
                  <span>{post.readingMinutes} min read</span>
                </div>
              </div>
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-suth-overlay lg:col-span-5 lg:aspect-[4/3]">
                <Image
                  src={post.heroImage}
                  alt={post.heroAlt}
                  fill
                  priority
                  sizes="(min-width: 1024px) 480px, 100vw"
                  className="object-cover"
                />
              </div>
            </header>

            <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_minmax(0,720px)_1fr]">
              <div
                className="lg:col-start-1 lg:row-start-1"
                aria-label="Table of contents"
              >
                <TableOfContents />
              </div>
              {/* min-w-0 lets wide children (tables, charts, code) scroll
                  inside themselves rather than widening the whole page. */}
              <div
                id="article-body"
                className="min-w-0 lg:col-start-2 lg:row-start-1"
              >
                <MDXRemote
                  source={post.content}
                  components={proseComponents}
                  options={{
                    // next-mdx-remote v6 strips ALL JavaScript expressions by
                    // default, including JSX attribute expressions — so any
                    // `prop={[...]}` is silently dropped and the component
                    // renders with the prop missing. That broke every data
                    // component we pass arrays to (charts, checklists,
                    // comparison tables, race splits).
                    //
                    // Safe to disable here: blog MDX is first-party content
                    // committed to this repo and reviewed like any other
                    // source file. It is never user-submitted. If that ever
                    // changes — accepting MDX from outside the team — this
                    // MUST go back to true. `blockDangerousJS` stays on as a
                    // second layer regardless.
                    blockJS: false,
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

                <div className="mt-12 border-t border-suth-border-subtle pt-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <ShareButtons url={url} title={post.title} />
                    {post.tags.length ? (
                      <ul className="flex flex-wrap items-center gap-2">
                        {post.tags.map((t) => (
                          <li key={t}>
                            <span className="inline-flex h-8 items-center rounded-pill border border-suth-border-subtle px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary">
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
              {/* Right rail: quiet sticky CTA, wide screens only. The third
                  grid column is otherwise dead space at 1280px+. */}
              <aside className="hidden xl:block lg:col-start-3 lg:row-start-1">
                <div className="sticky top-28 ml-auto max-w-[240px] rounded-lg border border-suth-border-subtle bg-suth-elevated p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-suth-accent">
                    [ Your plan ]
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-snug text-suth-text">
                    Want this written into a 12-week plan for your race?
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-suth-text-tertiary">
                    Three-minute quiz. See Week 1 for free.
                  </p>
                  <Link
                    href="/quiz"
                    className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-pill bg-suth-accent px-4 text-xs font-semibold uppercase tracking-wide text-[#0A0A0A] transition-[background] duration-fast hover:bg-suth-accent-hover"
                  >
                    Find your plan
                  </Link>
                </div>
              </aside>
            </div>
          </article>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
