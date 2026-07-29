# Personal-training / beginner-fitness blog post seeds (client intent ONLY —
# hard rule 2: no job-seeker, no PT-course content).
# Each: (cluster, wave, title, primary_kw, angle, image, format, status)

PT = []
def add(cluster, wave, title, kw, angle, image, fmt="guide", status="planned"):
    PT.append((cluster, wave, title, kw, angle, image, fmt, status))

# ── CLUSTER P1: PT Cost & Value (hub /how-much-is-a-personal-trainer) ─
CV = "PT Cost & Value"
add(CV, 1, "How much is a personal trainer in the UK? 2026 prices, honestly", "how much is a personal trainer",
    "1,300/KD12 anchor — THE online-vs-local argument page in blog form; cites real UK benchmarks", "chart:UK PT price map by region", "pillar")
add(CV, 1, "Personal trainer prices: what you get at every price point", "personal trainer prices",
    "Price-tier breakdown £25-£100+/session; what quality looks like at each", "chart:price tier ladder with inclusions")
add(CV, 1, "Is a personal trainer worth it? A trainer answers honestly", "is a personal trainer worth it",
    "Decision-stage; honest cases where a PT is NOT worth it — trust play, coaching CTA", "own:v2/adapt-coaching.jpg")
add(CV, 1, "How much does an online personal trainer cost?", "online personal trainer cost",
    "Online pricing transparency nobody offers; our prices named openly", "chart:online vs in-person cost comparison")
add(CV, 2, "Personal trainer cost per month: sessions vs coaching compared", "cost of personal trainer",
    "Monthly-budget framing; £160-260/mo local anchor vs online", "chart:monthly cost scenarios")
add(CV, 2, "How often should you see a personal trainer?", "how often personal trainer",
    "Frequency question; honest tapering-off answer; online model comparison", "gen:diary page with two marked sessions per week, coffee")
add(CV, 2, "Are personal trainers worth it for weight loss specifically?", "personal trainer for weight loss worth it",
    "Outcome-specific value question; evidence on adherence", "gen:trainer and client reviewing food diary at gym table")
add(CV, 2, "20 questions to ask a personal trainer before paying", "questions to ask a personal trainer",
    "Consumer-champion checklist; printable; positions our answers", "chart:question checklist card")
add(CV, 3, "Personal trainer red flags: 12 signs to walk away", "personal trainer red flags",
    "Consumer-protection content; trust magnet; share performance", "gen:client looking sceptical mid gym consult, candid")
add(CV, 3, "What does a personal trainer actually do?", "what does a personal trainer do",
    "Definition-stage query; sets expectations, funnels to assessment", "own:v2/about-coaching.jpg")
add(CV, 3, "PT session length: 30, 45 or 60 minutes — what's actually needed?", "personal trainer session length",
    "Micro-decision post; value-density argument favours coaching", "gen:interval timer on gym floor beside kettlebell")
add(CV, 3, "How long do you need a personal trainer for?", "how long do you need a personal trainer",
    "Honest exit-plan answer builds trust; graduate-to-online path", "chart:12-week outcome timeline")
add(CV, 4, "Cheap personal trainers: what corners get cut", "cheap personal trainer",
    "Budget-intent honesty; online coaching as the quality-per-pound answer", "gen:worn gym equipment corner, budget gym scene")
add(CV, 4, "Personal training packages explained: blocks, subs and contracts", "personal training packages",
    "Contract-literacy consumer post; our transparent model contrast", "chart:package structure comparison")

# ── CLUSTER P2: Online Coaching (hub /coaching) ──────────────────────
OC = "Online Coaching"
add(OC, 1, "Online personal trainer UK: how it works and who it suits", "online personal trainer uk",
    "Category pillar; the full model explained; assessment CTA", "own:v2/how-step-2.jpg", "pillar")
add(OC, 1, "Is online personal training worth it? Results vs the gym floor", "is online personal training worth it",
    "Head-on value question; adherence evidence; honest fit criteria", "own:v2/adapt-coaching.jpg")
add(OC, 1, "Online coaching vs in-person PT: the real differences", "online coaching vs personal trainer",
    "The conversion argument as editorial; geo-page synergy", "chart:side-by-side model comparison")
add(OC, 2, "What to expect from online coaching: your first month, week by week", "online coaching what to expect",
    "Expectation-setting reduces buying anxiety; onboarding preview", "own:v2/how-step-3.jpg")
add(OC, 2, "How online coaching check-ins work (and why they beat a weekly hour)", "online coaching check ins",
    "Model education; accountability science; retention preview", "gen:coach recording feedback video at desk, warm light")
add(OC, 2, "Do you need a gym for online coaching?", "online coaching without gym",
    "Access objection-handler; home-plan crosslinks", "gen:living room workout setup, mat dumbbells, real home")
add(OC, 3, "How to choose an online coach: credentials, proof and fit", "how to choose online coach",
    "Chooser framework; our proof laid out within it", "chart:coach vetting checklist")
add(OC, 3, "Online coaching for beginners: is it too soon?", "online coaching for beginners",
    "Beginner objection-handler; beginner-branch quiz CTA", "own:track/diverse-pool")
add(OC, 3, "App plans vs human coaching: what the £8.99 tier can and can't do", "fitness app vs personal trainer",
    "Honest tier comparison — sells both our tiers by being straight", "chart:app vs coach capability matrix")
add(OC, 4, "The case for a coach when you already know what to do", "why hire a coach",
    "Experienced-audience angle: accountability, blind spots, ceilings", "own:v2/bento-coaches.jpg")
add(OC, 4, "Group personal training online: cheaper, and it works", "group personal training",
    "390/KD10 quick win; Hub Plus group Q&A synergy", "gen:laptop group video call with coach, home gym corner")
add(OC, 4, "Corporate personal training: fitness benefits teams actually use", "corporate personal training",
    "KD10 B2B capture; partner-programme CTA", "gen:office wellness session, small group stretching meeting room")

# ── CLUSTER P3: Beginner Fitness (hub /get-fit) ──────────────────────
B = "Beginner Fitness"
add(B, 1, "How to start working out again (after months or years off)", "how to start working out again",
    "The beginner-branch front door; shame-free, programming-problem framing", "own:track/diverse-pool", "pillar")
add(B, 1, "The beginner gym plan: your first 8 weeks, fully mapped", "beginner gym plan",
    "Core beginner plan; printable; assessment CTA throughout", "chart:8-week beginner plan grid")
add(B, 1, "First time at the gym: what to do, where to stand, what to press", "first time at the gym",
    "Anxiety-dissolving walkthrough; genuinely kind tone", "gen:person at gym entrance with bag, deep breath, morning light")
add(B, 1, "Gym anxiety: 9 tactics that actually help", "gym anxiety",
    "High-empathy topic; beginner-brand trust builder; share magnet", "gen:quiet gym corner, person on mat with phone plan, safe feeling")
add(B, 2, "How many days a week should a beginner work out?", "how many days a week should i workout",
    "Frequency question; honest minimum-effective answer", "chart:results by weekly frequency visual")
