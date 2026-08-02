import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STATION_IDS, STATION_GUIDE_SLUG, stationGuideHref } from "./model";

/**
 * Station guide slugs are not the same strings as the station data keys —
 * the guides predate this section and use `burpee-broad-jumps` and `rowing`.
 * Linking with the data key 404s, and because Next only prefetches those links
 * it showed up nowhere except a production build's network log.
 */
describe("station guide links", () => {
  const source = readFileSync(join(process.cwd(), "lib", "hyrox-stations.ts"), "utf8");
  const realSlugs = [...source.matchAll(/slug:\s*"([a-z-]+)"/g)].map((m) => m[1]);

  it("maps every station to a slug that actually exists", () => {
    for (const station of STATION_IDS) {
      expect(realSlugs, `no guide page for ${station}`).toContain(STATION_GUIDE_SLUG[station]);
    }
  });

  it("covers every station with no gaps", () => {
    expect(Object.keys(STATION_GUIDE_SLUG).sort()).toEqual([...STATION_IDS].sort());
  });

  it("builds a guide href under /hyrox/stations", () => {
    expect(stationGuideHref("row")).toBe("/hyrox/stations/rowing");
    expect(stationGuideHref("burpee-broad-jump")).toBe("/hyrox/stations/burpee-broad-jumps");
  });
});
