# HYROX blog post seeds. Each: (title, primary_keyword, angle, image_spec)
# image_spec: "own:<path-or-pool>" | "gen:<concept>" | "chart:<concept>"
# Volumes/KD are joined from keywords.csv by the build script — never typed here.

STATIONS = [
    ("SkiErg", "ski erg", "own:guides/station-ski-erg.jpg"),
    ("Sled Push", "sled push", "own:guides/station-sled-push.jpg"),
    ("Sled Pull", "sled pull", "own:guides/station-sled-pull.jpg"),
    ("Burpee Broad Jump", "burpee broad jump", "own:guides/station-burpees.jpg"),
    ("Rowing", "row", "own:guides/station-row.jpg"),
    ("Farmers Carry", "farmers carry", "own:guides/station-farmers.jpg"),
    ("Sandbag Lunges", "sandbag lunges", "own:guides/station-sandbag.jpg"),
    ("Wall Balls", "wall balls", "own:guides/station-wall-balls.jpg"),
]

HYROX = []  # (cluster, wave, title, primary_kw, angle, image, format, status)

def add(cluster, wave, title, kw, angle, image, fmt="guide", status="planned"):
    HYROX.append((cluster, wave, title, kw, angle, image, fmt, status))

# ── CLUSTER H1: Fundamentals & FAQ (hub /hyrox/guide) ────────────────
F = "Fundamentals & FAQ"
add(F, 1, "What is HYROX? The complete beginner's explanation", "what is a hyrox",
    "The definitive plain-English explainer; wins the featured snippet with a 40-word definition up top", "own:track/pair-frontal-colour.jpg", "pillar")
add(F, 1, "What does HYROX stand for? Name, meaning and origin", "what does hyrox stand for",
    "5,400/mo question with a one-line answer nobody gives cleanly; snippet + AI-citation target", "gen:race-floor wide shot, competitors mid-transition, editorial grade")
add(F, 1, "HYROX meaning: what the word actually refers to", "hyrox meaning",
    "Sibling of the stand-for post targeting the distinct 2,900/mo phrasing; canonical-separate intents", "gen:close-up of chalked hands gripping sled rope, shallow depth")
add(F, 1, "The 8 HYROX stations explained (with weights and standards)", "hyrox stations",
    "Anchor listicle linking down to all 8 station guides; the internal-linking spine of the site", "own:guides/station-sled-push.jpg", "pillar")
add(F, 1, "HYROX rules: the official standards, penalties and no-reps", "hyrox rules",
    "KD23 quick win; tabular rules summary formatted for snippets, updated each season", "gen:judge's-eye view of wall ball rep at target, gym light")
add(F, 1, "HYROX race format: distances, order and how the race flows", "hyrox format",
    "Format query cluster (format/race format/distances/events in order) consolidated into one canonical", "chart:course flow diagram, 8 runs + 8 stations loop")
add(F, 1, "HYROX divisions explained: Open, Pro, Doubles and Relay", "hyrox singles",
    "Division chooser with honest guidance on which to enter first; feeds the quiz CTA", "own:track/pair-bend-rear-colour.jpg")
add(F, 1, "HYROX age groups: categories, cut-offs and what they mean for you", "hyrox age groups",
    "KD22; table of age brackets + how age-group placement works; masters cluster entry point", "gen:mixed-age athletes on race start line, documentary style")
add(F, 2, "How does HYROX work? Race day from arrival to finish line", "how does hyrox work",
    "Narrative first-timer walkthrough; long-tail catcher for a dozen 'how does it work' phrasings", "own:track/pair-distant-dusk-bw.jpg")
add(F, 2, "Is HYROX CrossFit? The differences that actually matter", "is hyrox crossfit",
    "KD28 question with clean yes/no answer; funnels to the full vs-CrossFit comparison", "gen:split scene sled lane vs barbell platform, same gym")
add(F, 2, "What does HYROX consist of? Every element of the race", "what does hyrox consist of",
    "Component checklist format for the 210/mo phrasing; snippet bait", "chart:stations + runs visual checklist")
add(F, 2, "The RoxZone explained: what it is and how not to lose minutes in it", "roxzone",
    "Glossary+strategy hybrid; almost nobody covers transition time loss with data", "gen:athlete jogging through transition zone carrying grip, motion blur")
add(F, 2, "HYROX scoring and rankings: how your time and placing work", "hyrox ranking",
    "Explains timing, age-group placement, world ranking; links to results pages", "chart:sample results table annotated")
add(F, 2, "HYROX penalties: every way to get time added and how to avoid them", "hyrox penalties",
    "Long-tail; judges' standards per station in one table; shareable in club chats", "gen:judge holding no-rep signal beside sled lane")
add(F, 2, "What to expect at your first HYROX: an honest hour-by-hour guide", "first hyrox",
    "Warm reassurance + logistics; the emotional on-ramp post; heavy quiz CTA", "own:track/pair-close-frontal-colour.jpg")
add(F, 2, "How long does a HYROX take? Full duration guide by division", "how long does hyrox take",
    "Question query answered with honest ranges by division and level", "chart:finish time ranges by division")
add(F, 2, "HYROX World Championship qualification: how it actually works", "hyrox world championship",
    "Season structure, majors, slots; updated annually; authority signal", "gen:packed arena race floor from spectator stand, dramatic light", status="refresh")
add(F, 2, "Elite 15 explained: HYROX's professional tier", "hyrox elite 15",
    "KD29 with Ben's first-hand authority — the one post only we can write honestly", "own:ben/ben-racing-placeholder.jpg")
add(F, 3, "HYROX weight classes and body types: does size matter?", "hyrox weight",
    "Addresses 'am I built for this' anxiety with balanced analysis", "gen:two different-build athletes side by side at sled lane")
add(F, 3, "Singles vs Doubles: which HYROX should you enter first?", "hyrox singles vs doubles",
    "Decision-post; links divisions pillar and doubles cluster", "own:track/pair-elevated-colour.jpg")
add(F, 3, "HYROX relay explained: format, rules and team strategy", "hyrox relay",
    "Underserved format query; corporate/team angle differentiates", "gen:four teammates at relay handover, high fives, arena floor")
add(F, 3, "Is HYROX harder than a marathon? A coach's honest comparison", "is hyrox harder than a marathon",
    "Comparison bait with genuine physiological analysis; social-share magnet", "gen:split image runner on road vs athlete under sled")
add(F, 3, "Is HYROX hard? Difficulty rated for every fitness level", "is hyrox hard",
    "Reassurance + calibration; quiz CTA to find starting level", "own:track/palms-runners-bw.jpg")
add(F, 3, "Can anyone do HYROX? Fitness requirements honestly assessed", "can anyone do hyrox",
    "Beginner objection-handler; strong beginner-plan CTA", "own:track/diverse-pool")
add(F, 3, "HYROX for spectators: how to watch, track and support your athlete", "hyrox spectators",
    "Nobody targets supporter intent; ranks easily, builds brand goodwill", "gen:spectators leaning over barrier cheering, athlete mid wall balls")
add(F, 3, "How much does HYROX cost? Entry fees, kit and the real total", "hyrox entry fee",
    "Transparent cost breakdown incl. tickets/flex; honest budgeting table", "chart:cost breakdown stacked bar")
add(F, 3, "HYROX tickets explained: registration, waves and the Flex add-on", "hyrox flex add on",
    "KD10 long-tail; practical registration walkthrough, updated per season", "gen:athlete checking phone at gym bench, entry confirmation moment")
add(F, 3, "The HYROX race day timeline: when to arrive, warm up and start", "hyrox race day timeline",
    "Logistics detail post linking to warm-up protocol and kit checklist", "own:v2/quiz-interstitial-1.jpg")
add(F, 4, "HYROX World Championships: history, venues and records", "hyrox world championships",
    "Evergreen championship hub refreshed yearly; catches 4 championship phrasings", "gen:confetti finish-line arch moment, wide arena")
add(F, 4, "The history of HYROX: from 2017 Hamburg to global phenomenon", "hyrox history",
    "Authority/entity content; AI-search citation magnet with timeline", "chart:growth timeline of events per season")
add(F, 4, "HYROX vs Hydrox: the fitness race vs the cookie (yes, really)", "what is hydrox",
    "590/mo misspell disambiguation done with charm; wins the confused searcher", "gen:athlete laughing mid chalk-up, candid")
add(F, 4, "What is a HYROX PFT? The physical fitness test explained", "hyrox fitness test",
    "KD19; explains the benchmark test + our assessment CTA", "own:v2/metrics-fresh.jpg")
add(F, 4, "HYROX jargon dictionary: every term you'll hear at a race", "hyrox terms",
    "Glossary pillar linking all micro-glossary pages; AI-citation food", "chart:illustrated A-Z grid")

