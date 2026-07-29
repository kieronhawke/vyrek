# SUV ATHLETIC — BUILD HANDOVER PACK

**Prepared:** 29 July 2026
**For:** Claude Code
**Owner:** Kieron Hawke
**Coach / brand principal:** Benjamin Sutherland (Elite 15 Hyrox athlete)

---

## READ THIS FIRST

This pack is the single source of truth for the SUV Athletic build. If anything you find
elsewhere in the repo contradicts this pack, **this pack wins**.

Read the files in this order:

| Order | File | What it gives you |
|---|---|---|
| 1 | `00-BUILD-ORDER.md` | The canonical sequence. Do not reorder it. |
| 2 | `rules/HARD-RULES.md` | Non-negotiables. Violating these breaks the business. |
| 3 | `01-brand-and-identity.md` | Name, domain, email, colours, tone |
| 4 | `02-audience-and-onboarding.md` | The three segments and the 28-screen quiz spec |
| 5 | `03-seo-architecture.md` | Site map, page classes, indexing strategy |
| 6 | `04-location-page-system.md` | The location data model and page template |
| 7 | `05-content-clusters.md` | 280+ planned posts, organised into 15 clusters |
| 8 | `06-traffic-playbook.md` | Niche audiences, content formats, non-Google channels |
| 9 | `07-product-spec.md` | SUV Performance Hub scope and tiers |
| 10 | `08-open-questions.md` | Unresolved decisions — do NOT invent answers to these |

Machine-readable data is in `/data`. Start with `keywords-client-only.csv` — that is the build list.

---

## WHAT THIS BUSINESS IS

A global online coaching business fronted by Benjamin Sutherland, an Elite 15 Hyrox athlete.
Three revenue lines:

1. **Subscription** — the SUV Performance Hub. Training plans, video library, logging,
   analytics, results data. Core business.
2. **Private 1:1 coaching** — capacity-limited, premium, sold by application. Price anchor.
3. **Beginner / general fitness** — app-led, self-serve, volume play. Feeds segment 1 over time.

Acquisition is SEO-led. Every client is remote; location pages exist to capture local
searchers and convert them to online clients.

---

## THE CONVERSION ARGUMENT

Every location page runs the same argument with a locally-true premise:

> There is no Elite 15 Hyrox coach in [town]. There is one online.

This is true in Bristol, Boise and Bangalore. It reframes online coaching as an upgrade
rather than a compromise. Build every location page around it.

---

## CORRECTION NOTICE

An earlier draft of the strategy argued **against** building `personal-trainer-[town]` pages,
on the grounds that local-service queries are dominated by Google's map pack and unwinnable
without a physical presence.

**That position was wrong and has been withdrawn.** Semrush data supplied 29 July 2026 shows
UK personal-trainer location terms sitting at KD 9–15 with genuine client intent —
Bristol 590/KD 10, Bournemouth 390/KD 11, Northampton 320/KD 11, Slough and Redhill at KD 9.

**The location layer is IN.** See `04-location-page-system.md`. If you find any file in the
repo arguing otherwise, ignore it and flag it to Kieron for deletion.
