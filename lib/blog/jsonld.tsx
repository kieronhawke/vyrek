import { siteUrl, postUrl, categoryUrl, authorUrl, ogImageUrl, blogIndexUrl } from "@/lib/blog/urls";
import { CATEGORIES, type PostMeta } from "@/lib/blog/posts";
import type { Author } from "@/lib/blog/authors";

/**
 * JSON-LD helpers. Every blog page renders one or more of these inline so
 * Google, Bing, and modern AI crawlers can index the content precisely.
 */

export function authorPersonJsonLd(author: Author) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${authorUrl(author.slug)}#person`,
    name: author.name,
    description: author.bio,
    image: author.photo.startsWith("http")
      ? author.photo
      : `${siteUrl()}${author.photo}`,
    jobTitle: author.role,
    url: authorUrl(author.slug),
    sameAs: author.sameAs,
    affiliation: {
      "@type": "Organization",
      name: "Vyrek",
      url: siteUrl(),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}#organization`,
    name: "Vyrek",
    url: siteUrl(),
    logo: `${siteUrl()}/logo-primary.svg`,
    description:
      "Personalised Hyrox training programmes built by Elite 15 athletes.",
    sameAs: [
      "https://instagram.com/vyrek",
      "https://tiktok.com/@vyrek",
    ],
  };
}

export function breadcrumbJsonLd(
  trail: { name: string; url: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: step.url,
    })),
  };
}

export function blogPostingJsonLd(post: PostMeta) {
  const heroAbs = post.heroImage.startsWith("http")
    ? post.heroImage
    : `${siteUrl()}${post.heroImage}`;
  const og = ogImageUrl(post.slug);
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${postUrl(post.slug)}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": postUrl(post.slug),
    },
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    image: [heroAbs, og],
    datePublished: new Date(post.publishedAt).toISOString(),
    dateModified: new Date(
      post.updatedAt ?? post.publishedAt,
    ).toISOString(),
    author: {
      "@type": "Person",
      "@id": `${authorUrl(post.authorSlug)}#person`,
      name: post.author.name,
      url: authorUrl(post.authorSlug),
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl()}#organization`,
      name: "Vyrek",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl()}/logo-primary.svg`,
      },
    },
    articleSection: CATEGORIES[post.category]?.label ?? post.category,
    keywords: post.tags.join(", "),
    wordCount: post.words,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
    url: postUrl(post.slug),
  };
}

export function faqPageJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

export function collectionPageJsonLd(posts: PostMeta[]) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Vyrek Journal",
    description:
      "Hyrox training, technique, and race-day guides written by Elite 15 coaches.",
    url: blogIndexUrl(),
    inLanguage: "en-GB",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteUrl()}#website`,
      url: siteUrl(),
      name: "Vyrek",
    },
    hasPart: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: postUrl(p.slug),
      datePublished: new Date(p.publishedAt).toISOString(),
      image: p.heroImage.startsWith("http")
        ? p.heroImage
        : `${siteUrl()}${p.heroImage}`,
      author: {
        "@type": "Person",
        name: p.author.name,
      },
    })),
  };
}

/** Inline a JSON-LD block inside any server component. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
