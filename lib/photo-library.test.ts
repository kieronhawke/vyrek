import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  ALL_PHOTOS,
  BEN_PHOTOS,
  ELITE15,
  HEROES,
  photoForStation,
  photosForStation,
  pickPhoto,
  type StationSlug,
} from "./photo-library";

const PUBLIC = path.join(process.cwd(), "public");

describe("photo library", () => {
  it("holds the full Elite 15 set", () => {
    expect(ALL_PHOTOS).toHaveLength(39);
  });

  // The whole point of the module is that a path is never wrong. If an encode
  // is deleted or renamed, this fails at test time rather than as a 404 on a
  // live page.
  it("every file it points at is actually on disk", () => {
    const missing = ALL_PHOTOS.flatMap((p) =>
      [p.src, p.wide].filter(Boolean).filter((f) => !existsSync(path.join(PUBLIC, f as string))),
    );
    expect(missing).toEqual([]);
  });

  it("gives every photo alt text a human would read out", () => {
    for (const p of ALL_PHOTOS) {
      expect(p.alt.length).toBeGreaterThan(25);
      // Alt text describes the frame; it is not a place for keywords.
      expect(p.alt.toLowerCase()).not.toContain("hyrox training");
      expect(p.alt.endsWith(".")).toBe(false);
    }
  });

  it("uses a unique source file per entry", () => {
    const srcs = ALL_PHOTOS.map((p) => p.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  // Seven of the eight stations are covered. Sled push is knowingly absent:
  // no frame in the set shows it, and borrowing another station's photo would
  // caption a lie.
  const COVERED: StationSlug[] = [
    "ski-erg",
    "sled-pull",
    "burpee-broad-jump",
    "row",
    "farmers-carry",
    "sandbag-lunge",
    "wall-balls",
  ];

  it.each(COVERED)("has a photo for %s", (station) => {
    const p = photoForStation(station);
    expect(p).toBeDefined();
    expect(p?.station).toBe(station);
  });

  it("has no photo for sled push, and says so rather than substituting", () => {
    expect(photoForStation("sled-push")).toBeUndefined();
    expect(photosForStation("sled-push")).toEqual([]);
  });

  it("returns station photos best first", () => {
    const wallBalls = photosForStation("wall-balls");
    expect(wallBalls.length).toBeGreaterThan(1);
    for (let i = 1; i < wallBalls.length; i++) {
      expect(wallBalls[i - 1].quality).toBeGreaterThanOrEqual(wallBalls[i].quality);
    }
  });

  it("only calls a frame a hero when it has a wide crop to be one with", () => {
    expect(HEROES.length).toBeGreaterThan(5);
    for (const p of HEROES) {
      expect(p.quality).toBe(5);
      expect(p.wide).toBeTruthy();
    }
  });

  it("names Ben only in frames where he is the subject", () => {
    for (const p of BEN_PHOTOS) {
      expect(p.alt).toContain("Ben Sutherland");
    }
    // ...and never names him in the others, which would be a claim about a
    // real person made from a photograph we cannot identify him in.
    for (const p of ALL_PHOTOS.filter((p) => !p.isBen)) {
      expect(p.alt).not.toContain("Ben Sutherland");
    }
  });

  it("picks deterministically, so pages do not reshuffle between builds", () => {
    const pool = photosForStation("row");
    expect(pickPhoto(pool, "row")).toBe(pickPhoto(pool, "row"));
    expect(pickPhoto(ALL_PHOTOS, "manchester")).toBe(
      pickPhoto(ALL_PHOTOS, "manchester"),
    );
  });

  it("throws rather than returning undefined on an empty pool", () => {
    expect(() => pickPhoto([], "anything")).toThrow();
  });

  it("keeps the team frames in colour", () => {
    expect(ELITE15.stockholmStepsPair.mono).toBe(false);
    expect(ELITE15.stockholmStepsWide.mono).toBe(false);
  });
});
