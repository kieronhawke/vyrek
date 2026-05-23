/**
 * Goal-time and audience plan templates. Drives the /plans/[slug]
 * programmatic pages, one per high-intent keyword cluster.
 */

export type PlanTemplate = {
  slug: string;
  kind: "goal-time" | "audience";
  /** Display title used in H1 and meta. */
  title: string;
  /** Short hook for the meta description. */
  hook: string;
  /** Eyebrow tag above the H1. */
  eyebrow: string;
  /** Suggested programme slug (passed to /quiz?program=). */
  programmeSlug: "first-race" | "sub-90" | "doubles" | "pro";
  /** Long-form intro paragraph(s). */
  intro: string[];
  /** Who it's for (4-6 bullets). */
  whoFor: string[];
  /** Prerequisites (4-6 bullets). */
  prerequisites: string[];
  /** Sample week. 4-7 sessions. */
  sampleWeek: { day: string; session: string; detail: string }[];
  /** Page FAQs. */
  faqs: { q: string; a: string }[];
};

export const PLAN_TEMPLATES: PlanTemplate[] = [
  // ─── Goal-time variants ────────────────────────────────────
  {
    slug: "sub-60-hyrox-training-plan",
    kind: "goal-time",
    title: "Sub-60 Hyrox training plan",
    hook: "The plan for elite-track Hyrox athletes targeting a sub-60-minute finish. Race-specific, brutal, calibrated.",
    eyebrow: "Pro · Elite",
    programmeSlug: "pro",
    intro: [
      "A sub-60 Hyrox is an Elite 15 finishing time. It demands a sub-3:45 1 km run held repeatedly under fatigue, station splits in the 60-90 second range, and transitions of under 8 seconds.",
      "This plan is for athletes already racing under 70 minutes who want to chase a Pro-division spot. It's a 12-week build with three phases: aerobic ceiling, threshold density, race simulation.",
    ],
    whoFor: [
      "Athletes already finishing Hyrox under 70 minutes consistently.",
      "Sub-22-minute 5 km runners with strong base mileage.",
      "Hyrox racers with 12+ months of station-specific work behind them.",
      "Athletes able to train 6 days per week, 60-90 minutes per session.",
    ],
    prerequisites: [
      "Current 5 km PR under 21:00.",
      "Sled push at race weight comfortably under 1:45.",
      "100 unbroken wall balls in under 4:30.",
      "Access to a full commercial gym with sleds, kettlebells, and a SkiErg.",
    ],
    sampleWeek: [
      {
        day: "Monday",
        session: "Threshold intervals",
        detail: "6 × 1 km at goal Hyrox pace, 90 sec rest. Aerobic ceiling.",
      },
      {
        day: "Tuesday",
        session: "Station strength block",
        detail: "Heavy sled push, sled pull, sandbag carries. Compound lifts at 80% 1RM.",
      },
      {
        day: "Wednesday",
        session: "Recovery + technique",
        detail: "Easy 8 km Zone 2 + 30 min wall ball / burpee broad jump technique.",
      },
      {
        day: "Thursday",
        session: "Race simulation half",
        detail: "4 km of running with 4 stations at race weight. Sub-30 min target.",
      },
      {
        day: "Friday",
        session: "Strength",
        detail: "Squat / deadlift / push press. Heavy. Off the floor for the weekend.",
      },
      {
        day: "Saturday",
        session: "Long Hyrox-pattern",
        detail: "8 km running + 6 stations at race weight. Full race-rehearsal energy.",
      },
      { day: "Sunday", session: "Rest", detail: "Active recovery walk only." },
    ],
    faqs: [
      {
        q: "Is a sub-60 Hyrox finish realistic?",
        a: "For Elite 15 athletes, yes. For the rest of us, it's a benchmark to chase, not a guarantee. Most athletes who break 60 minutes have 18-24 months of dedicated training behind them and a competitive endurance background.",
      },
      {
        q: "Do I need to train every day for sub-60?",
        a: "Six days a week is typical. The seventh is a true rest day, not a 'light' day. Recovery is when adaptation happens. Without it, the volume just accumulates fatigue.",
      },
    ],
  },
  {
    slug: "sub-75-hyrox-training-plan",
    kind: "goal-time",
    title: "Sub-75 Hyrox training plan",
    hook: "Break 75 minutes with a structured 12-week build. Sample week, prerequisites, training plan.",
    eyebrow: "Sub-90 · advanced",
    programmeSlug: "sub-90",
    intro: [
      "A sub-75 Hyrox is a serious age-group finish. You're holding 4:00-4:30/km running pace, station splits inside the target ranges, and recovering well enough between elements to repeat the pattern.",
      "This 12-week build assumes you've finished a Hyrox already and want a sharper structure. Three phases: aerobic build, race-specific intensity, peak.",
    ],
    whoFor: [
      "Athletes who've finished one or more Hyrox races between 80-90 minutes.",
      "Sub-24-minute 5 km runners.",
      "Athletes training 5 days per week, 60-75 minutes per session.",
      "Anyone serious about breaking 75 in their next 12-week cycle.",
    ],
    prerequisites: [
      "Sub-24 minute 5 km baseline.",
      "Sled push at race weight under 2:00.",
      "75-100 unbroken wall balls in under 5 minutes.",
      "Standard commercial gym access.",
    ],
    sampleWeek: [
      {
        day: "Monday",
        session: "Threshold run",
        detail: "5 × 1 km at goal pace, 90 sec rest.",
      },
      {
        day: "Tuesday",
        session: "Station block",
        detail:
          "Sled push, burpee broad jump, sandbag lunge intervals.",
      },
      {
        day: "Wednesday",
        session: "Easy aerobic",
        detail: "10 km Zone 2 run.",
      },
      {
        day: "Thursday",
        session: "Strength + transitions",
        detail: "Compound lifts at 75-80% 1RM, plus transition rehearsal.",
      },
      {
        day: "Saturday",
        session: "Hyrox-pattern long",
        detail: "5 km running + 5 stations at race weight.",
      },
    ],
    faqs: [
      {
        q: "How long to break 75 from 90?",
        a: "Most athletes can take 10-15 minutes off in a 12-week dedicated build. Going from 90 to 75 means aerobic ceiling work plus station strength density. Pacing discipline alone usually gets the first 5 minutes.",
      },
    ],
  },
  {
    slug: "sub-90-hyrox-training-plan",
    kind: "goal-time",
    title: "Sub-90 Hyrox training plan",
    hook: "Break 90 minutes with the Sub-90 programme. 12 weeks, diagnostic-led, plateau-breaker.",
    eyebrow: "Sub-90 · benchmark",
    programmeSlug: "sub-90",
    intro: [
      "A sub-90 Hyrox is the benchmark age-group finish, strong, consistent, race-tested. Most athletes who break 90 do so on their second or third race after a structured build.",
      "Vyrek's Sub-90 programme starts with a diagnostic block: three race-simulation sessions across weeks 1-3 that identify whether your limiter is aerobic capacity, station strength, or pacing discipline. The next 9 weeks target whichever one's holding you back.",
    ],
    whoFor: [
      "Athletes who've finished one Hyrox between 95-110 minutes.",
      "Runners with a sub-26-minute 5 km base.",
      "Anyone stuck at the same finish time across multiple races.",
    ],
    prerequisites: [
      "Sub-26 minute 5 km PR.",
      "Sled push at race weight under 3:00.",
      "Comfortable with 75+ wall balls in a single session.",
    ],
    sampleWeek: [
      {
        day: "Monday",
        session: "Tempo run",
        detail: "6 km at threshold pace.",
      },
      {
        day: "Tuesday",
        session: "Station strength",
        detail: "Sled work + heavy compound lifts.",
      },
      {
        day: "Thursday",
        session: "Hyrox-pattern intervals",
        detail: "3 km running + 3 stations.",
      },
      {
        day: "Saturday",
        session: "Long aerobic",
        detail: "10-12 km Zone 2.",
      },
    ],
    faqs: [
      {
        q: "What's the most common reason athletes can't break 90?",
        a: "Pacing. Most plateau athletes positive-split their races by 45+ seconds per kilometre. Eliminating that gap alone often takes 3-4 minutes off the finish time without any fitness gain.",
      },
    ],
  },
  {
    slug: "sub-100-hyrox-training-plan",
    kind: "goal-time",
    title: "Sub-100 Hyrox training plan",
    hook: "Break 100 minutes with a structured 12-week plan. Built for first-race graduates moving to their second.",
    eyebrow: "Intermediate",
    programmeSlug: "first-race",
    intro: [
      "A sub-100 Hyrox is the natural progression after a successful first race. You've felt the format, you know the stations, and you're ready to add real pace.",
      "This 12-week build assumes you finished your first Hyrox between 100-120 minutes and you're ready to add structure. Aerobic base, then race-specific work, then taper.",
    ],
    whoFor: [
      "Athletes who finished their first Hyrox in 100-120 minutes.",
      "Recreational runners with consistent training behind them.",
      "Anyone who wants a second-race PR by 10-20 minutes.",
    ],
    prerequisites: [
      "Sub-28 minute 5 km PR.",
      "Comfortable with 50+ wall balls in a single session.",
      "4 days per week training availability.",
    ],
    sampleWeek: [
      {
        day: "Tuesday",
        session: "Tempo run",
        detail: "5 km at threshold pace.",
      },
      {
        day: "Thursday",
        session: "Hyrox-pattern hybrid",
        detail: "4 rounds of 600 m + station.",
      },
      {
        day: "Saturday",
        session: "Long Zone 2",
        detail: "75-90 minutes.",
      },
    ],
    faqs: [
      {
        q: "Can I break 100 on 4 days a week?",
        a: "Yes. Most sub-100 finishers train 4 sessions a week. The structure matters more than the count, one long aerobic, one tempo, one Hyrox-pattern hybrid, one strength.",
      },
    ],
  },

  // ─── Audience variants ────────────────────────────────────
  {
    slug: "hyrox-training-plan-beginner",
    kind: "audience",
    title: "Beginner Hyrox training plan",
    hook: "Your first Hyrox in 12 weeks. Zero CrossFit background needed. Built for someone who's never raced.",
    eyebrow: "First Race",
    programmeSlug: "first-race",
    intro: [
      "Vyrek's First Race programme is built for total Hyrox beginners, athletes who've never raced and may not have done a CrossFit-style workout before. The 12 weeks build aerobic capacity, station competence, and race-pattern familiarity, in that order.",
      "You don't need to be a sub-25 runner. You don't need a CrossFit gym. You need 4 hours a week and a willingness to follow a plan written by Elite 15 coaches.",
    ],
    whoFor: [
      "Anyone signed up for their first Hyrox.",
      "Runners moving from 5k/10k to a hybrid format.",
      "Gym-goers who want a race goal beyond aesthetics.",
      "Athletes returning to training after a year+ off.",
    ],
    prerequisites: [
      "Able to run 5 km without stopping (any pace).",
      "Able to squat your bodyweight.",
      "No active injuries preventing high-rep movement.",
    ],
    sampleWeek: [
      {
        day: "Monday",
        session: "Easy run",
        detail: "45 minutes Zone 2.",
      },
      {
        day: "Wednesday",
        session: "Strength A",
        detail: "Hinge, push, pull, core. Sets of 8-12.",
      },
      {
        day: "Friday",
        session: "Hyrox-pattern hybrid",
        detail: "3 rounds of 600 m + one station. Half race-pace.",
      },
      {
        day: "Sunday",
        session: "Long aerobic",
        detail: "60-75 minutes Zone 2.",
      },
    ],
    faqs: [
      {
        q: "Is 12 weeks enough to train for my first Hyrox?",
        a: "Yes, for anyone with a basic running and strength baseline. If you can run 5 km without stopping and squat your bodyweight, 12 weeks is plenty for a first-time finish in the 100-110 minute range.",
      },
      {
        q: "Do I need to be a CrossFit athlete to train for Hyrox?",
        a: "No. Hyrox is more accessible than CrossFit, the movements are simpler (no Olympic lifts, no gymnastics) and the format is predictable. A consistent runner with basic strength training can finish their first Hyrox in 12 weeks.",
      },
    ],
  },
  {
    slug: "hyrox-training-plan-female",
    kind: "audience",
    title: "Hyrox training plan for women",
    hook: "Personalised Hyrox programming for women athletes. Calibrated loads, race-specific work, designed by Elite 15 coaches.",
    eyebrow: "Women",
    programmeSlug: "first-race",
    intro: [
      "Vyrek programmes auto-calibrate to women's open standards: 102 kg sled push, 78 kg sled pull, 16 kg farmers carry, 6 kg wall ball to a 9 ft target. Sandbag lunge weight scales as a percentage of your body weight.",
      "The training plan is the same structure, aerobic base, race-specific intensity, peak and taper, with loads dialled to your category and bodyweight.",
    ],
    whoFor: [
      "Women preparing for their first Hyrox.",
      "Women returning after pregnancy or break.",
      "Women chasing a sub-90 or sub-75 PR.",
      "Mixed-doubles teams (the female athlete's calibration).",
    ],
    prerequisites: [
      "Comfortable running 5 km continuously.",
      "Some history of strength training.",
      "Access to a gym with kettlebells, a sled, and wall ball setup.",
    ],
    sampleWeek: [
      {
        day: "Monday",
        session: "Tempo run",
        detail: "5 km at goal Hyrox pace.",
      },
      {
        day: "Wednesday",
        session: "Strength",
        detail: "Compound lifts at 70-80% 1RM, lower-body emphasis.",
      },
      {
        day: "Friday",
        session: "Hyrox-pattern intervals",
        detail: "4 rounds of 500 m + station at race weight.",
      },
      {
        day: "Sunday",
        session: "Long Zone 2",
        detail: "60-90 minutes.",
      },
    ],
    faqs: [
      {
        q: "Are Hyrox women's open standards realistic for a beginner?",
        a: "Yes. The 102 kg sled and 16 kg kettlebells feel intimidating on paper but the build progresses your tolerance. Most first-time women's open finishers complete in 100-115 minutes.",
      },
      {
        q: "Should I train differently from male athletes?",
        a: "Structurally no, the periodisation is the same. The differences are calibrated loads and a slightly different ratio of strength-to-running emphasis depending on your baseline. Vyrek auto-applies this from the quiz.",
      },
    ],
  },
  {
    slug: "hyrox-training-plan-over-40",
    kind: "audience",
    title: "Hyrox training plan for over-40 athletes",
    hook: "Masters Hyrox programming, recovery-first, sustainable, race-ready. Built around your real-world recovery rate.",
    eyebrow: "Masters",
    programmeSlug: "first-race",
    intro: [
      "Hyrox over 40 isn't a different sport, it's the same race with more attention paid to recovery. The Vyrek masters programming uses the same structure as our standard plans, with three differences: more deload weeks, more Zone 2 volume, and tighter rules around joint-loaded movements.",
      "You can finish a Hyrox over 40, over 50, over 60. The athletes who do it consistently are the ones who treat recovery as part of the training, not a luxury.",
    ],
    whoFor: [
      "Athletes 40+ preparing for their first Hyrox.",
      "Returning racers who've felt the recovery slow down.",
      "Anyone wanting a sustainable training rhythm.",
      "Masters division (40-44, 45-49, 50-54, 55-59, 60+) racers.",
    ],
    prerequisites: [
      "Cleared by a GP for high-intensity exercise.",
      "Able to run 5 km continuously.",
      "Honest about recent injury history (Vyrek's quiz asks).",
    ],
    sampleWeek: [
      {
        day: "Tuesday",
        session: "Easy aerobic",
        detail: "45 min Zone 2.",
      },
      {
        day: "Thursday",
        session: "Strength + technique",
        detail: "Compound lifts at 70% 1RM + station drills.",
      },
      {
        day: "Saturday",
        session: "Hyrox-pattern moderate",
        detail: "4 rounds of 600 m + station. Not race-pace.",
      },
      {
        day: "Sunday",
        session: "Long Zone 2",
        detail: "60-75 minutes.",
      },
    ],
    faqs: [
      {
        q: "Is Hyrox safe over 40?",
        a: "Yes, with the right preparation. Vyrek's masters programming uses lighter compound loads, more deload weeks, and substitutes joint-loaded movements (box jumps) for safer alternatives when your quiz flags injury history.",
      },
      {
        q: "How long should an over-40 Hyrox build be?",
        a: "12 weeks for a first-timer with a solid base. 16 weeks if returning after time off. The extra time goes to deloads and aerobic accumulation, not extra hard sessions.",
      },
    ],
  },
  {
    slug: "hyrox-doubles-training-plan",
    kind: "audience",
    title: "Hyrox doubles training plan",
    hook: "Paired programming for Hyrox doubles teams. Handoff strategy, split decisions, paired interval work.",
    eyebrow: "Doubles",
    programmeSlug: "doubles",
    intro: [
      "Hyrox doubles is the fastest-growing division. It's also a different race from solo, paired running, split station work, fast handoffs, partner-conversation strategy.",
      "Vyrek's Doubles programme assumes you train as a pair most of the time. Sessions are designed for two athletes, one runs while the other does a station, then swap. Calibration handles each athlete's individual loads plus the team's combined targets.",
    ],
    whoFor: [
      "Doubles teams preparing for their first paired race.",
      "Existing teams chasing a sub-90 doubles finish.",
      "Mixed doubles (male/female) and same-gender pairs.",
      "Teams that train apart most weeks but meet for the long sessions.",
    ],
    prerequisites: [
      "Both partners able to run 5 km continuously.",
      "Both partners comfortable with race-weight kettlebells and sleds.",
      "Honest conversation about each partner's strengths.",
    ],
    sampleWeek: [
      {
        day: "Tuesday",
        session: "Paired interval run",
        detail: "8 × 400 m paired at the slower runner's race pace.",
      },
      {
        day: "Thursday",
        session: "Split-station block",
        detail: "Practise the alternating-rep patterns at race weight.",
      },
      {
        day: "Saturday",
        session: "Paired Hyrox-pattern",
        detail: "Half-race rehearsal with planned splits.",
      },
    ],
    faqs: [
      {
        q: "How do you split stations in Hyrox doubles?",
        a: "Each station has its own rule. Sled push and pull alternate sets within the lane; burpee broad jumps alternate every rep; wall balls split 50-50 with one transition. Vyrek's Doubles programme rehearses each split pattern in training.",
      },
      {
        q: "Should doubles partners train together every session?",
        a: "Ideally yes, but realistically no. Vyrek's Doubles programme includes solo-mode sessions twice a week that simulate doubles patterns. Pair up for the long weekend sessions.",
      },
    ],
  },
];

export function getPlanTemplate(slug: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((p) => p.slug === slug);
}

export function listPlanSlugs(): string[] {
  return PLAN_TEMPLATES.map((p) => p.slug);
}
