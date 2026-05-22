# Vyrek

Personalised Hyrox training programmes built by Elite 15 athletes. Marketing site, onboarding funnel, plan reveal, Stripe-backed trial, and the journal. Live at **https://vyrek.vercel.app**.

## Stack

- **Next.js 16** App Router, React 19, TypeScript strict
- **Tailwind v4** with bespoke Vyrek design tokens (no `@tailwindcss/typography`)
- **Supabase** Auth + Postgres + RLS via `@supabase/ssr`
- **Stripe** subscriptions, £4.99/mo with 7-day trial
- **Resend + React Email** for transactional + drip
- **PostHog** for analytics (consent-gated, lazy-loaded)
- **MDX** for the blog (`content/blog/*.mdx`), with custom `Callout / PullQuote / Stat / StatGrid / KeyTakeaways` components
- **Sanity** stubbed for Phase G — schemas are intentionally empty

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Fill in env vars (see "Environment" below)
pnpm dev
```

Open http://localhost:3000.

## Project layout

```
app/                        Routes (App Router)
  api/
    account/create/         POST endpoint for V3 quiz account creation
    plan/[week]/            Paywall-enforced plan fetch
    stripe/                 Checkout session + webhook
    og/blog/[slug]/         Per-post OG image generation (next/og)
  blog/                     Journal (index, slug, category, author, rss)
  plan/                     Plan reveal (owner + shareable variants)
  quiz/                     V3 quiz (with /v2 fallback)
  welcome/                  Post-checkout landing
  llms.txt/                 AI-crawler discovery doc
  sitemap.ts                Dynamic sitemap including blog
  robots.ts                 robots.txt with explicit allow lists

components/
  quiz-v3/                  15-screen quiz V3 (Marchon-Runna hybrid)
  quiz-v2/                  Preserved V2 fallback
  plan/                     Plan reveal UI (day card, paywall, sticky CTA)
  blog/                     Blog UI (post card, TOC, MDX callouts)
  marketing/                Nav, hero, programmes, FAQ, footer
  welcome/                  Trial-confirm landing
  shared/                   Container, eyebrow, CTAs, logo

content/blog/*.mdx          Blog posts (frontmatter + body)

lib/
  blog/                     Post loader, authors, URLs, JSON-LD helpers
  email/                    Resend wrapper + React Email templates
  quiz-flow.ts              V3 types + programme matching + date helpers
  quiz-flow-v2.ts           V2 screens (kept for /quiz/v2)
  plan-generator.ts         Pure Week 1/N builder w/ calibration
  posthog.ts                Lazy + consent-gated posthog-js
  stripe.ts                 Lazy server-side Stripe client
  supabase/                 admin/server/browser wrappers

supabase/migrations/        0001_init + 0002_quiz_v3 (V3 additions)
scripts/                    Lighthouse, route sweeps, V3/plan/E2E tests
docs/                       Build briefs and competitive analysis
```

## Environment

Copy `.env.example` to `.env.local` and fill in. Without the optional ones, the funnel still works — they just degrade gracefully:

| Var | Required? | What happens if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Account creation API errors out |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Client cannot sign up users |
| `SUPABASE_SECRET_KEY` | yes | Server cannot persist customer/quiz rows |
| `STRIPE_SECRET_KEY` | for checkout | `/api/stripe/create-checkout-session` returns 503 with a friendly message |
| `STRIPE_PRICE_ID_MONTHLY` | for checkout | Same — 503 with message |
| `STRIPE_WEBHOOK_SECRET` | for webhook | `/api/stripe/webhook` returns 503 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | for client | UI checkout button still works (server creates session) |
| `RESEND_API_KEY` | for email | All `sendXxxEmail` calls log "skipping" and return `ok: false` |
| `NEXT_PUBLIC_POSTHOG_KEY` | for analytics | `capture()` is a no-op; quiz funnel still works |
| `NEXT_PUBLIC_POSTHOG_HOST` | optional | Defaults to `https://eu.posthog.com` |

Apply migrations: `supabase db push` (from a Supabase-CLI-authenticated machine) or run the SQL files in the Supabase dashboard.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build locally |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Type check |

Testing (Puppeteer-driven, against a running server):

| Command | What it tests |
|---|---|
| `node scripts/test-flow-v3.mjs <baseUrl>` | Full V3 quiz happy path |
| `node scripts/test-quiz-alt-paths.mjs <baseUrl>` | Doubles, raced-many, home+equipment paths |
| `node scripts/test-plan-reveal.mjs <baseUrl>` | Plan reveal + day card sheet + 152kg calibration |
| `node scripts/test-blog-seo.mjs <baseUrl>` | Blog JSON-LD, canonical, RSS, OG image |
| `node scripts/test-mobile-visual.mjs <baseUrl>` | Mobile drawer, no h-scroll, hero above-the-fold |
| `node scripts/test-consent-and-pricing.mjs <baseUrl>` | Cookie banner + £4.99 copy |
| `node scripts/full-route-sweep.mjs <baseUrl>` | Every route at 390/1440, console errors |
| `node scripts/lighthouse.mjs <baseUrl>` | Lighthouse perf/a11y/BP/SEO |
| `node scripts/lighthouse-blog.mjs <baseUrl>` | Lighthouse blog-only |

## Adding a blog post

Drop a new file at `content/blog/<slug>.mdx`. Frontmatter shape:

```mdx
---
title: "Post title"
slug: "url-slug"
excerpt: "One-sentence summary."
category: "training"             # first-race | training | technique | nutrition | race-day | recovery
tags: ["tag1", "tag2"]
publishedAt: "2026-05-22"
author: "james-wright"           # or vyrek-team (lib/blog/authors.ts)
heroImage: "/media/images/programme-first-race.jpg"
heroAlt: "Alt text for the hero image"
seoTitle: "Optional — overrides <title> tag"
seoDescription: "Optional — overrides <meta description>"
faqs:                            # optional — triggers FAQPage rich result
  - q: "Question?"
    a: "Answer."
---

# Body

Use any standard Markdown, plus these custom MDX components:

<KeyTakeaways>
- One
- Two
</KeyTakeaways>

<Callout tone="tip" title="...">  ...children...  </Callout>

<PullQuote attribution="Name">  ...children...  </PullQuote>

<StatGrid>
  <Stat value="12" label="WEEKS" caption="..." />
</StatGrid>
```

Next build picks it up automatically — sitemap, RSS, llms.txt, related-post scoring, category counts.

## Deploying

Production deploys are wired to push-to-`main` via Vercel ↔ GitHub. To deploy from local:

```bash
vercel --yes --prod
```

Preview deploys are automatic on PRs once the Vercel GitHub App is connected.

## Voice

Trainer's Notebook. Direct, technical, no hype. Lowercase nav copy. No exclamation marks. Specific over generic ("12 weeks" not "a few months"). See `docs/vyrek-build-brief-v3.md` §4 for the full guide.
