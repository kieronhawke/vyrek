/**
 * The questions an event page should answer in its own words.
 *
 * Search intent around a race splits cleanly in two. Before it: tickets,
 * venue, divisions, wave times. After it: who won, what the winning time was,
 * how many finished, where to find *my* result. The competitor's event title
 * is "HYROX London 2026 Tickets" — it takes the first half and leaves the
 * second, which is the half with the durable volume, because a race is over in
 * a weekend and searched for years afterwards.
 *
 * These render on the page and feed the `FAQPage` block from the same array.
 * Every answer is built from the event's own record, so nothing here is
 * boilerplate and nothing is invented — a question the data cannot answer is
 * simply not asked.
 */

import type { RaceEventDetail } from "./source";

export function eventFaqs(
  event: RaceEventDetail,
  formatTime: (seconds: number) => string,
): { q: string; a: string }[] {
  const faqs: { q: string; a: string }[] = [];
  const label = `HYROX ${event.city} ${event.year}`;
  const finished = event.status === "finished";

  const withLeaders = event.divisions.filter(
    (d) => d.leaderTimeSeconds && d.leaderAthleteName,
  );

  if (finished && withLeaders.length > 0) {
    const named = withLeaders
      .slice(0, 4)
      .map((d) => `${d.label.replace("HYROX ", "")} — ${d.leaderAthleteName} `
        + `in ${formatTime(d.leaderTimeSeconds!)}`)
      .join("; ");
    faqs.push({
      q: `Who won ${label}?`,
      a: `${named}. Every division's full podium and finishing order is on this `
        + `page, with station-by-station splits for each finisher.`,
    });

    const fastest = withLeaders.reduce(
      (a, b) => ((b.leaderTimeSeconds ?? Infinity) < (a.leaderTimeSeconds ?? Infinity) ? b : a),
    );
    faqs.push({
      q: `What was the winning time at ${label}?`,
      a: `The fastest finish of the weekend was `
        + `${formatTime(fastest.leaderTimeSeconds!)} by ${fastest.leaderAthleteName} `
        + `in ${fastest.label.replace("HYROX ", "")}. Winning times for every `
        + `other division are listed below.`,
    });
  }

  if (event.totalAthletes > 0) {
    faqs.push({
      q: `How many athletes raced ${label}?`,
      a: `${event.totalAthletes.toLocaleString("en-GB")} athletes were entered `
        + `across ${event.divisions.length} divisions`
        + `${event.venue ? ` at ${event.venue}` : ""}`
        + `${event.city ? `, ${event.city}` : ""}. `
        + `${finished
          ? "Every finisher is listed here by division, free and without an account."
          : "Start lists and wave times appear here as they are published."}`,
    });
  }

  if (event.divisions.length > 0) {
    faqs.push({
      q: `What divisions raced at ${label}?`,
      a: `${event.divisions.map((d) => d.label.replace("HYROX ", "")).join(", ")}. `
        + `Each has its own ranking page with full results, age-group placings `
        + `and splits for every athlete.`,
    });
  }

  faqs.push({
    q: `Where can I find my ${label} result?`,
    a: finished
      ? `Open your division below and search your name, or use the search at the `
        + `top of any page. Your result opens with every run and station split `
        + `measured against the division average, your age-group rank, and a `
        + `printable race report — free, and with no account needed.`
      : `Results appear here live as athletes cross the line, and the full `
        + `rankings are final within hours of the last wave. Search your name at `
        + `the top of any page to find yourself.`,
  });

  if (event.venue) {
    faqs.push({
      q: `Where is ${label} held?`,
      a: `${event.venue}${event.city ? `, ${event.city}` : ""}`
        + `${event.country ? `, ${event.country}` : ""}`
        + `${event.startDate ? `, on ${event.startDate}` : ""}. `
        + `Venue layout affects finish times independently of fitness — our `
        + `course speed index measures how much.`,
    });
  }

  return faqs;
}
