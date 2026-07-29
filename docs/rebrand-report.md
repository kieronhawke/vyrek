# Suth Performance rebrand report

Date: 29 July 2026
Scope: full rebrand from Vyrek to Suth Performance across the codebase, plus
replacement of the fictional founder persona with Ben Sutherland (verified
facts only).

Scale: 407 files changed, 3,544 insertions, 3,080 deletions, across eight
commits (stages 2 to 9). Each stage was deployed to a Vercel preview.
Production has NOT been touched; promote when you are happy.

Latest preview: https://vyrek-pd6zos8x8-kieronhawkes-projects.vercel.app

## Logo

Applied: Concept B wordmark (SUTH in Oswald 700 with a chartreuse square
full stop, PERFORMANCE in Geist Mono spaced caps beneath) plus Concept C's
S monogram for the favicon, app icons, and small slots. All letterforms are
outlined SVG paths, no font dependency. Concept files remain in
`docs/logo-concepts/` (three concepts, dark and light, comparison page).

Updated assets:
- `components/shared/logo.tsx` (Wordmark + Monogram components)
- `public/logo-primary.svg`, `public/logo-monogram.svg`
- `app/icon.svg` (favicon), `public/icon-192/512.png` + maskable variants

## What changed, by stage

- Stage 2, global rename: brand copy, metadata, Open Graph, JSON-LD,
  manifest, llms.txt, robots/sitemap (inherit site URL), package.json name
  (`suth-performance`), README, email addresses to @suthperformance.com,
  ~3,200 design-token occurrences `vyrek-*` → `suth-*`, storage/cookie keys
  `vyrek:*` → `suth:*`, partner cookie `vyrek_partner` → `suth_partner`,
  Stripe metadata key `vyrek_customer_id` → `suth_customer_id` (write-only,
  safe), env var names `VYREK_BOT_*` → `SUTH_BOT_*` (not set anywhere, safe),
  Sanity config name/studioHost, domain references to suthperformance.com.
- Stage 3, About page: rewritten around Ben (story, verified race record
  strip, coaching philosophy, mission note). The fictional founder "James
  Wright" was removed from the entire site: coach hub, blog authors, FAQ,
  plan-reveal copy, press bio, demo app data, llms.txt. Blog pull quotes he
  "said" are now attributed to "Suth Performance coaching" (they cannot be
  attributed to Ben; he never said them). Post authorship moved to "The
  Suth Performance team". Stock photos depicting the fictional founder were
  deleted and replaced with honest branded placeholders in
  `public/media/images/ben/`.
- Stage 4, Contact: general / coaching support / press categories, Ben's
  Instagram (@bennysuth95).
- Stage 5, Press: on-page founder bio (verified facts), Elite 15 Doubles
  interview topic, brand asset downloads point at the new logos, honest
  empty state for coverage, brand-guidelines page describes the new lockup.
- Stage 6, Legal: company-details placeholder block added to Privacy,
  Terms, Cookies, Refunds; last-updated bumped to 29 July 2026. Cookie
  tables match the renamed cookie/storage keys. Data processors unchanged.
- Stage 7, Footer and nav: new lockup in nav (stage 2), footer now has
  © 2026 Suth Performance, company small print placeholder, Instagram and
  hello@ pills, S monogram. All legal links verified 200.
- Stage 8, Marketing copy: landing hero says "Programmed by HYROX Elite 15
  athlete Ben Sutherland"; proof bar, bento, programmes, how-it-works, and
  journal hero all name Ben. Removed the unverified "podium contender"
  phrasing from plan-generator copy.
- Stage 9, QA: see below.

## Verification results

- Rendered HTML of every marketing, legal, blog, and funnel page checked:
  zero "Vyrek", zero "James Wright", zero em-dashes, zero exclamation
  marks in visible copy. AI-phrase sweep ("delve/leverage/robust/etc")
  cleaned from blog prose ("elevated heart rate" retained as physiology,
  not fluff).
- All 20 key routes return 200 (marketing, legal, quiz, blog, tools,
  results, partners, login).
- Metadata, OG tags, manifest, favicon all carry Suth Performance and the
  S monogram. OG image route renders (200, image/png).
