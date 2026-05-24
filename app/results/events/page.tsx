import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { EventGrid } from "@/components/results/event-grid";
import { GateModal } from "@/components/results/gate-modal";
import { listAllEvents, bucketEvents } from "@/lib/results/client";

export const metadata: Metadata = {
  title: "All HYROX events — browse by date · Vyrek",
  description:
    "Every HYROX event we track. Live, upcoming, finished. Sortable by region, status, division.",
  alternates: { canonical: "/results/events" },
};

export const revalidate = 60;

export default function EventsIndexPage() {
  const all = listAllEvents();
  const buckets = bucketEvents();
  const live = buckets.live.length;
  const thisWeekend = buckets.thisWeekend.length;
  const upcoming30 = buckets.upcoming.length;

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <header className="mx-auto max-w-3xl">
            <Eyebrow>Events</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl"
            >
              Browse HYROX events
            </SplitHeading>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
              [ {live} LIVE · {thisWeekend} THIS WEEKEND ·{" "}
              {upcoming30} UPCOMING ]
            </p>
          </header>

          <div className="mt-12">
            <EventGrid events={all} emptyLabel="No events seeded yet" />
          </div>
        </Container>
      </main>
      <MarketingFooter />
      <GateModal />
    </>
  );
}
