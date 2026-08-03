/**
 * The Course Speed Index.
 *
 * Every HYROX race is nominally identical — same eight runs, same eight
 * stations, same weights. Athletes know perfectly well that it is not: a venue
 * with a long, tight roxzone, a sticky floor, a hot hall or a 400m lap split
 * across two rooms costs minutes. Nobody publishes that, because nobody joins
 * the results of one venue to the results of every other. We already do.
 *
 * ## What this measures, precisely
 *
 * For a reference division at one edition we take two numbers — the field's
 * **median** finish and the **winner's** finish — and express each as a
 * percentage against the same statistic pooled across every sampled edition.
 * Positive means slower than the pool.
 *
 * ## What it does not measure
 *
 * A median is a fact about the people who entered, not only about the course.
 * A championship draws a deeper field and posts a faster median on an
 * identical layout. Publishing that as "difficulty" would be dishonest, which
 * is why this is called a *speed* index and why both columns are shown.
 *
 * The two columns are what makes it readable. A venue where the winner *and*
 * the median both ran slow is evidence about the course, because the front of
 * the field is the part least sensitive to who else turned up. A venue where
 * only the median moved is evidence about the entry list. Showing one number
 * would hide that distinction; showing both hands it to the reader.
 *
 * The honest upgrade is a paired comparison — the same athletes measured at
 * two venues in one season, which controls for field quality outright. That
 * needs athlete-level cross-event data, and is noted in DECISIONS.md as the
 * next step rather than pretended at here.
 *
 * Pure functions only, so the whole thing is testable without a data source.
 */

/** One edition's reference-division sample. */
export type EditionSample = {
  eventSlug: string;
  eventName: string;
  city: string;
  citySlug: string;
  country: string;
  countryIso: string;
  venue: string;
  season: string;
  year: number;
  /** Ascending finish times for the reference division. */
  finishTimes: number[];
};

export type CourseRating = {
  eventSlug: string;
  eventName: string;
  city: string;
  citySlug: string;
  country: string;
  countryIso: string;
  venue: string;
  season: string;
  year: number;
  fieldSize: number;
  medianSeconds: number;
  winnerSeconds: number;
  /** % against the pooled median. Positive = the field ran slower here. */
  medianIndex: number;
  /** % against the pooled winning time. Positive = the front ran slower here. */
  winnerIndex: number;
  /**
   * What the two columns agree on.
   *
   * `course` — both moved the same way by a meaningful margin, so the venue
   * is the likelier explanation. `field` — the median moved but the winner did
   * not, which is what a shallower or deeper entry list looks like. `par` —
   * neither moved enough to call.
   */
  signal: "course" | "field" | "par";
};

export type CourseBaseline = {
  medianSeconds: number;
  winnerSeconds: number;
  editions: number;
};

/** Median of a numeric array. Returns 0 for an empty one rather than NaN. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * The pool every edition is measured against.
 *
 * A median of per-edition medians, not a median of all finishers pooled
 * together. Pooling would weight the baseline towards whichever races were
 * biggest — London alone would define "normal" — and then measure London
 * against itself.
 */
export function courseBaseline(
  samples: EditionSample[],
  minFieldSize = 100,
): CourseBaseline {
  const usable = samples.filter((s) => s.finishTimes.length >= minFieldSize);
  return {
    medianSeconds: median(usable.map((s) => median(s.finishTimes))),
    winnerSeconds: median(usable.map((s) => Math.min(...s.finishTimes))),
    editions: usable.length,
  };
}

/** Percentage difference against a baseline, guarded against a zero pool. */
function indexOf(value: number, baseline: number): number {
  if (!baseline || !value) return 0;
  return Math.round(((value / baseline) - 1) * 1000) / 10;
}

/**
 * How confidently the two columns can be read together.
 *
 * 1.5% is a little under two minutes on a ninety-minute race — comfortably
 * above sampling noise on a field of hundreds, and small enough that genuine
 * venue effects are not rounded away.
 */
const MEANINGFUL = 1.5;

export function rateCourses(
  samples: EditionSample[],
  baseline: CourseBaseline,
  minFieldSize = 100,
): CourseRating[] {
  const ratings: CourseRating[] = [];

  for (const sample of samples) {
    // Below the threshold the median is noise, and a league table that ranks
    // noise at the top is worse than a shorter table.
    if (sample.finishTimes.length < minFieldSize) continue;

    const medianSeconds = median(sample.finishTimes);
    const winnerSeconds = Math.min(...sample.finishTimes);
    const medianIndex = indexOf(medianSeconds, baseline.medianSeconds);
    const winnerIndex = indexOf(winnerSeconds, baseline.winnerSeconds);

    const bothMoved = Math.abs(medianIndex) >= MEANINGFUL
      && Math.abs(winnerIndex) >= MEANINGFUL
      && Math.sign(medianIndex) === Math.sign(winnerIndex);
    const onlyFieldMoved = Math.abs(medianIndex) >= MEANINGFUL
      && Math.abs(winnerIndex) < MEANINGFUL;

    ratings.push({
      eventSlug: sample.eventSlug,
      eventName: sample.eventName,
      city: sample.city,
      citySlug: sample.citySlug,
      country: sample.country,
      countryIso: sample.countryIso,
      venue: sample.venue,
      season: sample.season,
      year: sample.year,
      fieldSize: sample.finishTimes.length,
      medianSeconds,
      winnerSeconds,
      medianIndex,
      winnerIndex,
      signal: bothMoved ? "course" : onlyFieldMoved ? "field" : "par",
    });
  }

  // Slowest first: "which is the toughest race" is the question people arrive
  // with, so the answer is the first row rather than the last.
  return ratings.sort((a, b) => b.medianIndex - a.medianIndex);
}

/** Plain-English reading of one row, for the page and for the FAQ answers. */
export function describeRating(rating: CourseRating): string {
  const dir = rating.medianIndex > 0 ? "slower" : "faster";
  const size = Math.abs(rating.medianIndex);

  if (rating.signal === "par") {
    return `${rating.eventName} ran within ${MEANINGFUL}% of the pooled median — `
      + `an average-speed race by both measures.`;
  }
  if (rating.signal === "course") {
    return `${rating.eventName} ran ${size}% ${dir} than the pooled median, and the `
      + `winning time moved the same way by ${Math.abs(rating.winnerIndex)}%. `
      + `When the front of the field and the middle agree, the venue is the `
      + `likelier explanation than the entry list.`;
  }
  return `${rating.eventName} ran ${size}% ${dir} than the pooled median, but the `
    + `winning time was normal. That pattern points at who entered rather than `
    + `at the course itself.`;
}
