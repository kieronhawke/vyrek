/**
 * Ben's read on the numbers.
 *
 * The paid reports in this market put an Elite 15 athlete's commentary beside
 * each chart, and it is the best thing about them: a chart tells you what
 * happened, a coach tells you what to do about it. But theirs is *static* — the
 * same paragraph ships with every report, so an athlete who faded badly and one
 * who paced perfectly are told the same thing about pacing.
 *
 * These are selected by what the data actually says. Each section has several
 * notes and a predicate; the first that matches is the one that prints. So a
 * fading athlete reads about fading, and an even-paced one reads about what to
 * do with that strength instead — which is the whole point of having a coach
 * look at it.
 *
 * Written in Ben's voice: direct, specific, no hedging, and always ending on
 * the next action rather than the observation. Nothing here claims to know
 * anything the numbers do not show.
 */

export type NoteContext = {
  /** Coefficient of variation across runs 2–7. */
  runVariationPercent: number;
  /** Second-half runs minus first-half runs, in seconds. */
  fadeSeconds: number;
  /** Roxzone total against the division average, in seconds. */
  roxzoneDeltaSeconds: number;
  roxzoneShare: number;
  /** The athlete's overall percentile in the division. */
  overallPercentile: number;
  /** Percentile of their weakest and strongest stations. */
  weakestLabel: string;
  weakestPercentile: number;
  strongestLabel: string;
  strongestPercentile: number;
  /** Seconds available if every station matched their own best standard. */
  secondsAvailable: number;
  /** Net change against their previous race; null when this is their first. */
  netVsPreviousSeconds: number | null;
  racesLogged: number;
};

export type CoachNote = { heading: string; body: string[] };

type Rule = { when: (c: NoteContext) => boolean; note: CoachNote };

/** First matching rule wins, so order is priority. Every list ends in a catch-all. */
function pick(rules: Rule[], context: NoteContext): CoachNote {
  return (rules.find((r) => r.when(context)) ?? rules[rules.length - 1]).note;
}

export function pacingNote(context: NoteContext): CoachNote {
  return pick([
    {
      when: (c) => c.fadeSeconds > 45,
      note: {
        heading: "You faded, and it cost more than it looks",
        body: [
          "Your back-four runs were well down on your front four. That is almost never a "
          + "running problem — it is a pacing decision made in the first ten minutes that "
          + "you paid for from run five onwards.",
          "The fix is boring and it works: run the first two laps at a pace you could hold "
          + "for all eight, and hold something back through the sled push. Most people find "
          + "they finish faster while feeling slower for the first half of the race.",
        ],
      },
    },
    {
      when: (c) => c.fadeSeconds < -30,
      note: {
        heading: "You negative-split it, which almost nobody does",
        body: [
          "Your second half of running was faster than your first. That is a strong sign "
          + "your engine is not the limiter — you had more to give and you gave it late.",
          "Next race, take some of that back to the front end. Not a sprint start, but a "
          + "genuinely committed first two runs. You have proved you can hold the back half "
          + "together, so the risk is lower for you than for most.",
        ],
      },
    },
    {
      when: (c) => c.runVariationPercent < 3,
      note: {
        heading: "Metronomic",
        body: [
          "Your run splits barely moved across the middle of the race. That is a well-executed "
          + "race and it is harder than it sounds with a sled push in between.",
          "When the running is this even, the next minute usually comes from the stations or "
          + "the roxzone rather than from running harder. Look at where the time actually went "
          + "before you add running volume.",
        ],
      },
    },
    {
      when: (c) => c.runVariationPercent > 7,
      note: {
        heading: "Your runs were all over the place",
        body: [
          "A high variation across runs two to seven usually points at one station wrecking "
          + "the lap after it, rather than at your running.",
          "Find the run that fell off a cliff and look at what came before it. That station is "
          + "where your training should go — not the run itself.",
        ],
      },
    },
    {
      when: () => true,
      note: {
        heading: "Solid, controlled running",
        body: [
          "Your runs held together through the middle of the race with no obvious blow-up. "
          + "That is the platform everything else is built on.",
          "From here, the gains are in compromised running — practise running straight off the "
          + "sled and the lunges, not fresh.",
        ],
      },
    },
  ], context);
}

export function roxzoneNote(context: NoteContext): CoachNote {
  return pick([
    {
      when: (c) => c.roxzoneDeltaSeconds > 45,
      note: {
        heading: "The roxzone is your cheapest minute",
        body: [
          "You spent notably longer in transition than the division average. Nobody trains this "
          + "and everybody loses time to it — which is exactly why it is the easiest place on "
          + "this sheet to get time back.",
          "Know where you are going before you get there, do not stop at the water station, and "
          + "start moving before you have got your breath back. That is worth more than any "
          + "session you could do this week.",
        ],
      },
    },
    {
      when: (c) => c.roxzoneDeltaSeconds < -25,
      note: {
        heading: "Sharp in transition",
        body: [
          "You moved through the roxzone faster than the division average. That is free time and "
          + "most people never claim it.",
          "Keep it. When you are looking for the next improvement, it is not here — your "
          + "transitions are already doing their job.",
        ],
      },
    },
    {
      when: () => true,
      note: {
        heading: "Transitions are about average",
        body: [
          "Your roxzone time sits close to the division average, which means there is a little "
          + "there but not a lot.",
          "It is still the lowest-effort time on the sheet. Walking with purpose rather than "
          + "recovering on the move is usually worth twenty or thirty seconds across a race.",
        ],
      },
    },
  ], context);
}

