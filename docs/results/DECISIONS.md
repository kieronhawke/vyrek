# DECISIONS.md — Results build

Decisions taken without asking, per the brief's autonomy rule. One line of reasoning each.
Newest at the bottom.

---

### D1 — Brand: "SUV Athletic" is read as "Suth Performance" throughout
The brief is written for "SUV Athletic" on `suvathletic.com`. That name is already recorded in
this repo as superseded: `docs/strategy/BRAND-NAME-CORRECTION.md` states *"brand name in this
pack (SUV Athletic) is SUPERSEDED — correct brand is Suth Performance on suthperformance.com
(Kieron, 2026-07-29)"*, and `.env.example` and `docs/build-pack/START-HERE.md` both carry the
same correction. **Applied:** the section is "Results", title suffix is `| Suth Performance`,
canonical host is `suthperformance.com`. The public H1 stays "HYROX Results" exactly as the
brief specifies. Reversible in one constants file if Kieron intends a revival.

### D2 — Reference screenshots came from Documents, not Downloads
The instruction said to look in `~/Downloads`. The only folder there is
`sutherlandse15-photo-download-1of1` — 41 race photographs, already catalogued in
`docs/photo-library-2026-07.md`, not reference material. The actual reference set is 107
screenshots of `hyresult.com` in `~/Documents/05 Media/Screenshots – Mac`, captured today
16:44–16:56. Verified by opening them before copying. **Applied:** those 107 copied to
`refs/screenshots/` (154MB) and gitignored. The 285 files in that folder's `Archive
(before Aug 2026)` are unrelated and were left alone.

### D3 — Work happens on `lane/results`, not on `main`
`~/code/VYREK-LANES.md` rule: `~/code/vyrek` on `main` is **integration only — no feature
work**, and four sibling worktrees own their own lanes. A build of this size on `main` would
break every other lane's rebase. **Applied:** new worktree `~/code/vyrek-results` on branch
`lane/results`, dev server on port 3005 (3000–3004 are taken). The brief document itself was
committed to `main` first, since it is a shared doc and conflicts with nothing.

### D4 — Build docs live in `docs/results/`, not the repo root
The brief asks for `PLAN.md`, `REFS.md`, `DECISIONS.md`, `REPORT.md`. A `PLAN.md` already
exists at the repo root describing the *existing* Suth Performance build; overwriting it would
destroy live project documentation. **Applied:** all four Results documents live in
`docs/results/`. Keeps the four together, destroys nothing, satisfies the Definition of Done's
intent that all four exist and stay current.

### D5 — Existing repo tokens are reused rather than redefined
The brief specifies chartreuse `#A3E635` on near-black `#0A0A0A`. Both already exist in
`app/globals.css` and `app/control-tokens.css` from the July rebrand, along with a documented
rule that chartreuse is an accent only and success states use white-plus-checkmark rather than
green. **Applied:** Results consumes the existing token layer and adds only what is genuinely
new (delta amber, percentile band shading). No parallel colour system.

### D6 — Storyline athletes are labelled as placeholder, and no one else real appears
The brief asks for Benjamin and Harry Sutherland as Pro Doubles storyline athletes. Note that
Ben Sutherland is a real athlete with real results on the competitor site — so his demo record
here must never read as a factual claim about his racing. **Applied:** both carry an explicit
"Demo placeholder — pending profile claim" flag rendered on the profile, their times are
synthetic, and every other athlete in the dataset is faker-generated. No other real person
appears anywhere in the data.

### D7 — A partial Results section already exists; the brief supersedes its IA
`lib/results/{types,client}.ts`, `data/results-seed/events.json` (5 events),
`components/results/*` and the routes `/results`, `/results/events`,
`/results/event/[slug]` were all built to an earlier "Brief v2 §3.3" as "Sprint 1". The new
brief specifies a different, larger IA with top-level `/event/{slug}`, `/ranking/...`,
`/athlete/...`. Running both would be duplicate content and two competing data layers.
**Applied:** the new brief's IA is canonical. `lib/results/types.ts` is *extended*, not
replaced — its `DivisionCode` union, `Venue`, `Split` and `formatSeconds` are already correct
and are reused. The old `/results/event/[slug]` and `/results/events` routes 308-redirect to
their new equivalents so nothing already indexed breaks.

