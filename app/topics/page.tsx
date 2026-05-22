import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { TOPIC_HUBS } from "@/lib/topic-hubs";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox topic hubs — women, masters, doubles, first race",
  description:
    "Curated Hyrox content by audience: women's open standards, masters programmes, doubles strategy, first-race preparation. Plans, stations, blog posts, all in one place.",
  alternates: { canonical: `${siteUrl()}/topics` },
  robots: { index: true, follow: true },
};

export default function TopicsIndex() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Topic hubs</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox by audience.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Curated hubs for the most common Hyrox audiences. Each one pulls
              the right plans, stations, blog posts, and gear into a single
              page so you don&apos;t have to dig.
            </p>
          </div>
          <ul role="list" className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
            {TOPIC_HUBS.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/topics/${t.slug}`}
                  className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                >
                  <Eyebrow>{t.eyebrow}</Eyebrow>
                  <h2 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                    {t.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                    {t.hook}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                    Open hub →
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
