# LOCATION PAGE SYSTEM

## WHAT A LOCATION PAGE IS

**Not** a gym directory. It is a **coaching sales page wearing local clothes.**

Local content earns relevance and trust. The sell is online delivery. Every page runs the
same argument with a locally-true premise:

> There is no Elite 15 Hyrox coach in Bracknell. There is one online.

A local PT in a town of 80,000 charges £40–60 a session and has never raced at elite
level. Ben has. The page exists to make someone realise the best coach for them isn't
down the road — and that going online is an upgrade, not a compromise.

---

## THE DATA MODEL

Location pages are **database-driven, not text-driven.** One excellent template plus a
rich data layer. The data makes each page different.

```
Location {
  // Identity
  name, slug, country, region, county, population, lat/lng

  // Gym layer — primary uniqueness driver
  affiliated_gyms[]        // official HYROX Training Clubs
  equipped_gyms[]          // sled / ski erg / wall ball verified
  crossfit_boxes[]         // many run Hyrox sim sessions
  chain_locations[]        // Gym Group, PureGym, F45, BLOK, 1Rebel
  equipment_matrix{}       // which stations can actually be trained here
  equipment_gaps[]         // what's missing + workarounds

  // Race layer
  nearest_race{}           // city, venue, date, distance, drive time, train time
  hosts_race: bool
  race_history[]
  next_3_races[]

  // Results layer — from our own database
  local_athlete_count
  local_median_time        // by gender, by age group
  local_fastest_time
  local_percentile_curve
  notable_local_athletes[]
  yoy_participation_change

  // Terrain layer
  running_routes[]         // named local routes, distances, elevation
  elevation_profile
  track_facilities[]
  parkrun_locations[]

  // Community layer
  run_clubs[]
  strava_clubs[]
  local_events[]

  // Human layer
  bens_take                // one original paragraph, human-written
}
```

---

## DATA SOURCES

- **Official HYROX Training Club directory** — 2,500+ affiliated gyms worldwide
- **The Gym Group** — official UK Hyrox training partner, 130+ UK locations
- **Google Places API** — gym discovery and verification
- **Chain store locators** — PureGym, F45, BLOK, 1Rebel
- **Our own results database** — the local performance layer
- **parkrun / Strava** — routes and community

Seeding and verifying the gym database is the **single biggest data job in the project.**
Start it in Phase 0 and let it run in parallel with everything else.

---

## PAGE TEMPLATE

| Section | Content | Job |
|---|---|---|
| H1 | *Online Personal Trainer in Bracknell* / *Hyrox Coach Bracknell* | Match search intent |
| Local opener | Named town, county, real local reference | "This is for me" |
| **The argument** | Why online beats local PT — cost, flexibility, elite access | Core conversion driver |
| Local proof | Clients coached in the county, local athlete count from our data | Trust at local level |
| Where you'll train | Equipped gyms in the area + station equipment matrix | Kills "but where do I train" |
| Equipment gap plan | How to train stations the town can't cover | Genuinely useful, genuinely local |
| Your nearest races | Real distances, journey times, next three dates | Concrete next step |
| How local athletes perform | Results data for the area | Unique — no competitor has it |
| Where to run | Named routes, distance, elevation | Real local knowledge |
| Pricing | Local currency, local comparison | Anchoring |
| Local FAQ | *"Can I do this from a PureGym in Bracknell?"* | Handles the specific objection |
| CTA | Into the quiz | Conversion |

Nine content sections, seven driven by data unique to that single location.

**Worked example (Bracknell):** *"Two venues in Bracknell have sled tracks. Neither has a
competition ski erg — nearest is in Reading, 11 minutes by car."* That sentence cannot
exist on any other page in the world. Burgess Hill reads completely differently because
its data is completely different.

---

## EVIDENCED TARGETS

62 UK towns confirmed by Semrush data, all client intent, all KD 15 or under.
Full list with volumes and suggested URLs: `data/location-targets.csv`.

Highlights:

| Keyword | Volume | KD | CPC |
|---|---|---|---|
| personal trainer manchester uk | 1,000 | 15 | $3.46 |
| personal trainer bristol | 590 | 10 | $1.03 |
| personal trainer bournemouth | 390 | 11 | $0.93 |
| personal trainer northampton | 320 | 11 | $1.14 |
| personal trainer brighton | 320 | 15 | $1.29 |
| personal trainer slough | 140 | 9 | $0.96 |
| personal trainer redhill | 90 | 9 | $1.22 |

These 62 come from roughly 1,100 possible UK towns. This is a sample of the opportunity,
not the ceiling. Pull the full long tail from Semrush and add rows to `keywords.csv`.

---

## THE PAGE MATRIX

Scale comes from the matrix, not the town list:

```
/online-personal-trainer/[town]
/hyrox-coach/[town]
/hyrox-training/[town]
/personal-trainer-near/[town]
/online-fitness-coaching/[town]
/hyrox-gyms/[town]
```

**Roll out one page type at a time.** Prove the first type ranks before layering the second.

Location inventory by market: UK ~1,170 · USA ~3,100 · Germany ~680 · India ~500 ·
Australia/NZ ~360 · Canada ~340 · Ireland ~135

---

## PRODUCTION PIPELINE

1. Seed gym data
2. Verify — sample-check equipment claims. Quality here is what separates us from a scraper.
3. Join to results data
4. Generate from template + data
5. **Human pass on `bens_take`** — one original paragraph per page
6. Run the uniqueness validator
7. Publish 20–30/month per market

---

## COMPETITIVE INTELLIGENCE

**hyroxvault.com** is already running this play — 2,273 hand-verified affiliated gyms
across 20 countries with city-level directory pages. Proof the model ranks.

They have gym data and **no results data**. "Here are the gyms in Leeds" is a good page.
"Here are the gyms in Leeds, and here's how Leeds athletes actually perform" is one they
cannot answer. Audit their site structure before building.
