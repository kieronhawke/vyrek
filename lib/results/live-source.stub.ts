/**
 * `LiveDataSource` — the shape a licensed feed has to fill.
 *
 * Deliberately not implemented. This file is the handover document: it names
 * exactly what a provider must supply for each interface method, so swapping
 * demo for live is a data-layer job with no UI changes.
 *
 * To go live: implement the TODOs, then flip `NEXT_PUBLIC_DATA_MODE=live`.
 * `getResultsSource()` in `./index.ts` will return this instead, and the
 * "Demo data" pill disappears on its own.
 *
 * ⚠️ Nothing here may scrape a results site. This is for a licensed feed or
 * our own user-submitted results only — see the brief's data rules.
 */

import type { ResultsDataSource } from "./source";

const NOT_IMPLEMENTED = (method: string) => () => {
  throw new Error(
    `LiveDataSource.${method} is not implemented. ` +
    `Set NEXT_PUBLIC_DATA_MODE=demo, or implement lib/results/live-source.stub.ts.`,
  );
};

export const liveDataSource: ResultsDataSource = {
  // TODO(live): event catalogue.
  // Needs: slug, season, year, city + local name, IATA, country + ISO, region,
  // venue, start/end dates, status, total entrant count.
  // Status must map onto upcoming | live | finished. If the feed exposes more
  // states (cancelled, postponed), decide the mapping here, not in the UI.
  listEvents: NOT_IMPLEMENTED("listEvents"),

  // TODO(live): one event with its division list.
  // Needs per division: code, label, entrant count, finisher count, leader time
  // and leader athlete, and wave times for start lists.
  // Division codes must map onto the DivisionCode union in ./types.ts — if the
  // feed names them differently, translate here so the UI never sees feed codes.
  getEvent: NOT_IMPLEMENTED("getEvent"),

  // TODO(live): paginated division leaderboard.
  // Needs: rank, age-group rank, athlete slug + name, nationality, age group,
  // finish time, and DNF status. Gap-to-leader is derived, not supplied.
  // Must support cursor pagination, age-group filter and a name query, because
  // the ranking table calls this incrementally as the user scrolls.
  getRanking: NOT_IMPLEMENTED("getRanking"),

  // TODO(live): a single race, fully split.
  // Needs: 8 run splits, 8 station splits, Roxzone total, plus the division
  // averages at that event for the vs-average bars. If the feed cannot supply
  // division averages, compute them once per event and cache — do not ask the
  // UI to aggregate.
  getResult: NOT_IMPLEMENTED("getResult"),

  // TODO(live): athlete profile and full race history.
  // Needs: stable athlete identity across events (the hard part — feeds often
  // key on name + DOB rather than a durable id). Decide the identity strategy
  // before wiring this, because athlete URLs depend on it and must not churn.
  getAthlete: NOT_IMPLEMENTED("getAthlete"),

  // TODO(live): start lists by division and wave, pre-race.
  getStarters: NOT_IMPLEMENTED("getStarters"),

  // TODO(live): search across athletes and events.
  // Latency budget is tight — this backs the ⌘K palette and fires per keystroke.
  // If the feed has no search endpoint, build an index on ingest rather than
  // fanning out queries here.
  searchAll: NOT_IMPLEMENTED("searchAll"),

  // TODO(live): records board by division.
  // Clarify with the provider whether records are all-time or season-scoped,
  // and whether they are ratified — an unratified record shown as fact is a
  // correction waiting to happen.
  getRecords: NOT_IMPLEMENTED("getRecords"),

  // TODO(live): ascending finish times for a division, nothing else.
  // Serve this from a precomputed, indexed column. Result pages call it on
  // every render, and building it by materialising result rows costs seconds.
  getDivisionFinishTimes: NOT_IMPLEMENTED("getDivisionFinishTimes"),

  // TODO(live): station time distribution for a division.
  // Needs enough samples to be meaningful. Precompute per season and cache;
  // this must never scan every result on request.
  getStationDistribution: NOT_IMPLEMENTED("getStationDistribution"),
};
