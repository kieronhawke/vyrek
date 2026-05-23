import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Breadcrumb } from "@/components/blog/breadcrumb";
import { AuthorCard } from "@/components/blog/author-card";
import { PostCard } from "@/components/blog/post-card";
import { listPostsByAuthor } from "@/lib/blog/posts";
import { AUTHORS } from "@/lib/blog/authors";
import { authorUrl, blogIndexUrl, siteUrl } from "@/lib/blog/urls";
import {
  authorPersonJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  JsonLd,
} from "@/lib/blog/jsonld";

export const revalidate = 3600;

export function generateStaticParams() {
  return Object.keys(AUTHORS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = AUTHORS[slug];
  if (!author) return { title: "Not found" };
  return {
    title: `${author.name}. Vyrek Journal`,
    description: author.bio,
    alternates: { canonical: authorUrl(slug) },
    openGraph: {
      title: `${author.name}. Vyrek Journal`,
      description: author.bio,
      url: authorUrl(slug),
      siteName: "Vyrek",
      type: "profile",
      locale: "en_GB",
    },
    robots: { index: true, follow: true },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = AUTHORS[slug];
  if (!author) notFound();
  const posts = await listPostsByAuthor(slug);

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={authorPersonJsonLd(author)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: siteUrl() },
          { name: "Journal", url: blogIndexUrl() },
          { name: author.name, url: authorUrl(slug) },
        ])}
      />
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <Breadcrumb
            trail={[
              { name: "Home", url: "/" },
              { name: "Journal", url: "/blog" },
              { name: author.name, url: `/blog/author/${slug}` },
            ]}
          />

          <div className="mt-8 max-w-3xl">
            <AuthorCard author={author} showLink={false} />
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
            <p className="mt-12 text-base text-vyrek-text-secondary">
              No posts from this author yet.
            </p>
          )}
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