# ── CLUSTER H2: Stations — 8 × 6 matrix (hub /hyrox/stations) ────────
S = "Stations"
_station_kw = {
    "SkiErg": "hyrox ski erg", "Sled Push": "hyrox sled push weight",
    "Sled Pull": "hyrox sled pull", "Burpee Broad Jump": "hyrox burpee broad jump",
    "Rowing": "hyrox rowing", "Farmers Carry": "hyrox farmers carry",
    "Sandbag Lunges": "hyrox sandbag lunges weight", "Wall Balls": "hyrox wall balls",
}
for name, kw_base, img in STATIONS:
    kw = _station_kw[name]
    add(S, 1, f"HYROX {name}: technique that survives race fatigue", kw,
        f"Definitive {name} technique guide from an Elite 15 racer; existing post refreshed to new standard", img, "guide",
        "refresh" if name not in ("Rowing",) else "planned")
    add(S, 2, f"{name} mistakes: what's costing you 60+ seconds", f"{kw_base} mistakes",
        f"Mistake-listicle format ranks for '{name} tips' long-tail; video-friendly", f"gen:athlete mid-{kw_base} with form fault subtly visible, coaching-eye angle")
    add(S, 2, f"5 workouts that build a faster HYROX {name}", f"{kw_base} workout",
        "Workout-card format; save/share magnet; links to plans", f"gen:whiteboard with session plan beside {kw_base} setup")
    add(S, 3, f"How to get faster at the HYROX {name}: a 6-week progression", f"faster {kw_base} hyrox",
        "Progression framework with measurable weekly targets", f"own:station-pool:{name}")
    add(S, 3, f"No {name}? Substitutions that build the same engine", f"{kw_base} substitute",
        "Equipment-gap solver; unique service content; geo-page synergy", f"gen:home garage gym improvised {kw_base} alternative")
    add(S, 4, f"HYROX {name} times: what good looks like by division", f"{kw_base} average time",
        "Station split benchmarks — needs results data; queued behind open question 1", "chart:station split distribution", status="blocked-results")

add(S, 1, "HYROX weights: every station standard for men and women", "hyrox weights",
    "KD18/1,900 quick win; the canonical weights table, one authoritative page", "chart:full weights table by division and gender", "pillar", "refresh")
add(S, 1, "HYROX sled push weight: standards by division (and how it feels)", "sled push hyrox weight",
    "1,900/KD25; table + first-hand 'what 152kg actually feels like'", "own:guides/station-sled-push.jpg")
add(S, 1, "HYROX women's weights: complete station standards", "hyrox womens weights",
    "590/KD18 quick win; women-specific canonical table", "gen:female athlete loading sled plates, focused, gym light")
add(S, 2, "HYROX station order: the exact sequence and why it matters", "hyrox station order",
    "390/KD20; sequence + pacing implications of the order", "chart:course sequence graphic")
add(S, 2, "The hardest HYROX station, ranked by the data and the athletes", "hardest hyrox station",
    "Debate-bait ranking; strong share performance; poll embed", "gen:athlete collapsed against sled post-race, honest exhaustion")
add(S, 2, "Wall ball standards: target heights, depths and no-rep rules", "wall ball target height hyrox",
    "Precise rules query; diagram answers it better than anyone", "chart:wall ball target height diagram by division")
add(S, 3, "Compromised running: the skill that decides every HYROX race", "compromised running",
    "Own the defining concept of the sport; pillar-quality analysis", "own:track/pair-rear-close-colour.jpg")
add(S, 3, "Sled push without a sled: 7 alternatives that actually transfer", "sled push without sled",
    "High-value equipment-gap post; geo synergy (gyms without sleds)", "gen:athlete pushing loaded plate across gym floor on towel")
add(S, 3, "HYROX lunges: weight, distance and the technique that saves your back", "hyrox lunges",
    "Consolidates lunge weight/distance queries; injury-prevention angle", "own:guides/station-sandbag.jpg")
add(S, 3, "Burpee broad jump rules: distance, standards and no-reps", "hyrox burpee broad jump rules",
    "Rules long-tail trio (rules/distance) in one canonical", "chart:burpee broad jump measurement diagram")
add(S, 4, "RoxZone efficiency: stealing back 3 minutes without fitness", "roxzone time",
    "Transition-craft deep dive; data-backed once results layer lands", "gen:athlete speed-walking roxzone, determined, wide floor")

# ── CLUSTER H3: Times & Benchmarks (hub /hyrox/times) ────────────────
T = "Times & Benchmarks"
add(T, 1, "What is a good HYROX time? Honest benchmarks for every level", "what is a good hyrox time",
    "320/KD13 anchor; ranges by division/experience; percentile CTA when data lands", "chart:time bands by level graphic", "pillar")
add(T, 1, "Average HYROX finish time: the real numbers", "average hyrox time",
    "Sibling intent to 'good time'; distinct SERP; snippet table", "chart:average time by division")
add(T, 1, "HYROX world records: every current record and who holds it", "hyrox world records",
    "260/KD17; maintained record book, updated within 48h of records falling", "gen:elite athlete crossing finish under race clock, arms up")
add(T, 2, "HYROX doubles world record and what we can learn from it", "hyrox doubles world record",
    "KD5 — easiest keyword in the set; Ben races doubles: unique authority", "own:ben/ben-racing-placeholder.jpg")
add(T, 2, "Sub-90 HYROX: the training that gets you there", "sub 90 hyrox",
    "Goal-time ladder rung 1; links plan CTA; existing post refresh", "own:v2/programme-sub-90-v2.jpg", "guide", "refresh")
add(T, 2, "Sub-80 HYROX: what separates 90-minute athletes from 80", "sub 80 hyrox",
    "Goal-time ladder rung 2; splits-based prescription", "chart:sub-80 pacing splits table")
add(T, 2, "Sub-70 HYROX: a serious athlete's blueprint", "sub 70 hyrox",
    "Rung 3; advanced audience, high plan-conversion intent", "own:track/pair-bend-rear-colour.jpg")
add(T, 3, "Sub-60 HYROX: inside the elite hour", "sub 60 hyrox",
    "Rung 4; Ben's own splits as the worked example — unfakeable content", "own:ben/ben-racing-placeholder.jpg")
add(T, 2, "HYROX times by age group: how age really changes the clock", "hyrox times by age",
    "Age-group benchmarks; masters magnet; needs results data", "chart:times by age group curve", status="blocked-results")
add(T, 2, "HYROX times by gender: the real gaps, station by station", "hyrox average time female",
    "Women's benchmark content; underserved; needs results data", "chart:gender split comparison", status="blocked-results")
add(T, 3, "Your first HYROX time: what to expect and how to predict it", "first hyrox time",
    "Anxiety-reducer + predictor tool CTA; mid-funnel gold", "own:v2/metrics-fresh.jpg")
add(T, 3, "HYROX pacing strategy: how to split the race by your target time", "hyrox pacing",
    "Pacing tables per target time; printable; existing post refresh", "chart:pacing wristband style table", "guide", "refresh")
add(T, 3, "Which HYROX station costs the most time? The data answer", "hyrox station times",
    "Data story; contrarian finding potential; needs results layer", "chart:time cost by station ranked", status="blocked-results")
add(T, 3, "Running splits in HYROX: why your 5k time lies to you", "hyrox running splits",
    "Compromised-running data analysis; unique angle", "chart:fresh vs compromised run pace decay")
add(T, 4, "The HYROX percentile calculator: where do you actually rank?", "hyrox percentile",
    "Tool landing post; link magnet; needs results data", "chart:percentile curve interactive preview", status="blocked-results")
add(T, 4, "How much faster is a second HYROX? First-vs-second race data", "second hyrox improvement",
    "Original data story; PR-able finding; needs results layer", "chart:first vs second race improvement distribution", status="blocked-results")

# ── CLUSTER H4: Training Plans (hub /hyrox/plans) ────────────────────
P = "Training Plans"
add(P, 1, "The 12-week HYROX training plan (free, complete, printable)", "12 week hyrox training plan",
    "KD19 core plan post; feeds the free plan-maker PDF funnel directly", "own:v2/bento-plan.jpg", "pillar", "refresh")
add(P, 1, "Couch to HYROX: the 24-week zero-to-finish-line plan", "couch to hyrox",
    "The flagship pillar — own this term before anyone else does", "own:track/diverse-pool", "pillar")
add(P, 1, "How long do you need to train for HYROX?", "how long to train for hyrox",
    "140/KD14; honest timeline by starting level; quiz CTA", "chart:readiness timeline by starting fitness")
add(P, 1, "Free HYROX training plan PDF: 12 weeks, no email wall... almost", "hyrox 12 week training plan pdf",
    "KD14 PDF-intent query; the plan-maker lead magnet's front door", "own:v2/bento-plan.jpg")
add(P, 2, "8-week HYROX training plan: race-ready on a deadline", "8 week hyrox training plan",
    "Duration ladder; realistic-deadline framing", "gen:calendar wall planner with training blocks marked")
add(P, 2, "6-week HYROX plan: the honest minimum", "6 week hyrox training plan",
    "Duration ladder; 'is 6 weeks enough' angle answers the real question", "gen:athlete checking watch mid interval, urgency")
add(P, 2, "16-week HYROX plan: the aerobic-base build", "16 week hyrox training plan",
    "Duration ladder top; periodisation education", "chart:16-week periodisation blocks")
add(P, 2, "HYROX training for beginners: your first 4 weeks", "hyrox training plan for beginners",
    "KD22 beginner entry; fear-reduction + structure", "own:track/palms-runners-bw.jpg")
add(P, 2, "How many days a week should you train for HYROX?", "hyrox training days per week",
    "Question post; honest minimums; segue to 3/4/5-day splits", "chart:results by training days visual")
add(P, 2, "The 3-day HYROX week: maximum result, minimum sessions", "3 day hyrox training plan",
    "Busy-athlete split; big untapped audience", "gen:parent lacing trainers by front door, dawn light")
add(P, 2, "The 4-day HYROX training split that most athletes should run", "4 day hyrox training plan",
    "The default split; canonical structure post", "chart:4-day split week structure")
add(P, 3, "The 5-day HYROX split for serious improvement", "5 day hyrox training plan",
    "Committed tier; overtraining warnings included", "own:v2/programme-pro.jpg")
add(P, 3, "HYROX training at home: full plan with minimal kit", "hyrox training at home",
    "Home/equipment-gap audience; substitutions matrix", "gen:garage gym with kettlebell rower and sandbag, morning light")