add(B, 2, "Full body workout for beginners: one routine, three days", "full body workout for beginners",
    "The canonical starter routine; video-linked; printable", "gen:simple dumbbell setup on gym floor, beginner-friendly")
add(B, 2, "How long does it take to see results from working out?", "how long to see results working out",
    "THE beginner question; honest photo-timeline expectations", "chart:realistic results timeline by weeks")
add(B, 2, "Gym machines explained: what everything does (with pictures)", "gym machines explained",
    "Visual glossary; massive beginner utility; long dwell time", "gen:clean gym machine lineup labelled naturally, catalogue style")
add(B, 2, "Gym etiquette: the unwritten rules nobody tells beginners", "gym etiquette",
    "Social-fear remover; light tone; share performance", "gen:busy gym floor polite moment, wiping bench, candid")
add(B, 2, "How to build a workout routine (that survives real life)", "how to build a workout routine",
    "Habit-architecture guide; template download", "chart:routine builder decision flow")
add(B, 3, "Strength training for beginners: the only guide you need", "strength training for beginners",
    "Beginner strength pillar; form-video links; plan CTA", "own:v2/video-farmers.jpg", "pillar")
add(B, 3, "Walking to running: the 8-week progression from zero", "walking to running plan",
    "C25K-adjacent with coaching voice; beginner-branch bridge", "gen:park path morning walker in trainers, hopeful light")
add(B, 3, "Home workouts with no equipment: 12 sessions that work", "home workout no equipment",
    "Access-first content; no-excuses-needed tone", "gen:living room bodyweight squat, real home, natural light")
add(B, 3, "Your first month at the gym: a day-by-day diary", "first month at the gym",
    "Narrative format; expectation-setting; relatable milestones", "gen:gym bag by door with calendar week one ticked")
add(B, 3, "Working out before work: the 6am routine that sticks", "morning workout routine",
    "Schedule-fit content; shift-worker crosslink", "gen:dark kitchen 5.45am, coffee and gym bag ready")
add(B, 4, "Am I too unfit to start? (No — here's the actual floor)", "too unfit to exercise",
    "Deepest fear answered directly; GP-clearance guidance included", "gen:person on bench post short walk, small win smile")
add(B, 4, "The 20-minute workout: enough, if you do this", "20 minute workout",
    "Time-objection killer; EMOM-style beginner sessions", "chart:20-minute session cards")
add(B, 4, "Couch to 5k and then what? The next 12 weeks", "after couch to 5k",
    "Graduation-intent capture; running + strength bridge", "gen:runner finishing park loop checking watch, satisfied")

# ── CLUSTER P4: Age & Life Stage ─────────────────────────────────────
A = "Age & Life Stage"
add(A, 1, "Getting fit at 40: what changes, what doesn't", "getting fit at 40",
    "Age-ladder anchor; hormone/recovery honesty without doom", "gen:40s person confident with dumbbells, home gym, real build", "pillar")
add(A, 1, "Getting fit at 50: strength is the priority now", "getting fit at 50",
    "Age ladder; muscle-mass evidence; medical-clearance framing", "gen:50s person barbell setup with coach spotting, respectful")
add(A, 2, "Getting fit at 30: the decade to build the base", "getting fit at 30",
    "Age ladder; career/kids collision angle", "gen:30s person quick lunch workout, office backdrop")
add(A, 2, "Getting fit at 60 and beyond: the evidence is on your side", "getting fit at 60",
    "Age ladder top; senior PT keywords (KD9-15) support this", "gen:60s pair walking with poles then light weights, joyful")
add(A, 2, "Personal training for over 60s: what good looks like", "personal trainer for over 60",
    "KD11 senior-service capture; falls-prevention + strength evidence", "gen:trainer guiding senior client balance work, warm studio")
add(A, 2, "Fitness for new parents: training on broken sleep", "fitness for new parents",
    "Life-stage empathy content; 20-minute session crosslinks", "gen:parent stretching beside baby monitor, dawn living room")
add(A, 3, "Postnatal fitness: rebuilding safely after birth", "postnatal fitness",
    "Sensitive, evidence-cited, professional-reviewed framing", "gen:postnatal class gentle core work, supportive setting")
add(A, 3, "Training through menopause: strength, symptoms and honesty", "menopause exercise",
    "Underserved high-trust topic; evidence-based", "gen:mid-life woman strength session, strong and unposed")
add(A, 3, "Shift worker fitness: training when your body clock is chaos", "shift work exercise",
    "Existing hyrox-shift-workers post generalised; unique niche", "gen:nurse in scrubs leaving night shift with gym bag, dawn")
add(A, 3, "Fitness for busy professionals: the minimum effective week", "exercise for busy professionals",
    "Time-scarcity segment; calendar-integration angle", "gen:suit jacket on gym hook, watch check, lunchtime session")
add(A, 4, "Getting back in shape after injury: the patient comeback", "getting fit after injury",
    "Return-journey empathy; physio-handoff honesty", "gen:person removing knee support before careful squat, hopeful")
add(A, 4, "Student fitness on a budget: gym-free and cheap-gym plans", "student workout plan",
    "Young-audience capture; budget angle", "gen:campus room bodyweight workout, laptop plan playing")
add(A, 4, "Exercise for desk workers: undoing 8 hours of sitting", "exercise for desk workers",
    "Occupational segment; micro-break routines; corporate crosslink", "gen:standing desk stretch moment, office plants, natural")

# ── CLUSTER P5: Fat Loss (hub /fat-loss) ─────────────────────────────
FL = "Fat Loss"
add(FL, 1, "How to lose fat: the complete evidence-based guide", "how to lose fat",
    "Fat-loss pillar; no gimmicks positioning; assessment CTA", "own:v2/metrics-fresh.jpg", "pillar")
add(FL, 1, "Calorie deficit explained: the maths and the psychology", "calorie deficit",
    "Core concept explainer; calculator CTA; snippet-format definition", "chart:energy balance visual, plain-English")
add(FL, 2, "Why the scale isn't moving (though you're doing everything right)", "scale not moving",
    "Frustration-intent; water/glycogen/measurement education; retention tone", "chart:weight fluctuation vs trend line")
add(FL, 2, "Fat loss for people who train hard: eat enough, lose anyway", "fat loss while training",
    "Athlete-specific deficit guidance; performance-preservation angle", "gen:weighing meal prep portions beside training plan")
add(FL, 2, "Weight loss personal trainer: what they do differently", "weight loss personal trainer",
    "KD10 service capture; method transparency; coaching CTA", "gen:coach and client walking gym floor mid conversation")
add(FL, 2, "Body recomposition: losing fat and gaining muscle at once", "body recomposition",
    "Popular concept; honest who-it-works-for criteria", "chart:recomp vs cut-bulk comparison")
add(FL, 3, "Macros for beginners: protein first, then don't overthink", "macros for beginners",
    "Simplification play against macro-obsessed content", "gen:simple plate portioned by hand method, kitchen light")
add(FL, 3, "How much protein to lose weight (without losing muscle)", "protein for weight loss",
    "Specific dosing question; evidence tables", "chart:protein targets by bodyweight")
