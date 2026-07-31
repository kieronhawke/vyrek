# UNIQUENESS VALIDATOR — PUBLISH GATE SPEC

The guardrail that makes programmatic scale safe. **Build this before the location template.**

---

## PURPOSE

Automatically block any page that does not carry enough unique data to justify its
existence. This removes the need for human judgement on every page and makes it safe to
scale to hundreds of locations.

---

## THE GATE

A page publishes only if it has **at least 5 populated unique data fields**, including:

- at least **one gym or facility** record, AND
- at least **one results/performance** data point

If either mandatory category is empty, the page is blocked regardless of total field count.

---

## COUNTABLE FIELDS

```
affiliated_gyms[]          non-empty
equipped_gyms[]            non-empty
chain_locations[]          non-empty
equipment_matrix{}         at least 3 stations resolved
equipment_gaps[]           non-empty
nearest_race{}             populated with distance + travel time
race_history[]             non-empty
next_3_races[]             non-empty
local_athlete_count        > 0
local_median_time          not null
local_fastest_time         not null
notable_local_athletes[]   non-empty
running_routes[]           at least 2 named routes
parkrun_locations[]        non-empty
run_clubs[]                non-empty
bens_take                  human-written, min 40 words, not templated
```

---

## IMPLEMENTATION NOTES

- Run as a **pre-publish check in the build pipeline**, not as a runtime check
- Fail loudly: log the page slug and which fields were empty
- Emit a build-time report of blocked pages so gaps can be filled deliberately
- **Do not add a `--force` or `skipValidation` flag.** If one exists, remove it.
- Meta title and description must be generated *from the data*, not from a template string

---

## `bens_take` FIELD

One original, human-written paragraph per page, in Ben's voice.

This cannot be generated. It is what makes the site his rather than a database dump, and
it is the single clearest signal to Google that a human was involved. Pages awaiting a
`bens_take` sit in draft.