add(P, 3, "HYROX for runners: convert your engine, keep your speed", "hyrox for runners",
    "Audience-bridge plan; runners are the biggest crossover pool", "own:track/bend-lanes-bw.jpg")
add(P, 3, "HYROX for CrossFitters: what transfers and what's missing", "hyrox for crossfitters",
    "Audience bridge; existing transition post refresh", "gen:crossfit box with hyrox sled lane taped out", "guide", "refresh")
add(P, 3, "HYROX over 40: the masters training plan", "hyrox over 40",
    "Masters plan; recovery-first framing; existing post refresh", "own:track/pair-distant-dusk-bw.jpg", "guide", "refresh")
add(P, 3, "HYROX over 50: strong, fast and injury-free", "hyrox over 50",
    "Extends masters ladder; almost zero competition", "gen:50s athlete confident with sandbag on shoulder, natural grade")
add(P, 3, "Strength training for HYROX: the lifts that actually matter", "hyrox strength training",
    "Strength programming pillar; links station workouts", "own:v2/video-farmers.jpg")
add(P, 3, "Running programme for HYROX: paces, volumes, sessions", "hyrox running programme",
    "Running-leg pillar; pace-zone tables", "own:track/pano-pair-bw.jpg")
add(P, 4, "HYROX taper week: the exact 7-day protocol", "hyrox taper",
    "Race-week detail; existing post refresh to new standard", "own:v2/quiz-interstitial-2.jpg", "guide", "refresh")
add(P, 4, "Training between HYROX races: the 6-week bridge plan", "training between hyrox races",
    "Multi-race season planning; retention content for subscribers", "chart:season structure between races")
add(P, 4, "HYROX off-season: build the engine while nobody's watching", "hyrox off season",
    "Season periodisation; existing post refresh", "own:track/gym-ergs-dark-colour.jpg", "guide", "refresh")
add(P, 4, "Doubles training plan: prepare as a pair, race as one", "hyrox doubles training plan",
    "Doubles-specific plan; Ben's division — unique authority", "own:track/pair-close-frontal-bw.jpg")
add(P, 4, "HYROX relay team training: getting four people race-ready", "hyrox relay training",
    "Corporate/team angle; group-booking CTA", "gen:four colleagues training together, relay batons of grip gloves")
add(P, 4, "Two HYROX races, four weeks apart: how to survive the double", "back to back hyrox races",
    "Multi-race recovery; existing recovery-between-races refresh", "own:v2/video-recovery.jpg", "guide", "refresh")

# ── CLUSTER H5: Workouts (hub /hyrox/workouts) ───────────────────────
W = "Workouts"
add(W, 1, "The HYROX workout, explained: what a session actually looks like", "hyrox workout",
    "22,200/mo head term; pillar defining the workout style + example sessions", "own:track/gym-coach-row-colour.jpg", "pillar")
add(W, 1, "15 HYROX workouts for every fitness level", "hyrox workouts",
    "1,300/KD34 listicle; workout-card format; save magnet", "own:v2/station-fresh.jpg")
add(W, 1, "HYROX exercises: the full movement list (and what they train)", "hyrox exercises",
    "2,400/KD27; movement library linking to station guides", "chart:movement grid with muscle groups")
add(W, 2, "The full HYROX simulation workout (and when to run one)", "hyrox simulation workout",
    "KD12 quick win; sim protocol + scaling; existing sim post refresh", "own:track/gym-skierg-colour.jpg", "guide", "refresh")
add(W, 2, "The mini HYROX workout: the race in 30 minutes", "mini hyrox workout",
    "KD13 quick win; time-poor format; shareable card", "chart:30-min mini-sim workout card")
add(W, 2, "HYROX partner workouts: 8 sessions to share the suffering", "hyrox partner workout",
    "KD20; doubles-prep + gym-buddy audience", "own:track/pair-close-frontal-colour.jpg")
add(W, 2, "HYROX WOD library: a month of daily sessions", "hyrox wod",
    "KD16 quick win; CrossFit-crossover vocabulary; recurring update post", "gen:gym whiteboard with WOD written up, chalk detail")
add(W, 2, "HYROX exercise order: why the sequence is the strategy", "hyrox exercise order",
    "Consolidates order/list queries; pacing-science angle", "chart:sequence with energy-system annotation")
add(W, 3, "HYROX strength workouts: 6 gym sessions for race power", "hyrox strength workout",
    "Strength sub-library; links strength plan pillar", "own:v2/video-sled-pull.jpg")
add(W, 3, "HYROX running workouts: intervals that build compromised speed", "hyrox running workout",
    "Run sub-library; compromised-running intervals are our signature concept", "own:track/bend-lanes-bw.jpg")
add(W, 3, "The 45-minute HYROX gym workout for normal gyms", "hyrox gym workout",
    "No-sled-lane reality; machine substitutions; huge practical value", "gen:busy commercial gym floor, athlete improvising sled push on prowler")
add(W, 3, "HYROX doubles workouts: train the handoff, not just the engine", "hyrox doubles workout",
    "KD32; pair session structures with split strategies", "own:track/pair-elevated-bw.jpg")
add(W, 3, "Hotel room HYROX: travel workouts that keep the engine running", "hyrox travel workout",
    "Travel/consistency niche; professional-audience overlap", "gen:athlete doing burpees in minimal hotel room, dawn window")
add(W, 4, "HYROX EMOMs: 10 clock-based engine builders", "hyrox emom",
    "Format-specific library; glossary crosslink", "chart:EMOM session cards")
add(W, 4, "One dumbbell, full HYROX session: minimal-kit workouts", "hyrox workout with dumbbells",
    "Equipment-minimum angle; home audience", "gen:single dumbbell on garage floor, athlete mid lunge")
add(W, 4, "HYROX circuit training: build race rhythm in a group class", "hyrox circuit",
    "Class-format angle; gym-partner programme synergy", "gen:small group circuit class mid-rotation, energetic")

# ── CLUSTER H6: Gear (hub /gear) ─────────────────────────────────────
G = "Gear"
add(G, 1, "HYROX trainers: how to choose, and what the race actually demands", "hyrox trainers",
    "2,900/KD22 head commercial term. RETITLED 2026-08-02: was 'Best HYROX shoes 2026: tested by racing feet', which claims testing we have not done (hard rule 1). Write as selection criteria grounded in the eight stations, not a ranked verdict, until a real test exists", "gen:worn racing shoes beside sled track chalk marks, top-down")
add(G, 1, "Best trainers for HYROX: the shortlist by foot type and budget", "best trainers for hyrox",
    "1,000/KD25 sibling intent; chooser-format by need", "chart:shoe chooser decision tree")
add(G, 1, "HYROX bag checklist: everything in a racer's kit bag", "hyrox bag",
    "1,600/KD17; flat-lay content; printable checklist; kit-list refresh", "gen:race kit flat lay on gym floor, labelled naturally", "guide", "refresh")
add(G, 2, "HYROX trainers for women: what actually fits and grips", "hyrox trainers women",
    "480/KD21; women-specific fit guidance nobody does properly", "gen:female athlete tying laces trackside, shoe detail focus")
add(G, 2, "What to wear for HYROX: kit that survives all 8 stations", "what to wear hyrox",
    "Practical apparel guide; sweat/grip/chafe honesty", "own:track/pair-frontal-bw.jpg")
add(G, 2, "HYROX equipment guide: what the race uses (and home equivalents)", "hyrox equipment",
    "320/KD17; spec table of race kit + budget home alternatives", "chart:race equipment spec table")
add(G, 2, "Grip socks, gloves and grips: what helps, what's a gimmick", "hyrox gloves",
    "Accessory honesty post; affiliate potential later", "gen:chalked palms holding farmers handles, macro detail")
add(G, 3, "HYROX gifts: 20 presents athletes actually want", "hyrox gift",
    "KD13 seasonal quick win; November publish for gifting SERP", "gen:wrapped gifts beside kettlebell and race bib, tasteful")
add(G, 3, "Home HYROX gym: the £500 / £1,500 / £5,000 builds", "home hyrox gym",
    "Budget-tiered build guide; big share performance", "gen:tidy garage gym three-quarter view, sled ski erg wall ball")
add(G, 3, "HYROX watch setup: screens, laps and data that helps mid-race", "hyrox watch settings",
    "Practical tech post; Garmin/Apple setups; screenshots", "gen:wrist close-up race screen on watch, gym blur background")
add(G, 3, "Budget HYROX setup: train properly for under £300", "budget hyrox equipment",
    "Access angle; beginner-friendly; equipment-gap synergy", "gen:secondhand kettlebell sandbag diy sled on driveway")
add(G, 4, "HYROX race day packing list: the night-before ritual", "hyrox packing list",
    "Checklist micro-post; printable PDF; links bag checklist", "chart:printable packing checklist")

# ── CLUSTER H7: Nutrition & Race Day (hub /hyrox/nutrition) ──────────
N = "Nutrition & Race Day"
add(N, 1, "What to eat before HYROX: the 48-hour fuelling plan", "what to eat before hyrox",
    "Core nutrition query; hour-by-hour timeline; race-day refresh", "gen:prepped meals in containers on kitchen counter, athlete's kitchen", "guide", "refresh")
add(N, 1, "HYROX race day nutrition: fuel, caffeine and timing", "hyrox nutrition",
    "Nutrition pillar; consolidates diet queries; existing refresh", "own:v2/honesty-fresh.jpg", "pillar", "refresh")
add(N, 2, "Carb loading for HYROX: how much, when, and what it feels like", "carb loading hyrox",
    "Specific protocol post with gram targets by bodyweight", "chart:carb loading timeline gram targets")