- Mobile (390px) and desktop (1440px) screenshots of 10 key pages in
  `docs/rebrand-screenshots/`. One regression found and fixed (footer pill
  row overflowed 390px viewports; now wraps). No horizontal overflow
  anywhere after the fix.
- Lighthouse: accessibility 96-100, best practices 100, SEO 100 (localhost;
  preview URLs report lower SEO only because Vercel sends noindex on
  previews). Performance: 73 mobile on my measurement rig for BOTH the
  rebranded preview and the current pre-rebrand production, i.e. no
  regression from the rebrand. The historical "93-98" numbers came from a
  different measurement environment; re-measure on production after
  promotion if you want a comparable figure.

## Remaining "vyrek" strings (intentional, not brand-facing)

- `VyrekDemo2026!` / `VyrekAdminTemp!2026` in scripts/docs: real demo and
  admin passwords for existing Supabase users. Renaming the strings would
  break the login scripts without changing the actual credentials. Rotate
  the passwords when convenient, then update scripts.
- `demo@vyrek.test` (and `@vyrek.test`): demo-user email addresses tied to
  existing auth users. Same reasoning.
- `why_vyrek` DB column (migration 0003, apply route, admin page, queries):
  the Supabase schema may already contain this column and the project was
  unreachable during the rebrand (host does not resolve; possibly paused or
  deleted), so I left the schema identifier untouched. If you ever want it
  gone: `alter table partner_applications rename column why_vyrek to
  why_suth;` then update the three code references.
- `kieronhawke/vyrek` GitHub URLs and `/Users/kieronhawke/code/vyrek` local
  paths in scripts/tests: these point at the real repo and folder. They
  disappear if you rename the GitHub repo and local directory (see below).

## Placeholders you need to fill in

1. Registered company details: name, Companies House number, registered
   office. Marked with "[... TO BE CONFIRMED]" in all four legal pages and
   the footer. Search the repo for `TO BE CONFIRMED`.
2. Ben's real photos: hero/racing shot (About hero + story), coaching shot
   (About coaching section), headshot (coach hub tile, plan paywall card,
   blog author, press portrait). Current placeholders live at
   `public/media/images/ben/` and every usage site carries a
   `PLACEHOLDER` code comment. Search the repo for `PLACEHOLDER`.
3. Ben's approval of the first-person mission statement on /about ("A note
   from Ben") — I drafted it from verified facts, but the words should be
   his.
4. Real testimonials remain absent by design (none were reinstated; the
   site launched with none after the earlier honesty audit).
5. Resend sender: `.env.local` now says "Suth Performance
   <onboarding@resend.dev>"; set up the suthperformance.com domain in
   Resend and switch to e.g. hello@suthperformance.com when DNS exists.

## Domain and infrastructure reminders

- Point suthperformance.com DNS at Vercel and add the domain to the
  project. Brand-facing URLs already say suthperformance.com.
- Update the Vercel env `NEXT_PUBLIC_SITE_URL` to
  https://suthperformance.com at the same time (it drives canonical URLs,
  OG urls, sitemap).
- Optional cleanups that remove the last infrastructure "vyrek" strings:
  rename the GitHub repo (kieronhawke/vyrek → suth-performance; GitHub
  redirects old URLs), rename the local folder, relink Vercel if you
  rename the project (currently kieronhawkes-projects/vyrek), rename the
  Sanity studio host if the studio is ever deployed.
- Existing users: cookie/localStorage keys changed, so previously saved
  consent choices, quiz drafts, and partner dashboard sessions reset once
  deployed. Pre-launch this costs nothing.
- Supabase: the project URL in .env.local does not resolve (paused or
  deleted). Nothing in the rebrand touched the database, but auth/data
  features cannot work anywhere until this is fixed.

## Honest completeness assessment

Complete: brand name, logo system, icons, metadata, emails, design tokens,
storage keys, legal pages, press kit, marketing copy, blog attribution,
and the founder story are fully migrated and verified against rendered
output, with builds green and each stage deployed to a preview.

Not complete, needs you: company registration details, Ben's photography,
Ben's sign-off on the mission statement and any copy that speaks as him,
DNS + `NEXT_PUBLIC_SITE_URL`, Resend domain, credential rotation, and the
optional repo/folder renames. The paused Supabase project blocks any
end-to-end test of quiz signup, member area, partners, and admin flows, so
those were verified by code inspection and route status only, not by a
full user journey.
