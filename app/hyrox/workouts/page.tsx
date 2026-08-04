import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HYROX workouts: sessions by station",
  description:
    "Complete HYROX sessions: five prescribed workouts for each of the eight stations, plus benchmarks to test whether they are working.",
  alternates: { canonical: `${siteUrl()}/hyrox/workouts` },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(),
    title: "HYROX workouts. Suth Performance",
    description:
      "Prescribed sessions for every station, built on what the race actually demands.",
    url: `${siteUrl()}/hyrox/workouts`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "15-hyrox-workouts-for-every-fitness-level",
    kicker: "Start here",
    blurb: "Fifteen sessions by level, most needing almost no equipment.",
  },
  {
    slug: "hyrox-exercises-the-full-movement-list-and-what-they-train",
    kicker: "The movements",
    blurb: "All nine, what each trains, and substitutes if your gym lacks kit.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-sled-push",
    kicker: "Sled push",
    blurb: "Position work, and the compromised push that actually transfers.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-sled-pull",
    kicker: "Sled pull",
    blurb: "Rehearsing inside the Racers Box, and the grip debt it creates.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-skierg",
    kicker: "SkiErg",
    blurb: "Split discipline, because pacing station one is worth more than seconds.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-burpee-broad-jump",
    kicker: "Burpee broad jumps",
    blurb: "Repeatable cadence, and why shorter jumps are legal and faster.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-rowing",
    kicker: "Rowing",
    blurb: "Training your heart rate to come down during a station.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-farmers-carry",
    kicker: "Farmers carry",
    blurb: "Every session downstream of the sled pull, because that is the race.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-sandbag-lunges",
    kicker: "Sandbag lunges",
    blurb: "Exposure rather than load. Add metres, not kilos.",
  },
  {
    slug: "5-workouts-that-build-a-faster-hyrox-wall-balls",
    kicker: "Wall balls",
    blurb: "All of it done tired, because the station arrives last.",
  },
  {
    slug: "hyrox-workout-explained",
    kicker: "The race as a workout",
    blurb: "What a HYROX actually asks of you, session by session.",
  },
  {
    slug: "hyrox-training-week-structure",
    kicker: "The week",
    blurb: "How to lay out runs, strength and station work across seven days.",
  },
  {
    slug: "hyrox-taper-week-protocol",
    kicker: "Taper",
    blurb: "What to cut and what to keep in the final week.",
  },
  {
    slug: "hyrox-offseason-training",
    kicker: "Offseason",
    blurb: "What to do between races so you start the next block ahead.",
  },
  {
    slug: "hyrox-at-home-simulations",
    kicker: "At home",
    blurb: "Running a useful simulation without a sled or the ergs.",
  },
  {
    slug: "hyrox-first-5km-strategy",
    kicker: "Pacing",
    blurb: "The opening half decides the race more than the closing half.",
  },
  {
    slug: "hyrox-exercise-order-why-the-sequence-is-the-strategy",
    kicker: "Sequence",
    blurb: "Why the fixed order is the strategy, not just the running order.",
  },
];

export default function HyroxWorkoutsHub() {
  return (
    <ClusterHub
      eyebrow="Workouts"
      heading="Sessions built on what the race actually demands."
      intro="Every session here is derived from the official movement standards rather than from general conditioning. That matters because the stations couple: the sled pull spends the grip the farmers carry needs, and wall balls arrive after everything. Training them in isolation improves the wrong things."
      entries={ENTRIES}
      path="/hyrox/workouts"
      breadcrumbName="HYROX workouts"
      listName="HYROX workout guides"
      closingHeading="Train the limiter, not the favourite"
      closingBody="Most athletes train the station they enjoy and avoid the one costing them time. For the majority of racers the answer is neither: it is running, which decides more of your finish than any station on this page. Find out which applies to you before you plan a block."
      secondaryHref="/hyrox/stations"
      secondaryLabel="Station-by-station technique"
    />
  );
}