add(FL, 3, "Walking for fat loss: the most underrated tool", "walking for fat loss",
    "Low-barrier entry content; step-count honesty", "gen:brisk walker on canal path, headphones, everyday clothing")
add(FL, 3, "How long does it take to lose a stone (healthily)?", "how long to lose a stone",
    "UK-specific unit query; honest timeline; UK audience signal", "chart:stone loss timeline scenarios")
add(FL, 4, "Cardio vs weights for fat loss: the actual answer", "cardio vs weights fat loss",
    "Evergreen debate; both-and evidence; programme crosslink", "gen:split treadmill vs dumbbell rack, same person")
add(FL, 4, "Maintenance: keeping weight off after you've lost it", "keeping weight off",
    "Post-diet content nobody writes; long-term coaching case", "gen:person cooking relaxed weeknight meal, sustainable feel")

# ── CLUSTER P6: Beginner Strength (hub /strength) ────────────────────
ST = "Beginner Strength"
add(ST, 1, "How to squat: form, depth and fixes for every body", "how to squat",
    "Movement pillar; video-first; form-check CTA", "own:v2/video-burpee.jpg", "pillar")
add(ST, 1, "How to deadlift safely: the hinge that changes everything", "how to deadlift",
    "Movement pillar; fear-reducing, physio-informed", "gen:coach teaching hinge with dowel, side profile, clean gym")
add(ST, 2, "Progressive overload: the only principle that matters", "progressive overload",
    "Core principle explainer; glossary crosslink; snippet definition", "chart:progression staircase visual")
add(ST, 2, "How much should I be able to lift? Standards by age and weight", "how much should i be able to lift",
    "Benchmark tables; calculator CTA; comparison-intent capture", "chart:strength standards by age/bodyweight")
add(ST, 2, "Dumbbells vs barbells for beginners", "dumbbells vs barbells",
    "Equipment-decision post; home-gym crosslink", "gen:dumbbell rack and barbell side by side, choice framing")
add(ST, 3, "Kettlebell training for beginners: 6 moves, one bell", "kettlebell workout beginners",
    "Minimal-kit strength; home audience; video-linked", "gen:single kettlebell swing mid-motion, garden setting")
add(ST, 3, "Core training that isn't crunches", "core exercises",
    "Anti-boredom angle; carries/planks/anti-rotation education", "gen:plank with coach cueing hips, gym floor")
add(ST, 3, "How to overhead press: shoulders that stay healthy", "how to overhead press",
    "Movement library completion", "gen:press lockout from behind, natural strength")
add(ST, 4, "Grip strength: why yours is holding everything back", "grip strength training",
    "Underrated-limiter angle; carry crosslinks to HYROX side", "own:track/palms-lamp-colour.jpg")
add(ST, 4, "Should beginners lift to failure?", "lifting to failure",
    "Programming question; RIR education; snippet answer", "gen:last hard rep face, honest effort, spotter present")

# ── CLUSTER P7: Beginner Running (hub /running) ──────────────────────
RN = "Beginner Running"
add(RN, 1, "How to start running from zero (when running feels impossible)", "how to start running",
    "Running pillar; walk-run method; empathy-first", "gen:new runner pausing to breathe, park, no shame framing", "pillar")
add(RN, 2, "How to run faster: the 4 levers that actually work", "how to run faster",
    "Improvement-intent; intervals/strength/economy/weight honesty", "own:track/bend-lanes-bw.jpg")
add(RN, 2, "Running form for beginners: 5 cues, not 50", "running form",
    "Simplification play; video-linked cues", "own:track/pair-rear-close-colour.jpg")
add(RN, 3, "Couch to 5k: an honest review from coaches", "couch to 5k review",
    "Rides the biggest beginner-running brand; what-next CTA", "gen:phone with running app strapped to arm, park backdrop")
add(RN, 3, "Treadmill vs outdoor running: differences that matter", "treadmill vs outdoor running",
    "Evergreen question; winter-UK practicality", "gen:split treadmill window scene vs wet pavement run")
add(RN, 3, "Shin splints: why new runners get them and the fix", "shin splints",
    "Symptom-intent capture; load-management education", "gen:runner stretching calf on kerb, morning street")
add(RN, 4, "Running in the heat (and the cold): UK weather playbook", "running in heat",
    "Seasonal republish pair; practical hydration/kit", "gen:runner in light rain with cap, very British conditions")
add(RN, 4, "Your first 10k: the 8-week step up from 5k", "first 10k training plan",
    "Progression-intent; plan download; coaching CTA", "chart:5k-to-10k 8-week plan grid")

# ── CLUSTER P8: Habits & Motivation ──────────────────────────────────
HM = "Habits & Motivation"
add(HM, 1, "How to stay consistent with exercise: systems, not willpower", "how to stay consistent with exercise",
    "The real problem named; habit-science; coaching-accountability CTA", "chart:habit loop applied to training", "pillar")
add(HM, 2, "Lost all motivation to work out? Read this first", "no motivation to workout",
    "Low-point empathy content; restart protocol; kind tone", "gen:trainers by door, hand reaching for them, quiet hope")
add(HM, 2, "How to make exercise a habit: the 66-day reality", "how to make exercise a habit",
    "Evidence-based habit formation; tracker download", "chart:habit formation curve annotated")
add(HM, 3, "Training when you really don't feel like it: the 10-minute rule", "workout when tired",
    "Practical micro-strategy; permission-to-scale framing", "gen:athlete doing lighter session, satisfied compromise")
add(HM, 3, "Why you quit the gym in February (and how not to)", "gym new years resolution",
    "January-publish seasonal; resolution-retention play", "gen:january gym crowd vs same gym in march, split")
add(HM, 4, "Tracking progress beyond the mirror: 9 markers that matter", "how to track fitness progress",
    "Non-scale-victory education; Hub logging synergy", "own:v2/bento-progress.jpg")
add(HM, 4, "Exercise and mental health: what the evidence really shows", "exercise mental health",
    "Evidence-cited wellbeing content; sensitive, non-clinical framing", "gen:post-workout calm outside gym, golden hour")

# ── CLUSTER P9: Niche Services (evidenced PT keywords) ───────────────
NS = "Niche Services"
add(NS, 2, "Personal trainers for seniors: strength against ageing", "fitness trainer for seniors",
    "KD10-15 senior cluster capture; evidence-forward", "gen:senior strength class, capable and dignified")
add(NS, 2, "Female personal trainers: why many women prefer them (and finding fit)", "personal trainer near me female",
    "Preference-intent; our coaching-fit answer; respectful framing", "gen:female coach demonstrating row to client, professional")
add(NS, 3, "1-on-1 personal training vs group sessions: choosing your format", "personal training 1 on 1",
    "KD9 format-decision; tier-ladder mapping", "chart:format comparison decision aid")
add(NS, 3, "Home personal trainers: how home sessions work (and the online rival)", "home personal trainer",
    "KD14; home-service intent captured then online-converted", "gen:coach with kit bag at client's front door, friendly")
