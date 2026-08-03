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
  /* Was "${author.name}. Suth Performance Journal", which the root layout's
     " · Suth Performance" template turned into the brand three times over on
     the team page, at 70 characters. */
  return {
    title: `Posts by ${author.name}`,
    description: author.bio,
    alternates: { canonical: authorUrl(slug) },
    openGraph: {
      title: `Posts by ${author.name}`,
      description: author.bio,
      url: authorUrl(slug),
      siteName: "Suth Performance",
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

          {/* The page had no h1 at all: the author card leads with an h2 and
              the post grid adds eleven more, so the document started at
              level two. Names the page's actual subject rather than
              repeating the name the card already shows. */}
          <h1 className="mt-8 text-3xl font-black tracking-[-0.04em] text-suth-text md:text-4xl">
            Posts by {author.name}
          </h1>

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
            <p className="mt-12 text-base text-suth-text-secondary">
              No posts from this author yet.
            </p>
          )}
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
