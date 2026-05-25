import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import {
  getEvent,
  listAllEvents,
  DIVISION_LABEL,
  DATA_STATUS,
} from "@/lib/results/client";
import { formatSeconds, daysFromNow } from "@/lib/results/types";

export const revalidate = 60;
export const dynamicParams = false;

export async function generateStaticParams() {
  return listAllEvents().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) return { title: "Event not found" };
  const dateRange =
    e.startDate === e.endDate
      ? format(new Date(e.startDate), "d MMMM yyyy")
      : `${format(new Date(e.startDate), "d MMM")}-${format(new Date(e.endDate), "d MMM yyyy")}`;
  return {
    title: `${e.name}: ${dateRange} · Vyrek`,
    description: `HYROX ${e.name} at ${e.venue.name}, ${e.venue.city}. ${e.totalAthletes.toLocaleString("en-GB")} athletes across ${e.divisions.length} divisions.`,
    alternates: { canonical: `/results/event/${e.slug}` },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const e = getEvent(slug);
  if (!e) notFound();

  const start = new Date(e.startDate);
  const end = new Date(e.endDate);
  const dateLabel =
    e.startDate === e.endDate
      ? format(start, "EEEE, d MMMM yyyy")
      : `${format(start, "EEEE, d MMMM")} - ${format(end, "EEEE, d MMMM yyyy")}`;
  const d = daysFromNow(e.startDate);
  const statusLabel =
    e.status === "live"
      ? "LIVE NOW"
      : e.status === "upcoming"
        ? d === 0
          ? "STARTING TODAY"
          : d > 0
            ? `IN ${d} DAY${d === 1 ? "" : "S"}`
            : "STARTING SOON"
        : `${Math.abs(d)} DAY${Math.abs(d) === 1 ? "" : "S"} AGO`;

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-32">
        {/* Hero block */}
        <section
          aria-labelledby="event-heading"
          className="relative overflow-hidden border-b border-vyrek-border-subtle"
        >
          <div className="relative aspect-[16/9] max-h-[60vh] w-full bg-vyrek-elevated md:aspect-[21/9]">
            {e.heroImage ? (
              <Image
                src={e.heroImage}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover grayscale"
              />
            ) : null}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-vyrek-base via-vyrek-base/60 to-vyrek-base/10"
            />
          </div>

          <Container className="relative -mt-32 md:-mt-44">
            <div className="mx-auto max-w-4xl">
              <Link
                href="/results/events"
                className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-secondary transition-colors hover:text-vyrek-accent"
              >
                <span aria-hidden>←</span> All events
              </Link>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ {statusLabel} ]
              </p>
              <h1
                id="event-heading"
                className="mt-3 text-balance text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl lg:text-6xl"
              >
                {e.name}
              </h1>
              <p className="mt-4 text-base text-vyrek-text-secondary md:text-xl">
                {e.venue.name} · {e.venue.city}, {e.venue.country}
              </p>
              <p className="mt-2 font-mono text-sm text-vyrek-text-tertiary">
                {dateLabel}
              </p>
            </div>
          </Container>
        </section>

        {/* Stats strip */}
        <section
          aria-label="Event at a glance"
          className="border-b border-vyrek-border-subtle py-10 md:py-14"
        >
          <Container>
            <dl className="mx-auto grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              <Stat
                label="Athletes"
                value={e.totalAthletes.toLocaleString("en-GB")}
              />
              <Stat label="Divisions" value={e.divisions.length.toString()} />
              <Stat
                label="Wave slots"
                value={e.slotCount.toLocaleString("en-GB")}
              />
              <Stat
                label="Region"
                value={e.venue.region}
              />
            </dl>
          </Container>
        </section>

        {/* Divisions */}
        <section
          aria-labelledby="divisions-heading"
          className="border-b border-vyrek-border-subtle py-14"
        >
          <Container>
            <div className="mx-auto max-w-4xl">
              <h2
                id="divisions-heading"
                className="text-2xl font-black tracking-[-0.04em] text-vyrek-text md:text-3xl"
              >
                Divisions
              </h2>
              <p className="mt-3 max-w-2xl text-base text-vyrek-text-secondary">
                {e.status === "finished"
                  ? "Final results by division. Full splits coming soon."
                  : e.status === "live"
                    ? "Live leader times update every 90 seconds."
                    : "Wave allocations close two weeks before race day."}
              </p>

              <ul role="list" className="mt-8 divide-y divide-vyrek-border-subtle rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated">
                {e.divisions.map((div) => (
                  <li
                    key={div.divisionCode}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 md:grid-cols-[1fr_auto_auto] md:px-6"
                  >
                    <div>
                      <p className="text-base font-bold text-vyrek-text md:text-lg">
                        {DIVISION_LABEL[div.divisionCode]}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                        {div.athleteCount.toLocaleString("en-GB")} athletes
                      </p>
                    </div>
                    {div.leaderTimeSeconds ? (
                      <p className="font-mono text-base font-bold tabular-nums text-vyrek-accent md:text-lg">
                        {formatSeconds(div.leaderTimeSeconds)}
                      </p>
                    ) : (
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                        {e.status === "upcoming" ? "Awaits race day" : "Results pending"}
                      </p>
                    )}
                    <span
                      aria-hidden
                      className="hidden font-mono text-vyrek-text-tertiary md:inline"
                    >
                      →
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Container>
        </section>

        {/* Sprint 2 placeholder */}
        <section className="border-b border-vyrek-border-subtle py-14">
          <Container>
            <div className="mx-auto max-w-4xl rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6 md:p-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ RESULTS HUB · SPRINT 2 ]
              </p>
              <h3 className="mt-3 text-xl font-bold text-vyrek-text md:text-2xl">
                Per-athlete splits and rankings coming soon.
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-vyrek-text-secondary">
                We are building per-station splits, athlete profiles, head-to-head
                comparisons, and an interactive race-day simulator. Sign up to be
                notified when the full results hub goes live.
              </p>
              <div className="mt-6">
                <Link
                  href="/quiz"
                  className="inline-flex h-12 items-center rounded-pill bg-vyrek-accent px-6 text-sm font-semibold tracking-tight text-[#0A0A0A] transition-colors hover:bg-vyrek-accent-hover"
                >
                  Train for your next race →
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Data status footer */}
        <Container>
          <p className="mx-auto mt-10 max-w-4xl font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
            [ DATA · {DATA_STATUS.source.toUpperCase()} · UPDATED {DATA_STATUS.lastUpdated} ]
          </p>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-4 md:p-5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
        {label}
      </dt>
      <dd className="mt-2 text-xl font-black tabular-nums text-vyrek-text md:text-2xl">
        {value}
      </dd>
    </div>
  );
}
