import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "HYROX vs CrossFit, Spartan, DEKA and running",
  description:
    "Honest comparisons between HYROX and the things people weigh it against: CrossFit, obstacle racing, DEKA, and whether to train strength or running first.",
  alternates: { canonical: `${siteUrl()}/hyrox-vs` },
  openGraph: {
    title: "HYROX vs everything else. Suth Performance",
    description:
      "How HYROX compares to CrossFit, Spartan, DEKA and pure running, and who each one actually suits.",
    url: `${siteUrl()}/hyrox-vs`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "hyrox-vs-crossfit",
    kicker: "vs CrossFit",
    blurb: "One fixed race against endless variety, and which suits which athlete.",
  },
  {
    slug: "hyrox-vs-spartan-vs-deka",
    kicker: "vs obstacle racing",
    blurb: "Spartan and DEKA compared on format, terrain and what they actually test.",
  },
  {
    slug: "crossfit-to-hyrox-transition",
    kicker: "Coming from CrossFit",
    blurb: "What transfers on day one, and the aerobic gap that decides your time.",
  },
  {
    slug: "hyrox-strength-vs-running",
    kicker: "Strength or running?",
    blurb: "Where to put your limited hours when you cannot train everything.",
  },
  {
    slug: "hyrox-meaning-what-the-word-actually-refers-to",
    kicker: "What it is not",
    blurb: "Not an acronym, not a workout style, not an obstacle race.",
  },
  {
    slug: "hyrox-vs-hydrox-the-fitness-race-vs-the-cookie",
    kicker: "Spelling",
    blurb: "Hyrox, Hydrox, and why the search results are confusing.",
  },
];

export default function HyroxVsHub() {
  return (
    <ClusterHub
      eyebrow="Comparisons"
      heading="HYROX against everything it gets confused with."
      intro="HYROX gets compared to CrossFit, obstacle racing, DEKA and plain running, usually by people trying to work out whether it suits them. These are honest comparisons rather than arguments for HYROX, including the cases where something else is the better fit."
      entries={ENTRIES}
      path="/hyrox-vs"
      breadcrumbName="HYROX comparisons"
      listName="HYROX comparison guides"
      closingHeading="The comparison that actually decides it"
      closingBody="Most of these come down to one question: do you want a fixed standard you can improve against, or do you want variety? HYROX is the same eight stations every time, which some people find motivating and others find dull by the third race. Neither answer is wrong."
      secondaryHref="/hyrox/guide"
      secondaryLabel="Start with the HYROX basics"
    />
  );
}
