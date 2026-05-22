/**
 * Equipment buyer's guides. High commercial intent ("best hyrox shoes",
 * "hyrox gloves uk", "knee sleeves for hyrox"). Drives /hyrox/gear/[slug]
 * programmatic pages with FAQPage + ItemList schema.
 *
 * Recommendations are descriptive (categories, attributes) not specific
 * affiliate-product listings — keeps the page honest pre-launch. Add
 * actual product links once affiliate accounts are set up.
 */

export type GearGuide = {
  slug: string;
  /** Display name, e.g. "Best Hyrox shoes for the open division". */
  title: string;
  /** Short eyebrow. */
  eyebrow: string;
  /** Meta hook. */
  hook: string;
  /** Intro paragraphs. */
  intro: string[];
  /** What to look for, as 4-6 attribute bullets. */
  whatToLookFor: string[];
  /** What to avoid, as 3-5 bullets. */
  whatToAvoid: string[];
  /** Common questions. */
  faqs: { q: string; a: string }[];
  /** Two-line summary for the parent /hyrox/gear index. */
  summary: string;
};

export const GEAR_GUIDES: GearGuide[] = [
  {
    slug: "best-hyrox-shoes",
    title: "Best Hyrox shoes: what to look for and what to avoid",
    eyebrow: "Shoes",
    hook: "Hyrox runs across 8 km of indoor flooring plus station-based lateral movement. The right shoe is a flat-ish hybrid trainer, not a marathon racer.",
    intro: [
      "Hyrox isn't a road race and it isn't a CrossFit workout. It's 8 × 1 km runs across rubberised indoor flooring, alternating with sled work, jumping, lunging, and lifting. The shoe has to handle all of it — which is why pure racing flats and pure lifting shoes both fail you.",
      "The honest answer is a hybrid trainer: low-drop, firm-but-not-flat, with enough lateral stability to push a sled and enough cushion to absorb 8 km of running. Most Hyrox racers settle on the same handful of models within a season.",
    ],
    whatToLookFor: [
      "Low drop (4-8 mm). Too high and the sled push loads your forefoot awkwardly.",
      "Firm midsole. Soft super-cushioned shoes compress under the sled and waste your push.",
      "Lateral stability. A shoe that lets you sidestep, pivot, and lunge without rolling.",
      "Grippy non-marking outsole — venues require non-marking soles.",
      "Breathable upper. You'll be in them for 60-120 minutes; sweat builds up fast.",
      "Comfortable enough to run 1 km in repeatedly under fatigue.",
    ],
    whatToAvoid: [
      "Maximalist running shoes (e.g. Nike Vaporfly, Hoka Bondi). Too soft for sled work.",
      "Weightlifting shoes with raised heels. Too restrictive for the running.",
      "Minimalist barefoot shoes unless you're already adapted. Wall ball + sandbag lunge in zero-drop is rough on calves.",
      "Brand-new shoes on race day. Race in something you've trained at least 3 sessions in.",
    ],
    faqs: [
      {
        q: "What shoes are best for Hyrox?",
        a: "A hybrid trainer with low drop (4-8 mm), firm midsole, lateral stability, and grippy non-marking outsole. Popular categories include Nike Metcon, Reebok Nano, NoBull Trainer, Tyr CXT, and similar — all share the firm-but-not-flat profile that handles both running and station work.",
      },
      {
        q: "Can I race Hyrox in running shoes?",
        a: "You can, but you shouldn't if the shoe is a soft long-distance trainer. The sled push and sled pull need a firm, stable platform. A 4-mm-drop hybrid trainer beats a 10-mm-drop marathon shoe at this race every time.",
      },
      {
        q: "Should Hyrox shoes be tight or loose?",
        a: "Slightly snug — thumb's width at the toe, no movement at the heel. Loose laces during sled pushes is one of the most common pre-race mistakes.",
      },
    ],
    summary:
      "Hybrid trainers with low drop, firm midsole, and lateral stability. Avoid soft running shoes and weightlifting shoes — both fail at the stations.",
  },
  {
    slug: "best-hyrox-gloves",
    title: "Hyrox gloves: when you need them, when you don't",
    eyebrow: "Gloves",
    hook: "Gloves help on sled pull and farmers carry. They hurt on wall balls and rowing. The honest verdict on whether to wear them.",
    intro: [
      "Gloves are the most over-recommended piece of Hyrox kit. Beginner advice says always wear them; experienced racers almost never do for full races. The real answer depends on the station.",
      "On the sled pull (rope, hand-over-hand) gloves protect the hands and grip better in sweat. On the farmers carry (kettlebell handle) most racers prefer bare hands — the friction is what stops you dropping. On rowing, wall ball, and burpee broad jumps, gloves are pure friction loss.",
    ],
    whatToLookFor: [
      "Thin palm — under 2 mm. Anything thicker reduces handle feel on kettlebells.",
      "Fingerless or three-quarter fingers. Full-finger gloves grip poorly.",
      "Open palm or mesh top. Sweat needs to escape.",
      "Tacky palm material (silicone, leather, or rubberised) for rope work.",
      "Lightweight enough to slip on/off mid-race if you change your mind.",
    ],
    whatToAvoid: [
      "Lifting gloves with thick padded palms — kills handle feel.",
      "Full-finger CrossFit gloves — too thick on the rope.",
      "Hand-grips designed for pull-ups — wrong shape for kettlebells.",
      "Cheap one-size gloves — fit matters enormously for a 60-min race.",
    ],
    faqs: [
      {
        q: "Do I need gloves for Hyrox?",
        a: "Most experienced racers don't wear them. They help on sled pull and rope work, hurt on kettlebell stations and rowing. If your hands tear easily, light fingerless gloves with a tacky palm are a reasonable compromise.",
      },
      {
        q: "What's the best Hyrox glove?",
        a: "A thin fingerless or three-quarter glove with a tacky leather or silicone palm. Bear KompleX, Picsil, and Velites all make Hyrox-suitable styles. The specific brand matters less than the thickness and palm material.",
      },
    ],
    summary:
      "Thin, fingerless, tacky palm. Useful on the sled pull; skip them on wall balls and farmers carry. Most experienced racers go bare-handed.",
  },
  {
    slug: "best-hyrox-knee-sleeves",
    title: "Hyrox knee sleeves: do you need them?",
    eyebrow: "Knee sleeves",
    hook: "Knee sleeves help on heavy sled work and sandbag lunges. They restrict on running. The trade-off explained.",
    intro: [
      "Knee sleeves are common in CrossFit but rare in Hyrox. The reason is simple: Hyrox is mostly running, and a tight sleeve restricts blood flow and limits stride mechanics over 8 km.",
      "If you have a known knee issue or feel insecure on heavy sled and sandbag lunge work, a thin 5 mm sleeve can give psychological and mild mechanical support without disrupting the running. Avoid the 7 mm powerlifting sleeves — they're built for one-rep maxes, not aerobic endurance.",
    ],
    whatToLookFor: [
      "Thin neoprene (3-5 mm), not powerlifting thickness (7 mm).",
      "Compression without circulation restriction.",
      "Snug fit at the joint, looser at calf/thigh.",
      "Breathable backing if available.",
    ],
    whatToAvoid: [
      "7 mm powerlifting sleeves — too restrictive for race-long use.",
      "Wraps (elastic bandages) — wrong tool, can cut circulation.",
      "Asymmetric or expensive 'recovery' sleeves with marketing claims about blood flow.",
    ],
    faqs: [
      {
        q: "Should I wear knee sleeves for Hyrox?",
        a: "Only if you have a specific knee issue or feel mechanically insecure on heavy sled or sandbag work. For most healthy racers, thin sleeves add nothing and slightly hurt running mechanics over 8 km.",
      },
      {
        q: "Can I race Hyrox with a knee strap?",
        a: "Yes if it's medically advised, but mention it to event staff at check-in. Make sure it doesn't slip during running — re-secure between stations if needed.",
      },
    ],
    summary:
      "Thin 3-5 mm sleeves only if you need them mechanically. Most healthy racers skip them — the running disadvantage outweighs the station support.",
  },
  {
    slug: "best-hyrox-belt",
    title: "Hyrox lifting belt: when it's useful and when it's not",
    eyebrow: "Belt",
    hook: "Belts help on heavy sled pulls and sandbag lunges. They restrict on running and burpee broad jumps. The trade-off.",
    intro: [
      "A lifting belt is over-used in Hyrox training and under-used on race day for good reasons. In training, you don't always need it — but for the few minutes you're under heavy sled or sandbag load, it can preserve your back across a 12-week build.",
      "On race day most racers don't wear a belt. It restricts breathing on the run, gets in the way on the burpee broad jump, and the load on any single Hyrox movement is sub-maximal for an experienced lifter. The exception is a known back issue.",
    ],
    whatToLookFor: [
      "Soft, flexible (nylon or velcro) — not a stiff powerlifting belt.",
      "Quick-release buckle if you might take it off mid-race.",
      "Lightweight and breathable.",
      "Right size for your waist — too loose is useless.",
    ],
    whatToAvoid: [
      "Stiff 10 mm powerlifting belt — too restrictive for race use.",
      "Belts with metal prong buckles — slow to remove mid-event.",
      "Wearing a belt for every single set in training — your core needs to work without it.",
    ],
    faqs: [
      {
        q: "Do I need a lifting belt for Hyrox?",
        a: "No — most racers don't wear one on race day. Useful in training for the heaviest sled and lunge sets. If you have a known back issue, a soft velcro belt is a reasonable race-day compromise.",
      },
    ],
    summary:
      "Soft velcro belt for the heaviest training sets only. Most racers don't wear one on race day — restricts breathing and gets in the way on burpees.",
  },
  {
    slug: "best-hyrox-socks",
    title: "Hyrox socks: thin, snug, anti-slip",
    eyebrow: "Socks",
    hook: "Wrong socks cause blisters by km 5. Right socks are thin, snug, and have at least some anti-slip backing.",
    intro: [
      "Socks are the most ignored piece of Hyrox kit and a leading cause of mid-race blisters. After two sleds, three runs, and a sandbag lunge, your foot is hot, sweating, and moving around inside the shoe — any sock looseness becomes friction, friction becomes a blister.",
      "Get this right once and you won't think about it again.",
    ],
    whatToLookFor: [
      "Thin merino or synthetic blend — not pure cotton.",
      "Snug fit at the arch and ankle.",
      "Optional: light cushioning at heel and ball.",
      "Some anti-slip backing helps in shoes that run a touch loose.",
    ],
    whatToAvoid: [
      "Pure cotton socks — hold sweat, slip, blister.",
      "Brand-new socks on race day. Wear them in training first.",
      "Thick padded marathon socks — combine with hybrid trainers to make the shoe feel awkward.",
    ],
    faqs: [
      {
        q: "What socks should I wear for Hyrox?",
        a: "Thin merino or synthetic blend, snug fit, low to mid cuff. Brands like Stance, Balega, Injinji, and Lululemon Power Stride are popular for hybrid sports. Avoid pure cotton.",
      },
    ],
    summary:
      "Thin merino or synthetic, snug at the arch, never pure cotton. Worn-in socks from your training rotation, not new ones from the pack.",
  },
];

export function getGearGuide(slug: string): GearGuide | undefined {
  return GEAR_GUIDES.find((g) => g.slug === slug);
}

export function listGearSlugs(): string[] {
  return GEAR_GUIDES.map((g) => g.slug);
}
