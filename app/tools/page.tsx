import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { siteUrl } from "@/lib/blog/urls";

export const metadata: Metadata = {
  title: "Free Hyrox tools, pace calculator, station splits",
  description:
    "Free Hyrox calculators and tools. Project your finish time, plan your station splits, predict your race pace.",
  alternates: { canonical: `${siteUrl()}/tools` },
  robots: { index: true, follow: true },
};

const TOOLS = [
  {
    slug: "pace-calculator",
    name: "Hyrox pace calculator",
    description:
      "Project your Hyrox finish time from your 1 km pace and station splits. Free.",
    eyebrow: "Free · Live",
  },
];

export default function ToolsIndex() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Tools</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Free Hyrox tools.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Calculators and planners for Hyrox racers. Free, no signup.
            </p>
          </div>
          <ul role="list" className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {TOOLS.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tools/${t.slug}`}
                  className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                >
                  <Eyebrow>{t.eyebrow}</Eyebrow>
                  <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                    {t.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                    {t.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                    Open tool →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
