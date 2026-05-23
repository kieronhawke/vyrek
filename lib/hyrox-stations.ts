/**
 * Eight Hyrox stations with structured technique data. Drives the
 * /hyrox/stations/[station] programmatic pages plus HowTo + FAQPage
 * schema for each.
 */

export type StationDef = {
  slug: string;
  name: string;
  order: number;
  /** What the athlete actually does. One-liner. */
  oneLiner: string;
  /** Race-spec loads and dimensions. */
  spec: {
    mensOpen: string;
    womensOpen: string;
    distance?: string;
    reps?: string;
  };
  /** Goal split times by finish-time target. */
  goalSplits: {
    sub60: string;
    sub75: string;
    sub90: string;
    finishFirst: string;
  };
  /** Common faults that cost time. */
  faults: string[];
  /** Coaching cues, what the athlete should be thinking about. */
  cues: string[];
  /** Training drills that build the station. */
  drills: { name: string; detail: string }[];
  /** Quick FAQs for schema + on-page. */
  faqs: { q: string; a: string }[];
  /** Two-line summary for the parent /hyrox/stations index page. */
  summary: string;
};

export const STATIONS: StationDef[] = [
  {
    slug: "ski-erg",
    name: "Ski Erg",
    order: 1,
    oneLiner: "1,000 metres on a SkiErg machine, the opening station.",
    spec: { mensOpen: "1,000 m", womensOpen: "1,000 m", distance: "1,000 m" },
    goalSplits: {
      sub60: "3:25",
      sub75: "3:50",
      sub90: "4:20",
      finishFirst: "5:00",
    },
    faults: [
      "Going out at 100% in the first 200 m, every other station is harder.",
      "Pulling only with arms and shoulders instead of driving with the legs.",
      "Standing tall, defeats the hip drive that powers the stroke.",
    ],
    cues: [
      "Hinge from the hips on every stroke. Knees soft, chest down.",
      "Pull the handles past the hips, then drive the legs again.",
      "Breathe out on the pull, in on the recovery. Three-count rhythm.",
    ],
    drills: [
      {
        name: "5×500 m race-pace",
        detail:
          "Five rounds of 500 m at goal Ski Erg split pace, 90 sec rest. Builds tolerance to the opening surge.",
      },
      {
        name: "2 min on / 2 min off × 8",
        detail:
          "Aerobic threshold work on the machine. Pace yourself so all 8 efforts are within 5 m of each other.",
      },
      {
        name: "Hip-hinge with PVC pipe",
        detail:
          "30 reps × 3 sets. Reinforces the hip-driven motion off the machine.",
      },
    ],
    faqs: [
      {
        q: "How do I pace the Hyrox Ski Erg?",
        a: "Aim for 5-10 seconds slower than your 2 km PR. The Ski Erg is the opener, going too hard here cooks your back end. Save 5% effort for the first kilometre of running.",
      },
      {
        q: "Is the Ski Erg arms or legs?",
        a: "Both, but legs first. The hip hinge and leg drive produce most of the power; the arms transmit it. Athletes who pull only with arms fatigue by metre 400.",
      },
    ],
    summary:
      "1,000 m, hip-driven. The race opens with the Ski Erg, pace it 5-10 sec slower than your 2 km PR or you'll pay for it at station 4.",
  },
  {
    slug: "sled-push",
    name: "Sled Push",
    order: 2,
    oneLiner: "50 metres pushing a weighted sled across the floor.",
    spec: {
      mensOpen: "152 kg",
      womensOpen: "102 kg",
      distance: "50 m (4 × 12.5 m lengths in some venues)",
    },
    goalSplits: {
      sub60: "1:15",
      sub75: "1:35",
      sub90: "2:00",
      finishFirst: "2:45",
    },
    faults: [
      "Standing too tall, pushes the sled into the floor, not across it.",
      "Long strides, force vector goes vertical, not horizontal.",
      "Stopping mid-lane, every stop resets static friction; the next start is the hardest moment of the whole station.",
    ],
    cues: [
      "Low, long, locked: 30° body angle, arms extended at the elbow, neutral spine.",
      "Short, fast strides under the hip. Toes down, ball of foot to forefoot.",
      "First 3 metres at 85%, get it moving, then settle into rhythm.",
    ],
    drills: [
      {
        name: "Heavy sled push 5×20 m",
        detail:
          "At race weight + 10 kg. Five rounds, full rest. Builds absolute pushing capacity.",
      },
      {
        name: "Race-weight sled at race pace × 6",
        detail:
          "6 × 25 m at race weight, 60 sec rest. Builds the specific aerobic demand.",
      },
      {
        name: "Front rack sled drives",
        detail:
          "Push the sled from a front-rack position to teach the upright-then-lean transition.",
      },
    ],
    faqs: [
      {
        q: "How heavy is the Hyrox sled push?",
        a: "152 kg for men's open division, 102 kg for women's open. Doubles and pro divisions have separate weights, check the official Hyrox standards for your category.",
      },
      {
        q: "Why does the sled feel impossible at the start?",
        a: "Static friction. A sled at rest needs more force than a sled in motion. The first metre is the hardest by a wide margin. Get it moving, settle into rhythm, and the rest is technique, not strength.",
      },
    ],
    summary:
      "152 kg / 102 kg over 50 m. The technical station that humbles strong athletes. Low, long, locked beats raw power every time.",
  },
  {
    slug: "sled-pull",
    name: "Sled Pull",
    order: 3,
    oneLiner: "50 metres pulling a weighted sled hand-over-hand on a rope.",
    spec: { mensOpen: "103 kg", womensOpen: "78 kg", distance: "50 m" },
    goalSplits: {
      sub60: "1:30",
      sub75: "2:00",
      sub90: "2:30",
      finishFirst: "3:20",
    },
    faults: [
      "Pulling with the upper body only, the legs should be in a wide squat absorbing the load.",
      "Standing up between pulls, wastes time and breaks rhythm.",
      "Letting the rope drag along the floor between pulls, friction adds up.",
    ],
    cues: [
      "Wide stance, low squat, chest up. Hand-over-hand with constant tension.",
      "Pull the rope to your hip, then immediately reach for the next grip.",
      "Breathe in time with the pull, out on contraction, in on reach.",
    ],
    drills: [
      {
        name: "Rope pull 30 m × 5",
        detail: "At race weight. Builds grip endurance and pulling cadence.",
      },
      {
        name: "Heavy ring rows × 5 sets of 10",
        detail: "Builds the horizontal pulling pattern with full body engagement.",
      },
    ],
    faqs: [
      {
        q: "How heavy is the Hyrox sled pull?",
        a: "103 kg for men's open, 78 kg for women's open. Same 50 m distance as the sled push.",
      },
      {
        q: "Should I use gloves for the sled pull?",
        a: "Most athletes don't. The rope is thick enough that bare hands grip well, and gloves can slip in sweat. Train without and your hands adapt within 4-6 weeks.",
      },
    ],
    summary:
      "103 kg / 78 kg over 50 m, hand-over-hand. Wide stance, low squat, constant tension. The legs absorb the load, the arms transmit it.",
  },
  {
    slug: "burpee-broad-jumps",
    name: "Burpee Broad Jumps",
    order: 4,
    oneLiner: "Burpee, jump forward, repeat. 80 metres of compounding fatigue.",
    spec: { mensOpen: "80 m", womensOpen: "80 m", distance: "80 m" },
    goalSplits: {
      sub60: "3:15",
      sub75: "4:00",
      sub90: "4:45",
      finishFirst: "6:00",
    },
    faults: [
      "Short jumps, under 1 m means more reps, more burpees, more time.",
      "Pausing too long between reps, the burpee broad jump has no rhythm to coast on.",
      "Skipping the arm swing, costs 15-20 cm per jump, free distance left on the floor.",
    ],
    cues: [
      "Breathe out on the descent, in on the stand, out on the jump.",
      "Arm swing initiates the jump, never an afterthought.",
      "Tight midline, body lands as one unit, not feet-then-hips-then-chest.",
    ],
    drills: [
      {
        name: "Burpee broad jump intervals 3 × 10 reps",
        detail: "Race-pace cadence. Builds the rhythm under fatigue.",
      },
      {
        name: "Standing broad jump for distance",
        detail:
          "6 sets × 3, full rest. Most athletes can add 15-25 cm to their jump in 12 weeks.",
      },
    ],
    faqs: [
      {
        q: "How long is the Hyrox burpee broad jump?",
        a: "80 metres. Most athletes need 18-30 reps depending on jump distance. Standards require a two-foot take-off and landing, plus chest-to-floor in the burpee.",
      },
      {
        q: "What's a good burpee broad jump split?",
        a: "Sub-2 minutes is elite. Most age-group athletes are 2:30-4:00. Over 5:00 usually points at a pacing problem on the kilometres before, not a fitness issue at the station.",
      },
    ],
    summary:
      "80 m of burpees and broad jumps. The station that exposes bad pacing. Long jumps, controlled rhythm, full arm swing.",
  },
  {
    slug: "rowing",
    name: "Rowing",
    order: 5,
    oneLiner: "1,000 metres on a Concept2 rower, the halfway station.",
    spec: { mensOpen: "1,000 m", womensOpen: "1,000 m", distance: "1,000 m" },
    goalSplits: {
      sub60: "3:35",
      sub75: "4:00",
      sub90: "4:30",
      finishFirst: "5:15",
    },
    faults: [
      "Yanking the handle at the catch instead of driving the legs first.",
      "Rushing the slide, disrupts breathing and burns extra calories.",
      "Setting damper too high, feels powerful but slows you down.",
    ],
    cues: [
      "Legs, then back, then arms on the drive. Arms, body, legs on the recovery.",
      "Damper at 5-6 for most athletes; not 10.",
      "Pace the row 5-10 sec slower than your fresh 2 km, you've got more race after this.",
    ],
    drills: [
      {
        name: "4 × 500 m at goal pace",
        detail: "90 sec rest. Builds the specific aerobic capacity for the row.",
      },
      {
        name: "Pyramid 250-500-750-500-250",
        detail: "All at race-pace effort. Builds the ability to settle a rhythm at any distance.",
      },
    ],
    faqs: [
      {
        q: "What's a good Hyrox rowing split?",
        a: "Sub-3:30 is elite, 4:00 is solid age-group, 4:30 is realistic for a first-time finisher. Pace it 5-10 sec slower than your fresh 2 km row PR.",
      },
      {
        q: "What damper setting for Hyrox rowing?",
        a: "5-6 for most athletes. Higher feels powerful but increases drag, you waste effort overcoming the machine instead of moving the chain.",
      },
    ],
    summary:
      "1,000 m on Concept2. The relative recovery station. Legs-back-arms on the drive, damper at 5-6, settle the rhythm fast.",
  },
  {
    slug: "farmers-carry",
    name: "Farmers Carry",
    order: 6,
    oneLiner: "200 metres carrying kettlebells in each hand.",
    spec: {
      mensOpen: "24 kg per hand",
      womensOpen: "16 kg per hand",
      distance: "200 m",
    },
    goalSplits: {
      sub60: "1:20",
      sub75: "1:40",
      sub90: "2:00",
      finishFirst: "2:45",
    },
    faults: [
      "Death-grip from the start, grip fails by metre 120.",
      "Long strides, destabilises the carry, wastes vertical energy.",
      "Hunching forward, loads the upper traps and degrades posture.",
    ],
    cues: [
      "Hand deep on the handle, full grip not hook. Lightest pressure that holds.",
      "Stand tall, short fast strides at 70% of normal pace.",
      "Breathe through pursed lips. 4 steps in, 2 steps out.",
    ],
    drills: [
      {
        name: "Heavy farmers walks 4 × 30 m",
        detail: "At 90-100% race weight. End of strength sessions. Builds capacity.",
      },
      {
        name: "Dead hangs for time",
        detail: "60 sec × 3 sets. Cheap, fast grip endurance.",
      },
    ],
    faqs: [
      {
        q: "How heavy are the Hyrox farmers carry kettlebells?",
        a: "24 kg per hand for men's open, 16 kg per hand for women's open. 200 m total, usually broken into 4 × 50 m laps.",
      },
      {
        q: "Can I drop the kettlebells during the carry?",
        a: "Yes, but you must reset and start the metre from where you dropped. A planned single drop at the 100 m mark beats three unplanned collapses.",
      },
    ],
    summary:
      "24/16 kg per hand over 200 m. Looks like a strength station, plays like aerobic recovery. Grip endurance, short strides, even pacing.",
  },
  {
    slug: "sandbag-lunges",
    name: "Sandbag Lunges",
    order: 7,
    oneLiner: "100 metres of walking lunges with a sandbag across the shoulders.",
    spec: {
      mensOpen: "20 kg sandbag",
      womensOpen: "10 kg sandbag",
      distance: "100 m",
    },
    goalSplits: {
      sub60: "3:30",
      sub75: "4:15",
      sub90: "5:00",
      finishFirst: "6:30",
    },
    faults: [
      "Letting the sandbag droop forward, pulls the spine into flexion.",
      "Stepping too long, front knee crashes over the toe.",
      "Rushing the cadence, back to the floor too fast loses control on the next step.",
    ],
    cues: [
      "Bag high across the upper back, hands gripping in front of the shoulders.",
      "Knee tracks over the toe, never beyond. Back knee gently to the floor.",
      "Steady cadence, breathe with each step. No racing.",
    ],
    drills: [
      {
        name: "Heavy walking lunges 4 × 30 m",
        detail: "At race weight + 5 kg. End-of-session strength endurance.",
      },
      {
        name: "Box step-ups with the sandbag",
        detail: "Single-leg strength carries over directly.",
      },
    ],
    faqs: [
      {
        q: "How heavy is the Hyrox sandbag?",
        a: "20 kg for men's open, 10 kg for women's open. 100 metres of walking lunges total. Pro divisions go heavier.",
      },
      {
        q: "Can I rest during sandbag lunges?",
        a: "Yes, but standing rest is brutal once you stop. Better to keep moving at a slow cadence than to take a 20-second standing reset.",
      },
    ],
    summary:
      "20/10 kg sandbag over 100 m of walking lunges. Steady cadence, knee tracking, no racing. The station that punishes posture errors.",
  },
  {
    slug: "wall-balls",
    name: "Wall Balls",
    order: 8,
    oneLiner: "100 wall ball reps to a 10 ft target, the final station.",
    spec: {
      mensOpen: "9 kg ball, 10 ft target, 100 reps",
      womensOpen: "6 kg ball, 9 ft target, 75 reps (or 100 for open)",
      reps: "100 (open) · 75 (women's open in some divisions)",
    },
    goalSplits: {
      sub60: "3:30",
      sub75: "4:30",
      sub90: "5:30",
      finishFirst: "7:30",
    },
    faults: [
      "Going unbroken from the start, you'll cook by rep 40.",
      "Short squats, half-rep penalties, plus poor target catch.",
      "Throwing only with arms, drains the shoulders fast.",
    ],
    cues: [
      "Full squat depth, drive through the heels, ball leaves the chest at the top.",
      "Pick a set scheme before you start. 25-25-25-25 or 30-25-25-20 or fives.",
      "Breathe out on the throw, in on the catch. Steady rhythm beats heroic sets.",
    ],
    drills: [
      {
        name: "Wall ball EMOM 20 reps × 10 minutes",
        detail: "Builds pacing and grip endurance under repeat stress.",
      },
      {
        name: "100 wall balls for time",
        detail:
          "Test once every 3 weeks during build. Tracks progress and rehearses race-day set scheme.",
      },
    ],
    faqs: [
      {
        q: "How many wall balls in a Hyrox race?",
        a: "100 reps for open and pro divisions. Some women's open divisions are 75. Men's standard is a 9 kg ball to a 10 ft target; women's is 6 kg to a 9 ft target.",
      },
      {
        q: "What's the best wall ball set scheme?",
        a: "Most age-group athletes break to 25-25-25-25 or 30-25-25-20. Unbroken is for elite. The fastest finishers aren't the ones who go unbroken, they're the ones whose breaks are shortest and most consistent.",
      },
    ],
    summary:
      "100 reps to 10 ft (or 75 to 9 ft). The race-deciding station. Pre-plan your sets, drive through the heels, breathe with the rhythm.",
  },
];

export function getStation(slug: string): StationDef | undefined {
  return STATIONS.find((s) => s.slug === slug);
}

export function listStationSlugs(): string[] {
  return STATIONS.map((s) => s.slug);
}
