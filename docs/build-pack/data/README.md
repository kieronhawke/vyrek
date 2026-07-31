# DATA FILES

| File | Rows | Use |
|---|---|---|
| `keywords-client-only.csv` | 307 | **THE BUILD LIST.** Buyer intent only. Start here. |
| `keywords.csv` | 425 | Full database, all buyer types |
| `keywords-excluded.csv` | 118 | Job seekers, course buyers, facility seekers. **Do not build for these.** |
| `location-targets.csv` | 62 | UK PT location pages with suggested URLs |
| `keyword-database.xlsx` | — | Human-facing workbook with scoring and analysis tabs |

## COLUMNS

- `buyer_type` — **the most important column.** Only `Client` rows are customers.
- `kd_percent` — Semrush keyword difficulty. Lower is easier.
  0-14 very easy · 15-29 easy · 30-49 possible · 50-69 hard · 70+ very hard.
  A new domain should stay at 30 and under for the first six months.
- `opportunity_score` — `volume x (100 - kd) / 100`. Build-order aid, not a traffic forecast.
- `priority` — P1 Quick Win / P2 High Value / P3 Build / P4 Long Term / Not a buyer
- `status` — update as pages ship: not_started / drafted / published / ranking

## SOURCE

Two Semrush pulls, 36 screenshots, 29 July 2026.

- Hyrox seed: 126,111 keywords / 624,610 total volume / 34% avg KD
- Personal Training seed: 136,069 keywords / 2,223,300 total volume / 42% avg KD
- Combined addressable universe: ~262,000 keywords, ~2.85m monthly searches

This file captures every keyword legible across those screenshots. The rest sits in the
unexported Semrush set — export it properly and append rows.

Re-pull KD quarterly. Difficulty moves as competitors enter.
