import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import registryJson from "@/data/locations/registry.json";
import type {
  LocationEnrichment,
  LocationIdentity,
  PublishStatus,
} from "./types";

/**
 * Accessors for the layered location database (data/locations/).
 * Server-side only — enrichment and publish status are read from disk
 * at build time. See data/locations/README.md for sourcing rules.
 */

const DATA_DIR = path.join(process.cwd(), "data", "locations");

const registry = registryJson.locations as LocationIdentity[];

export function getAllLocations(): LocationIdentity[] {
  return registry;
}

export function getLocation(slug: string): LocationIdentity | undefined {
  return registry.find((l) => l.slug === slug);
}

/** Locations with Semrush-evidenced keywords — the build priority list. */
export function getEvidencedLocations(): LocationIdentity[] {
  return registry
    .filter((l) => l.keywordEvidence?.length)
    .sort(
      (a, b) =>
        totalVolume(b.keywordEvidence!) - totalVolume(a.keywordEvidence!),
    );
}

function totalVolume(ev: { volume: number }[]): number {
  return ev.reduce((sum, k) => sum + k.volume, 0);
}

export function getEnrichment(slug: string): LocationEnrichment | undefined {
  const file = path.join(DATA_DIR, "enrichment", `${slug}.json`);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as LocationEnrichment;
}

/**
 * Slugs cleared by the uniqueness gate (scripts/validate-locations.mjs).
 * Location page types generated from this database MUST derive their
 * generateStaticParams from this list — never from the registry directly.
 */
export function getPublishableSlugs(): string[] {
  const file = path.join(DATA_DIR, "publish-status.json");
  if (!existsSync(file)) return [];
  const status = JSON.parse(readFileSync(file, "utf8")) as PublishStatus;
  return Object.entries(status.locations)
    .filter(([, s]) => s.publishable)
    .map(([slug]) => slug);
}
