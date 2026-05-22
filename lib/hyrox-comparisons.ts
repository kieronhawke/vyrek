export type ComparisonDef = {
  slug: string;
  /** Opponent name as used in copy. */
  opposite: string;
  /** Eyebrow. */
  eyebrow: string;
  /** Title H1. */
  title: string;
  /** Meta description. */
  hook: string;
  /** Intro paragraphs. */
  intro: string[];
  /** Side-by-side comparison rows. */
  rows: { axis: string; hyrox: string; other: string }[];
  /** Verdict paragraph. */
  verdict: string;
  /** FAQs. */
  faqs: { q: string; a: string }[];
};

export const COMPARISONS: ComparisonDef[] = [
  {
    slug: "hyrox-vs-crossfit",
    opposite: "CrossFit",
    eyebrow: "Hyrox vs CrossFit",
    title: "Hyrox vs CrossFit: which is harder, and which is right for you?",
    hook: "Hyrox and CrossFit look similar from the outside. They're built on different principles. The honest comparison.",
    intro: [
      "Hyrox is a fixed-format hybrid race: 8 stations, 8 × 1 km runs, in the same order every time. CrossFit is open-format functional fitness — workouts change daily, the movements span everything from Olympic lifting to gymnastics.",
      "If you want a measurable race you can train backwards from, Hyrox. If you want a daily fitness practice with variety, CrossFit. They're complementary as much as they're competing.",
    ],
    rows: [
      { axis: "Format", hyrox: "Fixed: 8 stations + 8 runs", other: "Open: changes daily" },
      { axis: "Race distance", hyrox: "~10 km running + stations (60-120 min)", other: "Workouts typically 10-30 min" },
      { axis: "Skill complexity", hyrox: "Low-to-moderate (no Olympic lifts, no gymnastics)", other: "High (snatch, muscle-up, handstand walk)" },
      { axis: "Entry barrier", hyrox: "Run 5 km + basic strength", other: "Months of skill acquisition" },
      { axis: "Programming style", hyrox: "Periodised 12-week builds", other: "Daily WOD or Open prep cycles" },
      { axis: "Race scene", hyrox: "Global, fixed-format, predictable", other: "CrossFit Games, Semifinals, Opens" },
    ],
    verdict:
      "If you're race-motivated and want a clear finish-time goal, Hyrox is simpler to train for and easier to measure. If you want daily variety and don't mind learning complex movements, CrossFit. Many athletes do both — CrossFit for the off-season, Hyrox for the race build.",
    faqs: [
      {
        q: "Is Hyrox easier than CrossFit?",
        a: "Easier to start, just as hard to finish well. Hyrox movements are simpler — no Olympic lifts, no gymnastics — but the aerobic demand over 60-120 minutes is significant. CrossFit favours short-burst capacity; Hyrox favours sustained aerobic + station endurance.",
      },
      {
        q: "Can I train for both Hyrox and CrossFit?",
        a: "Yes, in cycles. Most athletes pick one as the main focus for a 12-week build and use the other as cross-training. Doing both at competitive intensity year-round leads to overtraining.",
      },
    ],
  },
  {
    slug: "hyrox-vs-spartan",
    opposite: "Spartan Race",
    eyebrow: "Hyrox vs Spartan",
    title: "Hyrox vs Spartan Race: which one suits you?",
    hook: "Hyrox is indoor, fixed-format, race-clock. Spartan is outdoor, obstacle-course, weather-dependent. How they differ.",
    intro: [
      "Hyrox happens in arenas — climate-controlled floors, identical lanes, same stations every race. Spartan happens outdoors — mountain courses, mud, weather, varied obstacles.",
      "Both reward functional strength and endurance. The day-of-race experience is very different.",
    ],
    rows: [
      { axis: "Venue", hyrox: "Indoor arena", other: "Outdoor course (mountain, beach, urban)" },
      { axis: "Distance options", hyrox: "Single format (open / pro / doubles)", other: "Sprint (5 km), Super (10 km), Beast (21 km), Ultra (50 km)" },
      { axis: "Obstacles", hyrox: "8 fixed stations, predictable order", other: "20-60 varied obstacles, unknown order" },
      { axis: "Weather dependent", hyrox: "No", other: "Yes — significantly" },
      { axis: "Train indoors only?", hyrox: "Yes", other: "Partially — outdoor practice needed" },
      { axis: "Predictability", hyrox: "Same race format every time", other: "Course changes per event" },
    ],
    verdict:
      "If you want a measurable race you can train for from a gym, Hyrox. If you want adventure, mud, and variety, Spartan. Hyrox is easier to train backwards from because the demands are fixed; Spartan rewards generalists with adaptability.",
    faqs: [
      {
        q: "Is Spartan harder than Hyrox?",
        a: "Different hard. Spartan adds weather, terrain, and unknown obstacles — mentally more taxing. Hyrox is harder per minute on the clock — sustained, predictable, no respite.",
      },
    ],
  },
  {
    slug: "hyrox-vs-marathon",
    opposite: "Marathon",
    eyebrow: "Hyrox vs Marathon",
    title: "Hyrox vs Marathon: two endurance events, different sports",
    hook: "Both are 60-180 minutes of effort. The training is almost nothing alike.",
    intro: [
      "A marathon is 42.2 km of running. The training is 4-5 months of progressive running volume — typically 50-100 km per week — with race pace dialed into the body.",
      "Hyrox is 10 km of running broken across 8 hybrid station efforts. Training looks more like CrossFit with serious aerobic emphasis — 30-40 km running per week plus 3-4 station sessions.",
    ],
    rows: [
      { axis: "Distance", hyrox: "~10 km running + 8 stations", other: "42.2 km running only" },
      { axis: "Duration", hyrox: "60-120 minutes", other: "150-360 minutes" },
      { axis: "Weekly run volume", hyrox: "30-40 km", other: "50-100 km" },
      { axis: "Strength training", hyrox: "3-4 sessions weekly", other: "1-2 sessions optional" },
      { axis: "Recovery rate", hyrox: "1-2 weeks", other: "3-4 weeks" },
      { axis: "Race-day fuel needed", hyrox: "Minimal mid-race", other: "Gels every 30 min" },
    ],
    verdict:
      "If you love running for its own sake, marathon. If you want a shorter, more hybrid event with variety, Hyrox. Many athletes who marathon migrate to Hyrox in their off-season because the recovery is faster and the strength stays.",
    faqs: [
      {
        q: "Can a marathon runner do Hyrox?",
        a: "Yes — usually well. Marathon runners have the aerobic engine; what they need is station-specific strength and the muscular endurance for sled push, wall balls, and farmers carries. 8-12 weeks of station integration is typical for a first Hyrox.",
      },
    ],
  },
  {
    slug: "hyrox-vs-triathlon",
    opposite: "Triathlon",
    eyebrow: "Hyrox vs Triathlon",
    title: "Hyrox vs Triathlon: hybrid sport, different muscles",
    hook: "Both are hybrid endurance. Triathlon spreads across swim-bike-run. Hyrox stays on the floor.",
    intro: [
      "Triathlon trains three disciplines plus transitions. Hyrox trains running, station strength endurance, and pacing under fatigue. Different muscle groups, different scheduling demands.",
      "Triathlon needs pool access, a bike, and outdoor space. Hyrox needs a gym.",
    ],
    rows: [
      { axis: "Disciplines", hyrox: "Run + 8 strength stations", other: "Swim + bike + run" },
      { axis: "Kit cost", hyrox: "Gym membership", other: "Bike, wetsuit, goggles, tri-suit" },
      { axis: "Weekly hours", hyrox: "4-7 hours", other: "8-15 hours (sprint to long course)" },
      { axis: "Race duration", hyrox: "60-120 min", other: "70 min (sprint) to 8+ hours (Ironman)" },
      { axis: "Indoor friendly", hyrox: "Yes", other: "Partially (pool needed)" },
    ],
    verdict:
      "If you love multisport variety and have the kit budget, triathlon. If you want a shorter weekly time commitment and indoor training, Hyrox. Many ex-triathletes find Hyrox a refreshing change after a long-course season.",
    faqs: [
      {
        q: "Is Hyrox easier than triathlon?",
        a: "Shorter and cheaper to train for. Same effort per minute on the day. A first sprint triathlon and a first Hyrox both take 12-16 weeks of structured prep for most adults.",
      },
    ],
  },
  {
    slug: "hyrox-vs-f45",
    opposite: "F45",
    eyebrow: "Hyrox vs F45",
    title: "Hyrox vs F45: class-based training vs race-specific programming",
    hook: "F45 is a class. Hyrox is a race. The training needed for each is fundamentally different.",
    intro: [
      "F45 is a structured 45-minute group class — varied workouts, group atmosphere, designed for general fitness. Hyrox is a competitive race with a fixed format you train backwards from.",
      "If you want general fitness with social motivation, F45. If you want a measurable race goal, Hyrox.",
    ],
    rows: [
      { axis: "Format", hyrox: "Periodised 12-week race build", other: "45-min group class, varied daily" },
      { axis: "Outcome measured by", hyrox: "Finish time on race day", other: "Class attendance, perceived effort" },
      { axis: "Training environment", hyrox: "Gym, programmed sessions", other: "F45 studio" },
      { axis: "Cost", hyrox: "£4.99/mo (Vyrek) + gym", other: "£100-180/mo F45 membership" },
      { axis: "Race option", hyrox: "Yes — global calendar", other: "F45 Playoffs (limited)" },
    ],
    verdict:
      "F45 is great for adherence and group energy. Hyrox is better if you want a clear race outcome. You can do F45 and Hyrox-train at the same time — just don't expect F45 alone to prepare you for a Hyrox finish in the time you're hoping for.",
    faqs: [
      {
        q: "Can F45 prepare me for Hyrox?",
        a: "Partially. F45 builds general fitness but isn't race-specific. Most F45 members who attempt Hyrox underestimate the sustained sled push and the wall ball volume. Add 8-12 weeks of Hyrox-pattern training to your F45 schedule for a comfortable finish.",
      },
    ],
  },
];

export function getComparison(slug: string): ComparisonDef | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}

export function listComparisonSlugs(): string[] {
  return COMPARISONS.map((c) => c.slug);
}
