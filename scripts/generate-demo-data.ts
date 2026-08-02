/**
 * Demo data engine — brief §7.
 *
 * Run: `node scripts/generate-demo-data.ts` (Node 26 strips the types natively,
 * so this needs no build step and no new dependency).
 *
 * Output: `data/results-demo/` — gitignored, regenerated on build. One shard per
 * event so a ranking page loads one file rather than the whole dataset.
 *
 * Fixed seed. The same seed always yields the same dataset, so ranking positions
 * are stable across builds and Playwright fixtures do not rot.
 *
 * EVERY athlete here is synthetic. The two Sutherlands are storyline placeholders
 * flagged `isPlaceholder`, and no other real person appears.
 */

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  makeRng, uniform, intBetween, skewedNormal, normal, weightedPick, shuffle,
  makeName, slugify, DEFAULT_NATION_WEIGHTS, type Rng,
} from "../lib/results/rng.ts";
import {
  STATION_IDS, STATION_WEIGHTS, DIVISION_PROFILES,
  isDoubles, isRelay, type StationId, type AgeGroup, type DivisionProfile,
} from "../lib/results/model.ts";

const SEED = 20260802;
const OUT_DIR = join(import.meta.dirname, "..", "data", "results-demo");

/* ─── Event seeds ─────────────────────────────────────────────────
   14 events across s7/s8/s9, UK-weighted per the brief. `size` scales
   every division's entrant count. One LIVE, two UPCOMING, rest FINAL. */

type EventSeed = {
  city: string;
  cityLocal?: string;
  iata: string;
  country: string;
  countryIso: string;
  region: "Europe" | "Asia" | "Americas";
  season: string;
  year: number;
  start: string;
  end: string;
  status: "finished" | "live" | "upcoming";
  size: number;
  venue: string;
  /** Overrides the default nationality mix for regional events. */
  nations?: readonly (readonly [string, number])[];
};