add(N, 2, "Caffeine and HYROX: dose, timing and the crash to avoid", "caffeine before hyrox",
    "Specific + science-backed; snippet-friendly dosing table", "gen:espresso beside race bib and watch, morning table")
add(N, 2, "HYROX hydration: what to drink across race week", "hyrox hydration",
    "Electrolyte protocol; heat-race crosslink", "gen:athlete drinking from bottle trackside, sweat detail")
add(N, 3, "Eating to train: a week of meals for HYROX training", "hyrox diet",
    "KD16; real weekly meal structure, not macros lecture", "gen:weekly meal prep spread, realistic portions")
add(N, 3, "Recovery nutrition: the 4 hours after a HYROX session", "hyrox recovery nutrition",
    "Post-session window protocol; supplement honesty", "gen:protein shake and real food post gym, bench setting")
add(N, 3, "Race morning breakfast: what racers actually eat", "hyrox breakfast",
    "Micro-specific; poll-driven update potential; relatable", "gen:simple porridge banana coffee breakfast, early light")
add(N, 4, "Protein for hybrid athletes: how much you actually need", "protein hybrid athlete",
    "Evidence-based debunk; hybrid cluster crosslink", "chart:protein needs by training load")
add(N, 4, "Should you cut weight for HYROX? Divisions and honesty", "hyrox weight cutting",
    "Underserved question; responsible framing; body-comp crosslink", "own:v2/metrics-fresh.jpg")

# ── CLUSTER H8: Comparisons & Apps (hub /hyrox-vs) ───────────────────
C = "Comparisons & Apps"
add(C, 1, "HYROX vs CrossFit: which is right for you?", "hyrox vs crossfit",
    "Head comparison; existing post refresh; chooser matrix", "gen:split composition sled lane vs barbell, same lighting", "guide", "refresh")
add(C, 1, "Is HYROX worth it? An honest cost-benefit from a coach", "is hyrox worth it",
    "Decision-stage query; honest cons included — trust play", "own:track/palms-sunflare-pair-colour.jpg")
add(C, 1, "Best HYROX training app 2026: the honest comparison", "best hyrox training app",
    "Money page in blog clothing; we appear with genuine pros/cons vs rivals", "chart:app comparison matrix")
add(C, 2, "HYROX vs marathon: training, difficulty and which to pick", "hyrox vs marathon",
    "Big-audience comparison; runner conversion path", "gen:split road-race vs arena-floor scenes")
add(C, 2, "HYROX vs Spartan vs DEKA: the obstacle-fitness landscape", "hyrox vs spartan",
    "3-way format comparison; existing post refresh", "chart:format comparison table", "guide", "refresh")
add(C, 2, "Runna alternative for HYROX: what runners should use instead", "runna alternative",
    "Competitor-adjacent capture; respectful, factual comparison", "chart:feature comparison Runna vs hybrid needs")
add(C, 2, "HYROX vs triathlon: endurance racing compared", "hyrox vs triathlon",
    "Endurance-crossover audience; time-cost honesty", "gen:transition rack bike wetsuit vs gym floor kit, split")
add(C, 3, "HYROX vs F45: from class fitness to race fitness", "hyrox vs f45",
    "Class-member conversion path; partner-gym synergy", "gen:group class energy vs solo race focus, split")
add(C, 3, "HYROX vs DEKA FIT: the head-to-head", "hyrox vs deka",
    "Dedicated DEKA comparison for the US-lean query", "chart:station-by-station format comparison")
add(C, 3, "HYROX vs Turf Games: competition formats compared", "hyrox vs turf games",
    "UK-specific comparison; niche but zero competition", "gen:team event field vs indoor race floor, split")
add(C, 3, "Online HYROX coaching vs a local PT: the real comparison", "online hyrox coaching",
    "The conversion argument as content; geo-page synergy", "chart:cost and outcome comparison")
add(C, 4, "Free vs paid HYROX plans: when free is enough", "free hyrox training plan",
    "KD15; disarming honesty — free plan CTA with paid upgrade path", "own:v2/bento-plan.jpg")
add(C, 4, "HWPO HYROX review: strong programme, right for you?", "hwpo hyrox",
    "Competitor review; factual, fair, findable", "chart:programme structure comparison")
add(C, 4, "HYROX 365 explained: what the official platform does", "hyrox 365",
    "KD19 navigational catch; explains ecosystem, positions our hub", "chart:ecosystem map official vs coaching apps")

# ── CLUSTER H9: Race Cities & Events (supports /races/* pages) ───────
R = "Race Cities & Events"
for city, kw in [("London", "hyrox london"), ("Glasgow", "hyrox glasgow"),
                 ("Birmingham", "hyrox birmingham"), ("Manchester", "hyrox manchester"),
                 ("Dublin", "hyrox dublin"), ("Cardiff", "cardiff hyrox")]:
    add(R, 1, f"HYROX {city}: dates, venue, course and how to prepare", kw,
        f"Editorial companion to the /races/{city.lower()} page; taper + venue-specific prep angle", f"gen:{city} venue exterior with race-day crowd energy, documentary")
    add(R, 2, f"HYROX {city} spectator guide: where to stand, what to bring", f"hyrox {city.lower()} spectators",
        "Supporter long-tail; zero competition; goodwill + links", f"gen:spectator crowd barrier moment, {city} venue interior")
for city, kw in [("Malaga", "hyrox malaga"), ("Rome", "hyrox rome"), ("Madrid", "hyrox madrid"),
                 ("Oslo", "hyrox oslo"), ("Poznan", "hyrox poznan"), ("Hamburg", "hyrox hamburg"),
                 ("Chicago", "hyrox chicago"), ("Riga", "hyrox riga")]:
    add(R, 3, f"HYROX {city}: the travelling athlete's race guide", kw,
        "Race-tourism angle: venue, travel, where UK athletes stay; KD ≤24 across the set", f"gen:{city} skyline landmark at dawn with runner silhouette, tasteful")
add(R, 1, "HYROX calendar 2026/27: every confirmed race", "hyrox calendar",
    "390/KD30; maintained calendar post; ticket-release spike magnet", "chart:season calendar grid")
add(R, 2, "How to enter a HYROX: registration walkthrough", "how to enter hyrox",
    "Practical entry funnel content; catches ticket queries", "gen:athlete registering on laptop, race photos on wall")
add(R, 2, "HYROX tickets: prices, waves, sell-out patterns", "hyrox ticket prices",
    "Ticket price transparency; updated per release cycle", "chart:ticket price tiers by city")
add(R, 3, "Which HYROX race should you enter first? UK edition", "which hyrox race",
    "Decision post; links all city guides; quiz CTA", "chart:UK race chooser flowchart")
add(R, 3, "HYROX Glasgow start times and race-day schedule", "hyrox glasgow start times",
    "KD11 hyper-specific; seasonal update; results-page crosslink", "gen:OVO Hydro exterior early morning, athletes arriving")
add(R, 4, "Racing HYROX abroad: the UK athlete's travel playbook", "hyrox abroad",
    "Race-tourism pillar linking all city guides", "gen:passport race bib and trainers packed in carry-on")

# ── CLUSTER H10: Doubles, Relay & Team ───────────────────────────────
D = "Doubles & Teams"
add(D, 1, "HYROX Doubles: rules, splits and strategy from an Elite 15 pair", "hyrox doubles",
    "Division pillar; Ben+Harry first-hand — unmatchable E-E-A-T", "own:track/pair-close-frontal-colour.jpg", "pillar")
add(D, 1, "HYROX doubles rules: who does what, and what's allowed", "hyrox doubles rules",
    "480/KD26; clean rules table; snippet target", "chart:doubles work-split rules table")
add(D, 2, "Choosing a doubles partner: the compatibility checklist", "hyrox doubles partner",
    "Relationship-angle content; genuinely shareable", "own:track/pair-elevated-colour.jpg")
add(D, 2, "Doubles split strategy: who takes which station", "hyrox doubles strategy",
    "Existing post refreshed with Ben's actual race splits", "own:track/pair-rear-close-bw.jpg", "guide", "refresh")
add(D, 2, "Women's doubles: weights, standards and strategy", "hyrox women's doubles",
    "210/KD21; women-specific division guide", "gen:two female athletes fist-bump at sled lane")
add(D, 3, "Mixed doubles HYROX: making different engines work together", "hyrox mixed doubles",
    "Pairing-dynamics angle; couples audience; Valentine's republish", "gen:mixed pair mid handoff at roxzone")
add(D, 3, "The doubles handoff: transition craft that wins minutes", "hyrox doubles handoff",
    "Existing post refresh; micro-skill deep dive", "own:track/pair-bend-rear-colour.jpg", "guide", "refresh")
add(D, 4, "HYROX relay for workplaces: the team-building case", "hyrox corporate relay",
    "B2B angle; partner-programme synergy; zero competition", "gen:office team in matching shirts at race village, laughing")

# ── CLUSTER H11: Women & Demographics ────────────────────────────────
DM = "Women & Demographics"
add(DM, 1, "Women's HYROX: weights, training and racing — the complete guide", "hyrox women",
    "Women's pillar; existing strategy post refreshed and expanded", "gen:female athlete mid ski erg pull, powerful, gym light", "pillar", "refresh")
add(DM, 2, "Training for HYROX around your cycle", "hyrox menstrual cycle training",
    "Underserved, high-trust topic; evidence-cited, sensitively done", "gen:training diary and calendar flat lay, soft light")
add(DM, 2, "HYROX while pregnant: what the evidence and coaches say", "hyrox pregnant",
    "Medical-adjacent: conservative, sourced, reviewed framing", "gen:pregnant athlete walking gym floor with coach, supportive tone")
