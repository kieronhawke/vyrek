import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { listPostMeta } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/blog/urls";

/**
 * Shared renderer for cluster hubs.
 *
 * The content plan gives every post a `hub_link`, and post-template-spec.md
 * makes "1 link to the cluster hub" a publish requirement. An audit on
 * 2026-08-03 found 15 of 21 hub URLs returning 404, blocking ~538 planned
 * posts. Rather than hand-build each hub as a bespoke page, this takes the
 * shape /hyrox/guide established and makes the rest cheap.
 *
 * Entries are matched against live posts and anything missing is dropped, so
 * a hub can be created before its cluster is fully written without ever
 * rendering a dead link.
 */
export type HubEntry = {
  slug: string;
  kicker: string;
  blurb: string;
};

export type ClusterHubProps = {
  eyebrow: string;
  heading: string;
  intro: string;
  entries: readonly HubEntry[];
  path: string;
  breadcrumbName: string;
  listName: string;
  closingHeading: string;
  closingBody: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export async function ClusterHub({
  eyebrow,
  heading,
  intro,
  entries,
  path,
  breadcrumbName,
  listName,
  closingHeading,
  closingBody,
  secondaryHref,
  secondaryLabel,
}: ClusterHubProps) {
  const posts = await listPostMeta();
  const bySlug = new Map(posts.map((p) => [p.slug, p]));

  // A hub with a dead row is worse than no hub.
  const live = entries
    .map((e) => ({ ...e, post: bySlug.get(e.slug) }))
    .filter((e): e is HubEntry & { post: NonNullable<typeof e.post> } =>
      Boolean(e.post),
    );

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: live.length,
    itemListElement: live.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl()}/blog/${e.slug}`,
      name: e.post.title,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: breadcrumbName,
        item: `${siteUrl()}${path}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>{eyebrow}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              {heading}
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
              {secondaryHref && secondaryLabel ? (
                <Link
                  href={secondaryHref}
                  className="text-sm font-medium text-suth-text-secondary underline underline-offset-4 hover:text-suth-text"
                >
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <ol role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {live.map((e) => (
                <li key={e.slug}>
                  <Link
                    href={`/blog/${e.slug}`}
                    className="lift-on-hover shimmer block h-full rounded-lg border border-suth-border bg-suth-elevated p-6"
                  >
                    <span className="shrink-0 whitespace-nowrap">
                      <Eyebrow>{e.kicker}</Eyebrow>
                    </span>
                    <h2 className="mt-3 text-lg font-bold leading-snug tracking-[-0.02em] text-suth-text">
                      {e.post.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                      {e.blurb}
                    </p>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-xl font-bold tracking-[-0.02em] text-suth-text">
              {closingHeading}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-suth-text-secondary">
              {closingBody}
            </p>
            <div className="mt-6">
              <CtaButton href="/quiz" size="md">
                Take the assessment →
              </CtaButton>
            </div>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