const EVENT_SEEDS: EventSeed[] = [
  { city: "London", iata: "LON", country: "United Kingdom", countryIso: "gb", region: "Europe", season: "s9", year: 2026, start: "2026-05-16", end: "2026-05-17", status: "finished", size: 4.0, venue: "ExCeL London" },
  { city: "Manchester", iata: "MAN", country: "United Kingdom", countryIso: "gb", region: "Europe", season: "s9", year: 2026, start: "2026-04-11", end: "2026-04-12", status: "finished", size: 2.2, venue: "Manchester Central" },
  { city: "Birmingham", iata: "BHX", country: "United Kingdom", countryIso: "gb", region: "Europe", season: "s9", year: 2026, start: "2026-03-07", end: "2026-03-08", status: "finished", size: 1.9, venue: "NEC Birmingham" },
  { city: "Glasgow", iata: "GLA", country: "United Kingdom", countryIso: "gb", region: "Europe", season: "s9", year: 2026, start: "2026-02-21", end: "2026-02-22", status: "finished", size: 1.5, venue: "SEC Centre" },
  { city: "Cardiff", iata: "CWL", country: "United Kingdom", countryIso: "gb", region: "Europe", season: "s9", year: 2026, start: "2026-06-27", end: "2026-06-28", status: "live", size: 1.4, venue: "Utilita Arena Cardiff" },
  { city: "Dublin", iata: "DUB", country: "Ireland", countryIso: "ie", region: "Europe", season: "s9", year: 2026, start: "2026-09-12", end: "2026-09-13", status: "upcoming", size: 1.6, venue: "RDS Simmonscourt", nations: [["ie", 46], ["gb", 30], ["de", 6], ["us", 6], ["nl", 4], ["es", 4], ["se", 4]] },
  { city: "Berlin", iata: "BER", country: "Germany", countryIso: "de", region: "Europe", season: "s9", year: 2026, start: "2026-10-03", end: "2026-10-04", status: "upcoming", size: 2.4, venue: "Messe Berlin", nations: [["de", 50], ["nl", 10], ["gb", 12], ["se", 8], ["es", 6], ["us", 6], ["ie", 4], ["in", 4]] },
  { city: "Malaga", iata: "AGP", country: "Spain", countryIso: "es", region: "Europe", season: "s8", year: 2025, start: "2025-11-15", end: "2025-11-16", status: "finished", size: 1.7, venue: "Palacio de Deportes", nations: [["es", 44], ["gb", 18], ["de", 12], ["ie", 6], ["nl", 6], ["se", 6], ["us", 8]] },
  { city: "Stockholm", iata: "STO", country: "Sweden", countryIso: "se", region: "Europe", season: "s8", year: 2025, start: "2025-06-14", end: "2025-06-15", status: "finished", size: 2.6, venue: "Stockholmsmassan", nations: [["se", 30], ["gb", 16], ["de", 14], ["us", 12], ["nl", 8], ["ie", 6], ["es", 6], ["in", 4], ["hk", 4]] },
  { city: "Amsterdam", iata: "AMS", country: "Netherlands", countryIso: "nl", region: "Europe", season: "s8", year: 2025, start: "2025-04-05", end: "2025-04-06", status: "finished", size: 1.8, venue: "RAI Amsterdam", nations: [["nl", 46], ["de", 16], ["gb", 14], ["ie", 6], ["se", 6], ["es", 6], ["us", 6]] },
  { city: "Mumbai", cityLocal: "मुंबई", iata: "BOM", country: "India", countryIso: "in", region: "Asia", season: "s8", year: 2025, start: "2025-09-20", end: "2025-09-21", status: "finished", size: 1.2, venue: "Jio World Convention Centre", nations: [["in", 74], ["gb", 8], ["sg", 6], ["hk", 4], ["us", 4], ["de", 4]] },
  { city: "New Delhi", cityLocal: "नई दिल्ली", iata: "DEL", country: "India", countryIso: "in", region: "Asia", season: "s9", year: 2026, start: "2026-01-24", end: "2026-01-25", status: "finished", size: 1.1, venue: "Yashobhoomi Convention Centre", nations: [["in", 78], ["gb", 6], ["sg", 6], ["hk", 4], ["us", 3], ["de", 3]] },
  { city: "Hong Kong", cityLocal: "香港", iata: "HKG", country: "Hong Kong", countryIso: "hk", region: "Asia", season: "s8", year: 2025, start: "2025-03-08", end: "2025-03-09", status: "finished", size: 1.3, venue: "AsiaWorld-Expo", nations: [["hk", 58], ["sg", 12], ["gb", 10], ["us", 6], ["in", 6], ["de", 4], ["se", 4]] },
  { city: "Singapore", iata: "SIN", country: "Singapore", countryIso: "sg", region: "Asia", season: "s7", year: 2024, start: "2024-11-09", end: "2024-11-10", status: "finished", size: 1.2, venue: "Singapore Expo", nations: [["sg", 56], ["hk", 12], ["gb", 10], ["in", 8], ["us", 6], ["de", 4], ["se", 4]] },
];

/* ─── Athlete pool ────────────────────────────────────────────────
   The brief asks for ~4,000 athletes AND a 3,000-row ranking page. Those
   two cannot both hold with realistic entrant counts: London alone fields
   ~14,000 entries. Resolution — a 4,000-strong *returning* pool that races
   repeatedly across seasons (so athlete pages have real history), topped up
   with one-off entrants per event. See DECISIONS.md D11. */

const RETURNING_POOL = 4000;
const PROGRESSION_ATHLETES = 300;

type PoolAthlete = {
  slug: string;
  name: string;
  countryIso: string;
  gender: "men" | "women";
  ageGroup: AgeGroup;
  /** z-score of ability: negative is faster than the division mean. */
  ability: number;
  /** Seconds per season of improvement, for the progression cohort. */
  trendPerSeason: number;
  isPlaceholder?: boolean;
  raceCount: number;
};

const SEASON_INDEX: Record<string, number> = { s7: 0, s8: 1, s9: 2 };

function ageGroupFor(rng: Rng): AgeGroup {
  return weightedPick(rng, [
    ["16-24", 9], ["25-29", 18], ["30-34", 22], ["35-39", 18], ["40-44", 13],
    ["45-49", 9], ["50-54", 6], ["55-59", 3], ["60-64", 1.5], ["65-69", 0.5],
  ] as const) as AgeGroup;
}