add(DM, 2, "Postnatal return to HYROX: rebuilding without rushing", "postnatal hyrox",
    "Return-journey content; beginner-branch crossover", "gen:mother lacing shoes beside pram in hallway")
add(DM, 3, "HYROX over 60: the oldest age groups are growing fastest", "hyrox over 60",
    "Masters extension; inspiring but practical", "gen:60s athlete on rower, determined, respectful portrait")
add(DM, 3, "Masters HYROX strategy: racing smart after 45", "hyrox masters",
    "Age-group racing craft; pairs with masters plans", "own:track/pair-distant-dusk-bw.jpg")
add(DM, 3, "HYROX for tall athletes: turning levers into advantages", "hyrox tall athletes",
    "Body-type series; wall balls/erg specifics", "gen:tall athlete at wall ball target, height perspective")
add(DM, 3, "HYROX for shorter athletes: the sled is not your enemy", "hyrox short athletes",
    "Body-type series completion", "gen:shorter athlete low drive position on sled, technical")
add(DM, 4, "Teenagers and HYROX: age limits and smart preparation", "hyrox age limit",
    "Parent-intent query; safety-first framing", "gen:teen and parent training together, park setting")
add(DM, 4, "Couples who race together: training as a household", "couples hyrox",
    "Lifestyle angle; doubles crosslink; share magnet", "own:track/palms-sunflare-pair-colour.jpg")

# ── CLUSTER H12: Recovery & Injury ───────────────────────────────────
RC = "Recovery & Injury"
add(RC, 1, "Recovery for hybrid athletes: the complete system", "hybrid athlete recovery",
    "Recovery pillar; existing sleep post folded in and expanded", "own:v2/video-recovery.jpg", "pillar", "refresh")
add(RC, 2, "HYROX recovery: the 72 hours after your race", "hyrox recovery",
    "Post-race protocol; race-week email-series companion", "gen:athlete ice bath grimace-smile, honest moment")
add(RC, 2, "Lower back pain and sandbag lunges: fix the pattern", "sandbag lunges back pain",
    "Symptom-intent SEO; genuine physio-informed help", "gen:coach adjusting athlete lunge posture side-on")
add(RC, 2, "Shin splints from HYROX running: causes and the comeback", "shin splints hyrox",
    "Symptom-intent; compromised-running load analysis", "gen:athlete taping shin on bench, clinical-adjacent")
add(RC, 3, "Ankle mobility for wall balls and lunges: the 10-minute routine", "ankle mobility wall balls",
    "Micro-specific mobility; video-friendly", "gen:deep squat hold heels down, mobility mat scene")
add(RC, 3, "Deload weeks for HYROX: when and how to back off", "hyrox deload",
    "Programming education; plan crosslink", "chart:load wave with deload timing")
add(RC, 3, "DOMS after HYROX training: what helps, what's a myth", "doms hyrox",
    "Evidence-vs-myth format; glossary crosslink", "gen:athlete descending stairs gingerly, humour-adjacent honesty")
add(RC, 3, "Grip fatigue: the hidden HYROX limiter and how to train it", "hyrox grip strength",
    "Underserved limiter; farmers/sled-pull crosslinks", "own:track/palms-lamp-colour.jpg")
add(RC, 4, "Sleep and HYROX performance: the training you do unconscious", "sleep athletic performance",
    "Existing sleep post refresh; wearable-data angle", "gen:dark bedroom wearable on wrist charging, moody", "guide", "refresh")
add(RC, 4, "Knee pain from wall balls: technique, load or both?", "knee pain wall balls",
    "Symptom-intent; responsible signposting to professionals", "gen:athlete assessing knee with band warmup on floor")

# ── CLUSTER H13: Hybrid / Strength / Running science ─────────────────
H = "Hybrid Training Science"
add(H, 1, "What is hybrid training? The method behind HYROX fitness", "hybrid training",
    "Hybrid pillar; defines the category we coach", "own:track/gym-ergs-dark-colour.jpg", "pillar")
add(H, 1, "Can you build muscle and run? Killing the interference myth", "interference effect training",
    "Science explainer; evidence-cited; big debate audience", "chart:concurrent training study outcomes visual")
add(H, 2, "Zone 2 for HYROX: the boring miles that win races", "zone 2 training",
    "Zeitgeist term with HYROX application; glossary crosslink", "own:track/pano-pair-bw.jpg")
add(H, 2, "VO2 max for HYROX: what it predicts and how to raise it", "vo2 max hyrox",
    "Science-to-practice; wearable screenshots; benchmark tables", "chart:vo2max by finish time band")
add(H, 2, "Running and lifting on the same day: ordering, gaps, priorities", "running and lifting same day",
    "Practical programming question; snippet-friendly rules", "gen:gym bag and running shoes side by side, decision moment")
add(H, 3, "Lactate threshold, explained for hybrid athletes", "lactate threshold",
    "Science explainer; glossary+pillar bridge", "chart:lactate curve annotated plain-English")
add(H, 3, "Strength standards for HYROX: how strong is strong enough?", "strength standards hyrox",
    "Benchmark tables by bodyweight; calculator CTA", "chart:strength standards table by bodyweight")
add(H, 3, "Hybrid athlete programming: how to periodise both engines", "hybrid athlete training plan",
    "Advanced programming pillar; coaching-tier CTA", "chart:dual-periodisation wave diagram")
add(H, 4, "Heart rate zones for HYROX training: a working guide", "heart rate zones training",
    "Practical zones setup; watch-settings crosslink", "gen:watch on wrist showing zones mid run, track blur")
add(H, 4, "The engine room: aerobic base for people who hate running", "aerobic base training",
    "Erg-first base building; contrarian hook; erg workouts crosslink", "own:track/gym-row-close-colour.jpg")

# ── CLUSTER H14: Mental & Race Craft ─────────────────────────────────
M = "Mental & Race Craft"
add(M, 1, "The HYROX mental game: pacing your brain through 8 stations", "hyrox mental",
    "Existing mental posts consolidated into pillar", "own:track/palms-lamp-bw.jpg", "pillar", "refresh")
add(M, 2, "Race maths: what to do when your plan dies at station 3", "hyrox race strategy",
    "In-race decision frameworks; unique coaching content", "gen:athlete gathering breath at station entrance, resolve")
add(M, 2, "First-race nerves: the 7 fears everyone has (and answers)", "hyrox first race nerves",
    "Emotional on-ramp; beginner-branch tone; quiz CTA", "own:track/pair-close-frontal-colour.jpg")
add(M, 3, "Mid-race self-talk: cues from elite racers", "hyrox mental cues",
    "Existing cues post refresh; Ben's actual cues", "own:ben/ben-portrait-placeholder.jpg", "guide", "refresh")
add(M, 3, "DNF: what a did-not-finish teaches (and how to come back)", "hyrox dnf",
    "Taboo-topic honesty; community trust builder", "gen:athlete sitting trackside post race, contemplative, hopeful light")
add(M, 4, "Goal setting for a race season: process beats outcome", "race season goals",
    "Coaching-philosophy content; retention + brand voice", "gen:season planner with goals written, coffee, morning")

# ── CLUSTER H15: Results & Data Stories (blocked on open Q1) ─────────
DS = "Data Stories"
add(DS, 2, "HYROX results: how to find yours (and what it tells you)", "hyrox results",
    "14,800/KD19 — the biggest keyword we can win; results-lookup CTA", "chart:annotated results screen walkthrough", "pillar")
add(DS, 3, "The state of HYROX 2026: participation, times, trends", "hyrox statistics",
    "Annual data report; PR/link magnet; needs results layer", "chart:participation growth + time trends dashboard", status="blocked-results")
add(DS, 3, "Every HYROX world record, tracked and analysed", "hyrox world record",
    "Living record-book with progression charts", "chart:record progression timeline")
add(DS, 4, "Which city races fastest? HYROX venue speed rankings", "fastest hyrox course",
    "Original data story; city-guide crosslinks; needs results layer", "chart:median time by venue ranked", status="blocked-results")
add(DS, 4, "The doubles advantage: how much faster is racing in a pair?", "doubles vs singles times",
    "Data story on Ben's division; needs results layer", "chart:singles vs doubles distribution overlay", status="blocked-results")

# ── CLUSTER H16: Glossary (micro-pages) ──────────────────────────────
GL = "Glossary"
for term, desc in [
    ("RoxZone", "transition area between runs and stations"),
    ("Compromised running", "running under accumulated fatigue"),
    ("Hybrid athlete", "strength + endurance in one athlete"),
    ("Elite 15", "the professional HYROX tier"),
    ("Zone 2", "conversational-pace aerobic training"),
    ("VO2 max", "maximal oxygen uptake"),
    ("Lactate threshold", "sustainable intensity ceiling"),
    ("Progressive overload", "gradually increasing training stress"),
    ("DOMS", "delayed onset muscle soreness"),
    ("Deload", "planned recovery week"),
    ("Taper", "pre-race volume reduction"),
    ("RPE", "rating of perceived exertion"),
    ("EMOM", "every minute on the minute"),
    ("AMRAP", "as many rounds as possible"),
    ("Wave start", "staggered race start format"),
    ("No-rep", "rep not meeting movement standard"),
    ("Majors", "championship-qualifying HYROX events"),
    ("Pro division", "heavier-weights competitive division"),
]:
    add(GL, 4, f"{term}: definition and why it matters in HYROX", f"{term.lower()} meaning",
        f"Micro-glossary page ({desc}); 40-word definition first, AI-citation formatted", "chart:term card with definition typographic treatment", "glossary")

