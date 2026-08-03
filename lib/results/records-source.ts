import "server-only";

import { getResultsSource } from "./index";
import type { RecordCandidate } from "./records";

/**
 * Gathering the field the record book is computed from.
 *
 * A world record only needs rank 1, but a *national* record needs the fastest
 * athlete of a given nationality, who may be well down the overall order at a
 * big event. So this reads the top slice of every division at every finished
 * event rather than just the winners.
 *
 * `DEPTH` is the honest limit and the page says so. A national record set by
 * someone outside the top 200 of their race is not a record anyone would
 * recognise — but it is a real edge, so it is stated rather than hidden.
 */

/** How deep into each division's field to look. */
const DEPTH = 200;

/** How many division reads to have in flight at once. */
const BATCH = 8;

export async function collectRecordCandidates(): Promise<RecordCandidate[]> {
  const source = getResultsSource();
  const events = (await source.listEvents()).filter((e) => e.status === "finished");

  // Flatten to (event, division) pairs first so the batching is even. Batching
  // by event would put a fourteen-division event and a two-division one in the
  // same round and leave the pool idle for most of it.
  const jobs: { eventSlug: string; eventName: string; eventCity: string; date: string; division: string }[] = [];
  const details = await Promise.all(events.map((e) => source.getEvent(e.slug).catch(() => null)));

  details.forEach((detail, i) => {
    if (!detail) return;
    for (const division of detail.divisions) {
      jobs.push({
        eventSlug: events[i].slug,
        eventName: events[i].name,
        eventCity: events[i].city,
        date: events[i].startDate,
        division: division.divisionCode,
      });
    }
  });

  const candidates: RecordCandidate[] = [];

  for (let i = 0; i < jobs.length; i += BATCH) {
    const slice = jobs.slice(i, i + BATCH);
    const pages = await Promise.all(
      slice.map((job) =>
        source.getRanking(job.eventSlug, job.division, { limit: DEPTH }).catch(() => null),
      ),
    );

    slice.forEach((job, j) => {
      const page = pages[j];
      if (!page) return;
      for (const row of page.rows) {
        if (row.status !== "finished" || row.finishSeconds <= 0) continue;
        candidates.push({
          resultId: row.id,
          divisionCode: job.division as RecordCandidate["divisionCode"],
          divisionLabel: page.divisionLabel,
          athleteSlug: row.athleteSlug,
          athleteName: row.athleteName,
          countryIso: row.countryIso,
          ageGroup: row.ageGroup,
          finishSeconds: row.finishSeconds,
          eventSlug: job.eventSlug,
          eventName: job.eventName,
          eventCity: job.eventCity,
          date: job.date,
        });
      }
    });
  }

  return candidates;
}

export const RECORD_DEPTH = DEPTH;
