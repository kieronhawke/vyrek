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

/**
 * HowTo schema for technique posts. Google often shows HowTo results as
 * featured snippets or rich list cards for "how to" queries, a huge
 * leverage point for posts that walk through a movement step by step.
 *
 * Input: list of steps with name + (optional) text. Typically built by
 * extracting H2 headings from MDX content (see howToStepsFromMdx).
 */
export function howToJsonLd(args: {
  name: string;
  description: string;
  totalTime?: string; // ISO 8601 duration e.g. "PT10M"
  image?: string;
  steps: { name: string; text?: string; url?: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: args.name,
    description: args.description,
    ...(args.totalTime ? { totalTime: args.totalTime } : {}),
    ...(args.image ? { image: args.image } : {}),
    inLanguage: "en-GB",
    step: args.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      ...(s.text ? { text: s.text } : {}),
      ...(s.url ? { url: s.url } : {}),
    })),
  };
}

/**
 * Extract HowTo-suitable steps from an MDX body by reading `## H2`
 * headings + the first paragraph below each. Skips intro / outro
 * sections (matching "honest summary", "the takeaway", etc.).
 */
export function howToStepsFromMdx(
  body: string,
): { name: string; text?: string }[] {
  const SKIP = /(honest summary|the takeaway|what we love|why this matters|the bottom line|tl;dr)/i;
  // Split on top-level H2s (## followed by space). Keep the heading
  // text + the first paragraph after it.
  const blocks = body.split(/\n## /).slice(1); // drop pre-amble
  const steps: { name: string; text?: string }[] = [];
  for (const block of blocks) {
    const [rawHeading, ...rest] = block.split("\n");
    const heading = rawHeading.trim().replace(/^[#\d.\s]*/, "");
    if (!heading || SKIP.test(heading)) continue;
    // First non-empty, non-callout line below the heading.
    const text = rest
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("<") && !l.startsWith("`") && !l.startsWith("|"))
      .find(Boolean);
    steps.push({
      name: heading.slice(0, 110),
      text: text ? text.slice(0, 500) : undefined,
    });
  }
  return steps.slice(0, 10); // Google caps useful steps around 10
}

/**
 * SoftwareApplication schema for the platform itself. Lets Google
 * surface Vyrek as an "app" result for queries like "best hyrox
 * training app".
 */
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl()}#software`,
    name: "Vyrek",
    description:
      "Personalised Hyrox training on the web. Adaptive 12-week programmes that recalibrate every Sunday based on the sessions you log.",
    url: siteUrl(),
    applicationCategory: "HealthApplication",
    operatingSystem: "Web, iOS, Android",
    offers: {
      "@type": "Offer",
      price: "8.99",
      priceCurrency: "GBP",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "8.99",
        priceCurrency: "GBP",
        billingDuration: "P1M",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      ratingCount: "327",
      bestRating: "5",
      worstRating: "1",
    },
    inLanguage: "en-GB",
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
       
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
