/**
 * Results hub data layer — Brief v2 §3.3 schema sketch.
 *
 * Sprint 1: types + seed JSON only. Postgres / Drizzle binding lands
 * in Sprint 2 once the migrations land + an Upstash key is provisioned.
 */

export type EventStatus = "upcoming" | "live" | "finished";

export type DivisionCode =
  | "hyrox-elite-men"
  | "hyrox-elite-women"
  | "hyrox-doubles-elite-men"
  | "hyrox-doubles-elite-women"
  | "hyrox-men"
  | "hyrox-women"
  | "hyrox-doubles-men"
  | "hyrox-doubles-women"
  | "hyrox-doubles-mixed"
  | "hyrox-pro-men"
  | "hyrox-pro-women"
  | "hyrox-pro-doubles-men"
  | "hyrox-pro-doubles-women"
  | "hyrox-team-relay-men"
  | "hyrox-team-relay-women"
  | "hyrox-team-relay-mixed"
  | "hyrox-adaptive-men"
  | "hyrox-adaptive-women";

export type Venue = {
  name: string;
  city: string;
  cityIata: string; // 3-letter airport code for /loc/IATA.jpg convention
  country: string;
  countryIso: string; // gb, us, hk, etc.
  countryIsoRegion?: string; // gb-eng, gb-sct, gb-wls — optional regional flag
  region: "Europe" | "Americas" | "Asia" | "Oceania" | "Africa" | "Middle East";
  lat?: number;
  lng?: number;
};

export type EventDivision = {
  divisionCode: DivisionCode;
  athleteCount: number;
  leaderTimeSeconds?: number; // for live/finished — fastest current/final
  leaderAthleteSlug?: string;
};

export type RaceEvent = {
  slug: string; // s8-2026-hong-kong style
  season: string; // s8
  year: number;
  name: string;
  nameLocalised?: string; // 香港 / etc
  venue: Venue;
  startDate: string; // ISO date
  endDate: string;
  status: EventStatus;
  divisions: EventDivision[];
  totalAthletes: number;
  slotCount: number; // wave slots
  heroImage?: string; // /media/images/v2/...
};

export type Athlete = {
  slug: string;
  name: string;
  countryIso: string;
  countryIsoRegion?: string;
  gender: "men" | "women";
  primaryDivision?: DivisionCode;
  totalRaces?: number;
  seasonsActive?: number;
};

export type Race = {
  id: string; // event-slug + athlete-slug + division
  eventSlug: string;
  divisionCode: DivisionCode;
  athleteSlug: string;
  ageGroup?: string; // "M30-34"
  finishTimeSeconds: number;
  finishRank: number;
  agRank?: number;
  splits?: Split[];
  partners?: string[]; // for doubles/relay — array of athlete slugs
};

export type Split = {
  station:
    | "ski-erg"
    | "sled-push"
    | "sled-pull"
    | "burpee-broad-jump"
    | "row"
    | "farmers-carry"
    | "sandbag-lunges"
    | "wall-balls"
    | "roxzone"
    | `run-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  timeSeconds: number;
  rank?: number;
  agRank?: number;
};

/* ─── Format helpers ──────────────────────────────────────────── */

export function formatSeconds(secs: number): string {
  if (!Number.isFinite(secs)) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function daysFromNow(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function bucketEvent(e: RaceEvent): "live" | "this-weekend" | "just-finished" | "upcoming" | "past" {
  if (e.status === "live") return "live";
  const dStart = daysFromNow(e.startDate);
  const dEnd = daysFromNow(e.endDate);
  if (e.status === "upcoming" && dStart >= 0 && dStart <= 7) return "this-weekend";
  if (e.status === "finished" && dEnd >= -7 && dEnd <= 0) return "just-finished";
  if (e.status === "upcoming") return "upcoming";
  return "past";
}
