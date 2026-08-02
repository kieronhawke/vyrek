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
