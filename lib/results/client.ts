/**
 * Results data client.
 *
 * Sprint 1: reads from committed seed JSON (data/results-seed/*).
 * Sprint 2+: swap to Postgres via Drizzle once the migrations land.
 *
 * Always renders a "STATUS" marker in the UI so users (and dev) know
 * whether data is seed vs live. Per Brief v2 §3.3.
 */

import eventsRaw from "@/data/results-seed/events.json";
import type {
  RaceEvent,
  DivisionCode,
} from "@/lib/results/types";
import { bucketEvent } from "@/lib/results/types";

export const DATA_STATUS = {
  source: "seed-json" as "seed-json" | "live",
  lastUpdated: "2026-05-24",
};

const EVENTS = eventsRaw as RaceEvent[];

export function listAllEvents(): RaceEvent[] {
  return EVENTS;
}

export function getEvent(slug: string): RaceEvent | null {
  return EVENTS.find((e) => e.slug === slug) ?? null;
}

export function listEventsByMonth(
  year: number,
  monthOneIndexed: number,
): RaceEvent[] {
  return EVENTS.filter((e) => {
    const d = new Date(e.startDate);
    return d.getFullYear() === year && d.getMonth() + 1 === monthOneIndexed;
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function listLiveEvents(): RaceEvent[] {
  return EVENTS.filter((e) => e.status === "live");
}

export function bucketEvents() {
  return {
    live: EVENTS.filter((e) => bucketEvent(e) === "live"),
    thisWeekend: EVENTS.filter((e) => bucketEvent(e) === "this-weekend"),
    justFinished: EVENTS.filter((e) => bucketEvent(e) === "just-finished"),
    upcoming: EVENTS.filter((e) => bucketEvent(e) === "upcoming"),
    past: EVENTS.filter((e) => bucketEvent(e) === "past"),
  };
}

export function countAthletesAcrossEvents(): number {
  return EVENTS.reduce((sum, e) => sum + (e.totalAthletes ?? 0), 0);
}

export function listDivisionsForEvent(slug: string): DivisionCode[] {
  const e = getEvent(slug);
  if (!e) return [];
  return e.divisions.map((d) => d.divisionCode);
}

export const DIVISION_LABEL: Record<DivisionCode, string> = {
  "hyrox-elite-men": "HYROX Elite Men",
  "hyrox-elite-women": "HYROX Elite Women",
  "hyrox-doubles-elite-men": "HYROX Doubles Elite Men",
  "hyrox-doubles-elite-women": "HYROX Doubles Elite Women",
  "hyrox-men": "HYROX Men",
  "hyrox-women": "HYROX Women",
  "hyrox-doubles-men": "HYROX Doubles Men",
  "hyrox-doubles-women": "HYROX Doubles Women",
  "hyrox-doubles-mixed": "HYROX Doubles Mixed",
  "hyrox-pro-men": "HYROX Pro Men",
  "hyrox-pro-women": "HYROX Pro Women",
  "hyrox-pro-doubles-men": "HYROX Pro Doubles Men",
  "hyrox-pro-doubles-women": "HYROX Pro Doubles Women",
  "hyrox-team-relay-men": "HYROX Team Relay Men",
  "hyrox-team-relay-women": "HYROX Team Relay Women",
  "hyrox-team-relay-mixed": "HYROX Team Relay Mixed",
  "hyrox-adaptive-men": "HYROX Adaptive Men",
  "hyrox-adaptive-women": "HYROX Adaptive Women",
};
