# Results hub — feature plan (Stage 2)

**Author:** autonomous build session 2026-05-24
**Status:** planning doc per Stage 2 brief (no code).
**Note:** Sprint 1 of the Results hub already shipped this session (`d042446`) — `/results` + `/results/events` + types + client + seed JSON + GateModal + BlurWall + EventCard/Grid + "Results" nav tab. This doc covers Sprint 2-5 spec + retroactively documents Sprint 1 architecture.

---

## A. hyresult.com competitive analysis

### Pages walked (manually + via prior research)

| Page | Function | What works | What could be better |
|---|---|---|---|
| `/` home | Recent + upcoming event strip, "Train Race Analyze Repeat" tagline | Tagline; clean card grid; LIVE badge on running events | "Loading data..." placeholder feels broken vs a skeleton; no editorial framing |
| `/events`, `/events/[year]/[month]` | Month-by-month event browse with region filter | Prev/Next month nav, count statement ("16 events and 58 event days in May 2026") | No map view; no status filter (live/upcoming/finished); no division-with-results filter |
| `/event/[slug]` | Single event with title (with localised name), slots count, athlete count, per-division blocks | Localised event name; division block with athlete count + multiplier; ranking link per division | "Loading data..." placeholder; no tabbed sections; no course map; no athlete pinning |
| `/ranking/[slug]/[division]` | Per-division ranking table | Compare-row checkbox, pagination, age-group filter, nation filter | Pagination instead of virtualisation (slow on 15k rows); no expand-row for splits |
| `/result/[id]` | Race analysis with metric cards (Total, Runs, Workouts, Roxzone) + Performance Radar | Distribution scale with percentile markers, radar chart, "top X%" indicators | No pacing chart; no coach commentary; no "improvement levers" math; no share card |
| `/athlete/[slug]` | Athlete profile, tabs Races/PBs/Timings/Patches | Tabs concept, division/partner filters, compare CTA | "Loading data..."; no progression chart across career; no Follow; no OG share |
| `/compare` | Two-athlete picker | Two slots, name search | Capped at 2 athletes; no race-vs-race diff; no overlaying division average |
| `/rankings` | Hub for All-Time, Legends, Elite Points | Clean 3-card hero | No "rising stars" / improvement leaderboard |
| `/rankings/alltime` | 17 division × gender combos | Comprehensive division coverage | No top-10 podium visualisation; no filter persistence |
| `/rankings/alltime/[division]` | Per-division all-time table with trend arrows | Trend indicators showing last-100-day movement; diff column | No date/season filters; no athlete photos; no export |
| `/rankings/legends` | Most races leaderboard with tied ranks | Tied-rank notation | No additional metadata (nations raced, average finish) |
| `/rankings/elite-points/[category]` | Elite series leaderboard | Points calculation visible | No history sparkline per athlete; no live projection during running races |
| `/simulator` | Per-station time inputs, total time prediction | Top-percentile per station; total auto-calc | No "what-if" slider; no goal-mode (input target → suggested splits); no comparison to athlete |
| `/locations` | 126 cities indexed | Airport-code badges; city photos; nation/region filters | No map view; no per-city stats |
| `/locations/[city]` | City detail | Past + upcoming events list | No fastest-time-ever record; no "locals" leaderboard |
| `/hyrox/[station]` guides | Per-station guide with technique + pacing | Time-distribution chart with division selector | No video; no Vyrek-style coach commentary; no linked drills |

### Differentiators identified (where Vyrek should beat them)

(per Brief v2 §3.2 — Sprint 2-5 will deliver these)

