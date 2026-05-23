import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { PLAN_TEMPLATES } from "@/lib/plan-templates";
import { siteUrl } from "@/lib/blog/urls";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Hyrox training plans, by goal time and athlete",
  description:
    "Personalised Hyrox training plans by goal time (sub-60, sub-75, sub-90, sub-100) and audience (beginner, women, over-40, doubles). 12 weeks, dated, Elite 15 programming.",
  alternates: { canonical: `${siteUrl()}/plans` },
  robots: { index: true, follow: true },
};

export default function PlansIndex() {
  const goalTime = PLAN_TEMPLATES.filter((p) => p.kind === "goal-time");
  const audience = PLAN_TEMPLATES.filter((p) => p.kind === "audience");

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Eyebrow>Training plans</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Hyrox plans by goal and athlete.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
              Every Vyrek subscription includes all programmes. The plans below
              are example shapes, start the quiz and we&apos;ll build the
              version that fits your race date, equipment, and current fitness.
            </p>
            <div className="mt-8">
              <CtaButton href="/quiz" size="md">
                Find your plan →
              </CtaButton>
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <Eyebrow>By goal time</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Pick your target.
            </h2>
            <ul role="list" className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {goalTime.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/plans/${p.slug}`}
                    className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                  >
                    <Eyebrow>{p.eyebrow}</Eyebrow>
                    <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                      {p.hook}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                      Read the plan →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto mt-20 max-w-5xl border-t border-vyrek-border-subtle pt-12">
            <Eyebrow>By athlete</Eyebrow>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl">
              Pick your starting point.
            </h2>
            <ul role="list" className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {audience.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/plans/${p.slug}`}
                    className="lift-on-hover shimmer block rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                  >
                    <Eyebrow>{p.eyebrow}</Eyebrow>
                    <h3 className="mt-3 text-xl font-black tracking-[-0.04em] text-vyrek-text">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-vyrek-text-secondary">
                      {p.hook}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-vyrek-accent">
                      Read the plan →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
