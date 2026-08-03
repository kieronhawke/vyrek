import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText, Gauge, Medal, SlidersHorizontal, Percent, GitCompareArrows,
  Trophy, CalendarRange, MapPin, Dumbbell, ListOrdered, Newspaper,
} from "lucide-react";
import { siteUrl } from "@/lib/blog/urls";
import { getResultsSource } from "@/lib/results";
import { formatCount } from "@/lib/results/format";
import { Breadcrumbs } from "@/components/results/ui/breadcrumbs";
import { FaqSection } from "@/components/results/ui/faq-section";
import { ToolsHero } from "@/components/results/tools/tools-hero";
import { MicroLabel } from "@/components/results/ui/primitives";
import { Reveal } from "@/components/results/ui/reveal";
import { cn } from "@/lib/utils";

/**
 * `/results/tools` — everything this section can do, on one page.
 *
 * The navigation carries six links, and the section had grown well past six
 * things worth using: the race report, the record book, the course speed index
 * and the percentile check were each reachable only from one page deep inside
 * the section, or from a grid below the fold on the hub. A feature nobody can
 * find is a feature nobody uses, however good it is.
 *
 * Grouped by what someone is trying to do rather than by page type, because
 * "I want to know if my time was any good" is the question people arrive with —
 * not "show me the tools directory".
 *
 * The flagship goes first and says what it costs elsewhere. That is the single
 * most useful sentence on the page.
 */

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Free HYROX Tools & Race Analytics",
  description:
    "Every HYROX tool we build, free and without an account: a full race "
    + "report, the record book, the course speed index, a race simulator, "
    + "percentile checks and head-to-head comparison.",
  alternates: { canonical: "/results/tools" },
  openGraph: { url: `${siteUrl()}/results/tools`, type: "website" },
};

type Tool = {
  href: string;
  label: string;
  detail: string;
  icon: typeof FileText;
  /** Rendered as a small flag on the card. */
  badge?: string;
  featured?: boolean;
};

/**
 * The one tool promoted out of the grid and into `ToolsHero`.
 *
 * Matched on href rather than the `featured` flag: two tools carry that flag —
 * the race report and the record book — and filtering on it silently dropped
 * the record book off the page entirely. It is a good tool that belongs in the
 * grid; it is just not the flagship.
 *
 * A test asserts this href still resolves to a tool in GROUPS, because a typo
 * here fails by showing the report twice, which looks deliberate.
 */
const HERO_HREF = "/results";

const GROUPS: { title: string; lede: string; tools: Tool[] }[] = [
  {
    title: "Understand a race you have run",
    lede: "Open any result and these follow from it.",
    tools: [
      {
        // Deliberately the hub rather than one athlete's report: a report only
        // exists for a result, and hardcoding a sample id breaks the moment the
        // corpus changes or the site moves to live data. The copy carries the
        // route instead.
        href: "/results",
        label: "Full race report",
        detail:
          "Twelve sections on one race: every station against your own standard, "
          + "the story of your pacing, the gap to the winner, what the same legs "
          + "were worth, and split targets for next time. Prints as an A4 "
          + "document. Search your name, open your result, press “Full race report”.",
        icon: FileText,
        badge: "Free",
        featured: true,
      },
      {
        href: "/tools/good-hyrox-time",
        label: "Is my time any good?",
        detail: "Where a finish time actually places you, by division and age group.",
        icon: Percent,
      },
      {
        href: "/results/compare",
        label: "Compare two races",
        detail: "Two athletes, or two of your own races, segment by segment.",
        icon: GitCompareArrows,
      },
    ],
  },
  {
    title: "Plan the next one",
    lede: "Work backwards from the time you want.",
    tools: [
      {
        href: "/simulator",
        label: "Race simulator",
        detail: "Model a finish station by station and see what each change is worth.",
        icon: SlidersHorizontal,
      },
      {
        href: "/results/course-index",
        label: "Course speed index",
        detail:
          "Which venues actually run slow. Median and winning times against the "
          + "global pool — nobody else publishes this.",
        icon: Gauge,
        badge: "Only here",
      },
      {
        href: "/hyrox/stations",
        label: "Station guides",
        detail: "Technique, weights and pacing for all eight stations.",
        icon: Dumbbell,
      },
    ],
  },
  {
    title: "Explore the data",
    lede: "Every result we hold, however you want to come at it.",
    tools: [
      {
        href: "/rankings/records",
        label: "The record book",
        detail:
          "World, national and age-group records — every one, with what it beat "
          + "and by how much. Rebuilt from results every half hour.",
        icon: Medal,
        featured: true,
      },
      { href: "/events", label: "Race calendar", detail: "Every event by season, region and country.", icon: CalendarRange },
      { href: "/results/city", label: "Results by city", detail: "Every host city, every edition it has held.", icon: MapPin },
      { href: "/rankings/world-records", label: "All-time bests", detail: "The fastest ever recorded in each division.", icon: Trophy },
      { href: "/rankings/season-bests", label: "Season bests", detail: "The quickest times of the current season.", icon: ListOrdered },
      { href: "/reports", label: "Event recaps", detail: "What happened at each race, written from the data.", icon: Newspaper },
    ],
  },
];

