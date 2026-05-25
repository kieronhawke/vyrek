import Image from "next/image";
import Link from "next/link";
import type { RaceEvent } from "@/lib/results/types";
import { formatSeconds, daysFromNow } from "@/lib/results/types";

/**
 * Event card for /results carousels + /results/events grid.
 *
 * - Glass-morphism over a city / event hero image
 * - LIVE pulse dot when status === live
 * - "N days ago" / "in N days" / live label
 * - Subtle hover scale + brightness lift on the photo
 */
export function EventCard({
  event,
  variant = "default",
}: {
  event: RaceEvent;
  variant?: "default" | "featured";
}) {
  const d = daysFromNow(event.startDate);
  const liveBadge =
    event.status === "live"
      ? "LIVE"
      : event.status === "upcoming"
        ? d === 0
          ? "TODAY"
          : d > 0
            ? `IN ${d} DAY${d === 1 ? "" : "S"}`
            : "STARTING SOON"
        : `${Math.abs(d)} DAY${Math.abs(d) === 1 ? "" : "S"} AGO`;

  const featured = variant === "featured";

  return (
    <Link
      href={`/results/event/${event.slug}`}
      className={[
        "group relative block overflow-hidden rounded-2xl border border-vyrek-border bg-vyrek-elevated transition-[border,transform] duration-base ease-out hover:-translate-y-0.5 hover:border-vyrek-border-strong",
        featured ? "aspect-[16/9]" : "aspect-[4/5]",
        featured ? "" : "min-w-[280px] snap-center",
      ].join(" ")}
    >
      {event.heroImage ? (
        <Image
          src={event.heroImage}
          alt=""
          fill
          sizes={featured ? "(min-width: 1024px) 800px, 100vw" : "320px"}
          className="object-cover grayscale transition-[filter,transform] duration-slow ease-out group-hover:grayscale-0 group-hover:scale-[1.02]"
        />
      ) : null}

      {/* Glass + gradient legibility wash */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-vyrek-base/95 via-vyrek-base/60 to-vyrek-base/10"
      />

      {/* LIVE / countdown badge */}
      <div className="absolute right-4 top-4 z-10">
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] backdrop-blur-md",
            event.status === "live"
              ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-300"
              : "border-vyrek-border bg-vyrek-base/70 text-vyrek-text",
          ].join(" ")}
        >
          {event.status === "live" ? (
            <span
              aria-hidden
              className="size-2 animate-pulse rounded-full bg-cyan-300"
            />
          ) : null}
          {liveBadge}
        </span>
      </div>

      {/* Content stacks bottom-left */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          {event.venue.city} · {event.venue.country}
        </p>
        <h3
          className={[
            "mt-2 font-black leading-tight tracking-[-0.025em] text-vyrek-text",
            featured ? "text-2xl md:text-3xl" : "text-lg md:text-xl",
          ].join(" ")}
        >
          {event.name}
        </h3>
        {event.totalAthletes > 0 ? (
          <p className="mt-2 font-mono text-[10px] tabular-nums text-vyrek-text-secondary">
            <span title="Total racers signed up across all divisions">
              {event.totalAthletes.toLocaleString("en-GB")} athletes
            </span>
            {event.status === "live" && event.divisions[0]?.leaderTimeSeconds ? (
              <>
                {" · "}
                <span title="Fastest finish time so far in this race">
                  leader {formatSeconds(event.divisions[0].leaderTimeSeconds)}
                </span>
              </>
            ) : null}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
