import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

export const revalidate = 86400;

/** Hub for Beginner Running (8 planned posts). */
export const metadata: Metadata = {
  title: "Running for beginners: start slower",
  description:
    "Most people who hate running have only ever run too fast. The conversational pace test, run-walk structure, and what changes after eight weeks.",
  alternates: { canonical: `${siteUrl()}/running` },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(),
    title: "Running guides. Suth Performance",
    description: "Why easy running is the point, and how to build it.",
    url: `${siteUrl()}/running`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "how-to-start-running-when-you-hate-running",
    kicker: "Start here",
    blurb: "The conversational pace test, and an eight-week run-walk build.",
  },
  {
    slug: "how-many-times-a-week-should-you-train",
    kicker: "Frequency",
    blurb: "How often to run, and what to do when the week collapses.",
  },
  {
    slug: "hyrox-strength-vs-running",
    kicker: "Running or strength?",
    blurb: "Where the hours go when you cannot do everything.",
  },
];

export default function RunningHub() {
  return (
    <ClusterHub
      eyebrow="Running"
      heading="Almost everyone who hates running has only run too fast."
      intro="You should be able to speak a full sentence while running. Not gasp three words, a whole sentence. Most beginners never try it at that pace, redline within three minutes, and decide they are not built for running. At an easy pace it is a different activity."
      entries={ENTRIES}
      path="/running"
      breadcrumbName="Running"
      listName="Running guides"
      closingHeading="Weeks five to eight are where it changes"
      closingBody="Running stops being something you endure and becomes something you do, usually somewhere between weeks five and eight of easy running three times a week. The people who quit at week three never reach it, and week three is exactly when it feels most like admin."
      secondaryHref="/get-fit"
      secondaryLabel="If you are starting from nothing"
    />
  );
}