add(NS, 3, "Personal trainer and nutritionist in one: what's realistic", "personal trainer nutritionist",
    "Scope-of-practice honesty; combined-support model", "gen:meal plan and training plan side by side on table")
add(NS, 4, "Muscle-building coaching: when a PT accelerates hypertrophy", "personal trainer to build muscle",
    "KD14 outcome-specific service post", "gen:progressive dumbbell rack focus, gym depth")
add(NS, 4, "Strength training for women: the near-me search, answered online", "weight training for women near me",
    "KD13; near-me intent to online conversion; geo synergy", "gen:woman mid goblet squat, strong, everyday gym")

# ── CLUSTER P10: UK PT Location editorial (supports geo pages) ───────
LE = "Location Editorial"
for city in ["Manchester", "Bristol", "Birmingham", "Cardiff", "London"]:
    add(LE, 3, f"Personal trainer prices in {city}: what locals pay (2026)", f"personal trainer prices {city.lower()}",
        f"Local price-transparency editorial feeding /personal-trainer/{city.lower()}; online anchor comparison", "chart:city price ranges vs online")
add(LE, 4, "The best value personal training in the UK might not be near you",
    "best personal trainer uk",
    "Flagship geo-argument editorial; Elite-15-online-vs-local case; links location pages", "own:ben/ben-coaching-placeholder.jpg")

# ── CLUSTER P11: FAQ micro-posts (question inventory; agent-informed) ─
FQ = "PT FAQ"
for q, kw in [
    ("Can a personal trainer write my diet plan?", "can personal trainer give diet plan"),
    ("Do you tip a personal trainer?", "do you tip personal trainer"),
    ("Can you share a personal trainer with a friend?", "share personal trainer with friend"),
    ("What should I wear to my first PT session?", "what to wear first pt session"),
    ("What happens at a PT consultation?", "personal trainer consultation"),
    ("Do personal trainers judge beginners? (No — here's why)", "do personal trainers judge you"),
    ("Can I cancel a personal training contract?", "cancel personal training contract"),
    ("Is one PT session a week enough?", "is one pt session a week enough"),
    ("Are gym inductions worth doing?", "gym induction worth it"),
    ("Personal trainer or physio: who do I need?", "personal trainer or physiotherapist"),
]:
    add(FQ, 4, q, kw,
        "FAQ micro-post: 60-word direct answer first, then depth; FAQPage schema; AI-citation format", "gen:relevant candid coaching moment matching the question")

# ── CLUSTER P12: Beginner FAQ sweep (question inventory) ─────────────
BF = "Beginner FAQ"
for q, kw in [
    ("How long should a workout be?", "how long should a workout be"),
    ("Should you work out every day?", "should i workout every day"),
    ("Is it better to work out in the morning or evening?", "best time to workout"),
    ("Should you eat before a workout?", "eat before workout"),
    ("What should you eat after a workout?", "what to eat after workout"),
    ("How much water should you drink when training?", "water intake exercise"),
    ("Is it normal to be sore after every workout?", "sore after every workout"),
    ("Should you work out when sore?", "workout when sore"),
    ("Should you exercise with a cold?", "exercise with a cold"),
    ("How many rest days do you need a week?", "how many rest days"),
    ("Do you need to warm up? (Yes, but not how you think)", "do i need to warm up"),
    ("Is stretching before exercise bad?", "stretching before workout"),
    ("How much cardio is too much?", "how much cardio"),
    ("Do you need supplements as a beginner?", "supplements for beginners"),
    ("Is creatine worth it?", "is creatine worth it"),
    ("Do fat burners work?", "do fat burners work"),
    ("Are protein shakes necessary?", "are protein shakes necessary"),
    ("Should women lift heavy weights?", "should women lift heavy"),
    ("Will lifting weights make women bulky?", "will lifting make me bulky"),
    ("Can you spot-reduce belly fat?", "how to lose belly fat"),
    ("How many steps a day do you actually need?", "how many steps a day"),
    ("Is walking enough exercise?", "is walking enough exercise"),
    ("What is a good resting heart rate?", "good resting heart rate"),
    ("How do you breathe when lifting?", "breathing when lifting"),
    ("What weight should a beginner start with?", "what weight to start lifting"),
    ("How many reps and sets should beginners do?", "how many reps and sets"),
    ("How long between sets should you rest?", "rest between sets"),
    ("Free weights or machines for beginners?", "free weights vs machines"),
    ("Is a gym membership worth it?", "is gym membership worth it"),
    ("Home gym or gym membership: which is cheaper?", "home gym vs gym membership"),
    ("What is a calorie deficit in practice?", "what is a calorie deficit"),
    ("How accurate are calorie trackers on watches?", "are calorie trackers accurate"),
    ("Should you weigh yourself daily?", "should i weigh myself daily"),
    ("Why am I gaining weight while exercising?", "gaining weight while exercising"),
    ("How long does it take to get fit?", "how long to get fit"),
    ("How long does it take to lose fitness?", "how quickly do you lose fitness"),
    ("Can you get fit at home without equipment?", "get fit at home"),
    ("What's the best exercise for beginners?", "best exercise for beginners"),
    ("Do you have to run to get fit?", "do i have to run"),
    ("Is HIIT good for beginners?", "hiit for beginners"),
]:
    add(BF, 4, q, kw,
        "FAQ micro-post: 50-word direct answer (snippet/AI-citation target), then coach-level depth; FAQPage schema", "gen:candid gym or home-training moment matching the question", "glossary")

# ── CLUSTER P13: Body-part & goal training ───────────────────────────
BP = "Goal Training"
for title, kw, angle_x, img in [
    ("How to build muscle: the beginner's evidence guide", "how to build muscle", "hypertrophy pillar; volume/progression/protein basics", "own:v2/video-farmers.jpg"),
    ("How to get stronger without getting bigger", "get stronger not bigger", "neural vs hypertrophy; weight-class + aesthetic audience", "gen:lean athlete heavy single, focused"),
    ("Building a stronger back: rows, pulls and posture", "back workout", "body-part library; desk-worker crosslink", "gen:cable row execution side profile"),
    ("Leg day for people who hate leg day", "leg workout", "body-part library; humour + programming", "gen:squat rack setup, chalk, honest effort"),
    ("Arms without ego: training that actually adds size", "arm workout", "body-part library; beginner-realistic", "gen:dumbbell curl mid-set, gym mirror context"),
    ("Shoulder health: build them without wrecking them", "shoulder workout", "injury-aware body-part content", "gen:band work on rig, warmup context"),
    ("Glute training that isn't just hip thrusts", "glute workout", "high-volume search topic; evidence-based", "gen:hip hinge with barbell, technical framing"),
    ("Core strength for real life: carries and anti-rotation", "core workout", "functional framing; HYROX crossover", "own:v2/video-farmers.jpg"),
    ("Building endurance from scratch", "how to build endurance", "aerobic base for beginners; zone-2 lite", "gen:steady run on canal path, sustainable pace"),
    ("Improving flexibility as an adult", "how to improve flexibility", "mobility for stiff beginners; 10-min routines", "gen:hamstring stretch on mat, home living room"),
    ("Posture: what training can and can't fix", "how to improve posture", "myth-correction + practical strength answer", "gen:desk setup with standing break, office"),
    ("Balance training and why it matters after 50", "balance exercises", "senior cluster crosslink; falls-prevention evidence", "gen:single-leg balance work with rail support"),
]:
    add(BP, 3, title, kw, angle_x, img)

