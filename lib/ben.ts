/**
 * Ben Sutherland: the record, in one place.
 *
 * Source: Ben's own written bio, supplied by Kieron 30 July 2026. Reworded
 * for the site but no claim added, removed or inflated. Everything here is
 * a factual claim about a real person, so it is kept as data rather than
 * scattered through copy: one edit fixes every surface.
 *
 * HARD-RULES compliance: these are the athlete's own stated credentials,
 * not invented social proof, and the HYROX ones are checkable against
 * public results. See `docs/ben-research-dossier.md` for the verified
 * subset that predates this bio.
 *
 * KNOWN CONFLICT, flagged for Kieron: Ben's bio says "5 E15 majors" in the
 * opening paragraph and "4 elite 15 majors" in the credentials list. We use
 * the lower number until he confirms which is right.
 */

export const BEN = {
  name: "Ben Sutherland",
  firstName: "Ben",
  role: "Founder and head coach",
  instagram: "https://instagram.com/bennysuth95",

  /** First person, for places where Ben speaks directly to the reader. */
  intro:
    "I'm an elite HYROX athlete with over a decade competing and coaching in elite sport. I was a national-class 1500m runner and raced at D1 level in the NCAA before I found HYROX, where I've broken world and British records.",

  /**
   * The line that matters most to a beginner. Deliberately leads with who
   * he coaches rather than what he has won.
   */
  beginnerPromise:
    "Most of the people I coach have never competed at anything. They came to me because nothing had stuck before, and that is almost always the plan's fault rather than theirs.",

  /**
   * The line that matters most to an athlete: the range of outcomes he has
   * actually coached, not just the ones he has raced.
   */
  athletePromise:
    "First race to world titles. Whatever you're chasing, I've coached someone through it.",

  racing: [
    "2 HYROX world records",
    "4 British records",
    "5 age-group world records",
    "6th, Elite 15 World Championships, Doubles (2025)",
    "Podium, Mixed Doubles, World Championships (2026)",
    "4 Elite 15 majors",
    "Multiple Hybrid Games and Turf Games wins",
  ],

  coaching: [
    "An age-group world record",
    "An age-group world title",
    "An age-group British record",
    "An age-group world podium and a world top 10",
    "The fastest open doubles in India",
  ],

  background: [
    "National-class 1500m runner",
    "D1 NCAA athlete",
    "Former boxer",
  ],

  /** Long-form appearances, for the about page and proof surfaces. */
  media: [
    {
      kind: "video" as const,
      label: "Ben on YouTube",
      url: "https://www.youtube.com/watch?v=4YrF-RkSgHc",
    },
    {
      kind: "podcast" as const,
      label: "Ben on the podcast",
      url: "https://open.spotify.com/episode/1wX6jyyU6ouDYTEnaMFoo3",
    },
  ],

  /**
   * Real photography, July 2026 intake, cleared for use by Kieron.
   * Every camp frame is portrait 2:3, which suits tall slots like the quiz
   * interstitials; `-wide` variants exist for landscape slots.
   */
  portrait: "/media/images/camp/camp-portrait-forders-banner.jpg",
  portraitAlt:
    "Ben Sutherland front-on after an effort at a training camp, Forders banner behind him",
  coachingImage: "/media/images/camp/camp-trail-run-group.jpg",
  coachingImageAlt:
    "A group running together on a gravel track at a Suth Performance training camp",
} as const;

/**
 * The three proof points shown to an athlete in the quiz. Short enough to
 * read in the two seconds someone gives an interstitial.
 */
export const BEN_ATHLETE_PROOF: string[] = [
  "2 world records",
  "4 British records",
  "6th Elite 15 Worlds, Doubles",
];

/**
 * The beginner equivalent. Deliberately not a wall of records: the job on
 * this rail is to show he is safe hands, not to intimidate.
 */
export const BEN_BEGINNER_PROOF: string[] = [
  "Coaches total beginners",
  "Elite-level athlete",
  "Over a decade in elite sport",
];