### D8 — The sign-up gate does not apply to the new public entity pages
Sprint 1 shipped `GateModal` + `BlurWall` — results content blurs behind a sign-up prompt
after a preview. The new brief's section 10 requires every entity page to server-render
complete metadata and treats thin, non-indexable competitor pages as the weakness to beat;
gated content cannot do that job, and the brief monetises through one contextual coaching CTA
per page instead (6.5). **Applied:** new entity pages are fully public. The gate components
are left in place and untouched rather than deleted, so reinstating them anywhere is a
one-line mount. Flagging plainly: this reverses a deliberate Brief v2 monetisation choice, and
is the decision here most worth a second opinion.

### D9 — Station guides stay at `/hyrox/stations/{station}`
The brief asks for `/hyrox/{station}`. That is not buildable: `app/hyrox/[city]/page.tsx`
already exists (UK city SEO pages from `lib/uk-locations.ts`), and Next.js rejects two dynamic
segments at the same level — `app/hyrox/[station]` alongside `app/hyrox/[city]` is a build
error, and `/hyrox/run` would collide with the city route regardless. **Applied:** guides live
at the existing `/hyrox/stations/{station}`, index at `/hyrox/stations`. A technical
constraint, not a preference.

### D10 — Existing station content is extended, not rewritten
`lib/hyrox-stations.ts` already holds eight stations with specs, goal splits, faults, cues,
drills and FAQs, driving live pages with HowTo + FAQPage schema. The brief asks for nine
guides (the eight stations plus "run") with technique, pacing and mistakes. **Applied:** the
existing eight are extended with the brief's additions (weights-by-division table, time
distribution histogram, the two empty human-content slots) and a ninth "run" guide is added in
the same shape. Rewriting working, indexed content to satisfy a spec it already mostly meets
would be destructive for no gain.

### D11 — Athlete pool: 4,000 returning athletes plus one-off entrants
The brief asks for "around 4,000 synthetic athletes" *and* for ranking pages that stay smooth
"with 3,000 plus rows". Those cannot both hold: London alone fields ~14,000 entries across 16
divisions, so a 4,000-athlete pool would have to put people in four races at once.
**Applied:** a 4,000-strong *returning* pool (the number the brief names) whose members race
repeatedly across three seasons — which is what gives athlete pages real history, and matches
what the reference site shows (one profile there lists 59 races over 5 seasons) — topped up
with one-off entrants minted per event. Result: 75,396 races, 4,000 profiled athletes, and
HYROX Men at London is 3,221 rows, so virtualisation is genuinely exercised.

### D12 — Division times are clamped at a world-class floor
Drawing ability from a normal distribution across a 3,000-strong field reaches roughly 3.5
standard deviations, which produced an Elite Men winner of 46:30 — around eight minutes faster
than any time ever recorded. Synthetic data still has to be *believable*, and a records board
is exactly where a Hyrox-literate reader would catch it. **Applied:** each division profile
carries a `floorSeconds` set to a plausible world-class time, with slight jitter so the fast
end does not stack on one value. HYROX Men now wins in 54:33 against a real-world record of
about 54:30.

### D13 — Generator is `.ts` and runs on Node's native type stripping
The brief specifies `scripts/generate-demo-data.ts`. Repo convention for scripts is `.mjs`,
and running TypeScript would normally mean adding `tsx` — a dependency, which lane rule 6
serialises. Node 26 strips types natively, so the script runs as-is with no build step and no
dependency. This required `allowImportingTsExtensions: true` in `tsconfig.json` (safe: the
repo already sets `noEmit`), because Node requires explicit `.ts` import extensions.