# ── CLUSTER P14: Nutrition for general fitness ───────────────────────
NU = "Everyday Nutrition"
for title, kw, angle_x, img in [
    ("How much protein do you need a day?", "how much protein per day", "top nutrition question; bodyweight table; snippet target", "chart:daily protein targets by bodyweight and goal"),
    ("Meal prep for people who hate meal prep", "meal prep for beginners", "practical anti-perfectionism; 3-component method", "gen:simple batch cook containers, real kitchen"),
    ("Eating out while training: the ordering playbook", "eating out on a diet", "sustainability angle; social-life-preserved framing", "gen:restaurant table with balanced plate, friends blurred"),
    ("Alcohol and training: the honest trade-offs", "alcohol and fitness", "evidence without moralising; UK-relevant", "gen:pub scene, glass on table, gym bag beside chair"),
    ("Do you need breakfast to train?", "breakfast before workout", "myth question; fasted-training evidence", "gen:early kitchen, toast and coffee, gym kit on"),
    ("Snacks that actually support training", "healthy snacks", "practical list; protein-forward", "gen:snack options laid out on counter, realistic"),
    ("Cooking for a family while eating for a goal", "healthy family meals", "life-stage practical; parents crosslink", "gen:family dinner table, shared meal, warm"),
    ("Supermarket shopping for training: the basket method", "healthy food shopping list", "budget + practical; UK supermarket context", "gen:trolley with staples, supermarket aisle"),
    ("Vegetarian and vegan training nutrition", "vegan fitness nutrition", "underserved combination; protein strategies", "gen:plant-based protein spread, colourful plate"),
    ("Eating for shift work: fuelling a broken clock", "shift work nutrition", "niche; shift-worker cluster crosslink", "gen:night-shift meal in staff room, honest"),
]:
    add(NU, 3, title, kw, angle_x, img)

# ── CLUSTER P15: Location editorial expansion (geo support) ──────────
for city in ["Nottingham", "Southampton", "Brighton", "Cambridge", "York", "Norwich",
             "Aberdeen", "Coventry", "Reading", "Watford", "Northampton", "Bournemouth",
             "Exeter", "Oxford", "Bath", "Canterbury", "Portsmouth", "Poole"]:
    add(LE, 4, f"Getting fit in {city}: gyms, parks and online coaching compared", f"personal trainer {city.lower()}",
        f"Local editorial supporting /personal-trainer/{city.lower()}; genuinely useful local content that also runs the online argument", f"gen:{city} recognisable park or waterfront with runner, natural")

# ── CLUSTER P16: Consumer guides & comparisons ───────────────────────
CG = "Consumer Guides"
for title, kw, angle_x, img in [
    ("Best gym chains in the UK compared (2026)", "best gym uk", "consumer comparison; PureGym/Gym Group/DW; huge search", "chart:UK gym chain comparison table"),
    ("PureGym vs The Gym Group: which suits your training?", "puregym vs gym group", "head-to-head; equipment reality for hybrid training", "gen:budget gym floor equipment overview"),
    ("Best fitness apps 2026: what each is actually for", "best fitness app", "app landscape; we appear honestly among them", "chart:fitness app comparison by use case"),
    ("Best free workout apps that don't nag you to pay", "free workout app", "free-intent capture; honest freemium map", "chart:free app feature comparison"),
    ("Fitness trackers compared: what data actually helps", "best fitness tracker", "wearable buying guide; data-literacy angle", "gen:three watches on desk, screens showing metrics"),
    ("Home gym essentials: what to buy first, second, third", "home gym essentials", "budget-tiered build; big commercial intent", "gen:compact home gym corner, tidy and achievable"),
    ("Are gym contracts worth it? Rolling vs annual", "gym contract", "consumer-rights angle; UK-specific", "gen:contract paperwork on gym reception desk"),
    ("Personal training vs group classes vs apps: a buyer's map", "personal training vs classes", "category-decision post; our ladder maps onto it", "chart:training option decision matrix"),
    ("What to look for in a gym if you're training for a race", "choosing a gym", "equipment-checklist angle; HYROX crossover", "gen:gym equipment audit view, sled and rig visible"),
    ("Fitness qualifications explained (for people hiring, not becoming)", "personal trainer qualifications", "buyer-side framing only — vetting a coach, NOT course content", "chart:credential checklist for hiring a coach"),
]:
    add(CG, 3, title, kw, angle_x, img)

# ── CLUSTER P17: Results, proof and process ──────────────────────────
PR = "Process & Proof"
for title, kw, angle_x, img in [
    ("What results can you expect in 12 weeks?", "12 week transformation", "honest expectation-setting; no fake before/afters (hard rule 1)", "chart:realistic 12-week outcome ranges"),
    ("How to take progress photos that actually tell the truth", "progress photos", "method post; lighting/consistency; self-tracking", "gen:phone on tripod in bedroom, neutral setup"),
    ("Measuring progress without a scale", "how to measure progress fitness", "non-scale markers; Hub logging synergy", "own:v2/bento-progress.jpg"),
    ("Plateaus: why progress stalls and the 5 fixes", "training plateau", "problem-intent; programming education", "gen:athlete resting on bench between sets, thinking"),
    ("How coaches actually write a training programme", "how to write a training program", "transparency content; sells the skill by showing it", "gen:coach writing plan at desk with laptop and notes"),
    ("What a good check-in looks like (with a real example)", "coaching check in", "process transparency; online coaching CTA", "gen:coach reviewing client data on screen"),
    ("Deload weeks for normal people", "deload week", "recovery education for non-athletes", "chart:training load with deload visual"),
    ("Why your last programme failed (it probably wasn't you)", "why diets fail", "empathy + systems argument; strong coaching CTA", "gen:abandoned gym plan on fridge, honest scene"),
]:
    add(PR, 3, title, kw, angle_x, img)

# ── CLUSTER P18: Location editorial — remaining evidenced towns ──────
for city in ["Leicester", "Sheffield", "Leeds", "Liverpool", "Newcastle", "Glasgow",
             "Edinburgh", "Swansea", "Derby", "Plymouth", "Milton Keynes", "Luton",
             "Slough", "Croydon", "Chelmsford", "Bedford", "Worcester", "Redhill",
             "Ilford", "Southend-on-Sea", "Bradford", "Preston", "Middlesbrough", "Swindon"]:
    slug_city = city.lower().replace(" ", "-")
    add(LE, 4, f"Getting fit in {city}: your options compared", f"personal trainer {city.lower()}",
        f"Local editorial supporting /personal-trainer/{slug_city}; gyms, parks, costs, and the online alternative", f"gen:{city} recognisable outdoor training location, natural documentary")

