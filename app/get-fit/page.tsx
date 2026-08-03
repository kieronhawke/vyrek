import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/**
 * Hub for the beginner clusters: Beginner FAQ, Beginner Fitness, Age & Life
 * Stage, Everyday Nutrition, Lifestyle & Context, Myths & Evidence,
 * Life-Situation Coaching, Women's Fitness, Getting Started, Habits.
 *
 * 140 planned posts in pt-posts.csv carry hub_link=/get-fit, the largest
 * single blocked group in the plan, and the route did not exist.
 */
export const metadata: Metadata = {
  title: "Getting fit: honest guides for beginners",
  description:
    "Where to start from nothing: how often to train, what actually matters, what to ignore, and why the first eight weeks are about turning up.",
  alternates: { canonical: `${siteUrl()}/get-fit` },
  openGraph: {
    title: "Getting fit. Suth Performance",
    description:
      "Honest, unglamorous guidance for people at the beginning, from a coaching team that races.",
    url: `${siteUrl()}/get-fit`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "how-to-get-fit-when-youre-starting-from-nothing",
    kicker: "Start here",
    blurb: "The first eight weeks, what to ignore, and why modest works.",
  },
  {
    slug: "how-many-times-a-week-should-you-train",
    kicker: "How often",
    blurb: "Three, usually. And what to do when the week collapses.",
  },
  {
    slug: "1-on-1-personal-training-vs-group-sessions",
    kicker: "Do you need a coach?",
    blurb: "What each format solves, and when the answer is neither.",
  },
  {
    slug: "how-much-is-a-personal-trainer-uk",
    kicker: "What it costs",
    blurb: "UK personal training costs, and what actually changes the number.",
  },
  {
    slug: "personal-trainers-for-seniors-strength-against-ageing",
    kicker: "Starting later",
    blurb: "Why progressive strength beats gentle circuits after sixty.",
  },
];

export default function GetFitHub() {
  return (
    <ClusterHub
      eyebrow="Getting fit"
      heading="Start smaller than you think. Keep going longer than you expect."
      intro="Almost every failed attempt at getting fit fails the same way: someone starts at week-twelve intensity in week one, hurts, and stops. These guides are deliberately unglamorous. Three sessions a week, an effort you could repeat tomorrow, and a plan that survives a bad week rather than one that looks impressive."
      entries={ENTRIES}
      path="/get-fit"
      breadcrumbName="Getting fit"
      listName="Getting fit guides"
      closingHeading="The habit is the hard part, not the programme"
      closingBody="If you have started and stopped before, the missing ingredient is almost never information. Five movements twice a week for a year will make you dramatically stronger, and the programme was never what stopped you. Work out honestly where you are, then pick something you can hold."
      secondaryHref="/coaching"
      secondaryLabel="Whether you need a coach"
    />
  );
}
