import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HYROX nutrition: race day and training weeks",
  description:
    "How to fuel a HYROX: race-morning timing, what to take mid-race, the weekly framework through a training block, and hydration when the hall is hot.",
  alternates: { canonical: `${siteUrl()}/hyrox/nutrition` },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(),
    title: "HYROX nutrition. Suth Performance",
    description:
      "Race-day fuelling, weekly frameworks and the 12-week timeline, without the supplement noise.",
    url: `${siteUrl()}/hyrox/nutrition`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "hyrox-race-day-nutrition",
    kicker: "Race day",
    blurb: "Breakfast timing, mid-race carbs, and recovery inside 60 minutes.",
  },
  {
    slug: "hyrox-weekly-nutrition-framework",
    kicker: "Training weeks",
    blurb: "What to eat across a normal week, built around your hard sessions.",
  },
  {
    slug: "hyrox-12-week-nutrition-timeline",
    kicker: "The full block",
    blurb: "How fuelling changes from base through to race week.",
  },
  {
    slug: "hyrox-heat-preparation",
    kicker: "Heat and hydration",
    blurb: "What changes when the hall is warm, and how to prepare for it.",
  },
  {
    slug: "hyrox-carb-loading-the-last-48-hours",
    kicker: "Race week",
    blurb: "Why it starts two days out, and why fibre comes down as carbs go up.",
  },
  {
    slug: "under-fuelling-in-hybrid-training-the-signs-people-miss",
    kicker: "Eating enough",
    blurb: "Under-eating looks exactly like overtraining, so people rest instead.",
  },
  {
    slug: "plant-based-hyrox-nutrition",
    kicker: "Plant-based",
    blurb: "What actually changes, and the one supplement that is not optional.",
  },
];

export default function HyroxNutritionHub() {
  return (
    <ClusterHub
      eyebrow="Nutrition"
      heading="Fuelling a HYROX, without the noise."
      intro="HYROX is roughly an hour to two hours of work, which puts it in an awkward middle ground: long enough that fuelling matters, short enough that most endurance advice overcomplicates it. These guides cover race day, the training week, and the full twelve-week build."
      entries={ENTRIES}
      path="/hyrox/nutrition"
      breadcrumbName="HYROX nutrition"
      listName="HYROX nutrition guides"
      closingHeading="Fuelling follows training, not the other way round"
      closingBody="Nutrition is worth getting roughly right and rarely worth obsessing over. If your race is being decided by anything on this page rather than by your running, the running is where the work is. Find out which it is."
      secondaryHref="/hyrox/guide"
      secondaryLabel="Start with the HYROX basics"
    />
  );
}
