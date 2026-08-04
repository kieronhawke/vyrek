import Link from "next/link";
import { cn } from "@/lib/utils";
import { Time, StatusBadge, MicroLabel } from "./ui/primitives";
import { CityMark } from "./ui/city-mark";
import { formatCount, formatRelativeDate } from "@/lib/results/format";
import type { EventSummary, EventDivisionSummary } from "@/lib/results/source";

/**
 * Event tile.
 *
 * The reference site's event cards carry a city photo, a name and a date, and
 * nothing else — you have to open the page to learn anything. These carry the
 * winner and the field size on the tile itself, so the grid is scannable and
 * the click is a decision rather than a probe (REFS.md §2.3).
 */
export function EventTile({
  event, winners, now, className,
}: {
  event: EventSummary;
  winners?: EventDivisionSummary[];
  now: Date;
  className?: string;
}) {
  return (
    <Link
      href={`/event/${event.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-md border border-suth-border-subtle",
        "bg-suth-elevated transition-colors hover:border-suth-border-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent",
        className,
      )}
    >
      <CityMark iata={event.iata} city={event.city} countryIso={event.countryIso} />

      <div className="flex flex-1 flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-suth-text">
            {event.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-suth-text-secondary">
            <span className="truncate">{event.city}</span>
            <span aria-hidden className="text-suth-text-disabled">·</span>
            <span className="whitespace-nowrap">{formatRelativeDate(event.startDate, now, String(event.year))}</span>
          </p>
        </div>
        <StatusBadge status={event.status} />
      </div>

      {winners && winners.length > 0 ? (
        <ul className="space-y-1 border-t border-suth-border-subtle pt-3">
          {winners.slice(0, 3).map((d) => (
            <li key={d.divisionCode} className="flex items-baseline justify-between gap-3 text-xs">
              <span className="truncate text-suth-text-secondary">
                {d.label.replace("HYROX ", "")}
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                <span className="max-w-[9rem] truncate text-suth-text">{d.leaderAthleteName}</span>
                <Time seconds={d.leaderTimeSeconds ?? 0} className="text-suth-accent" />
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto flex items-center justify-between pt-1">
        <MicroLabel>{formatCount(event.totalAthletes)} athletes</MicroLabel>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text-tertiary
                         transition-colors group-hover:text-suth-accent">
          {event.status === "upcoming" ? "Start lists →" : "Results →"}
        </span>
      </div>
      </div>
    </Link>
  );
}

/**
 * Horizontal card rail on mobile, grid on desktop. Scroll snapping means a
 * swipe lands cleanly on a card rather than halfway between two.
 */
export function EventRail({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      aria-label={label}
      className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2
                 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-2 md:overflow-visible
                 md:px-0 lg:grid-cols-3"
    >
      {children}
    </div>
  );
}

export function RailItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[82vw] shrink-0 snap-start sm:w-[60vw] md:w-auto">
      {children}
    </div>
  );
}