# ── CLUSTER P19: Pain, injury and safe training ──────────────────────
PI = "Pain & Injury"
for title, kw, angle_x, img in [
    ("Lower back pain and exercise: what helps, what hurts", "lower back pain exercise", "huge search topic; evidence-based, physio-signposted", "gen:person doing gentle hinge with coach watching, careful"),
    ("Knee pain when squatting: causes and fixes", "knee pain squatting", "symptom-intent; technique vs load diagnosis", "gen:squat depth assessment side view, coach hand cue"),
    ("Shoulder pain from pressing: the assessment", "shoulder pain pressing", "symptom-intent; scaling options", "gen:shoulder mobility screen with band, studio"),
    ("Training with arthritis: what the evidence supports", "exercise with arthritis", "senior cluster crosslink; evidence-cited, conservative", "gen:older adult on stationary bike, comfortable and capable"),
    ("Exercising with high blood pressure: safe starting points", "exercise high blood pressure", "medical-adjacent; GP-clearance framing throughout", "gen:blood pressure monitor beside trainers on table"),
    ("Training with diabetes: timing, fuel and safety", "exercise and diabetes", "medical-adjacent; conservative, sourced", "gen:glucose monitor and gym bag, morning routine"),
    ("Exercise and asthma: training with your lungs in mind", "exercise induced asthma", "condition-specific; inhaler-aware practical advice", "gen:runner with inhaler in pocket, park path"),
    ("Hypermobility and strength training", "hypermobility exercise", "underserved condition; stability-first programming", "gen:controlled tempo work with light dumbbells"),
    ("Returning to training after surgery", "exercise after surgery", "return-journey; clinician-handoff honesty", "gen:physio-style gentle rehab session, clinic-adjacent gym"),
    ("Is it muscle soreness or an injury? How to tell", "muscle soreness vs injury", "decision-tree post; genuinely useful triage", "chart:soreness vs injury decision tree"),
    ("Training around a niggle without making it worse", "training with niggle", "practical modification matrix", "gen:athlete adjusting exercise selection, thoughtful"),
    ("Warm-ups that actually reduce injury risk", "warm up to prevent injury", "evidence vs ritual; RAMP protocol", "gen:dynamic warmup sequence on gym floor"),
]:
    add(PI, 3, title, kw, angle_x, img)

# ── CLUSTER P20: Women's fitness ─────────────────────────────────────
WF = "Women's Fitness"
for title, kw, angle_x, img in [
    ("Strength training for women: the complete starting guide", "strength training for women", "women's pillar; myth-clearing + programme", "gen:woman deadlift setup, strong and unposed, real gym"),
    ("Training with your cycle: a practical framework", "training menstrual cycle", "evidence-cited; practical not prescriptive", "chart:cycle phase training adjustments"),
    ("Pelvic floor and lifting: what every woman should know", "pelvic floor exercise lifting", "underserved, high-trust; specialist-reviewed", "gen:core breathing work on mat, calm studio"),
    ("Perimenopause and strength: why now matters most", "perimenopause exercise", "life-stage; bone/muscle evidence", "gen:mid-life woman with barbell, confident"),
    ("Women's protein needs: the numbers, honestly", "protein for women", "counters under-eating; evidence tables", "chart:protein targets for women by weight and goal"),
    ("Training while breastfeeding: energy, timing and safety", "exercise while breastfeeding", "sensitive life-stage; sourced guidance", "gen:mother with baby carrier walking, active recovery"),
    ("Female-specific injury risks and prevention", "women injury prevention training", "ACL/bone-density evidence; practical prevention", "gen:landing mechanics drill, coach observing"),
    ("Gym intimidation and the free-weights area", "women gym intimidation", "empathy + tactics; gym-anxiety sibling", "gen:woman confidently in free weights area, natural"),
]:
    add(WF, 3, title, kw, angle_x, img, "pillar" if "complete starting guide" in title else "guide")

# ── CLUSTER P21: Lifestyle & context ─────────────────────────────────
LS = "Lifestyle & Context"
for title, kw, angle_x, img in [
    ("Sleep and fitness: the free performance multiplier", "sleep and exercise", "evidence-based; wearable-era relevance", "gen:dark bedroom, watch charging, calm"),
    ("Stress, cortisol and training: separating fact from fear", "stress and exercise", "myth-correction; evidence-cited", "gen:person walking outdoors decompressing, dusk"),
    ("Training and mental health: what actually helps", "exercise for mental health", "sensitive, non-clinical, sourced; signposts support", "gen:group run at dusk, connection and calm"),
    ("Fitting fitness around childcare", "exercise with kids", "practical life-stage; micro-session strategies", "gen:parent training with toddler playing nearby, real"),
    ("Training with a long commute", "exercise with long commute", "time-scarcity niche; commute-integration ideas", "gen:cyclist commuter with pannier, city morning"),
    ("Fitness on a tight budget: everything free that works", "exercise on a budget", "access-first; cost-of-living relevant", "gen:park bench workout, no equipment, honest"),
    ("Training in a small flat: the 2m² workout", "small space workout", "urban-living constraint; equipment-minimal", "gen:tiny flat floor workout, mat and bands"),
    ("Winter training in the UK: dark, wet and still doable", "winter training uk", "seasonal; UK-specific; kit and mindset", "gen:runner in rain under streetlight, determined"),
    ("Training while travelling for work", "workout while travelling", "professional niche; hotel-gym reality", "gen:hotel gym at night, suitcase, laptop bag"),
    ("Social life vs training goals: the compatible version", "training and social life", "sustainability angle; anti-all-or-nothing", "gen:friends at pub, one with gym bag, relaxed"),
]:
    add(LS, 4, title, kw, angle_x, img)

# ── CLUSTER P22: Beginner-to-HYROX bridge (segment ladder) ───────────
BR = "Beginner to HYROX Bridge"
for title, kw, angle_x, img in [
    ("From first gym session to first race: the 12-month path", "beginner to hyrox", "THE strategic bridge post — beginners become race athletes", "own:track/diverse-pool"),
    ("Are you fit enough to try a fitness race?", "fit enough for fitness race", "readiness assessment; quiz CTA; fear-reduction", "chart:readiness self-assessment checklist"),
    ("Why a race goal beats a weight goal", "fitness goal setting", "motivation-science; converts fat-loss audience to event training", "gen:race bib pinned beside scale in bin, symbolic but tasteful"),
    ("Your first fitness event: 5k, HYROX or something else?", "first fitness event", "event chooser for beginners; low-pressure framing", "chart:event chooser decision tree"),
    ("What functional fitness actually means", "functional fitness", "definition post; category education; hybrid crosslink", "own:v2/station-fresh.jpg"),
    ("Group training vs solo: which keeps you consistent?", "group training vs solo", "adherence evidence; community angle", "gen:small group session, camaraderie, gym floor"),
]:
    add(BR, 2, title, kw, angle_x, img, "pillar" if "12-month path" in title else "guide")