export function stationNote(context: NoteContext): CoachNote {
  return pick([
    {
      when: (c) => c.overallPercentile - c.weakestPercentile > 25,
      note: {
        heading: `${context.weakestLabel} is the outlier`,
        body: [
          `You are racing at roughly the ${Math.round(context.overallPercentile)}th percentile `
          + `overall but sitting at the ${Math.round(context.weakestPercentile)}th on `
          + `${context.weakestLabel}. That gap is the single clearest thing in this report.`,
          "One station this far behind your own standard is a training gap, not a bad day. Give "
          + "it dedicated work twice a week for a block and it will come up to meet the rest of "
          + "your race.",
        ],
      },
    },
    {
      when: (c) => c.strongestPercentile - c.overallPercentile > 25,
      note: {
        heading: `${context.strongestLabel} is carrying you`,
        body: [
          `${context.strongestLabel} is well ahead of your overall standard. That is a real `
          + "strength and it is worth knowing, because it changes how you should race.",
          "Lean on it — go slightly harder there than feels balanced, and buy yourself room on "
          + "the stations where you are giving time away.",
        ],
      },
    },
    {
      when: () => true,
      note: {
        heading: "An even profile",
        body: [
          "No station is dramatically out of line with the rest of your race. That is a good "
          + "place to be — it means nothing is broken.",
          "It also means there is no single fix. Improvements from here come from raising the "
          + "whole thing, which is a longer job and mostly an aerobic one.",
        ],
      },
    },
  ], context);
}

export function potentialNote(context: NoteContext): CoachNote {
  return pick([
    {
      when: (c) => c.secondsAvailable > 240,
      note: {
        heading: "There is a lot on the table",
        body: [
          "The gap between your strongest station and your weakest is wide enough that bringing "
          + "the rest up to your own best level would take minutes off, not seconds.",
          "Do not try to fix all of it at once. Take the top two from the list and give them a "
          + "block. The rest will still be there afterwards.",
        ],
      },
    },
    {
      when: (c) => c.secondsAvailable < 60,
      note: {
        heading: "You raced close to your ceiling",
        body: [
          "Every station landed near the same standard, so there is very little left to claim by "
          + "rebalancing. You got what you had on the day.",
          "That is the point at which the next improvement has to come from being fitter rather "
          + "than from racing smarter. It is a good problem.",
        ],
      },
    },
    {
      when: () => true,
      note: {
        heading: "A realistic target, not a fantasy one",
        body: [
          "This figure is not what a perfect athlete would run. It is what you would have run if "
          + "every segment had matched the level you already reached on your best station, on "
          + "the same day, on the same legs.",
          "That makes it a target worth chasing rather than a number to feel bad about.",
        ],
      },
    },
  ], context);
}

export function progressNote(context: NoteContext): CoachNote {
  return pick([
    {
      when: (c) => c.netVsPreviousSeconds != null && c.netVsPreviousSeconds < -60,
      note: {
        heading: "Clear progress",
        body: [
          "You took real time off your last race. Look at which splits produced it — that is "
          + "where your training has been working, and it is worth knowing so you keep doing it.",
          "Progress is rarely even. The splits that did not move are your next block.",
        ],
      },
    },
    {
      when: (c) => c.netVsPreviousSeconds != null && c.netVsPreviousSeconds > 60,
      note: {
        heading: "Slower than last time, and that is information",
        body: [
          "A slower race is not automatically a worse one. Courses differ, fields differ, and "
          + "the state you arrived in differs. Check the split breakdown before you read anything "
          + "into the total.",
          "If the time went in one or two places, that is a specific problem with a specific fix. "
          + "If it went everywhere, it is usually fatigue or a training block that peaked wrong.",
        ],
      },
    },
    {
      when: (c) => c.racesLogged <= 1,
      note: {
        heading: "This is your baseline",
        body: [
          "First race on record, so there is nothing to compare against yet. That is fine — this "
          + "report is now the thing every future race gets measured against.",
          "The most useful thing you can do is race again on a similar course. Two data points "
          + "tell you far more than one.",
        ],
      },
    },
    {
      when: () => true,
      note: {
        heading: "Broadly where you were",
        body: [
          "Your total is close to your last race, but the splits underneath will have moved. "
          + "Those are the interesting part.",
          "A flat total with a changed shape usually means you have got better at one thing and "
          + "let another slip. Find both.",
        ],
      },
    },
  ], context);
}
