import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { GEAR_GUIDES } from "@/lib/hyrox-gear";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox gear guides, shoes, gloves, knee sleeves, belts, socks",
  description:
    "Honest Hyrox gear guides. What kit actually helps, what's marketing, and what experienced racers ignore. Independent reviews from an Elite 15 coach.",
  alternates: { canonical: `${siteUrl()}/hyrox/gear` },
  robots: { index: true, follow: true },
};

export default function GearIndex() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Gear</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox gear, honestly.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              No affiliate-stuffed listicles. What helps, what doesn&apos;t, and
              what experienced racers actually wear.
            </p>
          </div>
          <ul role="list" className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {GEAR_GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/hyrox/gear/${g.slug}`}
                  className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                >
                  <Eyebrow>{g.eyebrow}</Eyebrow>
                  <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                    {g.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                    {g.summary}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                    Read the guide →
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