# ── CLUSTER H17: HYROX FAQ micro-posts ───────────────────────────────
FA = "HYROX FAQ"
for q, kw in [
    ("Can you walk in HYROX?", "can you walk in hyrox"),
    ("Is there a time limit in HYROX?", "hyrox time limit"),
    ("Can you wear headphones in HYROX?", "hyrox headphones"),
    ("How fit do you need to be for HYROX?", "how fit for hyrox"),
    ("Can you do HYROX without a gym membership?", "hyrox without gym"),
    ("How many people are in a HYROX wave?", "hyrox wave size"),
    ("Can you change division after entering?", "hyrox change division"),
    ("Can you defer or transfer a HYROX entry?", "hyrox transfer entry"),
    ("What happens if you can't finish a station?", "hyrox fail station"),
    ("Do you get a medal at HYROX?", "hyrox medal"),
    ("What is the HYROX run distance in total?", "hyrox total distance"),
    ("How far is each HYROX run?", "hyrox run distance"),
    ("Can you do HYROX with no running background?", "hyrox without running"),
    ("How many calories does a HYROX burn?", "hyrox calories burned"),
    ("Can you do two HYROX races in one season?", "how many hyrox races per year"),
    ("What age do you have to be for HYROX?", "hyrox minimum age"),
    ("Do HYROX races sell out? How fast?", "do hyrox races sell out"),
    ("Can beginners enter HYROX Open?", "can beginners do hyrox"),
    ("What's the difference between HYROX Open and Pro?", "hyrox open vs pro"),
    ("Is HYROX bad for your knees?", "is hyrox bad for knees"),
    ("Can you train for HYROX in a normal gym?", "hyrox normal gym"),
    ("What should you not do the week before HYROX?", "week before hyrox"),
    ("Do you need grip gloves for HYROX?", "do you need gloves for hyrox"),
    ("Can you watch HYROX for free as a spectator?", "hyrox spectator tickets"),
    ("How do HYROX waves and start times work?", "hyrox start times"),
    ("What's a HYROX sim and should you do one before racing?", "hyrox sim"),
    ("Is HYROX every year? How seasons work", "hyrox season"),
    ("Can you do HYROX solo or must you have a partner?", "hyrox solo"),
    ("What happens at HYROX packet pickup?", "hyrox packet pickup"),
    ("Are there showers/changing facilities at HYROX events?", "hyrox facilities"),
]:
    add(FA, 4, q, kw,
        "FAQ micro-post: 50-word direct answer first (snippet/AI-citation), then practical depth; FAQPage schema", "gen:candid race-village or gym moment matching the question", "glossary")

# ── CLUSTER H18: Niche audiences (traffic playbook §6) ───────────────
NA = "Niche Audiences"
for aud, kw, angle_x in [
    ("rugby players", "hyrox for rugby players", "power-to-engine conversion; club preseason angle"),
    ("footballers", "hyrox for footballers", "off-season engine; agility transfer honesty"),
    ("cyclists", "hyrox for cyclists", "big engine, missing load-bearing strength"),
    ("swimmers", "hyrox for swimmers", "engine transfer; impact adaptation timeline"),
    ("triathletes", "hyrox for triathletes", "the winter alternative season play"),
    ("runners over 40", "hyrox for runners over 40", "strength as longevity for masters runners"),
    ("CrossFit masters athletes", "hyrox for crossfit masters", "less skill risk, same competition itch"),
    ("boxers and fighters", "hyrox for boxers", "conditioning crossover; fight-camp parallels"),
    ("military and veterans", "hyrox military", "loaded-carry DNA; team relay angle"),
    ("police officers", "hyrox for police", "job-fitness standards crossover"),
    ("firefighters", "hyrox for firefighters", "sled push is literally the job; PPE conditioning"),
    ("NHS shift workers", "hyrox for nurses", "shift-pattern training; existing shift post crosslink"),
    ("teachers", "hyrox for teachers", "term-time periodisation; holiday race targeting"),
    ("new dads", "hyrox for dads", "identity+time angle; existing parents post sibling"),
    ("busy executives", "hyrox for busy professionals", "minimum effective dose; travel workouts crosslink"),
    ("students", "hyrox student", "budget + uni gym reality; first-race social angle"),
    ("vegans", "vegan hyrox nutrition", "plant-based fuelling for hybrid load"),
    ("tall rowers", "hyrox for rowers", "erg natives; the running problem"),
    ("hybrid-curious bodybuilders", "hyrox for bodybuilders", "muscle-loss fear addressed with evidence"),
    ("dancers", "hyrox for dancers", "capacity vs aesthetics athletic identity shift"),
    ("golfers", "hyrox for golfers", "unexpected crossover; engine for the back nine"),
    ("skiers", "hyrox for skiers", "off-season leg engine; ski erg irony"),
    ("obstacle-race converts", "spartan to hyrox", "OCR-to-HYROX migration guide"),
    ("park runners", "parkrun to hyrox", "the 5k community is the perfect feeder"),
]:
    add(NA, 3, f"HYROX for {aud}: what transfers, what to train", kw,
        f"Niche-audience capture ({angle_x}); each its own mini-funnel per traffic playbook", f"gen:{aud} training scene bridging their sport and hyrox stations")

# ── CLUSTER H19: Training micro-topics ───────────────────────────────
MT = "Training Micro-topics"
for title, kw, angle_x, img in [
    ("Treadmill sled simulation: incline settings that transfer", "treadmill sled push", "no-sled hack with real numbers", "gen:steep incline treadmill push position, gym corner"),
    ("Breathing patterns for the erg stations", "breathing ski erg", "micro-skill; calm-under-fatigue", "own:track/gym-skierg-colour.jpg"),
    ("Running cadence under fatigue: the compromised-running fix", "running cadence", "signature concept application", "own:track/bend-lanes-bw.jpg"),
    ("Heat training for summer races", "hyrox heat training", "existing heat post refresh; acclimation protocol", "own:track/palms-sunflare-pair-colour.jpg"),
    ("Cold venues: warming up when the arena is freezing", "hyrox cold venue", "UK winter race reality", "gen:athlete in layers warming up, breath visible, arena concourse"),
    ("Double days: training twice without falling apart", "two a day training", "advanced volume management", "gen:morning and evening gym bags by door, clock detail"),
    ("Morning vs evening training: what the evidence says", "morning vs evening workout", "evergreen question, hybrid lens", "gen:split dawn run vs evening gym scene"),
    ("Training on holiday: the 3-session week that maintains", "training on holiday", "consistency niche; travel workouts sibling", "gen:hotel gym minimal session, suitcase in room"),
    ("The minimum effective dose for HYROX maintenance", "minimum training hyrox", "busy-life honesty; retention content", "chart:maintenance vs build training loads"),
    ("Training through minor injury: what you can still do", "training with injury", "responsible modification matrix; physio signpost", "gen:athlete on ski erg with taped ankle, careful"),
    ("Cross-training for HYROX: bike and swim sessions that count", "cross training hyrox", "low-impact volume options", "gen:athlete on assault bike, effort, gym window light"),
    ("The HYROX warm-up library: 5 warm-ups for 5 session types", "hyrox warm up", "existing warm-up post refresh + expansion", "own:v2/quiz-interstitial-3.jpg"),
    ("Cooldowns that actually speed recovery", "cool down after workout", "evidence vs ritual; short protocols", "gen:athlete walking track lane post session, dusk"),
    ("Mobility for the sled: hips and ankles that hold position", "sled push mobility", "position-specific mobility", "gen:deep drive position hold, coach observing"),
    ("Rucking for HYROX: does weighted walking transfer?", "rucking hyrox", "trend crossover; honest transfer analysis", "gen:walker with weighted pack on trail, morning"),
    ("Zone 2 on the ski erg: base building without running impact", "ski erg zone 2", "erg-first base; joint-friendly angle", "own:track/gym-ergs-dark-colour.jpg"),
    ("Step count and HYROX: does daily movement matter?", "step count fitness", "NEAT education for athletes", "gen:watch step count mid walk, city park"),
    ("Strength maintenance in race season", "in season strength training", "periodisation education", "chart:in-season vs off-season strength dose"),
]:
    add(MT, 4, title, kw, angle_x, img)

# ── CLUSTER H20: Seasonal & Series ───────────────────────────────────
SE = "Seasonal & Series"
add(SE, 2, "New year, first HYROX: the January starter's roadmap", "new year hyrox",
    "January spike capture; beginner branch bridge; republish annually", "gen:january gym floor, new starter determination, honest busy-ness")
add(SE, 2, "Race week: the complete 7-day countdown series hub", "hyrox race week",
    "Hub for taper/kit/nutrition/warm-up posts; email-series twin", "own:v2/quiz-interstitial-2.jpg", "pillar")
add(SE, 3, "HYROX season preview 2026/27: dates, changes, predictions", "hyrox season 2027",
    "Annual authority post; ticket-release traffic; update yearly", "chart:season map with key dates")
add(SE, 3, "HYROX season review: what the times told us this year", "hyrox season review",
    "Annual data retrospective; needs results layer for full version", "chart:season trends dashboard", status="blocked-results")
add(SE, 3, "Summer training for an autumn race: the 12-week runway", "autumn hyrox training",
    "Seasonal periodisation; race-calendar synergy", "gen:summer outdoor training session, track heat shimmer")
add(SE, 4, "Christmas week training: keep the engine, keep the peace", "training over christmas",
    "Seasonal reality post; maintenance dose; republish annually", "gen:home workout beside christmas tree, kettlebell with bow")