# ── CLUSTER P23: Getting started decisions ───────────────────────────
GS = "Getting Started"
for title, kw, angle_x, img in [
    ("How to choose your first fitness goal", "how to set fitness goals", "goal-setting framework; feeds the assessment quiz", "chart:goal selection decision aid"),
    ("Do you need a fitness assessment before starting?", "fitness assessment", "our free assessment as the answer; genuinely useful either way", "own:v2/metrics-fresh.jpg"),
    ("What is a fitness baseline and how to measure yours", "fitness baseline test", "self-test protocol; repeatable; logging synergy", "chart:baseline test battery card"),
    ("How to read a training programme (if you've never had one)", "how to follow a workout plan", "programme-literacy; sets and reps notation decoded", "gen:printed plan on gym bench with pen marks"),
    ("Gym kit for beginners: what you actually need to buy", "gym clothes for beginners", "low-barrier practical; anti-overspend honesty", "gen:simple kit laid out on bed, unbranded"),
    ("Your first week: exactly what to do, day by day", "first week gym plan", "day-one hand-holding; highest beginner intent", "chart:day-by-day first week plan"),
    ("Solo gym or class? Choosing your entry point", "gym class or gym floor", "entry-mode decision; anxiety-aware", "gen:class studio door vs gym floor, choice framing"),
    ("What to do if you've never exercised at all", "never exercised where to start", "true-zero starting point; walk-first protocol", "gen:front door trainers, first walk, hopeful"),
]:
    add(GS, 2, title, kw, angle_x, img)

# ── CLUSTER P24: Myths and misinformation ────────────────────────────
MY = "Myths & Evidence"
for title, kw, angle_x, img in [
    ("10 fitness myths that won't die", "fitness myths", "myth-bust listicle; share magnet; evidence-cited", "chart:myth vs evidence comparison cards"),
    ("Does sweating mean you burned more fat?", "does sweating burn fat", "specific myth; physiology explained simply", "gen:sweat towel on bench, honest post-session"),
    ("Is soreness a sign of a good workout?", "is soreness good", "adherence-damaging myth corrected", "gen:athlete stretching next day, mild discomfort"),
    ("Do you need to 'shock the muscle'?", "muscle confusion", "programming myth; progressive-overload counter", "chart:consistency vs variety outcome comparison"),
    ("Is fasted cardio better for fat loss?", "fasted cardio", "evidence review; practical verdict", "gen:early morning run, empty streets, dawn"),
    ("Do detoxes and cleanses do anything?", "detox for weight loss", "consumer-protection; liver physiology", "gen:juice bottles beside real food, contrast"),
    ("Are carbs the enemy?", "are carbs bad", "nutrition myth; performance-fuel framing", "gen:rice pasta oats on counter, unashamed"),
    ("Can you turn fat into muscle?", "turn fat into muscle", "biology myth; recomp explained properly", "chart:fat loss and muscle gain as separate processes"),
    ("Is running bad for your knees?", "is running bad for knees", "big evidence-backed myth-bust; running crosslink", "gen:runner on path, knees healthy, mid-stride"),
    ("Do you lose muscle if you stop training for two weeks?", "muscle loss detraining", "reassurance content; detraining evidence", "gen:person returning to gym after break, calm"),
]:
    add(MY, 3, title, kw, angle_x, img)

# ── CLUSTER P25: Coaching philosophy / brand voice ───────────────────
CP = "Coaching Philosophy"
for title, kw, angle_x, img in [
    ("Why we don't do before-and-after photos", "before and after photos fitness", "brand-values content; honesty as differentiation (hard rule 1 as marketing)", "own:v2/honesty-fresh.jpg"),
    ("The problem with 75 Hard and extreme challenges", "75 hard review", "high-search critique; sustainable-alternative offer", "gen:calendar with crossed-off days, exhaustion implied"),
    ("Discipline vs motivation: the more useful frame", "discipline vs motivation", "philosophy content; habit crosslink", "gen:early alarm and kit ready, quiet resolve"),
    ("What a coach actually changes (it isn't the exercises)", "what does a coach do", "differentiation content; adherence and decisions", "own:v2/about-coaching.jpg"),
    ("Training for life, not for a date", "sustainable fitness", "anti-crash-diet positioning; long-term coaching case", "gen:person training in their forties, unhurried"),
    ("Why most fitness advice online is wrong for you", "fitness advice online", "personalisation argument; assessment CTA", "gen:phone with conflicting fitness content, confusion"),
    ("Rest is training: the case for doing less sometimes", "rest days importance", "recovery philosophy; overtraining crosslink", "gen:empty gym bag on rest day, book and coffee"),
]:
    add(CP, 4, title, kw, angle_x, img)

# ── CLUSTER P26: Corporate & group (B2B revenue line) ────────────────
CB = "Corporate & Group"
for title, kw, angle_x, img in [
    ("Corporate wellness that employees actually use", "corporate wellness programme", "B2B lead content; partner-programme CTA", "gen:office team lunchtime session, genuine participation"),
    ("Setting up a workplace fitness challenge", "workplace fitness challenge", "practical B2B playbook; relay crosslink", "chart:8-week workplace challenge structure"),
    ("Training a team for a fitness event together", "team fitness event training", "corporate relay funnel; group coaching CTA", "gen:workplace team training together after hours"),
    ("Group coaching vs individual: what teams should choose", "group coaching for teams", "B2B service comparison", "chart:group vs individual coaching for teams"),
]:
    add(CB, 4, title, kw, angle_x, img)

# ══════════════════════════════════════════════════════════════════════
# GAP-DRIVEN ADDITIONS — from UK client-intent research 2026-07-29.
# Note the SERP-contamination finding: course sellers (OriGym, HFE) and
# salary sites rank for the same strings with "become a PT" intent. Every
# title below must signal BUYER intent ("cost you", "should you", "your",
# "hiring") or Google treats us as a near-duplicate of them.
# ══════════════════════════════════════════════════════════════════════

# ── P27: Commercial transparency (no coaching brand publishes numbers) ─
CT = "Coaching Transparency"
add(CT, 1, "What online coaching actually costs in the UK (2026 price bands)", "online coaching cost uk",
    "GAP: only marketplaces publish prices; no coaching brand does. Publishing ours openly is both differentiation and the strongest trust signal available", "chart:UK online coaching price bands by tier", "pillar")
add(CT, 1, "£40/hr PT vs £129/month coaching: the cost-of-contact maths", "personal trainer vs online coach cost",
    "GAP: nobody does this arithmetic. It is the conversion argument in numbers, and it favours us honestly", "chart:cost per week of coach contact, both models")
add(CT, 1, "What you get for £100, £200 and £300 a month in online coaching", "online coaching tiers",
    "GAP: tier explainer unwritten anywhere in the UK; sets expectations before the call", "chart:what each price tier includes")
add(CT, 2, "Why online coaches charge monthly instead of per session", "why online coaching monthly",
    "GAP: billing-model explainer with zero UK coverage; removes a real objection", "gen:calendar with continuous coaching marked vs isolated sessions")
add(CT, 2, "The cheapest legitimate ways to get properly coached in the UK", "cheap online coaching uk",
    "GAP: the budget ladder (group, 12-week block, check-in-only) is unwritten; captures price-sensitive searchers honestly", "chart:coaching options by budget ladder")
