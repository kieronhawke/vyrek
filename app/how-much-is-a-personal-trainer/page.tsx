import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/**
 * Hub for PT Cost & Value and Coaching Transparency (19 planned posts).
 *
 * THE NO-PRICING POLICY APPLIES HERE HARDEST. This is the cluster whose whole
 * subject is cost, and it must still never publish a Suth coaching price.
 * Quoting third-party market rates is explicitly fine; naming ours is not.
 * Every path ends at the free consultation. See HARD-RULES.md and the
 * enforcement in scripts/proof-posts.mjs.
 */
export const metadata: Metadata = {
  title: "What coaching costs, and what you are actually paying for",
  description:
    "Honest guides to what personal training and online coaching cost in the UK, what changes the number, and how to tell whether the premium is buying you anything.",
  alternates: { canonical: `${siteUrl()}/how-much-is-a-personal-trainer` },
  openGraph: {
    title: "What coaching costs. Suth Performance",
    description:
      "UK coaching costs, what drives them, and whether the premium buys anything.",
    url: `${siteUrl()}/how-much-is-a-personal-trainer`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "how-much-is-a-personal-trainer-uk",
    kicker: "UK costs",
    blurb: "What personal training costs, and what actually moves the number.",
  },
  {
    slug: "hyrox-cheapest-vs-best",
    kicker: "Tier by tier",
    blurb: "Free PDFs through to 1:1, and what each one genuinely buys.",
  },
  {
    slug: "group-personal-training-online-cheaper-and-it-works",
    kicker: "The cheaper option",
    blurb: "Where shared coaching works, and how to spot a plan in disguise.",
  },
  {
    slug: "1-on-1-personal-training-vs-group-sessions",
    kicker: "Is 1:1 worth it?",
    blurb: "When paying for attention is the right call, and when it is waste.",
  },
  {
    slug: "how-much-does-hyrox-cost",
    kicker: "Racing costs",
    blurb: "Entry, travel and kit, before you add any coaching at all.",
  },
];

export default function CoachingCostHub() {
  return (
    <ClusterHub
      eyebrow="Cost and value"
      heading="What coaching costs, and what the premium actually buys."
      intro="Cost is the question people are most often too embarrassed to ask and most likely to be misled about. These guides quote real market ranges, explain what drives them, and are honest about the cases where the expensive option buys accountability rather than better programming."
      entries={ENTRIES}
      path="/how-much-is-a-personal-trainer"
      breadcrumbName="Cost and value"
      listName="Coaching cost guides"
      closingHeading="Why our own prices are not on this site"
      closingBody="We do not publish coaching prices anywhere. Every coached path starts with a free conversation, so the recommendation is not shaped by what you can afford before anyone has established what you actually need, and so nobody buys a tier they do not require. If price is the deciding factor for you, ask on that call and you will get a straight answer."
      secondaryHref="/coaching"
      secondaryLabel="Choosing a coach"
    />
  );
}