const FAQS = [
  {
    q: "Do I need an account for any of this?",
    a: "No. Every tool on this page is free and open — no sign-up, no email, "
      + "no paywall, including the full race report.",
  },
  {
    q: "Where do the numbers come from?",
    a: "Published race results. Every figure in the race report states its own "
      + "derivation in the method section at the end, because a number you cannot "
      + "check is one you cannot train against.",
  },
  {
    q: "How do I find my own race report?",
    a: "Search your name at the top of any page, open your result, and press "
      + "“Full race report”. It generates instantly from your splits.",
  },
  {
    q: "My name is not coming up. What now?",
    a: "Try your surname on its own first — results are published as the "
      + "organiser recorded them, so accents, hyphens and swapped first and "
      + "last names are all common. If it is still missing, the event may not "
      + "have published finals yet; races usually appear within a day or two.",
  },
  {
    q: "What if some of my splits are missing?",
    a: "The report is built from whatever is published and says so where "
      + "something is absent rather than quietly filling the gap. Sections that "
      + "genuinely cannot be calculated without a split are left out instead of "
      + "being estimated — a made-up number you cannot tell apart from a real "
      + "one is worse than no number.",
  },
  {
    q: "How often does the data update?",
    a: "Results are re-read continuously and the record book is rebuilt every "
      + "half hour, so a record set on a Saturday is here the same afternoon "
      + "without anyone touching it.",
  },
  {
    q: "Can I use these for a race I ran years ago?",
    a: "Yes. Every race in the database gets the same treatment, however long "
      + "ago it was — and comparing an old race with a recent one is one of the "
      + "more useful things here.",
  },
  {
    q: "Do these work for doubles and relay?",
    a: "Yes, across every division we hold, including Pro, Doubles, Team Relay "
      + "and Adaptive. Standards and comparisons are always drawn from within "
      + "your own division, never from the overall field.",
  },
  {
    q: "Can I share a report, or print it?",
    a: "Both. There is a share button on every report that puts the link "
      + "wherever you want it, and “Save as PDF” lays the whole thing out as an "
      + "A4 document with a cover page. Anyone who opens the link sees the full "
      + "report, free, with no account.",
  },
  {
    q: "Is my result showing something wrong?",
    a: "We publish what the organiser published, so a wrong time here almost "
      + "always means a wrong time there — that has to be corrected at the "
      + "source. If a result is attributed to the wrong athlete, tell us and we "
      + "will fix it.",
  },
  {
    q: "Can I get my result removed?",
    a: "Yes. There is a removal request form, and we action it without asking "
      + "for a reason.",
  },
  {
    q: "Are you affiliated with HYROX?",
    a: "No. Suth Performance is an independent coaching business. These tools "
      + "are built on publicly published results and are not an official HYROX "
      + "product.",
  },
];

export default async function ToolsDirectoryPage() {
  const events = await getResultsSource().listEvents().catch(() => []);
  const athleteTotal = events.reduce((sum, e) => sum + (e.totalAthletes || 0), 0);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:py-12">
      <Breadcrumbs
        trail={[
          { name: "Results", path: "/results" },
          { name: "Tools", path: "/results/tools" },
        ]}
      />

      <header>
        <MicroLabel>[ EVERYTHING HERE ]</MicroLabel>
        <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-suth-text md:text-4xl">
          HYROX Tools
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-suth-text-secondary">
          Everything this section can do, in one place — all of it free and none
          of it behind an account.
          {events.length > 0
            ? ` Built on ${formatCount(events.length)} races and ${formatCount(athleteTotal)} results.`
            : ""}
        </p>
      </header>

      {/*
        The flagship comes out of the grid entirely.

        As one card among nine it was indistinguishable from "Race calendar",
        which is how an accurate inventory becomes a bad shop window: a reader
        cannot tell which of nine things deserves their next thirty seconds, so
        they scan all nine and open none.
      */}
      <ToolsHero />

      <div className="mt-12 space-y-12">
        {GROUPS.map((group, groupIndex) => (
          <section key={group.title} aria-labelledby={`g-${groupIndex}`}>
            <h2
              id={`g-${groupIndex}`}
              className="text-lg font-semibold text-suth-text"
            >
              {group.title}
            </h2>
            <p className="mt-1 text-sm text-suth-text-secondary">{group.lede}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.tools.filter((t) => t.href !== HERO_HREF).map((tool, i) => (
                // Staggered by index within the group only — a delay that keeps
                // climbing down a long page leaves the last card arriving well
                // after the reader has reached it.
                <Reveal key={tool.href} delay={Math.min(i, 5) * 45} className={tool.featured ? "sm:col-span-2 lg:col-span-1" : ""}>
                  <ToolCard tool={tool} />
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </div>

      <FaqSection faqs={FAQS} title="Using these" />
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  return (
    <Link
      href={tool.href}
      className={cn(
        "group flex h-full flex-col rounded-md border bg-suth-elevated p-4",
        "transition-[border-color,transform] duration-200 ease-out",
        "hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
        tool.featured
          ? "border-suth-accent/40 hover:border-suth-accent/70"
          : "border-suth-border-subtle hover:border-suth-border-strong",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <Icon
          className={cn(
            "size-5 shrink-0 transition-colors",
            tool.featured ? "text-suth-accent" : "text-suth-text-tertiary group-hover:text-suth-accent",
          )}
          aria-hidden
        />
        {tool.badge ? (
          <span className="rounded-pill border border-suth-accent/40 bg-suth-accent/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-suth-accent">
            {tool.badge}
          </span>
        ) : null}
      </span>

      <h3 className="mt-3 text-sm font-semibold text-suth-text">{tool.label}</h3>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-suth-text-secondary">
        {tool.detail}
      </p>
      <span
        aria-hidden
        className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary
                   transition-colors group-hover:text-suth-accent"
      >
        Open →
      </span>
    </Link>
  );
}