function buildPool(rng: Rng): PoolAthlete[] {
  const used = new Set<string>();
  const pool: PoolAthlete[] = [];

  const mint = (gender: "men" | "women", nation: string, placeholder?: { name: string }) => {
    const name = placeholder?.name ?? makeName(rng, gender, nation);
    let slug = slugify(name);
    let n = 2;
    while (used.has(slug)) slug = `${slugify(name)}-${n++}`;
    used.add(slug);
    pool.push({
      slug,
      name,
      countryIso: nation,
      gender,
      ageGroup: ageGroupFor(rng),
      ability: normal(rng, 0, 1),
      trendPerSeason: 0,
      isPlaceholder: placeholder ? true : undefined,
      raceCount: 0,
    });
    return pool[pool.length - 1];
  };

  // Storyline athletes first, so their slugs are never taken by a synthetic name.
  const ben = mint("men", "gb", { name: "Benjamin Sutherland" });
  ben.ability = -2.4;
  ben.trendPerSeason = -70;
  const harry = mint("men", "gb", { name: "Harry Sutherland" });
  harry.ability = -2.1;
  harry.trendPerSeason = -55;

  for (let i = pool.length; i < RETURNING_POOL; i++) {
    const gender = rng() < 0.58 ? "men" : "women";
    mint(gender, weightedPick(rng, DEFAULT_NATION_WEIGHTS));
  }

  // A cohort with modelled season-on-season improvement.
  for (const a of shuffle(rng, pool.slice()).slice(0, PROGRESSION_ATHLETES)) {
    if (a.trendPerSeason === 0) a.trendPerSeason = -uniform(rng, 40, 180);
  }

  return pool;
}

/* ─── Race generation ─────────────────────────────────────────────── */

function splitRace(rng: Rng, profile: DivisionProfile, finishSeconds: number) {
  // Roxzone is transition time: 5–9% of the race, tighter for elites.
  const roxShare = uniform(rng, 0.05, profile.headline ? 0.09 : 0.085);
  const roxzoneSeconds = Math.round(finishSeconds * roxShare);
  const working = finishSeconds - roxzoneSeconds;

  const runTotal = working * profile.runShare * uniform(rng, 0.96, 1.04);
  const stationTotal = working - runTotal;

  // Runs drift slower as the race goes on — the pacing story the charts tell.
  const drift = uniform(rng, 0.004, 0.022);
  const rawRuns = Array.from({ length: 8 }, (_, i) => (1 + drift * i) * uniform(rng, 0.97, 1.03));
  const rawRunSum = rawRuns.reduce((s, v) => s + v, 0);
  const runs = rawRuns.map((v) => Math.round((v / rawRunSum) * runTotal));

  const stations = {} as Record<StationId, number>;
  let allocated = 0;
  STATION_IDS.forEach((id, i) => {
    const jitter = uniform(rng, 0.85, 1.18);
    const value = Math.round(stationTotal * STATION_WEIGHTS[id] * jitter);
    stations[id] = value;
    allocated += value;
    if (i === STATION_IDS.length - 1) {
      // Absorb rounding drift into the last station so the parts sum to the whole.
      stations[id] += Math.round(stationTotal) - allocated;
      if (stations[id] < 30) stations[id] = 30;
    }
  });

  const actual = runs.reduce((s, v) => s + v, 0)
    + STATION_IDS.reduce((s, id) => s + stations[id], 0)
    + roxzoneSeconds;

  return { runs, stations, roxzoneSeconds, finishSeconds: actual };
}

