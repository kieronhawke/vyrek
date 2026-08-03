import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/**
 * Hub for Times & Benchmarks (10 planned posts).
 *
 * Note: 23 posts in this area are marked `blocked-results` in the content
 * plan, waiting on a results data source. This hub deliberately links only
 * to what can be written without it.
 */
export const metadata: Metadata = {
  title: "HYROX times: what good looks like, and what your splits mean",
  description:
    "What counts as a good HYROX time by division and age group, how to read your splits, and why comparing your finish across venues is unreliable.",
  alternates: { canonical: `${siteUrl()}/hyrox/times` },
  openGraph: {
    title: "HYROX times and benchmarks. Suth Performance",
    description:
      "What a good time actually means, and what your splits are telling you.",
    url: `${siteUrl()}/hyrox/times`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "what-is-a-good-hyrox-time",
    kicker: "Benchmarks",
    blurb: "What good looks like, and why the raw number means little alone.",
  },
  {
    slug: "hyrox-results-how-to-find-yours-and-what-it-tells-you",
    kicker: "Your splits",
    blurb: "Where results live, and the split-spread test that diagnoses pacing.",
  },
  {
    slug: "hyrox-sub-90-secrets",
    kicker: "Breaking 90",
    blurb: "What separates a 95-minute racer from an 89-minute one.",
  },
  {
    slug: "breaking-hyrox-plateau",
    kicker: "Stuck",
    blurb: "Why the second and third races often do not improve on the first.",
  },
  {
    slug: "hyrox-race-day-pacing",
    kicker: "Pacing",
    blurb: "Station by station, and where the bill for going out hard arrives.",
  },
];

export default function HyroxTimesHub() {
  return (
    <ClusterHub
      eyebrow="Times"
      heading="A finish time means almost nothing on its own."
      intro="Divisions run different loads, age groups run in five-year bands, and venues differ in track layout, floor surface and Roxzone length. Which makes a raw number close to meaningless out of context. Your splits, and your placing inside your own bracket, are where the useful information is."
      entries={ENTRIES}
      path="/hyrox/times"
      breadcrumbName="HYROX times"
      listName="HYROX times and benchmarks"
      closingHeading="The thirty-second test"
      closingBody="Take your eight kilometre splits and find the gap between fastest and slowest. Under 30 seconds means you paced it well. Over 60 means you went out too hard, which is the most common finding in a first race, and it means your next race plan is pacing rather than fitness."
      secondaryHref="/hyrox/guide"
      secondaryLabel="The HYROX basics"
    />
  );
}
