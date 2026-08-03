import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/** Hub for Beginner Strength and Goal Training (22 planned posts). */
export const metadata: Metadata = {
  title: "Strength training: the five movements",
  description:
    "Squat, hinge, push, pull, carry. How to start strength training, how heavy to go, how to progress, and how to tell it is working without using the mirror.",
  alternates: { canonical: `${siteUrl()}/strength` },
  openGraph: {
    title: "Strength training guides. Suth Performance",
    description: "The five patterns, how to load them, and how to progress.",
    url: `${siteUrl()}/strength`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "strength-training-for-beginners-the-five-movements",
    kicker: "Start here",
    blurb: "Squat, hinge, push, pull, carry. Everything else is a variation.",
  },
  {
    slug: "how-many-times-a-week-should-you-train",
    kicker: "Frequency",
    blurb: "Three, for most goals. And why more is usually worse.",
  },
  {
    slug: "personal-trainers-for-seniors-strength-against-ageing",
    kicker: "Starting later",
    blurb: "Progressive load beats gentle circuits, at any age.",
  },
  {
    slug: "hyrox-strength-vs-running",
    kicker: "Strength or running?",
    blurb: "Where to put your hours when you cannot train everything.",
  },
];

export default function StrengthHub() {
  return (
    <ClusterHub
      eyebrow="Strength"
      heading="Five movements. Everything else is a variation."
      intro="Strength training looks complicated from outside and is not. A programme built on the five patterns, done twice a week and progressed sensibly, will make you dramatically stronger. Changing the programme every three weeks is the most common reason it does not."
      entries={ENTRIES}
      path="/strength"
      breadcrumbName="Strength"
      listName="Strength training guides"
      closingHeading="Progress is the load going up, not the mirror"
      closingBody="Track your sets, reps and weights. Memory is unreliable, and a notebook is the cheapest coaching you will ever buy. If the weights are going up and the same load feels easier, it is working, whatever the mirror says this week."
      secondaryHref="/get-fit"
      secondaryLabel="If you are starting from nothing"
    />
  );
}