add(SE, 4, "Black Friday for HYROX athletes: kit worth waiting for", "hyrox black friday",
    "Seasonal commercial; gear cluster synergy; update annually", "chart:kit deals checklist template")
add(SE, 4, "12 Days of HYROX: the festive partner workout series", "christmas workout",
    "Community/share content; social-first with blog anchor", "gen:pair doing festive-themed stations, santa hats, gym")

# ── Gear extras ──────────────────────────────────────────────────────
add(G, 3, "HYROX socks, insoles and the unglamorous kit that matters", "hyrox socks",
    "Micro-kit roundup; comfort-detail authority", "gen:race sock and insole detail on gym bench")
add(G, 3, "Knee sleeves and supports: needed for HYROX or not?", "knee sleeves hyrox",
    "Support-kit honesty; injury cluster crosslink", "gen:athlete rolling on knee sleeve pre wall balls")
add(G, 4, "Chalk at HYROX: rules, etiquette and alternatives", "chalk hyrox",
    "Detail question; rules crosslink", "own:track/palms-lamp-colour.jpg")
add(G, 4, "Massage guns and recovery tech: what's worth the money", "massage gun worth it",
    "Recovery-tech honesty; evidence-based", "gen:massage gun on quad post session, sofa setting"),
add(G, 4, "Running vests and hydration at HYROX: allowed? needed?", "hyrox hydration vest",
    "Kit-rules micro question", "gen:vest laid out with race kit, flat lay")
add(G, 4, "The £50 HYROX starter kit", "cheap hyrox kit",
    "Entry-level access angle; beginner-brand warmth", "gen:budget kit flat lay, honest brands blurred")

# ── CLUSTER H21: More race cities (evidenced Race Events keywords) ───
for city, kw in [("Dublin", "dublin hyrox"), ("Olympia", "hyrox olympia"),
                 ("Poland", "hyrox poland"), ("Belgium", "hyrox belgium"),
                 ("Spain", "hyrox spain"), ("Italy", "hyrox italy"),
                 ("Germany", "hyrox germany"), ("Ireland", "hyrox ireland"),
                 ("Scotland", "hyrox scotland"), ("Australia", "hyrox australia")]:
    add(R, 4, f"HYROX {city}: races, venues and what to know", kw,
        "Evidenced country/venue term (KD 12-39); travelling-athlete guide feeding the race hub", f"gen:{city} landmark with training scene, editorial travel style")
add(R, 3, "HYROX events explained: majors, opens and world championships", "hyrox events",
    "6,600/KD41; the event-type taxonomy nobody explains clearly", "chart:event tier pyramid diagram")
add(R, 3, "Where is HYROX held? Every venue type and what to expect", "hyrox locations",
    "Venue-conditions content: arena floors, air quality, crowd noise", "gen:cavernous arena interior pre-race setup, wide")
add(R, 4, "HYROX live streams and results tracking: follow the race", "hyrox glasgow live stream",
    "KD16 long-tail; spectator utility; results-page crosslink", "gen:laptop showing live timing with phone alongside, home")
add(R, 4, "How HYROX race numbers and waves are assigned", "hyrox wave allocation",
    "Practical logistics query; entry-process crosslink", "gen:race bib and wristband on kit bag, morning")

# ── CLUSTER H22: Gyms, coaching and community ────────────────────────
GC = "Gyms & Community"
add(GC, 1, "HYROX training near me: how to find a gym that's actually equipped", "hyrox training near me",
    "880/KD6 — the single best keyword in the database; equipment-checklist approach + online alternative", "gen:athlete assessing gym equipment, sled visible, decision moment", "pillar")
add(GC, 2, "HYROX affiliate gyms explained: what the badge means", "hyrox affiliated gym",
    "Directory-adjacent; explains the ecosystem honestly (no affiliation claimed)", "gen:functional gym interior with sled track taped, wide")
add(GC, 2, "Training for HYROX at PureGym, The Gym Group and budget gyms", "hyrox budget gym",
    "The reality for most UK athletes; substitution matrix; huge practical value", "gen:budget gym floor with improvised setup, honest")
add(GC, 2, "How to choose a HYROX coach: 8 questions to ask", "hyrox coach",
    "Coach-selection framework; our credentials answer it; coaching CTA", "own:ben/ben-coaching-placeholder.jpg")
add(GC, 3, "Do you need a HYROX coach? An honest assessment", "do i need a hyrox coach",
    "Objection-handler; honest 'no' cases build trust", "own:v2/adapt-coaching.jpg")
add(GC, 3, "Finding training partners for HYROX", "hyrox training partner",
    "Community-building content; doubles crosslink", "own:track/pair-close-frontal-colour.jpg")
add(GC, 3, "HYROX gyms in the UK: what the map actually looks like", "hyrox gyms uk",
    "Directory-adjacent editorial; supports location pages", "chart:UK equipped-gym density map")
add(GC, 4, "The HYROX community: clubs, groups and where to find your people", "hyrox community",
    "Culture content; goodwill and links; low competition", "gen:post-race group photo energy, arms around shoulders")
add(GC, 4, "HYROX on social: the accounts worth following", "hyrox youtube",
    "KD30 navigational catch; curation content; entity-building", "gen:phone showing training feed, gym bench setting")

# ── CLUSTER H23: Programming deep dives ──────────────────────────────
PD = "Programming"
for title, kw, angle_x, img in [
    ("Periodisation for HYROX: structuring a full season", "hyrox periodisation", "advanced programming; coaching-tier CTA", "chart:annual periodisation plan"),
    ("How to programme your own HYROX training", "how to program hyrox training", "transparency content; sells coaching by showing the craft", "gen:coach's notebook with session structure, desk"),
    ("Training volume for HYROX: how much is enough?", "hyrox training volume", "volume-landmarks; overtraining honesty", "chart:weekly volume by experience level"),
    ("Intensity distribution: the 80/20 rule applied to HYROX", "80 20 training", "polarised-training evidence applied to hybrid", "chart:intensity distribution pie"),
    ("Testing days: benchmark sessions to track real progress", "hyrox benchmark workout", "repeatable test protocols; logging synergy", "own:v2/metrics-fresh.jpg"),
    ("Building a training week around one long session", "long workout weekly", "time-poor programming; weekend-warrior reality", "chart:week structure around one key session"),
    ("When to switch from base building to race prep", "base training to race prep", "transition-timing decision; periodisation crosslink", "chart:phase transition timing markers"),
    ("Overtraining in hybrid athletes: the warning signs", "overtraining symptoms", "health-first content; recovery crosslink", "gen:fatigued athlete sitting on bench, honest"),
    ("Autoregulation: training by feel without going soft", "autoregulation training", "RPE-based programming education", "chart:RPE adjustment decision guide"),
    ("How to fit HYROX training around a marathon block", "hyrox and marathon training", "dual-goal programming; runner audience", "chart:combined block structure"),
]:
    add(PD, 3, title, kw, angle_x, img)

# ── CLUSTER H24: Race execution micro-skills ─────────────────────────
RE = "Race Execution"
for title, kw, angle_x, img in [
    ("The first 1km: why everyone goes out too fast", "hyrox first km", "existing first-5km post sibling; pacing discipline", "own:track/pair-frontal-colour.jpg"),
    ("Reading the course map before race day", "hyrox course map", "preparation micro-skill; venue-specific advantage", "chart:annotated course map example"),
    ("Fuelling during the race: is there time?", "hyrox fuelling during race", "in-race nutrition reality; practical honesty", "gen:gel tucked in waistband, race kit detail"),
    ("The final 1km: how to finish without falling apart", "hyrox final km", "closing-strength strategy; mental crosslink", "gen:athlete on final run visibly digging in"),
    ("Wall balls at the end: surviving the last station", "hyrox wall balls strategy", "the station everyone fears; break-up strategies", "own:guides/station-wall-balls.jpg"),
    ("Sled push strategy: when to push through and when to reset", "hyrox sled push strategy", "in-station decision-making; high-value micro-skill", "own:guides/station-sled-push.jpg"),
    ("Managing a bad race in real time", "bad hyrox race", "resilience content; race-craft; honest", "gen:athlete regrouping mid-race, hands on knees"),
    ("Warm-up on race day: timing it to your wave", "hyrox race day warm up", "existing warm-up post refresh; wave-timed protocol", "own:v2/quiz-interstitial-3.jpg"),
    ("Racing in a hot, crowded arena: the conditions playbook", "hyrox arena conditions", "environment-specific prep; underserved", "gen:crowded warm-up area, heat and energy"),
    ("What to do in the 10 minutes before your wave", "before hyrox start", "micro-timeline; nerves crosslink", "gen:athletes in holding pen pre-start, focus"),
]:
    add(RE, 3, title, kw, angle_x, img)

# ══════════════════════════════════════════════════════════════════════
# GAP-DRIVEN ADDITIONS — from competitor research 2026-07-29.
# Every entry here maps to a confirmed gap in docs/content-plan/
# competitor-findings.md. These are the posts rivals cannot easily answer.
# ══════════════════════════════════════════════════════════════════════

# ── H25: Venue intelligence (biggest structural gap in the niche) ────
VI = "Venue Intelligence"
add(VI, 1, "HYROX floor surfaces: how carpet, rubber and concrete change your sled", "hyrox sled floor surface",
    "GAP: only a flooring supplier ranks for this. Every rival writes event listings; nobody writes what a competitor actually needs", "gen:sled runner on different floor surfaces, close detail", "pillar")
add(VI, 1, "Why indoor arenas are hotter than you expect (and how to race in one)", "hyrox arena heat",
    "GAP: 'indoor means cool' is a costly assumption; zero competitor coverage of venue heat management", "gen:humid arena interior, condensation and effort, wide")
