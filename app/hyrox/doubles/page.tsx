import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HYROX Doubles: rules, tactics, partners",
  description:
    "Everything on racing HYROX Doubles: what the rules allow, how to split each station, handover tactics, and how to choose a partner you can actually race with.",
  alternates: { canonical: `${siteUrl()}/hyrox/doubles` },
  openGraph: {
    title: "HYROX Doubles. Suth Performance",
    description:
      "Rules, station splits and partner selection, from an Elite 15 doubles racer.",
    url: `${siteUrl()}/hyrox/doubles`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "hyrox-doubles-rules-who-does-what-and-whats-allowed",
    kicker: "The rules",
    blurb: "Both of you run all 8km. How the stations can be split, and what is fixed.",
  },
  {
    slug: "hyrox-doubles-strategy",
    kicker: "Strategy",
    blurb: "Playing to asymmetry instead of both being average at everything.",
  },
  {
    slug: "hyrox-doubles-handoff-strategy",
    kicker: "Handovers",
    blurb: "The swaps themselves, and why frequent beats tidy.",
  },
  {
    slug: "hyrox-divisions-explained-open-pro-doubles-and-relay",
    kicker: "Which division",
    blurb: "Doubles against singles and relay, and which suits a first race.",
  },
];

export default function HyroxDoublesHub() {
  return (
    <ClusterHub
      eyebrow="Doubles"
      heading="Two athletes, one race, eight shared stations."
      intro="Doubles is not an easier singles. Both of you run the full 8km and only the stations are shared, so the work comes at you faster and recovery is shorter. The upside is that you no longer have to be good at everything, and that is where doubles races are won."
      entries={ENTRIES}
      path="/hyrox/doubles"
      breadcrumbName="HYROX Doubles"
      listName="HYROX Doubles guides"
      closingHeading="Not sure doubles is the right entry?"
      closingBody="The single biggest predictor of a good doubles race is whether you and your partner run at a similar pace, because that is the part you cannot split. Work out where your own fitness sits first, then find the partner to match it."
      secondaryHref="/hyrox/guide"
      secondaryLabel="Start with the HYROX basics"
    />
  );
}