1. **Story-mode race recaps** with scroll-driven storytelling per event
2. **Coach commentary system** tagged onto individual results
3. **Pacing chart** on race analysis: cumulative time vs target finish line
4. **Improvement levers**: "If you'd matched the field-average wall balls, your finish would be 1:28:47 (-22s, +14 positions)"
5. **"What if?" simulator slider** with live position update
6. **Goal-mode simulator**: input target finish → suggested per-station splits
7. **Course visualisation** with animated runner avatar through the 8 stations + 8 runs
8. **Athlete progression chart** across whole career
9. **Achievement / patch gamification** — "Sub-90 Open Men", "Elite Top 100", "5 nations raced", "10 races in a season"
10. **Rising stars index (Vyrek Live)** — athletes whose times are improving fastest
11. **Live points projection** during a running race
12. **World map view** of locations (MapLibre, no token, free tier)
13. **City fastest-time-ever records** by division
14. **Locals leaderboard** per venue
15. **Mobile-first execution** — every table swipeable, every chart pinchable
16. **Universal Cmd+K search** with athlete/event/location/guide types
17. **OG share cards** for athletes / races / events / rankings / simulator scenarios

### Side-by-side feature inventory

(see Sprint 2-5 spec below for which features land when)

---

## B. Data sourcing

### Hyrox results — current state

- **No public Hyrox API** exists in 2026-05.
- Race results live at `results.hyrox.com` powered by SAP mika:Timing.
- Event metadata + course details on `hyrox.com/event/[slug]`.
- Athletes can download their own per-race PDF; bulk export not offered.

### Three viable paths

**A. Scrape and store** — pull `results.hyrox.com` via scheduled Vercel Cron (every 5 minutes during live event weekends, daily otherwise). Normalise to Postgres. Respectful rate-limit at 1 req/sec, identifying user-agent. **Legal grey area** — needs your explicit OK before deploying. Hyrox terms (last checked) prohibit "systematic" extraction; we'd be testing the line. Mitigations: low rate, attribution credit, no monetisation of the raw data (we monetise the analysis layer), opt-out for any athlete who requests removal.

**B. Manual seed JSON** — curate 3-5 events into committed JSON. Ship UI immediately, no legal exposure. Full pipeline in v2. **Status: this is what Sprint 1 shipped** (`data/results-seed/events.json` has 5 events).

**C. Pursue official partner feed** — reach out to Hyrox / mika:Timing for a partner agreement. Slowest path (weeks-to-months), best long-term. Worth opening in parallel with B; needed before A goes anywhere near production.

### Recommendation

Path B for v1 (live now), path C in parallel for v2 (long-term), path A only if C fails and you explicitly approve a controlled scrape with attribution + low rate + athlete opt-out.

### Hyrox terms of service review

- `hyrox.com/terms` — last reviewed 2026-05-24. Standard restrictions on automated access; explicit prohibition on "data mining, robots, or similar gathering and extraction methods." Path A would test this clause.
- `results.hyrox.com` is operated by mika:Timing (independent timing partner). Their terms apply to that subdomain — separate review needed before deploying A.
- **Action**: I am not deploying any scraper. Path C outreach is a user-side task (you contact partnerships@hyrox.com).

---

## C. Feature spec for Vyrek Results

### Sprint 2 — Event detail + division ranking (4-6 hrs)

- **`/results/event/[slug]`**: tabbed page (Overview · Start Lists · Live Results · Final Results · Recap · Course Map). Sprint 2 ships Overview + Final Results.
- **Overview**: venue photo, dates, distance-from-user (with geolocation prompt + skip), schedule, divisions table (name, athlete count, leader so far, fastest split per station).
- **`/results/event/[slug]/[division]`**: ranking table.
  - Filters: All AGs ▼, All nations ▼, search-by-name (fuzzy)
  - Compare flow: row checkbox + floating "Compare (n)" button → opens compare modal
  - Sticky header, sortable, virtualised via Tanstack Virtual (handles 15k+ rows)
  - Columns: #, Athlete (flag + name), Time, AG-rank, gap to leader, gap to row above, [Analyze] link
  - Row hover: pin athlete to "watching" list → pinned float to top in a strip

### Sprint 3 — Athlete profile + race analysis + compare (5-7 hrs)

- **`/results/athlete/[slug]`**: tabs Races / PBs / Timings / Patches / Partners / Progression.
- **`/results/race/[id]`**: metric cards (Total, Runs, Workouts, Roxzone) with animated number reveals + rank chip + top-%. Distribution histograms per station, radar chart (overlayable), splits table, pacing chart, coach commentary slot, improvement-levers calculator, share card generator.
- **`/results/compare`**: 4-athlete picker (was 2 on hyresult), compare modes (all-time PBs / specific race / season avg / division benchmark), visual diff with deltas highlighted.

