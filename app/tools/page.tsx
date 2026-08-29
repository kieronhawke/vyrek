import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { siteUrl } from "@/lib/blog/urls";

export const metadata: Metadata = {
  title: "Free HYROX tools, calculators and race data",
  description:
    "Every free HYROX tool on Suth Performance: pace and split calculators, a race simulator, full race reports from real results, world records, season bests and the whole race calendar. No signup.",
  alternates: { canonical: `${siteUrl()}/tools` },
  robots: { index: true, follow: true },
};

/**
 * THIS PAGE PROMISED TOOLS AND LISTED ONE.
 *
 * "Free Hyrox tools", plural, above a single pace calculator — while the
 * results section quietly grew a dozen more that nothing outside it linked
 * to. The footer sends people here, so here is where they concluded there
 * was nothing to see.
 *
 * Grouped by what somebody has actually come to do rather than by which
 * part of the codebase owns the route, because the split between the
 * marketing site and the results section is our problem and not theirs.
 * Every route below was checked to return 200 before it was listed: a free
 * tools page that links to a 404 is worse than one that lists nothing.
 */

type Tool = { href: string; name: string; detail: string; tag?: string };

const GROUPS: { title: string; lede: string; tools: Tool[] }[] = [
  {
    title: "Work out your race",
    lede: "Before you enter, or before you toe the line.",
    tools: [
      {
        href: "/tools/pace-calculator",
        name: "Pace calculator",
        detail:
          "Project your finish from your 1 km pace and station splits, and see where the time actually goes.",
        tag: "Calculator",
      },
      {
        href: "/tools/good-hyrox-time",
        name: "What counts as a good time",
        detail:
          "Your time against everybody else who has raced your division, rather than against a number somebody made up.",
        tag: "Benchmark",
      },
      {
        href: "/simulator",
        name: "Race simulator",
        detail:
          "Build a target race station by station and find out what it asks of you.",
        tag: "Planner",
      },
    ],
  },
  {
    title: "Understand a race you have run",
    lede: "Every result we hold, free to read, no account needed.",
    tools: [
      {
        href: "/results",
        name: "Find your race",
        detail:
          "Search every athlete and every event, then open the full report on any result.",
        tag: "Search",
      },
      {
        href: "/results/compare",
        name: "Compare two athletes",
        detail: "Station by station, split by split, side by side.",
      },
      {
        href: "/reports",
        name: "Event recaps",
        detail: "What happened at each race, written from the data rather than the press release.",
      },
      {
        href: "/results/course-index",
        name: "Course index",
        detail: "Which venues run fast, which run slow, and by how much.",
      },
    ],
  },
  {
    title: "Explore the data",
    lede: "The whole database, open.",
    tools: [
      {
        href: "/rankings/world-records",
        name: "All-time bests",
        detail: "The fastest ever recorded in each division.",
      },
      {
        href: "/rankings/season-bests",
        name: "Season bests",
        detail: "The quickest times of the current season.",
      },
      {
        href: "/rankings/records",
        name: "Records book",
        detail: "Records by division, age group and nation.",
      },
      {
        href: "/results/city",
        name: "Results by city",
        detail: "Every host city and every edition it has held.",
      },
      {
        href: "/events",
        name: "Race calendar",
        detail: "Every event by season, region and country.",
      },
    ],
  },
  {
    title: "Learn the thing",
    lede: "Free to read, written by people who race.",
    tools: [
      {
        href: "/hyrox/stations",
        name: "The eight stations",
        detail: "What each one asks of you and how to train for it.",
      },
      {
        href: "/hyrox/gear",
        name: "Gear guides",
        detail: "What is worth buying, what is not, and what you can borrow.",
      },
      {
        href: "/blog",
        name: "Training guides",
        detail: "First race, pacing, strength, and the mistakes everybody makes once.",
      },
    ],
  },
];

const TOTAL = GROUPS.reduce((n, g) => n + g.tools.length, 0);

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
              className="mt-4 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-[46px]"
            >
              Free Hyrox tools.
            </SplitHeading>
            <p className="mt-5 text-base leading-relaxed text-suth-text-secondary md:text-lg">
              {TOTAL} of them, and all genuinely free — no signup, no card, no
              email wall. The race data comes from every published HYROX
              result we hold.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-6xl space-y-14">
            {GROUPS.map((group) => (
              <section key={group.title} aria-labelledby={`g-${group.title}`}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-suth-border-subtle pb-4">
                  <h2
                    id={`g-${group.title}`}
                    className="text-xl font-black tracking-[-0.03em] text-suth-text md:text-2xl"
                  >
                    {group.title}
                  </h2>
                  <p className="text-sm text-suth-text-tertiary">{group.lede}</p>
                </div>

                <ul
                  role="list"
                  className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {group.tools.map((t) => (
                    <li key={t.href}>
                      <Link
                        href={t.href}
                        className="lift-on-hover flex h-full flex-col rounded-lg border border-suth-border bg-suth-elevated p-6 transition-colors hover:border-suth-border-strong"
                      >
                        {t.tag ? <Eyebrow>{t.tag}</Eyebrow> : null}
                        <h3
                          className={`text-lg font-black tracking-[-0.03em] text-suth-text ${
                            t.tag ? "mt-3" : ""
                          }`}
                        >
                          {t.name}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                          {t.detail}
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-suth-accent">
                          Open →
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
