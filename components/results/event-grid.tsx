import type { RaceEvent } from "@/lib/results/types";
import { EventCard } from "@/components/results/event-card";

export function EventGrid({
  events,
  emptyLabel = "No events to show",
}: {
  events: RaceEvent[];
  emptyLabel?: string;
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-vyrek-border bg-vyrek-elevated/30 p-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          {emptyLabel}
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => (
        <EventCard key={e.slug} event={e} />
      ))}
    </div>
  );
}

export function EventCarousel({
  events,
  label,
}: {
  events: RaceEvent[];
  label: string;
}) {
  if (events.length === 0) return null;
  return (
    <section className="mt-12">
      <header className="mb-4 flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ {label} ]
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </header>
      <div
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {events.map((e) => (
          <EventCard key={e.slug} event={e} />
        ))}
      </div>
    </section>
  );
}
