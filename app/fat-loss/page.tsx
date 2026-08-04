import type { Metadata } from "next";
import { ClusterHub, type HubEntry } from "@/components/hyrox/cluster-hub";
import { siteUrl } from "@/lib/blog/urls";
import { ogImages } from "@/lib/seo/og";

export const revalidate = 86400;

/** Hub for the Fat Loss cluster (12 planned posts). */
export const metadata: Metadata = {
  title: "Fat loss: the four things that work",
  description:
    "What actually drives fat loss, why the scales mislead you weekly, and the long list of things that barely matter. No supplements, no fasting windows.",
  alternates: { canonical: `${siteUrl()}/fat-loss` },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(),
    title: "Fat loss guides. Suth Performance",
    description: "The four levers that matter, and the noise around them.",
    url: `${siteUrl()}/fat-loss`,
    siteName: "Suth Performance",
    type: "website",
    locale: "en_GB",
  },
  robots: { index: true, follow: true },
};

const ENTRIES: readonly HubEntry[] = [
  {
    slug: "fat-loss-what-actually-works-and-what-is-noise",
    kicker: "Start here",
    blurb: "Four levers do almost all of it. None is a supplement.",
  },
  {
    slug: "strength-training-for-beginners-the-five-movements",
    kicker: "Keep the muscle",
    blurb: "The difference between finishing lighter and finishing stronger.",
  },
  {
    slug: "how-many-times-a-week-should-you-train",
    kicker: "How often",
    blurb: "Three, plus walking, which matters more than a fourth session.",
  },
  {
    slug: "how-to-get-fit-when-youre-starting-from-nothing",
    kicker: "From nothing",
    blurb: "The first eight weeks, when attendance beats intensity.",
  },
];

export default function FatLossHub() {
  return (
    <ClusterHub
      eyebrow="Fat loss"
      heading="Four things do the work. The rest is noise."
      intro="A sustainable deficit, enough protein, strength training and daily steps. If those four are in place you will lose fat, and if they are not, no supplement, eating window or fasted session will rescue it. The unglamorous part is why the noise gets sold so hard."
      entries={ENTRIES}
      path="/fat-loss"
      breadcrumbName="Fat loss"
      listName="Fat loss guides"
      closingHeading="Stop judging it by the week"
      closingBody="Body weight moves daily with water, sodium, food volume and hormones, and those swings are routinely larger than a week of actual fat loss. Judging a fortnight by one weigh-in is the fastest route to abandoning something that was working."
      secondaryHref="/get-fit"
      secondaryLabel="Training fundamentals"
    />
  );
}
