# Vyrek visual + smoke test suite

Built per Phase B3 Part 13.

## Run locally

```bash
# First-time setup (downloads ~200MB of browser binaries)
pnpm test:visual:install

# Run the full suite across all 4 viewports (mobile-375, mobile-390,
# tablet-768, desktop-1440). Boots a Next dev server automatically.
pnpm test:visual

# Open the HTML report after a run
pnpm test:visual:report

# Run a single project (faster iteration)
pnpm test:visual --project=desktop-1440

# Run with the browser visible
pnpm test:visual --headed
```

## What's covered

- `pages.spec.ts` — page coverage matrix. Loads every public page,
  asserts no console errors, captures a full-page screenshot per viewport.
- `smoke-quiz.spec.ts` — quick smoke checks (quiz entry, partner apply form).

## What's deferred

The brief (13.2.2) calls for full end-to-end flows:

- Full 15-screen quiz happy path with Stripe Checkout redirect
- Full 11-screen partner application submission (requires Supabase
  test-mode rows)
- Login + forgot password flows

These require test-mode credentials, Stripe checkout test cards, and a
test Supabase schema. They belong in a focused testing session once the
billing flow is verified manually.

## CI

The workflow file `visual-tests.yml` is parked in `.github-pending/`
because the current gh CLI session does not have the `workflow` scope.
To enable CI runs on every push:

1. Copy `.github-pending/visual-tests.yml` to
   `.github/workflows/visual-tests.yml`
2. Push from an environment with `workflow` scope (or paste via the
   GitHub UI under Actions → New workflow → manual upload).

Screenshots are uploaded as the `playwright-report` artefact and kept
for 14 days.
