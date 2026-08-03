import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { listPostMeta } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/**
 * The hub for the Fundamentals cluster.
 *
 * 115 rows in docs/content-plan/hyrox-posts.csv carry `hub_link=/hyrox/guide`
 * across six clusters (Fundamentals & FAQ, HYROX FAQ, Glossary, Women &
 * Demographics, Race Execution, Mental & Race Craft), and every one of them
 * has "one link to the cluster hub" as a publish requirement in
 * docs/content-plan/post-template-spec.md. The route did not exist, so those
 * links had nowhere to point.
 *
 * Deliberately built from live posts rather than a hand-maintained list: the
 * cluster grows by roughly 100 posts, and a hardcoded array would rot on the
 * first batch.
 */
export const metadata: Metadata = {
  title: "The HYROX guide: format, weights, divisions",
  description:
    "Everything a first-time HYROX racer needs in one place. The format, the eight stations, official weights by division, age groups, and how long to train.",
  alternates: { canonical: `${siteUrl()}/hyrox/guide` },
  openGraph: {
    title: "The HYROX guide. Suth Performance",
    description:
      "The format, the weights, the divisions and the training timeline, from an Elite 15 coaching team.",
    url: `${siteUrl()}/hyrox/guide`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

/** Ordered entry points. Slugs are asserted against live posts at build. */
const CORE = [
  {
    slug: "what-is-hyrox-the-complete-beginners-explanation",
    kicker: "Start here",
    blurb: "The format, the eight stations, and a realistic first-race time.",
  },
  {
    slug: "hyrox-race-format-distances-order-and-how-the-race-flows",
    kicker: "The format",
    blurb: "8km of running, eight stations, and what the sequence does to you.",
  },
  {
    slug: "hyrox-meaning-what-the-word-actually-refers-to",
    kicker: "The name",
    blurb: "Not an acronym. What the word refers to, and the common misspellings.",
  },
  {
    slug: "hyrox-divisions-explained-open-pro-doubles-and-relay",
    kicker: "Divisions",
    blurb: "Open, Pro, Doubles and Relay, and which one to enter first.",
  },
  {
    slug: "hyrox-station-weights-explained",
    kicker: "Weights",
    blurb: "Every load by division, straight from the 26/27 rulebook.",
  },
  {
    slug: "hyrox-womens-weights-complete-station-standards",
    kicker: "Women's standards",
    blurb: "Open and Pro loads, and the two figures most sites get wrong.",
  },
  {
    slug: "hyrox-age-groups-categories-cut-offs-and-what-they-mean-for-you",
    kicker: "Age groups",
    blurb: "Five-year bands, and why the weights never scale with age.",
  },
  {
    slug: "hyrox-exercises-the-full-movement-list-and-what-they-train",
    kicker: "The movements",
    blurb: "All nine, what each one costs, and substitutes if your gym lacks kit.",
  },
  {
    slug: "how-long-do-you-need-to-train-for-hyrox",
    kicker: "Timeline",
    blurb: "12 weeks, 16, or six months. How to tell which one you are.",
  },
  {
    slug: "15-hyrox-workouts-for-every-fitness-level",
    kicker: "Sessions",
    blurb: "Fifteen workouts grouped by level, most needing almost no equipment.",
  },
  {
    slug: "hyrox-doubles-rules-who-does-what-and-whats-allowed",
    kicker: "Doubles",
    blurb: "Both of you run all 8km. How to split the stations, and pick a partner.",
  },
  {
    slug: "hyrox-uk-calendar-2026",
    kicker: "Race dates",
    blurb: "Every UK and Ireland race, with the date your build should start.",
  },
  {
    slug: "what-does-hyrox-stand-for",
    kicker: "The name",
    blurb: "Whether it is an acronym, and what it actually means.",
  },
  {
    slug: "first-hyrox-preparation-guide",
    kicker: "Your first race",
    blurb: "Everything to sort before race day, in the order it matters.",
  },
  {
    slug: "how-do-hyrox-waves-and-start-times-work",
    kicker: "Waves",
    blurb: "How start times are allocated, and what a wave means for your race.",
  },
  {
    slug: "womens-hyrox-strategy-weights-pacing",
    kicker: "Women's racing",
    blurb: "The women's loads, and how the pacing differs in practice.",
  },
  {
    slug: "hyrox-world-championship-qualifying",
    kicker: "Qualifying",
    blurb: "How the World Championship pathway actually works.",
  },
] as const;

export default async function HyroxGuideIndex() {
  const posts = await listPostMeta();
  const bySlug = new Map(posts.map((p) => [p.slug, p]));

  // A hub with a dead row is worse than no hub, so drop anything not live.
  const entries = CORE.map((c) => ({ ...c, post: bySlug.get(c.slug) })).filter(
    (c): c is (typeof CORE)[number] & { post: NonNullable<ReturnType<typeof bySlug.get>> } =>
      Boolean(c.post),
  );

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "The HYROX guide",
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
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
        name: "HYROX guide",
        item: `${siteUrl()}/hyrox/guide`,
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
            <Eyebrow>The guide</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Everything you need before your first HYROX.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              HYROX is 8km of running split into eight 1km segments, each one
              followed by a standardised workout station. The format is
              identical at every event in the world, which means it can be
              learned once. Every weight and distance in these guides is read
              from the official 26/27 rulebook, not from other coverage.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
              <Link
                href="/hyrox/stations"
                className="text-sm font-medium text-suth-text-secondary underline underline-offset-4 hover:text-suth-text"
              >
                Station-by-station technique
              </Link>
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <ol role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {entries.map((e) => (
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
              Still deciding whether to enter?
            </h2>
            <p className="mt-3 text-base leading-relaxed text-suth-text-secondary">
              You do not need to qualify, and you do not need to be an athlete.
              The Open division is designed for people who train in a gym and
              can run. The quiz gives you an honest read on where you sit
              before you commit to a date.
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
