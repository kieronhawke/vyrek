/**
 * Topic hubs — audience-cluster landing pages that pull together
 * relevant blog posts, plans, station guides, gear, and cities.
 *
 * These are pure curation: the data references already-published
 * surfaces. The point is internal-link density + a single page that
 * ranks for "{topic} hyrox" queries.
 */

export type TopicHub = {
  slug: string;
  /** Display title. */
  title: string;
  /** Eyebrow + intro. */
  eyebrow: string;
  hook: string;
  intro: string[];
  /** Curated content pulls — references real URLs. */
  blogSlugs: string[]; // matches content/blog/{slug}.mdx
  planSlugs: string[]; // matches lib/plan-templates.ts
  stationSlugs?: string[]; // matches lib/hyrox-stations.ts
  /** Tailored FAQs for the hub. */
  faqs: { q: string; a: string }[];
};

export const TOPIC_HUBS: TopicHub[] = [
  {
    slug: "womens-hyrox",
    title: "Hyrox for women — programmes, stations, race-day",
    eyebrow: "Topic · Women's Hyrox",
    hook: "Personalised Hyrox training for women athletes. Calibrated loads, race-specific work, programmes for first-timers to Pro qualifiers.",
    intro: [
      "Hyrox women's open standards are 102 kg sled push, 78 kg sled pull, 16 kg farmers carry per hand, 6 kg wall ball to a 9 ft target. The race format and the periodisation are identical to men's open; the loads scale and the run-strength balance shifts slightly toward strength.",
      "Vyrek programmes auto-calibrate to women's open standards based on your quiz answers. Everything below is the curated set of resources for women preparing for Hyrox at any level.",
    ],
    blogSlugs: [
      "first-hyrox-preparation-guide",
      "12-week-hyrox-training-plan",
      "hyrox-recovery-and-sleep",
      "hyrox-weekly-nutrition-framework",
      "hyrox-race-day-warm-up",
    ],
    planSlugs: ["hyrox-training-plan-female", "hyrox-training-plan-beginner"],
    stationSlugs: ["sled-push", "wall-balls", "burpee-broad-jumps", "farmers-carry"],
    faqs: [
      {
        q: "Are Hyrox women's standards realistic for a beginner?",
        a: "Yes. The 102 kg sled and 16 kg kettlebells feel intimidating on paper but the 12-week build progresses your tolerance steadily. Most first-time women's open finishers complete in 100-115 minutes.",
      },
      {
        q: "Should women train differently from men for Hyrox?",
        a: "Structurally no — periodisation is the same. The differences are calibrated loads and a slight shift in strength-to-running ratio depending on your baseline. Vyrek's quiz handles this calibration automatically.",
      },
    ],
  },
  {
    slug: "masters-hyrox",
    title: "Masters Hyrox — over-40 programmes and recovery-first training",
    eyebrow: "Topic · Masters (40+)",
    hook: "Sustainable Hyrox programming for masters athletes. More deloads, more Zone 2, joint-aware substitutions, real recovery built in.",
    intro: [
      "Hyrox is the same race at 30, 40, 50, or 60 — but the recovery rate is not the same. Masters programming uses the standard 12-week structure with three differences: more deload weeks, more aerobic volume at Zone 2, and tighter rules around high-impact movements when you flag a relevant injury history.",
      "You can finish Hyrox over 40, over 50, over 60. The athletes who do it consistently are the ones who treat recovery as part of the training, not a luxury.",
    ],
    blogSlugs: [
      "hyrox-recovery-and-sleep",
      "12-week-hyrox-training-plan",
      "hyrox-race-day-warm-up",
      "first-hyrox-preparation-guide",
      "hyrox-weekly-nutrition-framework",
    ],
    planSlugs: ["hyrox-training-plan-over-40", "hyrox-training-plan-beginner"],
    stationSlugs: ["sled-push", "farmers-carry", "wall-balls"],
    faqs: [
      {
        q: "Is Hyrox safe over 40?",
        a: "Yes, with the right preparation. Vyrek's masters programming uses lighter compound loads, more deload weeks, and substitutes joint-loaded movements (box jumps) for safer alternatives when your quiz flags injury history.",
      },
      {
        q: "How long should an over-40 Hyrox build be?",
        a: "12 weeks for a first-timer with a solid base. 16 weeks if returning after time off. The extra weeks go to deloads and aerobic accumulation, not extra hard sessions.",
      },
      {
        q: "Are there Hyrox masters divisions?",
        a: "Yes — 40-44, 45-49, 50-54, 55-59, and 60+ for both men's and women's. Standards are identical to open; the rankings are split by age bracket.",
      },
    ],
  },
  {
    slug: "doubles-hyrox",
    title: "Hyrox doubles — paired training, splits, and handoff strategy",
    eyebrow: "Topic · Doubles",
    hook: "Hyrox doubles is the fastest-growing division. Different race, different strategy. Programmes, splits, partner-pacing, handoff drills.",
    intro: [
      "Hyrox doubles isn't two solo races — it's its own race with paired running, split station work, and handoff strategy. Teams that train together for 8+ weeks consistently beat better-matched pairs that meet at the start line.",
      "Vyrek's Doubles programme is designed for pairs training together most of the time, with solo-mode sessions for the weeks you can't sync up.",
    ],
    blogSlugs: ["hyrox-doubles-strategy", "hyrox-transitions-and-flow", "hyrox-race-day-warm-up"],
    planSlugs: ["hyrox-doubles-training-plan"],
    stationSlugs: ["burpee-broad-jumps", "sled-push", "farmers-carry", "wall-balls"],
    faqs: [
      {
        q: "How do you split stations in Hyrox doubles?",
        a: "Each station has its own rule. Sled push and pull alternate sets within the lane; burpee broad jumps alternate every rep; wall balls split 50-50 with one transition. Vyrek's Doubles programme rehearses each split pattern in training.",
      },
      {
        q: "Do both partners need to be the same fitness level for doubles?",
        a: "Helps, but isn't required. A bigger fitness gap requires more strategic station splits — the stronger athlete absorbs more of the load on their stronger stations. Running pace is set by the slower partner.",
      },
      {
        q: "How long should I train as a doubles team before racing?",
        a: "8-12 weeks minimum for the partnership to feel rehearsed. The handoffs, pacing decisions, and station splits all need repetition under fatigue — not just talked through.",
      },
    ],
  },
  {
    slug: "first-race-hyrox",
    title: "First Hyrox — your complete preparation guide",
    eyebrow: "Topic · First Race",
    hook: "Everything for your first Hyrox. Programme, gear, race-day, the stations, the schedule, the warm-up, the mistakes to avoid.",
    intro: [
      "Vyrek's First Race programme is built for someone who's never raced Hyrox and may not have done a CrossFit-style workout before. The 12 weeks build aerobic capacity, station competence, and race-pattern familiarity — in that order.",
      "You don't need to be a sub-25 runner. You don't need a CrossFit gym. You need 4 hours a week and a willingness to follow a plan written by Elite 15 coaches.",
    ],
    blogSlugs: [
      "first-hyrox-preparation-guide",
      "12-week-hyrox-training-plan",
      "hyrox-race-day-warm-up",
      "hyrox-race-day-pacing",
      "race-day-nutrition",
      "hyrox-burpee-broad-jump-technique",
      "hyrox-sled-push-technique",
      "wall-balls-scaling-technique",
    ],
    planSlugs: ["hyrox-training-plan-beginner", "sub-100-hyrox-training-plan"],
    stationSlugs: [
      "ski-erg",
      "sled-push",
      "sled-pull",
      "burpee-broad-jumps",
      "rowing",
      "farmers-carry",
      "sandbag-lunges",
      "wall-balls",
    ],
    faqs: [
      {
        q: "Is 12 weeks enough for my first Hyrox?",
        a: "Yes — for anyone with a basic running and strength baseline. If you can run 5 km without stopping and squat your bodyweight, 12 weeks is plenty for a first-time finish in the 100-110 minute range.",
      },
      {
        q: "Do I need a CrossFit gym to train for Hyrox?",
        a: "No. Vyrek programmes adapt to your equipment — full commercial gym, standard PureGym/Nuffield-style facility, or home setup. The quiz asks what you have access to.",
      },
      {
        q: "What's a realistic first-Hyrox finish time?",
        a: "Most first-time men's open finishers complete in 95-115 minutes. Most first-time women's open finishers complete in 100-120. Doubles teams add 5-10 minutes typically.",
      },
    ],
  },
];

export function getTopicHub(slug: string): TopicHub | undefined {
  return TOPIC_HUBS.find((t) => t.slug === slug);
}

export function listTopicSlugs(): string[] {
  return TOPIC_HUBS.map((t) => t.slug);
}