add(VI, 2, "Course length variance: why your watch says 1.08km, not 1km", "hyrox course length",
    "GAP: widely discussed in forums, written up by nobody; recalculates every pacing plan", "chart:measured lap distance variance vs pacing impact")
add(VI, 2, "Early wave or late wave? How race-day timing changes your race", "hyrox wave strategy",
    "GAP: sled degradation, floor wear, crowding and heat all shift across a race day. Unclaimed", "gen:arena early morning vs busy afternoon, split")
add(VI, 2, "Reading the RoxZone: venue geometry and the fastest route through", "roxzone layout",
    "GAP: everyone writes 'be efficient'; nobody maps the actual transition geometry", "chart:roxzone route diagram with distance annotations")
for venue, kw in [("ExCeL London", "hyrox excel london"), ("Olympia London", "hyrox olympia venue"),
                  ("Manchester Central", "hyrox manchester central"), ("OVO Hydro Glasgow", "hyrox ovo hydro"),
                  ("NEC Birmingham", "hyrox nec birmingham")]:
    add(VI, 2, f"{venue}: the coach's venue guide", kw,
        "GAP: UK venue deep-dives at coaching depth (floor, air, roxzone, warm-up space, logistics) — rivals do dates and hotels only", f"gen:{venue} interior architecture with race setup, documentary")

# ── H26: Wearables (competitor has 2 posts; nobody else is there) ────
WE = "Wearables & Tech"
for device, kw in [("Garmin", "garmin hyrox setup"), ("Apple Watch", "apple watch hyrox"),
                   ("Coros", "coros hyrox"), ("Polar", "polar hyrox"), ("Whoop", "whoop hyrox")]:
    add(WE, 2, f"{device} for HYROX: the exact race-day setup", kw,
        "GAP: near-empty vertical; screenshot-led setup guides rank fast and get bookmarked", f"gen:{device} on wrist showing race screen, gym context")
add(WE, 2, "What your heart rate actually does during a HYROX", "hyrox heart rate",
    "GAP: nobody has published real in-race HR traces. Ben's own race data makes this unmatchable", "chart:annotated in-race heart rate trace by station")
add(WE, 3, "Reading your HYROX race data: what the numbers tell you to fix", "hyrox race data analysis",
    "GAP: aggregate-average content everywhere; per-athlete diagnostic framework nowhere", "chart:split analysis diagnostic worksheet")
add(WE, 3, "Do you need a fitness watch for HYROX?", "hyrox watch",
    "Buying-decision post; honest 'no' case included", "gen:bare wrist vs watch, decision framing")

# ── H27: Injury and return-to-race (vertical owned only by clinics) ──
IR = "Injury & Return"
add(IR, 1, "Returning to HYROX after injury: the staged comeback", "return to training after injury",
    "GAP: physio clinics own HYROX injury search with zero HYROX-specific programming; no rival competes", "gen:athlete carefully resuming sled work, coach supervising", "pillar")
add(IR, 2, "Training around a knee injury for HYROX", "hyrox knee injury",
    "GAP: station-by-station modification matrix; genuinely useful, entirely unwritten", "chart:station modification matrix for knee injury")
add(IR, 2, "Training around a lower back injury for HYROX", "hyrox back injury",
    "GAP: sandbag/sled/lunges are the risk stations; modification guidance is absent", "gen:athlete doing supported hinge work, careful technique")
add(IR, 2, "Shoulder injuries and the erg stations", "hyrox shoulder injury",
    "GAP: ski erg/wall ball modification; clinic content lacks race context", "gen:shoulder rehab band work beside ski erg")
add(IR, 3, "The physio handover: from discharge back to race training", "physio to training",
    "GAP: the discharge-to-training gap is uncovered on both sides; needs physio review", "gen:clinic to gym transition, rehab notes on bench")
add(IR, 3, "Injury prevention for HYROX: the five highest-risk moments", "hyrox injury prevention",
    "Prevention content anchored to real station demands", "chart:risk moments across the eight stations")

# ── H28: Doubles/relay depth (rivals are all generic) ────────────────
add(D, 1, "Doubles split strategy with the actual maths, station by station", "hyrox doubles splits",
    "GAP: every rival says 'play to your strengths'. Nobody publishes the time-cost maths. Ben races doubles", "chart:doubles split time-cost model per station", "pillar")
add(D, 2, "Partner matching: what happens when your paces don't match", "hyrox doubles partner mismatch",
    "GAP: pace and weight-class mismatch is the real doubles problem; unaddressed anywhere", "chart:partner compatibility matrix")
add(D, 2, "Changeover drills: practising the handoff before race day", "hyrox doubles changeover",
    "GAP: changeover mechanics as trainable skill with drills; competitors describe, never coach", "own:track/pair-rear-close-colour.jpg")
add(D, 3, "Relay leg assignment: who takes which of the eight blocks", "hyrox relay strategy",
    "GAP: relay is the thinnest division in the niche; optimisation framework is unclaimed", "chart:relay leg assignment optimisation grid")

# ── H29: Pacing physiology (all vibes, no physiology, everywhere) ────
add(H, 1, "The physiology of HYROX pacing: LT1, LT2 and cardiac drift", "hyrox pacing physiology",
    "GAP: all pacing content in the niche is heuristic. Actual physiological rationale is unwritten and is a credibility moat", "chart:physiological demand across eight run-station cycles", "pillar")
add(H, 2, "Lactate clearance and the run-station cycle", "lactate clearance training",
    "GAP: explains WHY compromised running degrades; supports the signature concept", "chart:lactate response across race structure")
add(H, 3, "Cardiac drift: why your pace slows at the same effort", "cardiac drift",
    "GAP: explains a universal race experience nobody has named for this audience", "chart:HR drift vs pace decay over race duration")

# ── H30: Data stories from the results layer (blocked but planned) ───
add(DS, 3, "Where UK athletes actually lose time: variance by station", "hyrox time loss station",
    "GAP: rivals publish averages; variance analysis identifies the real coaching target", "chart:time variance by station, UK field", status="blocked-results")
add(DS, 3, "Open to Pro: what the upgrade really costs you in minutes", "hyrox open to pro time",
    "GAP: quantified division-change cost is asked constantly and answered nowhere", "chart:open vs pro time delta distribution", status="blocked-results")
add(DS, 3, "UK HYROX results analysis: how the British field compares", "uk hyrox results",
    "GAP: all data content is global-aggregate; UK-specific segmentation is unclaimed and matches our audience", "chart:UK vs global field distribution", status="blocked-results")
add(DS, 4, "Age-graded HYROX: comparing times fairly across decades", "hyrox age graded",
    "GAP: age-grading tables exist in running, not HYROX. Genuine link magnet", "chart:age grading factor table", status="blocked-results")
add(DS, 4, "DNF rates in HYROX: how often people don't finish, and why", "hyrox dnf rate",
    "GAP: nobody publishes this; reassuring and honest; strong share potential", "chart:DNF rate by division and station", status="blocked-results")
add(DS, 4, "Your 5k time predicts your HYROX: the conversion model", "5k to hyrox time",
    "GAP: predictive tooling is the single most-requested calculator; needs results data", "chart:5k time to predicted finish scatter", status="blocked-results")

# ── H31: Underserved demographics (confirmed near-zero coverage) ─────
add(DM, 1, "Pregnancy and HYROX: training, racing and returning", "hyrox pregnancy",
    "GAP: search returned ZERO HYROX-specific content. Completely open, needs clinical review", "gen:pregnant athlete training modified, supportive coach present", "pillar")
add(DM, 2, "Postpartum return to HYROX: the first 12 months", "postpartum hyrox return",
    "GAP: no HYROX-specific return pathway exists anywhere", "gen:parent training with pram nearby, gentle progression")
add(DM, 2, "Women and the sled push: the biggest time gap, and how to close it", "women hyrox sled push",
    "GAP: identified as the largest female time-loss station but only lightly covered anywhere", "gen:female athlete low sled drive position, technical focus")
add(DM, 3, "HYROX for heavier athletes: pacing and station strategy", "hyrox for bigger athletes",
    "GAP: entirely unwritten; large audience; running vs strength station trade-off is real", "gen:larger-build athlete strong on sled, respectful and capable")
add(DM, 3, "Adaptive and para HYROX: divisions, access and preparation", "adaptive hyrox",
    "GAP: no coverage anywhere in the niche; genuine access content", "gen:adaptive athlete training, dignified documentary style")
add(DM, 4, "Youth and under-24 HYROX: the development pathway", "youth hyrox",
    "GAP: pathway content unwritten; parent-and-athlete audience", "gen:young athlete with coach, development setting")

# ── H32: Season management (only one rival has any of this) ──────────
add(PD, 2, "How many HYROX races can you actually do in a season?", "how many hyrox races per season",
    "GAP: taper + recovery maths means the honest answer is lower than people think. Unwritten", "chart:season capacity model, taper and recovery blocks")
add(PD, 3, "Multi-race periodisation: planning three races across a season", "hyrox season periodisation",
    "GAP: only one rival covers offseason at all; multi-race planning is unclaimed", "chart:three-race season plan")

# ── H33: Rules in searchable HTML (official content is a PDF) ────────
add(F, 1, "The HYROX rulebook, in plain English and searchable", "hyrox rulebook",
    "GAP: official rules ship as a PDF. A searchable, structured HTML version outranks PDFs reliably; maintained per season", "chart:structured rules reference layout", "pillar")
add(F, 2, "HYROX no-reps: every standard a judge is watching for", "hyrox no rep",
    "GAP: judging standards scattered across a PDF; one clear reference per station", "chart:judging standards per station")
