/**
 * The canonical model — our shape, not the source's.
 *
 * Everything downstream of the normaliser speaks this. The source's quirks
 * (mika event codes, HH:MM:SS strings, one row per doubles *team*) stop at the
 * normaliser and never reach a worker, an endpoint or a component.
 *
 * Mirrors `supabase/migrations/0101_results_engine.sql`.
 */

export type EngineEventStatus = "upcoming" | "live" | "final" | "updates_paused";
export type EngineResultStatus = "finished" | "dnf" | "dns" | "dq";
export type IngestionMode = "catalog" | "backfill" | "live" | "reconcile" | "manual";
export type IngestionRunStatus = "running" | "ok" | "partial" | "error";
export type AlertSeverity = "info" | "warning" | "critical";

/** The nine segments, in race order, as we key them everywhere. */
export const STATION_KEYS = [
  "ski-erg",
  "sled-push",
  "sled-pull",
  "burpee-broad-jump",
  "row",
  "farmers-carry",
  "sandbag-lunges",
  "wall-balls",
] as const;
export type EngineStationKey = (typeof STATION_KEYS)[number];

export type SplitSegment = {
  /** `run-1` … `run-8`, or a station key. */
  key: string;
  timeMs: number;
};

export type Splits = {
  runs: SplitSegment[];
  stations: SplitSegment[];
  roxzoneMs?: number;
};

export type EngineEvent = {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  countryIso: string;
  region: string;
  season: string;
  year: number;
  venue?: string | null;
  status: EngineEventStatus;
  /** Real local start moment, stored UTC. Arming maths uses this, never a date. */
  startDatetime?: string | null;
  endDatetime?: string | null;
  /** What local time that UTC moment was, in minutes. Sydney is +600 or +660. */
  tzOffsetMinutes: number;
  startDate?: string | null;
  endDate?: string | null;
  athleteCount: number;
  sourceEventId?: string | null;
  sourceSeasonPath?: string | null;
  isDemo: boolean;
  lastSyncedAt?: string | null;
};

export type EngineDivision = {
  id: string;
  eventId: string;
  divisionKey: string;
  displayName: string;
  entrantCount: number;
  /** What the source published. Null when it published nothing to check against. */
  publishedEntrantCount?: number | null;
  sourceDivisionId?: string | null;
  /** Content hash of the last fetched board for this division. */
  lastSeenHash?: string | null;
  lastSyncedAt?: string | null;
};

export type EngineAthlete = {
  id: string;
  slug: string;
  name: string;
  nationality?: string | null;
  gender?: string | null;
  sourceAthleteId?: string | null;
  claimedByUserId?: string | null;
  isDemo: boolean;
  isAnonymised: boolean;
  identityConfidence: number;
  needsIdentityReview: boolean;
};

export type EngineResult = {
  id: string;
  eventId: string;
  divisionId: string;
  athleteId: string;
  sourceResultId: string;
  rankOverall?: number | null;
  rankAgeGroup?: number | null;
  ageGroup?: string | null;
  sex?: string | null;
  finishTimeMs?: number | null;
  roxzoneTimeMs?: number | null;
  status: EngineResultStatus;
  wave?: string | null;
  bib?: string | null;
  splits: Splits;
  partnerAthleteIds: string[];
  isDemo: boolean;
};

export type StationDistribution = {
  id: string;
  scope: "event" | "global";
  eventId?: string | null;
  divisionKey: string;
  stationKey: string;
  ageGroup?: string | null;
  sex?: string | null;
  sampleCount: number;
  medianMs?: number | null;
  meanMs?: number | null;
  percentiles: Record<string, number>;
  computedAt: string;
};

export type IngestionRun = {
  id: string;
  mode: IngestionMode;
  status: IngestionRunStatus;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number | null;
  eventsTouched: number;
  rowsUpserted: number;
  rowsQuarantined: number;
  requestsMade: number;
  errors: { message: string; context?: unknown }[];
  detail: Record<string, unknown>;
  triggerSource?: string | null;
};

export type SyncState = {
  sourceEventId: string;
  eventId?: string | null;
  lastSeenHash?: string | null;
  lastPolledAt?: string | null;
  lastSuccessAt?: string | null;
  isLive: boolean;
  liveArmedAt?: string | null;
  liveIntervalSeconds: number;
  consecutiveFailures: number;
  updatesPaused: boolean;
  reconcileUntil?: string | null;
  reconcileAttempts: number;
};

export type QuarantineRow = {
  id: string;
  sourceEventId?: string | null;
  sourceDivisionId?: string | null;
  sourceResultId?: string | null;
  reason: string;
  detail: Record<string, unknown>;
  rawPayload?: unknown;
  ingestionRunId?: string | null;
  reprocessedAt?: string | null;
  createdAt: string;
};

export type EngineAlert = {
  id: string;
  kind:
    | "parser_shape"
    | "breaker"
    | "completeness"
    | "source_unreachable"
    | "heartbeat_missed"
    | "identity_review"
    | "updates_paused";
  severity: AlertSeverity;
  message: string;
  detail: Record<string, unknown>;
  sourceEventId?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
};

export type AthleteMergeReview = {
  id: string;
  athleteId: string;
  candidateAthleteId: string;
  confidence: number;
  signals: Record<string, unknown>;
  resolution?: "merged" | "rejected" | null;
  resolvedAt?: string | null;
  createdAt: string;
};

/* ── What the adapter returns, before normalisation ──────────────────── */

export type RawEventGroup = {
  sourceEventId: string;
  label: string;
  seasonPath: string;
  divisions: RawDivisionRef[];
};

export type RawDivisionRef = {
  sourceDivisionId: string;
  label: string;
  /** Parsed off the code prefix: H, HPRO, HD, HDP, HMR, HA, HE, HDE. */
  divisionPrefix: string;
};

export type RawResultRow = {
  sourceResultId: string;
  sourceDivisionId: string;
  sourceEventId: string;
  sourceAthleteId?: string;
  name: string;
  nationality?: string;
  ageGroup?: string;
  sex?: string;
  rankOverall?: string;
  rankAgeGroup?: string;
  finishTime?: string;
  roxzoneTime?: string;
  wave?: string;
  bib?: string;
  status?: string;
  /** Raw split labels to times, exactly as the source printed them. */
  splits?: Record<string, string>;
  partnerNames?: string[];
  /** Doubles/relay: the row is a team, so its name holds several athletes. */
  isTeam?: boolean;
};

/** One athlete's splits, as the detail view prints them. */
export type RawResultDetail = {
  sourceResultId: string;
  idp: string;
  runs: { key: string; time: string }[];
  stations: { key: string; time: string }[];
  roxzone?: string;
  finish?: string;
  bib?: string;
};

/** What the parser saw, for the shape sentinel. Carried, never reconstructed. */
export type ParseDiagnostics = {
  /** Distinct `field-*` names seen in the header row. */
  headerFields: string[];
  /** `<li>` blocks that looked like rows. */
  candidateRows: number;
  /** Rows that yielded a usable name and time. */
  parsedRows: number;
  /** True when the page rendered but contained no data rows at all. */
  emptyShell: boolean;
};

export type RawDivisionPage = {
  sourceEventId: string;
  sourceDivisionId: string;
  publishedEntrantCount?: number;
  rows: RawResultRow[];
  /** Which access method produced this, for the fallback-chain tests and logs. */
  via: "ajax2" | "html" | "replay" | "demo";
  diagnostics?: ParseDiagnostics;
};
