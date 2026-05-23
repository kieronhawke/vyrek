import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { Breadcrumb } from "@/components/blog/breadcrumb";
import { PostCard } from "@/components/blog/post-card";
import { PostFinalCta } from "@/components/blog/post-final-cta";
import {
  listPostsByCategory,
  CATEGORIES,
  type Category,
} from "@/lib/blog/posts";
import {
  categoryUrl,
  siteUrl,
  blogIndexUrl,
} from "@/lib/blog/urls";
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  JsonLd,
} from "@/lib/blog/jsonld";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = CATEGORIES[slug as Category];
  if (!cat) return { title: "Not found" };
  const title = `${cat.label}. Vyrek Journal`;
  return {
    title,
    description: cat.description,
    alternates: { canonical: categoryUrl(slug) },
    openGraph: {
      title,
      description: cat.description,
      url: categoryUrl(slug),
      siteName: "Vyrek",
      type: "website",
      locale: "en_GB",
    },
    twitter: { card: "summary", title, description: cat.description },
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = CATEGORIES[slug as Category];
  if (!cat) notFound();
  const posts = await listPostsByCategory(slug as Category);

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: siteUrl() },
          { name: "Journal", url: blogIndexUrl() },
          { name: cat.label, url: categoryUrl(slug) },
        ])}
      />
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <Breadcrumb
            trail={[
              { name: "Home", url: "/" },
              { name: "Journal", url: "/blog" },
              { name: cat.label, url: `/blog/category/${slug}` },
            ]}
          />
          <div className="mt-6 max-w-3xl">
            <Eyebrow>{cat.label}</Eyebrow>
            <h1 className="mt-3 text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl">
              {cat.label} guides
            </h1>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              {cat.description}
            </p>
          </div>

          {posts.length ? (
            <ul
              role="list"
              className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3"
            >
              {posts.map((p) => (
                <li key={p.slug}>
                  <PostCard post={p} />
                </li>
              ))}
            </ul>
          ): (
            <p className="mt-10 text-base text-vyrek-text-secondary">
              No posts in this category yet, check back soon.
            </p>
          )}

          <div className="mt-16">
            <PostFinalCta />
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
