import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { COMPARISONS } from "@/lib/hyrox-comparisons";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox compared. CrossFit, Spartan, marathon, triathlon, F45",
  description:
    "Honest comparisons of Hyrox vs other fitness disciplines. Pick the right race or training programme for you.",
  alternates: { canonical: `${siteUrl()}/compare` },
  robots: { index: true, follow: true },
};

export default function CompareIndex() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Compare</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox vs everything else.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Honest comparisons of Hyrox against the other major endurance and
              hybrid disciplines. Use them to pick the right race, or to make
              the case to your gym buddy.
            </p>
          </div>
          <ul role="list" className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {COMPARISONS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/compare/${c.slug}`}
                  className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                >
                  <Eyebrow>{c.eyebrow}</Eyebrow>
                  <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                    {c.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                    {c.hook}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                    Read the comparison →
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