### Sprint 4 — Rankings hub + simulator (4-6 hrs)

- **`/results/rankings`** hub
- **`/results/rankings/alltime`** + **`/[division]`** with trend arrows
- **`/results/rankings/legends`** (most races)
- **`/results/rankings/elite-points/[category]`** with sparkline history
- **`/results/simulator`** with "what if" sliders + goal mode + course visualisation
- **`/results/rankings/vyrek-live`** (Vyrek-only "rising stars index")

### Sprint 5 — Locations + guides + recap + polish (5-7 hrs)

- **`/results/locations`** grid + world map toggle (MapLibre + MapTiler free tier dark style)
- **`/results/locations/[city]`** detail with locals leaderboard + city records
- **`/results/guides/[station]`** for the 9 stations + Roxzone
- **`/results/recap/[event-slug]`** scroll-driven story-mode
- Universal Cmd-K search modal
- OG share card generator at `/api/og/results/...`
- Performance pass + mobile audit at 375px

### Free tier vs members-only

| Feature | Free | Free + signed in | Course member |
|---|---|---|---|
| Browse events + cities + station guides | ✅ | ✅ | ✅ |
| View basic event rankings (top 50 per div) | ✅ | ✅ | ✅ |
| 5 minutes/session unfettered access | ✅ (then GateModal) | ✅ | ✅ |
| Athlete profile basics | ✅ | ✅ | ✅ |
| Full ranking tables (15k+ rows) | — (BlurWall) | ✅ | ✅ |
| Athlete profile deep tabs (PBs, Timings, Patches) | — | ✅ | ✅ |
| Compare 2 athletes | — | ✅ | ✅ |
| Compare 4 athletes | — | — | ✅ |
| Pacing chart + improvement levers | — | — | ✅ |
| Radar overlay vs Elite avg / goal | — | — | ✅ |
| Coach commentary | — | — | ✅ |
| Simulator goal mode + what-if | — | — | ✅ |
| OG share card customisation | — | — | ✅ |
| Rising stars / Vyrek Live insights | — | — | ✅ |

---

## D. SEO strategy

### Indexable surfaces

- `/results/event/[slug]` — 100+ events × 10+ divisions = 1000+ ranking pages
- `/results/athlete/[slug]` — top 5000 athletes initially; long tail grows
- `/results/locations/[city]` — 126 cities
- `/results/guides/[station]` — 10 station guides
- `/results/recap/[event-slug]` — 1 recap per finished event
- `/results/rankings/alltime/[division]` — 17 division pages
- `/results/rankings/elite-points/[category]` — 4-5 category pages

Total addressable indexable pages at launch: ~1200. With long tail: 8000+ as athletes accumulate.

### Schema.org markup per route

- `SportsEvent` JSON-LD on `/results/event/[slug]` with name, startDate, endDate, location, eventStatus, organizer
- `Person` JSON-LD on `/results/athlete/[slug]` with name, nationality, alumniOf (event participations)
- `ItemList` on ranking tables with each `ListItem` pointing to athlete profile
- `Article` JSON-LD on recap pages with athlete callouts as `mentions`
- `Place` JSON-LD on `/results/locations/[city]`

### Realistic timeline to outrank hyresult.com

- Month 1-3: Sprint 2-5 ships, base indexable surface available
- Month 3-6: organic crawl + indexing, ranking for long-tail queries first ("hyrox london 2026 results" etc.)
- Month 6-12: ranking pages compete with hyresult on event-specific queries; athlete profiles compete on long-tail name queries
- Month 12-18: outranking hyresult on the queries we hold differentiators on (improvement levers, athlete progression, locals leaderboard)
- **Pre-launch backlinks** matter more than schema. Top priorities: Vyrek blog cross-links from race-coverage posts (already exist), partner programme creators sharing their athlete profile, official Hyrox UK / nation pages, fitness publications (Men's Health, Runner's World UK, Hyrox Mag) when we have story-mode recaps to pitch.

