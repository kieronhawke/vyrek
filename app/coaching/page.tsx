import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/**
 * Hub for the coaching clusters (Online Coaching, PT FAQ, Consumer Guides,
 * Process & Proof, Coaching Philosophy, Vetting a Coach, Expectations).
 *
 * 76 planned posts in docs/content-plan/pt-posts.csv carry hub_link=/coaching
 * and the route did not exist, so none of them could meet the "1 link to the
 * cluster hub" publish requirement.
 *
 * No-pricing policy applies here more than anywhere: this hub must never
 * carry a Suth coaching price. Every coached path ends at a free
 * consultation. See docs/strategy/rules/HARD-RULES.md.
 */
export const metadata: Metadata = {
  title: "Coaching: how to choose one, and whether you need one",
  description:
    "Honest guides to personal training and online coaching: comparing formats, what good coaching actually includes, how to vet a coach, and when you do not need one.",
  alternates: { canonical: `${siteUrl()}/coaching` },
  openGraph: {
    title: "Coaching guides. Suth Performance",
    description:
      "How to choose a coach, what good coaching includes, and when you are better off without one.",
    url: `${siteUrl()}/coaching`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "1-on-1-personal-training-vs-group-sessions",
    kicker: "Formats",
    blurb: "They solve different problems. Which one matches yours.",
  },
  {
    slug: "group-personal-training-online-cheaper-and-it-works",
    kicker: "Online group",
    blurb: "What it includes, where it fails, and five questions before you pay.",
  },
  {
    slug: "home-personal-trainers-how-home-sessions-work",
    kicker: "At home",
    blurb: "What a coach can carry through your door, and what needs a gym.",
  },
  {
    slug: "personal-trainers-for-seniors-strength-against-ageing",
    kicker: "After sixty",
    blurb: "Progressive strength, not gentle circuits. And when to see a GP first.",
  },
  {
    slug: "how-much-is-a-personal-trainer-uk",
    kicker: "Cost",
    blurb: "What personal training costs in the UK, and what changes the number.",
  },
];

export default function CoachingHub() {
  return (
    <ClusterHub
      eyebrow="Coaching"
      heading="How to choose a coach, and whether you need one."
      intro="Most coaching advice is written by people selling coaching. These guides try to be useful instead: what each format actually solves, how to tell real coaching from a plan with a group chat, and the cases where the honest answer is that you do not need a coach at all."
      entries={ENTRIES}
      path="/coaching"
      breadcrumbName="Coaching"
      listName="Coaching guides"
      closingHeading="Start with what stopped you last time"
      closingBody="The most useful question is not what you want to achieve, it is what went wrong before. If you failed through not knowing what to do, you need programming. If you failed through not turning up, you need accountability. Those are different products, and buying the wrong one is the most common reason people stop within three months."
      secondaryHref="/personal-trainer"
      secondaryLabel="Find coaching near you"
    />
  );
}
