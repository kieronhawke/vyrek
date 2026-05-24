import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { EventCarousel, EventGrid } from "@/components/results/event-grid";
import { GateModal } from "@/components/results/gate-modal";
import {
  bucketEvents,
  countAthletesAcrossEvents,
  listLiveEvents,
  DATA_STATUS,
} from "@/lib/results/client";
import { EventCard } from "@/components/results/event-card";

export const metadata: Metadata = {
  title: "Results — HYROX athletes, events, rankings · Vyrek",
  description:
    "Browse HYROX events, athletes, splits, rankings. Live and historic data across every venue. Train, race, analyse, beat.",
  alternates: { canonical: "/results" },
};

export const revalidate = 60; // seed data, low churn

export default function ResultsHubPage() {
  const buckets = bucketEvents();
  const liveEvents = listLiveEvents();
  const featured = liveEvents[0] ?? buckets.upcoming[0] ?? buckets.justFinished[0] ?? null;
  const totalAthletes = countAthletesAcrossEvents();

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          {/* Hero */}
          <header className="mx-auto max-w-3xl text-center">
            <Eyebrow>Results</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-balance text-4xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-6xl"
            >
              Train. Race. Analyse. Beat.
            </SplitHeading>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              Live and historic HYROX results across every venue. Splits,
              ranks, comparisons, and the data that decides your next
              build.
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              [ {DATA_STATUS.source === "live" ? "LIVE" : "PREVIEW"} ·{" "}
              {totalAthletes.toLocaleString("en-GB")} athletes indexed ]
            </p>
          </header>

          {/* Featured live event */}
          {featured ? (
            <div className="mt-12">
              <EventCard event={featured} variant="featured" />
            </div>
          ) : null}

          {/* Carousels */}
          <EventCarousel events={buckets.live} label="LIVE NOW" />
          <EventCarousel events={buckets.thisWeekend} label="THIS WEEKEND" />
          <EventCarousel events={buckets.justFinished} label="JUST FINISHED" />
          <EventCarousel events={buckets.upcoming} label="COMING UP" />

          {/* All-events grid CTA */}
          <section className="mt-20 border-t border-vyrek-border-subtle pt-10">
            <header className="mb-4 flex items-baseline justify-between">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ EVERY EVENT ]
              </h2>
              <a
                href="/results/events"
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-secondary hover:text-vyrek-text"
              >
                Browse all →
              </a>
            </header>
            <EventGrid events={buckets.past.concat(buckets.upcoming).slice(0, 6)} />
          </section>
        </Container>
      </main>
      <MarketingFooter />
      <GateModal />
    </>
  );
}