### Backlink strategy

1. **Internal**: every blog post mentioning an event or athlete links to the relevant `/results/...` page
2. **Race-coverage T+7 posts** auto-mention top-3 finishers with links
3. **Partner programme**: partners share their own athlete profile with their audience
4. **Editorial outreach**: pitch story-mode recap pages to UK fitness press
5. **Athlete promotion**: athletes share their own profile when they PB
6. **Sitemap submission**: programmatic per-event/per-athlete sitemap to Google + Bing Search Console

---

## E. Architecture

### Database tables (Postgres / Drizzle ORM)

Already shipped in `lib/results/types.ts` (TypeScript shape). Postgres tables to create when migrations land:

```sql
create table events (
  slug text primary key,
  season text not null,
  year int not null,
  name text not null,
  name_localised text,
  venue_name text not null,
  city text not null,
  city_iata text not null,
  country text not null,
  country_iso text not null,
  country_iso_region text,
  region text not null,
  lat double precision,
  lng double precision,
  start_date date not null,
  end_date date not null,
  status text not null check (status in ('upcoming','live','finished')),
  total_athletes int default 0,
  slot_count int default 0,
  hero_image text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index events_status_idx on events(status);
create index events_start_date_idx on events(start_date);
create index events_country_iso_idx on events(country_iso);

create table event_divisions (
  id bigserial primary key,
  event_slug text references events(slug) on delete cascade,
  division_code text not null,
  athlete_count int default 0,
  leader_time_seconds int,
  leader_athlete_slug text,
  unique (event_slug, division_code)
);

create table athletes (
  slug text primary key,
  name text not null,
  country_iso text not null,
  country_iso_region text,
  gender text not null check (gender in ('men','women')),
  primary_division text,
  total_races int default 0,
  seasons_active int default 0,
  photo_url text,
  created_at timestamptz default now()
);

create index athletes_name_trgm_idx on athletes using gin (name gin_trgm_ops);
create index athletes_country_idx on athletes(country_iso);

create table races (
  id text primary key,  -- event_slug + athlete_slug + division_code
  event_slug text references events(slug) on delete cascade,
  division_code text not null,
  athlete_slug text references athletes(slug),
  age_group text,
  finish_time_seconds int not null,
  finish_rank int not null,
  ag_rank int,
  partners text[],  -- for doubles/relay
  created_at timestamptz default now()
);

create index races_event_idx on races(event_slug, division_code);
create index races_athlete_idx on races(athlete_slug);

create table splits (
  id bigserial primary key,
  race_id text references races(id) on delete cascade,
  station text not null,
  time_seconds int not null,
  rank int,
  ag_rank int
);

create index splits_race_idx on splits(race_id);
```

### API design

```
GET  /api/results/events                          list with filters
GET  /api/results/event/[slug]                    single event + divisions
GET  /api/results/event/[slug]/[division]         ranking table (paginated)
GET  /api/results/race/[id]                       single race + splits
GET  /api/results/athlete/[slug]                  athlete + races
GET  /api/results/athletes/search?q=              fuzzy name search
GET  /api/results/rankings/alltime/[division]     all-time leaderboard
GET  /api/results/rankings/legends                most races
GET  /api/results/rankings/elite-points/[cat]     elite points
GET  /api/results/locations                       all locations
GET  /api/results/locations/[city]                city detail
POST /api/results/simulator/percentile            { division, station, time } -> percentile
POST /api/results/gate/heartbeat                  server-side time-tracking (Upstash)
```

All GETs cache-control `s-maxage=60, stale-while-revalidate=300` so the ISR layer absorbs traffic without hitting Postgres.

### Caching strategy

- **Static event/athlete pages**: ISR with 60s revalidate (live events) / 86400s (finished events). `revalidate = 60` already set in Sprint 1.
- **Search API**: cache search results per query for 5 min in Upstash.
- **OG share cards**: generated via `@vercel/og` and cached at edge for 24 hr per unique slug.
- **Ranking tables**: 5-min cache on the JSON, virtualised render so the client only mounts 30-50 rows at a time.

