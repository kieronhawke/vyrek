import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

/** Hub for Pain & Injury and Injury & Return (28 planned posts). */
export const metadata: Metadata = {
  title: "Recovery and injury: training around it",
  description:
    "When to train through a niggle and when to stop, what modification actually means, the red flags that need assessing, and how to come back without repeating it.",
  alternates: { canonical: `${siteUrl()}/recovery` },
  openGraph: {
    title: "Recovery and injury guides. Suth Performance",
    description:
      "A usable framework for the grey area between an ache and an injury.",
    url: `${siteUrl()}/recovery`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "training-with-a-niggle-when-to-push-and-when-to-stop",
    kicker: "Start here",
    blurb: "The grey-area framework, and the red flags that mean stop.",
  },
  {
    slug: "hyrox-recovery-and-sleep",
    kicker: "Recovery",
    blurb: "Sleep does more than anything else, and gets the least attention.",
  },
  {
    slug: "hyrox-recovery-between-races",
    kicker: "Between races",
    blurb: "How long to leave it, and what the gap is actually for.",
  },
  {
    slug: "how-many-times-a-week-should-you-train",
    kicker: "Load",
    blurb: "Signs you are training too often, and why the fix is a lighter week.",
  },
  {
    slug: "common-hyrox-injuries-and-the-training-that-prevents-them",
    kicker: "Injury",
    blurb: "Where they cluster, and the load management that prevents most of them.",
  },
  {
    slug: "hyrox-deload-week-when-to-take-one-and-what-to-do",
    kicker: "Deload",
    blurb: "Not a rest week and not a taper. What to cut and what to keep.",
  },
  {
    slug: "doms-after-hyrox-what-helps-and-what-does-not",
    kicker: "Soreness",
    blurb: "Why it is your quads, and which recovery products are worth the money.",
  },
];

export default function RecoveryHub() {
  return (
    <ClusterHub
      eyebrow="Recovery"
      heading="Most niggles need modified loading, not rest."
      intro="Advice about training with pain tends to be either 'listen to your body', which means nothing, or 'push through', which is how a niggle becomes an injury. These guides sit in the grey area in between, with a clear list of the symptoms where the honest answer is to stop reading and go and see someone."
      entries={ENTRIES}
      path="/recovery"
      breadcrumbName="Recovery"
      listName="Recovery and injury guides"
      closingHeading="Six weeks unchanged is your answer"
      closingBody="A niggle improving week on week is resolving and you can keep working around it. One that has been identical for six weeks is not, and another six weeks of the same will not change that. A physiotherapist assessment is one of the better-value things in this sport: a single session often resolves weeks of guessing."
      secondaryHref="/get-fit"
      secondaryLabel="Training fundamentals"
    />
  );
}
