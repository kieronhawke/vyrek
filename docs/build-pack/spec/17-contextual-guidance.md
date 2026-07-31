# CONTEXTUAL GUIDANCE LAYER

**Closes a gap.** The brief asked that the client account give *"advice, tips, etc.,
depending on what the plan is for — if they're a beginner it'll be a beginner's plan, if it's
Hyrox training it'll be the Hyrox training plan."* Nothing in docs 09–16 specified that.

---

## 1. WHAT THIS IS

A curated library of short guidance cards, surfaced automatically in the client account based
on **who they are, what their plan is for, and where they are in it.**

Not an AI feature. Not generated on the fly. **A curated library**, written once, reused
across every client — which is what makes the quality controllable and consistent with the
no-generated-slop principle in HARD-RULES §1 and §4.

---

## 2. THE CONTENT MODEL

```sql
guidance_cards
  slug unique, title, body_md, media_url null
  card_type enum('technique','nutrition','recovery','mindset','logistics',
                 'expectation','equipment','safety')
  segment enum('beginner','hyrox','both')
  phase enum('onboarding','base','build','peak','taper','race_week',
             'post_race','recovery','any')
  station enum null                       -- for technique cards
  week_number_min int null                -- "week 1-3 of any plan"
  week_number_max int null
  priority int, active bool
  linked_article_path null                -- reuse from the content clusters

client_guidance_seen
  account_id, guidance_card_id, seen_at, dismissed_at, helpful bool null

client_pinned_guidance                    -- Ben pins a card to a specific client
  account_id, guidance_card_id, pinned_by fk users, note
```

---

## 3. SURFACES

| Where | What appears |
|---|---|
| **Home** | One card, chosen by phase and segment. Dismissible. Never more than one. |
| **Session detail** | Technique cards for the stations in that session |
| **Plan tab** | A phase card explaining what this block is *for* — "this is a base block, here's why the runs feel easy" |
| **Race week** | The race-week set fires automatically 7 days out |
| **Post-race** | Recovery and debrief guidance |
| **First 14 days** | The onboarding sequence |

**Rule: one card per surface, maximum.** A wall of tips is noise. Rotate, don't stack.

---

## 4. THE BEGINNER TRACK

The barrier is fear, not information (context/02). Guidance should reduce anxiety.

**Onboarding (week 1)**
- What to expect in your first two weeks — and why it's meant to feel manageable
- Gym anxiety is normal, and here's how to walk in
- What to wear and what to bring
- How to use the machines you'll meet this week
- Why we're starting easier than you think you need

**Weeks 2–6**
- DOMS is normal, here's the difference between sore and injured
- Why rest days are training
- What progress actually looks like month one — and why the scale is the worst measure
- How to not lose the habit when you miss a session
- Sleep does more for this than any supplement

**Weeks 6+**
- Adding load safely
- When to push and when to back off
- **"You're closer to a Hyrox than you think"** — the bridge card, fires around week 10 and
  links to the nearest race. This is the beginner→Hyrox conversion moment described in
  context/02.

## 5. THE HYROX TRACK

Assumes knowledge. Should feel like a coach who respects them.

**Technique — one per station**, linked to the video library: SkiErg · Sled Push · Sled Pull ·
Burpee Broad Jump · Row · Farmers Carry · Sandbag Lunges · Wall Balls. Each covers the common
faults, the cue that fixes it, and what it costs in seconds.

**Phase cards**
- Base: why volume now buys speed later
- Build: what compromised running actually trains
- Peak: race-pace work and why it hurts differently
- Taper: why less is right, and the taper anxiety everyone gets

**Race week**
- The pacing plan and how to hold it when adrenaline hits
- ROXZONE efficiency — where the free seconds are
- Kit checklist
- Night-before and morning-of fuelling
- Warm-up protocol
- What to do if a station goes badly — the recovery mindset

**Post-race**
- Debrief: how to read your splits
- Recovery week
- What the data says about your weakest station

---

## 6. SELECTION LOGIC

```
1. Pinned by Ben for this client        → always wins
2. Match: segment, phase, week range
3. Exclude: already seen or dismissed
4. Prefer: cards matching their weak_stations
5. Order by priority
6. Take one
7. If nothing matches, show nothing — never fall back to a generic tip
```

That last rule matters. A generic tip when nothing relevant exists is exactly the filler that
makes a product feel machine-made.

---

## 7. WHERE THE CONTENT COMES FROM

**Reuse the content clusters** in `context/05-content-clusters.md`. Those 280+ planned posts
are the source material — a guidance card is a 60-word extract with a link to the full article.

That means: written once, ranks on the public site, *and* serves in the app. Do not commission
separate content for this.

---

## 8. ADMIN

Guidance cards are managed in the admin (Settings → Guidance), not in code. Create, edit,
reorder, activate, deactivate, preview as a given segment and phase. Ben can pin any card to
any client with a personal note attached — which turns a library card into something that
reads as chosen for them.