add(CT, 2, "Coaching contracts: cancellation, pausing and refunds explained", "personal training contract cancellation",
    "GAP: UK norms completely absent from search; consumer-champion content", "gen:contract terms on tablet, clear and readable")

# ── P28: Vetting an online coach (the in-person version is US-only) ──
VT = "Vetting a Coach"
add(VT, 1, "Questions to ask an online coach before you pay", "questions to ask online coach",
    "GAP: the in-person version exists (US only); the ONLINE version does not exist anywhere. Clean first-mover", "chart:online coach vetting question checklist", "pillar")
add(VT, 1, "UK fitness credentials for buyers: Level 3, Level 4, CIMSPA, insurance", "personal trainer qualifications uk",
    "GAP: only course sellers cover this, written for students. A buyer-side explainer is unclaimed — and title framing keeps us out of their SERP", "chart:credential tiers explained for buyers")
add(VT, 2, "How to spot faked transformation photos", "fake transformation photos",
    "GAP: unwritten; consumer-protection content that also explains why we don't use before-and-afters", "gen:same person same day different lighting and posture, honest demo")
add(VT, 2, "Online coaching red flags: 10 signs to keep your money", "online coaching red flags",
    "GAP: current results are US business-coaching scams; UK fitness version unclaimed", "gen:sceptical person reading coaching sales page on phone")
add(VT, 3, "What a UK coach can and can't legally tell you about food", "can personal trainer give meal plan",
    "GAP: scope-of-practice covered only by course sites for trainers; buyers never told. Trust content", "chart:coach vs dietitian scope boundaries")
add(VT, 3, "How to leave a coach who isn't working out", "how to quit personal trainer",
    "GAP: awkward-topic content nobody writes; genuine goodwill and search demand", "gen:polite conversation at gym reception, respectful")

# ── P29: Expectations and evidence ──────────────────────────────────
EX = "Expectations"
add(EX, 1, "What 12 weeks of online coaching realistically looks like", "12 weeks online coaching",
    "GAP: week-by-week reality with real numbers; nobody publishes the actual experience", "chart:week-by-week coaching timeline", "pillar")
add(EX, 2, "Month 1 vs month 3 vs month 6 of coaching", "coaching progress timeline",
    "GAP: longitudinal expectation-setting; reduces early churn", "chart:progress and experience by month")
add(EX, 2, "Six weeks in and seeing nothing? What's actually happening", "no results after 6 weeks",
    "GAP: plateau/expectation management written for buyers, not trainers; high-frustration search moment", "gen:person mid-training block, unglamorous middle phase")
add(EX, 2, "What happens after coaching ends", "after personal training ends",
    "GAP: nobody markets offboarding. Graduation planning is a trust differentiator and a retention tool", "gen:person training independently and confidently, gym floor")
add(EX, 3, "How online coaches actually check your form", "online coaching form check",
    "GAP: process opacity is a top objection; screenshots of the real review flow answer it", "gen:coach annotating client lift video on screen")
add(EX, 3, "What a coaching check-in actually contains", "coaching check in example",
    "GAP: process transparency; showing the real artefact sells the service", "chart:anonymised check-in structure")

# ── P30: Life-situation coaching (largest gap cluster found) ─────────
LC = "Life-Situation Coaching"
add(LC, 1, "Training while on GLP-1 medication: keeping muscle on Mounjaro or Wegovy", "exercise on mounjaro",
    "GAP: huge and rising UK search demand, near-zero coach-authored content. Muscle retention is the real clinical concern. Needs careful sourcing and clinical review", "gen:person meal-prepping protein-forward food, calm kitchen", "pillar")
add(LC, 2, "Coaching for new parents: the first 12 months", "fitness for new parents uk",
    "GAP: UK results are all buggy-fitness classes; no coaching angle exists", "gen:parent training at home during nap, realistic")
add(LC, 2, "Training on NHS and emergency-service shift patterns", "shift worker fitness nhs",
    "GAP: only two big publishers touch night-shift training; no coaching brand serves it", "gen:paramedic or nurse leaving shift with gym bag, dawn")
add(LC, 2, "Coming back to training after 50 (and a long layoff)", "getting back into exercise after 50",
    "GAP: distinct from 'senior fitness'; current UK pages are London studio service pages", "gen:50s person restarting confidently in gym, capable")
add(LC, 2, "Coaching through perimenopause and menopause", "menopause personal trainer",
    "GAP: insurers and clinics own this clinically; nobody owns the coaching side", "gen:woman strength training, mid-life, strong and unbothered")
add(LC, 2, "Men 35-50: desk job, kids, and getting back in shape", "getting fit 40 year old man",
    "GAP: served only by tiny personal blogs; no scaled UK content brand", "gen:man in 40s training in garage gym after work, honest")
add(LC, 3, "Post-physio: bridging discharge and normal training", "after physio what next",
    "GAP: the handover between physio discharge and training is uncovered from both sides", "gen:rehab exercises transitioning to gym work")
add(LC, 3, "Training with gym anxiety: the coached route in", "gym anxiety help",
    "GAP: gym-anxiety content exists everywhere but never links to a coaching solution", "gen:supportive first session, quiet corner of gym")
add(LC, 3, "Remote and hybrid workers: when your day has no shape", "working from home fitness",
    "GAP: nobody has written the no-commute-structure fitness post; large post-2020 audience", "gen:home office with kit in corner, midday break")
add(LC, 4, "Finished Couch to 5k? Here's what most people do next", "what to do after couch to 5k",
    "GAP: documented low completion rate leaves a large, identifiable stranded audience with nowhere to go", "gen:runner past the 5k stage looking at next goal")

# ── P31: Model education ────────────────────────────────────────────
add(OC, 1, "Can a total beginner use online coaching? (Everyone says no)", "online coaching for complete beginners",
    "GAP: every existing article claims online is for intermediates. That objection is unanswered anywhere and it blocks our largest segment", "own:track/diverse-pool")
add(OC, 2, "Hybrid coaching explained (for clients, not trainers)", "hybrid coaching",
    "GAP: all hybrid content is written for trainers by coach-software firms; the client-facing version is unwritten", "chart:hybrid model explained")
add(OC, 3, "Self-serve plan or full coaching: which do you actually need?", "training plan vs coaching",
    "GAP: the tiered-product decision page; sells both our tiers honestly", "chart:plan vs coaching decision aid")

# ── P32: Tools (link-earning assets Bark/Airtasker take by default) ──
TL = "Tools"
add(TL, 1, "Personal trainer cost calculator: what your goal will actually cost", "personal trainer cost calculator",
    "GAP: no UK brand owns a PT cost calculator. Link-earning asset currently defaulting to marketplaces", "chart:interactive cost calculator preview", "pillar")
add(TL, 2, "Which coaching model suits you? A 2-minute quiz", "which coaching is right for me",
    "GAP: no UK coaching-model quiz exists; doubles as a funnel entry into the assessment", "chart:quiz decision paths preview")
add(TL, 2, "UK personal trainer price index by region", "personal trainer prices by region uk",
    "GAP: regional price index is a link magnet; supports every location page", "chart:regional price index map")