### Search backend

- **Postgres FTS with `pg_trgm`** — sufficient for athlete name search (fuzzy + ranking by similarity). Indexed in the schema above. No external dependency.
- **Algolia / Meilisearch** — overkill at <100k athletes. Reconsider if athlete count crosses 200k or if we add semantic search (e.g. "athletes who match my pace").

---

## F. Effort estimate

| Sprint | Hours | Deliverables |
|---|---:|---|
| Sprint 1 (DONE 2026-05-24) | 4 | Hub + events index + types + client + seed + GateModal + BlurWall + EventCard/Grid + nav tab |
| Sprint 2 | 5 | Event detail + division ranking table (virtualised) |
| Sprint 3 | 7 | Athlete profile + race analysis + compare |
| Sprint 4 | 5 | Rankings hub + alltime + legends + elite points + simulator |
| Sprint 5 | 7 | Locations + city detail + station guides + recap + Cmd-K + OG cards + perf |
| Drizzle + Postgres migration | 3 | Once Supabase migrations land |
| Upstash gate counter | 2 | Once Upstash provisioned |
| MapLibre map (locations) | 3 | World map view |
| Scrape pipeline (optional) | 6 | Only if you authorise; legal review first |
| AI race-recap auto-blog | 4 | Per-event T+7 GPT recap drafts, manual review queue, auto-publish on approve |
| **MVP total (Sprints 1-5, no scraper)** | **28** | **Includes Sprint 1 already done** |
| **Full version with scraper + AI recaps** | **38** | |

### MVP vs full

- **MVP (Sprints 1-5)**: every route renders against seed JSON. Looks finished. Doesn't refresh live results — but a manual JSON push on event day works for the first few events while we build the data pipeline.
- **Full**: live results + AI recaps + scraper.

---

## G. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Hyrox terms violation if we deploy a scraper | HIGH | Don't deploy Path A without your OK + legal review. Start with Path B (seed). Pursue Path C (partner feed) in parallel. |
| Brand dilution: people see Vyrek as "results site" not "training app" | MEDIUM | Results positioned as a top-of-funnel acquisition channel. Every results page CTAs the quiz. Course members get pro analytics. The training app is the destination, not Results. |
| Resource pull from core training product | MEDIUM | Time-box Sprints. Don't ship Sprint 2 until Sprint 1 is validated with real traffic for 2 weeks. Don't ship Sprint 3 until Sprint 2 is. |
| 15k-row ranking tables slow to render | MEDIUM | Virtualisation in Sprint 2 (Tanstack Virtual). Test with realistic synthetic data before shipping. |
| Athlete personal data + UK GDPR | HIGH | Athlete results are public race data, so most of GDPR doesn't bite. But we'll honour any DSAR / right-to-erasure within 30 days, and we'll add a "Remove me" link on every athlete profile. Privacy Policy update needed (covered in Stage 11). |
| MapLibre tiles cost | LOW | MapTiler free tier covers 100k loads/month. World map view is a "nice to have"; we can launch Sprint 5 without it if cost matters. |
| Search performance at scale | LOW | Postgres FTS + pg_trgm handles 200k+ rows comfortably. Reconsider only if we get there. |
| Live-event load spike | MEDIUM | ISR + Vercel edge cache absorbs read traffic. Writes (when scraper lives) are infrequent. |

---

## Decision summary

- **Ship Sprints 2-5 in order**, ~24 more hours of focused work
- **Path B (seed JSON)** for v1, **Path C (partner feed)** as a parallel outreach effort
- **Defer scraper (Path A)** indefinitely unless C fails AND you explicitly approve
- **Drizzle + Postgres** when migrations land; in the meantime seed JSON
- **Upstash gate counter** in Sprint 2 (currently client-only fallback)
- **MapLibre** in Sprint 5
- **AI race-recap auto-blog** is its own ~4hr scope after Sprint 5; gated on data layer
