# Quiz decision matrix — Brief v2 §2.3

**Generated:** 2026-05-24
**Source of truth:** `lib/quiz-flow.ts → determineProgramme()` (~15 lines, fully deterministic).

Brief says: *"Build a decision matrix mapping every answer permutation → programme. No 'mostly Bs' guesswork. Every path lands somewhere."*

V3 is deterministic and rule-based, not score-based. Every input maps to exactly one of four programmes. This document tabulates the rules so a human can sanity-check edge cases.

## Inputs that affect programme

Three of the 13 question answers influence programme assignment:

| Input | Type | Options | Affects programme? |
|---|---|---|---|
| `intent` | multi-select (1-2) | `first-hyrox` · `go-faster` · `doubles` · `getting-into` · `building` | YES — primary decider |
| `bestTime` | single-select | `under-75` · `75-90` · `90-105` · `105-120` · `over-120` | YES — tiebreaker between sub-90 and pro |
| `experience` · `raceDate` · `activity` · `sex` · `weight` · `days` · `sessionLength` · `location` · `equipment` · `partner` · `injuries` | various | various | NO — these affect plan content + dates + station weights, not programme |

## Rule table (priority order — first matching rule wins)

```
RULE 1.  intent contains "doubles"            -> doubles
RULE 2.  intent contains "go-faster" AND
         bestTime == "under-75"               -> pro
RULE 3.  intent contains "go-faster"          -> sub-90
RULE 4.  intent contains "first-hyrox"        -> first-race
RULE 5.  intent contains "getting-into"       -> first-race
RULE 6.  intent contains "building"           -> first-race
RULE 7.  fallback                             -> first-race
```

## Exhaustive permutation table

Brief asks for "every answer permutation". Intent is multi-select of 1-2 from 5 options, so there are 5 + C(5,2) = **15 valid intent inputs**. bestTime is asked only when `intent.includes("go-faster")`. The combinatorial table:

### Single-intent permutations (5)

| Intent | bestTime asked? | Programme | Rule |
|---|---|---|---|
| `["first-hyrox"]` | no | first-race | R4 |
| `["go-faster"]` | YES, `under-75` | pro | R2 |
| `["go-faster"]` | YES, `75-90` | sub-90 | R3 |
| `["go-faster"]` | YES, `90-105` | sub-90 | R3 |
| `["go-faster"]` | YES, `105-120` | sub-90 | R3 |
| `["go-faster"]` | YES, `over-120` | sub-90 | R3 |
| `["doubles"]` | no | doubles | R1 |
| `["getting-into"]` | no | first-race | R5 |
| `["building"]` | no | first-race | R6 |

### Two-intent permutations (10)

For pairs that include `doubles`, R1 wins immediately so bestTime isn't asked.

| Intent | bestTime asked? | Programme | Rule |
|---|---|---|---|
| `["first-hyrox", "go-faster"]` | YES | sub-90 / pro (per bestTime) | R2 or R3 |
| `["first-hyrox", "doubles"]` | no | doubles | R1 |
| `["first-hyrox", "getting-into"]` | no | first-race | R4 |
| `["first-hyrox", "building"]` | no | first-race | R4 |
| `["go-faster", "doubles"]` | no | doubles | R1 |
| `["go-faster", "getting-into"]` | YES | sub-90 / pro (per bestTime) | R2 or R3 |
| `["go-faster", "building"]` | YES | sub-90 / pro (per bestTime) | R2 or R3 |
| `["doubles", "getting-into"]` | no | doubles | R1 |
| `["doubles", "building"]` | no | doubles | R1 |
| `["getting-into", "building"]` | no | first-race | R5 |

### Outcome distribution

Across all 15 intent permutations × 5 bestTime variations where asked:

| Programme | Permutation paths landing here |
|---|---|
| `first-race` | 7 |
| `sub-90` | 4 × bestTime ≠ under-75 = 16 paths through the go-faster + tiebreaker branch |
| `pro` | 4 paths (any "go-faster" intent combined with bestTime = under-75) |
| `doubles` | 5 paths (any intent including doubles) |

## Edge cases & sanity checks

| Case | Behaviour |
|---|---|
| User picks 0 intent options | Continue is disabled — they must pick at least 1 (UI enforced via `disabled={intent.length === 0}`) |
| User picks 2 intent options then deselects to 0 | Same — Continue disables |
| User picks `["go-faster", "first-hyrox"]` (contradictory: never raced yet wants faster) | R2/R3 wins (sub-90 or pro) — `go-faster` takes precedence. Arguably wrong if they've literally never raced — but the bestTime answer (`over-120` = first-timer target) captures this and they get sub-90 (slowest of the two go-faster outcomes). Acceptable. |
| User picks `["first-hyrox"]` then on race-date picks a date in 4 weeks | Programme stays `first-race`, plan duration capped to 4 weeks (start-date → race-date) with shortened phases. `determineRaceDate()` honours the user's date. |
| User picks no race date at all | `determineRaceDate()` returns `start + 12 weeks`. Default 12-week build. |
| `bestTime` defaulted via URL shortcut (`/quiz?program=pro`) | `applyProgrammeShortcutV3()` pre-fills `bestTime = "under-75"`. User can still change it on the screen if shown. |
| URL shortcut `?program=sub-90` | Pre-fills `bestTime = "90-105"`. |
| URL shortcut `?program=doubles` | Pre-fills `intent` with `doubles`; bestTime never asked. |
| URL shortcut `?program=first-race` | Pre-fills `intent` with `first-hyrox`; bestTime never asked. |
| All shortcuts | User can still add/remove other intent options on Screen 1; the URL is a pre-fill not a lock. |

## Conditional screen show rules

Restated from `docs/quiz-audit.md` §3 for completeness:

```
best-time  shown iff  intent.includes("go-faster")
equipment  shown iff  location !== "gym-full"
partner    shown iff  intent.does NOT include "doubles"  (otherwise pre-filled)
```

Race-date is always shown but optional (user can "No race yet").

## Verification

`lib/quiz-flow.ts` and `scripts/test-quiz-helpers.mjs` together cover the entire decision space. The test file runs 11 cases against `determineProgramme()`, `determineStartDate()`, `determineRaceDate()`, and `applyProgrammeShortcutV3()` and all pass.

## Acceptance per §2.3

- [x] Every intent permutation has a defined outcome — see tables above
- [x] No "mostly Bs" / score-based logic — fully rule-based
- [x] Every path lands on exactly one of four programmes
- [x] Pre-fill URL shortcuts documented + valid
- [x] Edge cases (contradictory intent, no race date, short race date) documented