function main() {
  const rng = makeRng(SEED);
  const pool = buildPool(rng);
  const poolByGender = {
    men: pool.filter((a) => a.gender === "men"),
    women: pool.filter((a) => a.gender === "women"),
  };

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const eventIndex: unknown[] = [];
  const athleteRaces = new Map<string, unknown[]>();
  let totalResults = 0;

  for (const seed of EVENT_SEEDS) {
    const slug = `${seed.season}-${seed.year}-${slugify(seed.city)}`;
    const nations = seed.nations ?? DEFAULT_NATION_WEIGHTS;
    const seasonIdx = SEASON_INDEX[seed.season] ?? 0;
    const divisions: unknown[] = [];
    const results: Record<string, unknown[]> = {};
    let eventAthletes = 0;

    for (const profile of DIVISION_PROFILES) {
      // Elite only shows up at the flagship and the championship-scale events.
      const isElite = profile.code.includes("elite");
      if (isElite && seed.size < 2.5) continue;

      const entrants = Math.max(8, Math.round(profile.baseEntrants * seed.size * uniform(rng, 0.9, 1.1)));
      // Upcoming events have start lists but no times.
      const hasTimes = seed.status !== "upcoming";

      const genderPool = profile.gender === "mixed"
        ? pool
        : poolByGender[profile.gender];

      const seen = new Set<string>();
      const rows: {
        athlete: PoolAthlete; finish: number; split: ReturnType<typeof splitRace>; dnf: boolean;
      }[] = [];

      for (let i = 0; i < entrants; i++) {
        // ~62% of a field are returning athletes; the rest are one-off entrants
        // minted on the spot so the pool is not asked to be in four places at once.
        let athlete: PoolAthlete;
        if (rng() < 0.62) {
          let guard = 0;
          do {
            athlete = genderPool[Math.floor(rng() * genderPool.length)];
            guard++;
          } while (seen.has(athlete.slug) && guard < 12);
          if (seen.has(athlete.slug)) continue;
        } else {
          const gender = profile.gender === "mixed" ? (rng() < 0.5 ? "men" : "women") : profile.gender;
          const nation = weightedPick(rng, nations);
          const name = makeName(rng, gender, nation);
          athlete = {
            slug: `${slugify(name)}-${slug}-${i}`,
            name,
            countryIso: nation,
            gender,
            ageGroup: ageGroupFor(rng),
            ability: normal(rng, 0, 1),
            trendPerSeason: 0,
            raceCount: 0,
          };
        }
        seen.add(athlete.slug);

        const trend = athlete.trendPerSeason * seasonIdx;
        const target = profile.meanSeconds
          + athlete.ability * profile.sdSeconds
          + trend
          + normal(rng, 0, profile.sdSeconds * 0.28);
        // Clamp at the division's world-class floor, with a little jitter so the
        // fast end does not pile up on one identical value.
        const raw = skewedNormal(rng, target, profile.sdSeconds * 0.12, profile.skew);
        const finish = Math.max(profile.floorSeconds * uniform(rng, 1.0, 1.035), raw);
        const dnf = hasTimes && rng() < profile.dnfRate;
        rows.push({ athlete, finish: Math.round(finish), split: splitRace(rng, profile, Math.round(finish)), dnf });
      }

      if (!hasTimes) {
        // Start list only: no times, no ranks.
        divisions.push({
          divisionCode: profile.code,
          label: profile.label,
          headline: profile.headline,
          athleteCount: rows.length,
          waves: buildWaves(rng, rows.length),
        });
        results[profile.code] = rows.map((r, i) => ({
          id: `${slug}-${profile.code}-${i}`,
          eventSlug: slug, division: profile.code,
          athleteSlug: r.athlete.slug, athleteName: r.athlete.name,
          countryIso: r.athlete.countryIso, ageGroup: r.athlete.ageGroup,
          status: "entered",
        }));
        eventAthletes += rows.length;
        continue;
      }

      const finishers = rows.filter((r) => !r.dnf).sort((a, b) => a.split.finishSeconds - b.split.finishSeconds);
      const agCounters = new Map<string, number>();
      const divisionResults = finishers.map((r, i) => {
        const agRank = (agCounters.get(r.athlete.ageGroup) ?? 0) + 1;
        agCounters.set(r.athlete.ageGroup, agRank);
        r.athlete.raceCount++;
        const row = {
          id: `${slug}-${profile.code}-${i + 1}`,
          eventSlug: slug,
          division: profile.code,
          athleteSlug: r.athlete.slug,
          athleteName: r.athlete.name,
          countryIso: r.athlete.countryIso,
          ageGroup: r.athlete.ageGroup,
          rank: i + 1,
          ageGroupRank: agRank,
          finishSeconds: r.split.finishSeconds,
          runs: r.split.runs,
          stations: r.split.stations,
          roxzoneSeconds: r.split.roxzoneSeconds,
          status: "finished" as const,
          ...(isDoubles(profile.code) || isRelay(profile.code)
            ? { partnerNames: [makeName(rng, profile.gender === "women" ? "women" : "men", r.athlete.countryIso)] }
            : {}),
        };
        if (!athleteRaces.has(r.athlete.slug)) athleteRaces.set(r.athlete.slug, []);
        athleteRaces.get(r.athlete.slug)!.push({
          eventSlug: slug, eventCity: seed.city, season: seed.season, year: seed.year,
          date: seed.start, division: profile.code, divisionLabel: profile.label,
          rank: row.rank, ageGroupRank: agRank, finishSeconds: row.finishSeconds, resultId: row.id,
        });
        return row;
      });

      for (const r of rows.filter((x) => x.dnf)) {
        divisionResults.push({
          id: `${slug}-${profile.code}-dnf-${r.athlete.slug}`,
          eventSlug: slug, division: profile.code,
          athleteSlug: r.athlete.slug, athleteName: r.athlete.name,
          countryIso: r.athlete.countryIso, ageGroup: r.athlete.ageGroup,
          rank: 0, ageGroupRank: 0, finishSeconds: 0,
          runs: [], stations: {}, roxzoneSeconds: 0,
          status: "dnf",
        } as never);
      }

      results[profile.code] = divisionResults;
      totalResults += divisionResults.length;
      eventAthletes += rows.length;
      divisions.push({
        divisionCode: profile.code,
        label: profile.label,
        headline: profile.headline,
        athleteCount: rows.length,
        finisherCount: finishers.length,
        leaderTimeSeconds: finishers[0]?.split.finishSeconds,
        leaderAthleteSlug: finishers[0]?.athlete.slug,
        leaderAthleteName: finishers[0]?.athlete.name,
        waves: buildWaves(rng, rows.length),
      });
    }

    writeFileSync(join(OUT_DIR, `event-${slug}.json`), JSON.stringify({ slug, results }));

    eventIndex.push({
      slug, season: seed.season, year: seed.year,
      name: `HYROX ${seed.city} ${seed.year}`,
      city: seed.city, cityLocal: seed.cityLocal, iata: seed.iata,
      country: seed.country, countryIso: seed.countryIso, region: seed.region,
      venue: seed.venue, startDate: seed.start, endDate: seed.end,
      status: seed.status, totalAthletes: eventAthletes, divisions,
    });
  }

  // Athlete index: only those with a race, sorted for stable output.
  const athleteIndex = pool
    .filter((a) => athleteRaces.has(a.slug))
    .map((a) => ({
      slug: a.slug, name: a.name, countryIso: a.countryIso, gender: a.gender,
      ageGroup: a.ageGroup, isPlaceholder: a.isPlaceholder ?? false,
      raceCount: athleteRaces.get(a.slug)!.length,
      races: athleteRaces.get(a.slug),
    }));

  writeFileSync(join(OUT_DIR, "events.json"), JSON.stringify(eventIndex));
  writeFileSync(join(OUT_DIR, "athletes.json"), JSON.stringify(athleteIndex));
  writeFileSync(join(OUT_DIR, "meta.json"), JSON.stringify({
    seed: SEED,
    generatedFrom: "scripts/generate-demo-data.ts",
    events: eventIndex.length,
    results: totalResults,
    profiledAthletes: athleteIndex.length,
  }, null, 2));

  console.log(`✓ ${eventIndex.length} events, ${totalResults.toLocaleString()} results, ${athleteIndex.length.toLocaleString()} profiled athletes`);
  console.log(`  → ${OUT_DIR}`);
}

/** Wave windows for start lists. Divisions run in 30-athlete waves. */
function buildWaves(rng: Rng, athletes: number) {
  const perWave = 30;
  const count = Math.max(1, Math.ceil(athletes / perWave));
  const startHour = intBetween(rng, 8, 16);
  return Array.from({ length: Math.min(count, 24) }, (_, i) => {
    const minutes = startHour * 60 + i * 20;
    return {
      wave: i + 1,
      time: `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
      athletes: i === count - 1 ? athletes - perWave * (count - 1) : perWave,
    };
  });
}

main();
