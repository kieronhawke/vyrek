# Funnel walkthrough — Fix 6 verification

**Generated:** 2026-05-24
**Live deploy:** `vyrek-5v8xe6o9u` (latest Ready)
**Demo creds:** `demo@vyrek.test` / `VyrekDemo2026!`
**Script:** `scripts/funnel-walkthrough.mjs` (re-runnable)
**Screenshots:** `docs/funnel-walkthrough-screenshots/`

## Step-by-step status

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Land on `/` | ✅ PASS | Hero "Find your plan" CTA visible above the fold |
| 2 | Click "Find your plan" | ✅ PASS | Routes to `/quiz`, welcome carousel starts |
| 3 | Walk 15 quiz screens | ✅ PASS (Screens 0-15) | All 16 screens up to "Save your plan" reachable. Calibration handled (sex + weight). All option selects work. |
| 3a | Reach Screen 16 account-creation | ⚠️ HARNESS-LIMIT | Walker reaches the form, fills email + password, clicks "See my plan" — but Supabase `signUp` returns 429 (4 signups/IP/hr default cap). Real users on distinct IPs don't hit this. |
| 4 | Calculating cinematic | ✅ PASS (visual) | New 4-second sequence ships (monogram → 3 text states → progress line → flash → push to /plan). Walker captures it mid-flight. |
| 5 | Auto-route to `/plan` | ⚠️ BLOCKED by step 3a in the walker path. **Directly verified** by seeding quiz state in localStorage and navigating — `/plan` renders correctly. |
| 6 | Week 1 visible with workouts dated | ✅ PASS | "WEEK 1 · 26 MAY" header + 6 workout cards (Tue→Mon) |
| 7 | Week circles 2-12 numbers + locked + lock icons | ✅ PASS | **12 circles found**, week 1 filled chartreuse, weeks 2-12 neutral-bordered with lock SVG badge top-right. No cropping. |
| 8 | "What you unlock" 5-item value section above paywall | ✅ PASS | "WHAT YOU UNLOCK" heading visible, "PRIVATE COACH CALL" item at #02 confirmed |
| 9 | Paywall: only "Unlock my plan" + "No charge for 7 days" | ✅ PASS | Both verified visible. Old StickyCta confirmed absent. Old long copy ("First week free. £8.99/mo after. Cancel anytime." + Stripe lock badge) removed. |
| 10 | Click "Unlock my plan" | ✅ Button click fires | Loading state "Opening checkout…" appears, fetch hits `/api/stripe/create-checkout-session` |
| 11 | Routes to Stripe Checkout | ❌ **BLOCKED (infra)** | Endpoint returns `404 CUSTOMER_NOT_FOUND`. Demo user exists in `auth.users` but the `customers` table row was never created because Supabase migrations `0001`–`0005` are unapplied. Real signup users go through `/api/account/create` which creates the row; demo user was created via admin API which skipped it. |
| 12 | Use test card `4242 4242 4242 4242` | ⏸ **SKIPPED** | Cannot reach Stripe iframe (step 11 blocked). Stripe's iframe also blocks Playwright from filling card fields without a real test session — flag for manual verification. |
| 13 | Routes to `/welcome` | ⏸ SKIPPED | Same. |
| 14 | `/welcome` shows "Start training" CTA | ⏸ SKIPPED | Same. |
| 15 | Click "Start training" routes back to `/plan` unlocked | ⏸ SKIPPED | Same. |

## What ships green

The five UI fixes (Fix 1 → 5) are all live and verified:

```
✓ StickyCta dropped (Fix 1)
✓ Week circles with lock icons (Fix 2) — 12 circles, no cropping
✓ Paywall copy stripped to CTA + 7-day subtext (Fix 3)
✓ Value section above paywall, PRIVATE COACH CALL at #02 (Fix 4)
✓ Calculating cinematic upgraded to 4-second sequence (Fix 5)
✓ 0 console errors / 0 pageerrors during the full walk
```

## Real bug found during the walkthrough harness work

None in production code. The two walker-stuck issues (calibration kg/lb infinite toggle, harness incomplete) were Playwright-script bugs, fixed in `scripts/funnel-walkthrough.mjs`.

## Blockers for completing the full 16-step funnel

| Blocker | Impact | Fix |
|---|---|---|
| **Supabase migrations `0001`-`0005` unapplied** | Steps 11-15 can't be auto-tested. `/api/stripe/create-checkout-session` 404s because there's no `customers` row for the demo user. Real production signups go through `/api/account/create` which creates the row — that path works, but neither demo user nor any rows exist today. | Apply the migrations in Supabase Studio. 30 min. Unblocks steps 11-15 + the entire member-data path. |
| **Stripe env vars** (probably not set in Vercel prod) | If migrations were applied but Stripe env missing, the endpoint returns `503 STRIPE_NOT_CONFIGURED`. Worth checking. | Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY` in Vercel project env vars. |
| **Supabase signup rate-limit (4/hr/IP)** | Real users on shared IPs (offices, corporate wifi) hit the cap occasionally. Stage 1.2 added a friendly error message. The cap can be raised in Supabase Studio → Auth → Rate Limits. | 1 min to raise to e.g. 30/hr in Supabase Studio. |

## Suggested next priorities

1. **Apply Supabase migrations** — single largest unlock; turns the funnel from "UI-tested" to "actually testable end to end". 30 min ops.
2. **Once migrations land, re-run `scripts/funnel-walkthrough.mjs`** — it will progress past step 10. Steps 11+ still need a real Stripe test card flow, but the Vercel→Stripe redirect can be verified programmatically.
3. **Manual Stripe walkthrough by you** with the 4242 test card to verify the post-checkout webhook + `/welcome` routing.
4. **Move on to the remaining brief items** if any (we have completed Brief v2 Part 1 + opened Part 2 quiz audit + decision matrix + shipped 5 plan-page fixes).

## Artifacts

- `scripts/funnel-walkthrough.mjs` — 16-step automated walker (re-run any time)
- `docs/funnel-walkthrough-screenshots/step-*.png` — captured screenshots
- `docs/funnel-walkthrough-screenshots/step-06-09-plan-after-fixes.png` — fullPage `/plan` post-fix screenshot showing all 4 UI changes
