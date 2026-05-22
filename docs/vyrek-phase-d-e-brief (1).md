# Vyrek — Phase D + E brief: Plan Reveal + Stripe + Welcome + Emails

**Paste this entire document into Claude Code Terminal AFTER Quiz V3 finishes building.**

## Context

Quiz V3 is shipped. User completes 15 screens, has an account in Supabase Auth, sees calculating cinematic, then hits the `/plan` route. From this point we need:

- **Phase D:** Plan reveal page at `/plan` — Week 1 visible, Weeks 2-12 paywalled (the moat)
- **Phase E.1:** Stripe Checkout integration — captures the trial signup
- **Phase E.2:** Welcome page at `/welcome` — confirms trial started
- **Phase E.3:** Resend email templates — welcome + 4 trial reminders

Build in order. Deploy after each sub-phase. Stop for review before next.

---

## Locked decisions

| Decision | Value |
|---|---|
| Pricing | **£4.99/month** (GBP) |
| Trial | 7 days free, no card validation at signup |
| Charge timing | Day 8 |
| Payment flow | Plan reveal → "Start training" button → Stripe Checkout → Welcome page |
| Currency | GBP only |
| Payment methods | Card + Apple Pay + Google Pay (Stripe auto-enables) |

---

## User prerequisites (you, not Claude Code)

Before Claude Code can wire anything up, you need accounts and keys.

### 1. Stripe (test mode for now)

1. Go to https://dashboard.stripe.com/test/apikeys
2. Sign up if you haven't (free, takes 2 minutes)
3. You'll see your **test mode** keys. Two values to copy:
   - `Publishable key` (starts with `pk_test_...`)
   - `Secret key` (starts with `sk_test_...` — click to reveal)
4. Then go to https://dashboard.stripe.com/test/products
5. Click **+ Add product**
6. Fill in:
   - Name: `Vyrek Membership`
   - Description: `Personalised Hyrox training programmes`
   - Pricing model: `Standard pricing`
   - Price: `£4.99`
   - Billing period: `Monthly`
   - Currency: `GBP`
7. Click **Add product**
8. After save, click into the product, find the **Price ID** (starts with `price_...`). Copy it.
9. Go to https://dashboard.stripe.com/test/webhooks
10. Click **+ Add endpoint**
11. URL: `https://vyrek.vercel.app/api/stripe/webhook` (or your custom domain if set up)
12. Events to send (select these specific ones):
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `customer.subscription.trial_will_end`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
13. Click **Add endpoint**
14. After save, click into the endpoint and find the **Signing secret** (starts with `whsec_...`). Copy it.

**You now have 4 Stripe values:** `pk_test_...`, `sk_test_...`, `price_...`, `whsec_...`

### 2. Resend (for emails)

1. Go to https://resend.com/signup
2. Sign up (free tier covers up to 3,000 emails/month)
3. Verify your email
4. Once in the dashboard, go to **API Keys**
5. Click **Create API Key**
6. Name it `vyrek-production`, permission `Full access`
7. Copy the key (starts with `re_...`)

**For now use Resend's default sender domain.** Custom domain verification can wait until launch.

### 3. PostHog (already done, double-check)

If you haven't set up PostHog yet:
1. Go to https://posthog.com/signup
2. Create a project called `vyrek`
3. Region: EU
4. Copy the project key (starts with `phc_...`)

### 4. Hand all keys to Claude Code

When Claude Code asks, paste this into the **Terminal** (NOT this chat):

```
Stripe test mode credentials:
- Publishable key: pk_test_[your value]
- Secret key: sk_test_[your value]
- Price ID for £4.99/mo: price_[your value]
- Webhook signing secret: whsec_[your value]

Resend API key: re_[your value]
PostHog project key: phc_[your value] (if not already in .env.local)

Update .env.local with these. Use these variable names:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

Push to Vercel with the existing push-env-to-vercel script.
```

---

## PHASE D — Plan reveal page (2-3 hours)

The moat. This is where Vyrek wins vs Marchon and Runna.

### Route

`/plan` — accessible to:
- Authenticated users (Supabase session valid)
- Users who just completed the quiz (UUID + email in localStorage)

If neither: redirect to `/quiz` to start over.

### Layout (mobile-first)

```
┌─────────────────────────────────┐
│ ← back              [ JW ] menu │  56px nav with avatar
├─────────────────────────────────┤
│                                 │
│ [ YOUR PLAN ]                   │  Eyebrow, mono
│                                 │
│ First Race                      │  Programme name, text-3xl weight 900
│                                 │
│ 12 weeks. Built around          │  Tagline
│ your race on Saturday,          │
│ 19 August 2026.                 │
│                                 │
│ ┌──────┬──────┬──────┐         │  Stat row, 3 cols, mono
│ │ DAYS │ TIME │START │         │
│ │  4   │ 60m  │ Tue  │         │
│ └──────┴──────┴──────┘         │
│                                 │
│ [ 14 weeks to your race ]       │  Countdown chip, accent
│                                 │
│ ─────────                       │
│                                 │
│ Week 1 · Week 2 · Week 3 · ...  │  Horizontal scroll, snap, week 1 active
│ ━━━━━━                          │
│                                 │
│ ┌───────────────────────────┐  │
│ │ Mon  27 May               │  │  Week 1 day card
│ │ Easy run                  │  │
│ │ 45 min · Z2 endurance     │  │
│ │ Tap for full session →    │  │
│ └───────────────────────────┘  │
│                                 │
│ ┌───────────────────────────┐  │
│ │ Tue  28 May               │  │
│ │ Hyrox Hybrid: Run + Sled  │  │
│ │ 60 min · Race-specific    │  │
│ └───────────────────────────┘  │
│                                 │
│ ... 5 more days ...             │
│                                 │
│ ─────────                       │
│                                 │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  Weeks 2-12 blurred
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│   ┌─────────────────────────┐  │
│   │ Unlock weeks 2-12       │  │  Paywall card, centred
│   │                         │  │
│   │ First week free.        │  │
│   │ £4.99/mo after.         │  │
│   │ Cancel anytime.         │  │
│   │                         │  │
│   │ [ Start training → ]    │  │
│   └─────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│ Start training — 7 days free →  │  Sticky bottom CTA
└─────────────────────────────────┘
```

### Day card interaction

Tap any Week 1 day → bottom sheet slides up:

```
┌─────────────────────────────────┐
│                            ✕   │
├─────────────────────────────────┤
│                                 │
│ Tue 28 May                      │
│                                 │
│ Hyrox Hybrid: Run + Sled        │  Title, text-2xl weight 900
│ 60 min · Race-specific          │
│                                 │
│ ─────────                       │
│                                 │
│ WARM-UP · 10 min                │  Section header, mono
│ • 5 min easy jog                │
│ • Dynamic stretches × 5         │
│ • Sled push, light × 2          │
│                                 │
│ MAIN · 40 min                   │
│ • 1km run at race pace          │
│ • Sled push 20m × 4             │
│   [ MEN'S: 152kg / 30m sets ]   │  Calibrated to user's sex
│ • 1km run at race pace          │
│ • Sled pull 20m × 4             │
│ • 1km run at race pace          │
│                                 │
│ COOL-DOWN · 10 min              │
│ • Walk 5 min                    │
│ • Stretches × 5                 │
│                                 │
│ [ Share workout ↗ ]             │  Native share API
│                                 │
└─────────────────────────────────┘
```

### Plan generator integration

`lib/plan-generator.ts` should already exist (built earlier or stub). If not, create now:

```typescript
// lib/plan-generator.ts

import { QuizAnswers, Programme } from './quiz-flow';
import { addDays, format, nextTuesday } from 'date-fns';

export type Workout = {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  date: Date;
  type: 'run' | 'hyrox' | 'strength' | 'recovery' | 'rest';
  title: string;
  duration_min: number;
  intensity_zone: 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | null;
  structure: WorkoutSection[];
};

export type WorkoutSection = {
  section: 'warmup' | 'main' | 'cooldown';
  duration_min: number;
  blocks: WorkoutBlock[];
};

export type WorkoutBlock = {
  name: string;
  reps?: string;
  duration?: string;
  notes?: string;
  calibrated_load?: { weight: number; unit: 'kg' | 'lb' };
};

export type Plan = {
  week: number;
  workouts: Workout[];
};

export function generateWeek1(answers: QuizAnswers, programme: Programme): Plan {
  const startDate = nextTuesday(new Date());

  // Apply calibration from quiz answers (sex + weight)
  const sledLoad = answers.sex === 'men' ? 152 : 102;
  const wallBall = answers.sex === 'men' ? 9 : 6;
  const farmersCarry = answers.sex === 'men' ? 24 : 16;
  const sandbagLunge = Math.round(answers.weight * (answers.sex === 'men' ? 0.3 : 0.25));

  // Build workouts based on programme + days/week
  const workouts: Workout[] = buildWeekStructure({
    programme,
    daysPerWeek: answers.days,
    sessionLength: parseInt(answers.sessionLength),
    location: answers.location,
    equipment: answers.equipment ?? [],
    partner: answers.partner,
    injuries: answers.injuries,
    activityLevel: answers.activity,
    startDate,
    calibration: { sledLoad, wallBall, farmersCarry, sandbagLunge, unit: answers.weightUnit },
  });

  return { week: 1, workouts };
}

// Stub for now — full programme library comes in Phase F
function buildWeekStructure(params: {
  programme: Programme;
  daysPerWeek: number;
  sessionLength: number;
  location: 'gym-full' | 'gym-standard' | 'home';
  equipment: string[];
  partner: 'solo' | 'doubles' | 'solo-partner-later';
  injuries: string;
  activityLevel: string;
  startDate: Date;
  calibration: { sledLoad: number; wallBall: number; farmersCarry: number; sandbagLunge: number; unit: 'kg' | 'lb' };
}): Workout[] {
  // ... seed-based deterministic generator
  // ... returns 7 Workout entries (Mon-Sun) with appropriate rest days
  // ... applies injury substitutions (e.g. knee = swap box jumps for low-impact)
  // ... applies equipment filters (no kettlebell = swap for dumbbell)
}
```

**Critical: Week 1 generated client-side. Weeks 2-12 server-side only.**

### Paywall enforcement (server-side)

Weeks 2-12 data must NOT be in the client bundle. Otherwise users can dev-tools-bypass the paywall.

```typescript
// app/api/plan/[week]/route.ts

import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(req: Request, { params }: { params: { week: string } }) {
  const week = parseInt(params.week);

  // Week 1 is public — anyone can fetch
  if (week === 1) {
    // Generate from quiz state, return
    return Response.json({ week: 1, workouts: generateWeek1FromSession(req) });
  }

  // Weeks 2-12: authenticated + subscribed only
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });

  const { data: subscription } = await supabaseAdmin()
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('customer_id', user.id)
    .single();

  if (!subscription || !['trialing', 'active'].includes(subscription.status)) {
    return Response.json({ error: 'SUBSCRIPTION_REQUIRED' }, { status: 402 });
  }

  // Subscribed — return the week
  return Response.json({ week, workouts: generateWeekN(week, user.id) });
}
```

### Native share

Day card "Share workout" button uses Web Share API:

```typescript
async function shareWorkout(workout: Workout, planShareId: string) {
  const text = `${workout.day}'s training: ${workout.title}. ${workout.duration_min} min. From my Vyrek plan.`;
  const url = `https://vyrek.vercel.app/plan/share/${planShareId}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'Vyrek workout', text, url });
      posthog.capture('workout_shared', { workout_type: workout.type });
    } catch {
      // User cancelled — fine
    }
  } else {
    // Fallback: copy to clipboard, show toast
    await navigator.clipboard.writeText(`${text} ${url}`);
    showToast('Copied to clipboard');
  }
}
```

### Shareable plan URL

Create route `app/plan/share/[id]/page.tsx`:

```typescript
// Anyone with the URL sees a non-paywalled view of the user's Week 1.
// At the bottom: "Want your own plan? Take the quiz →"
//
// Viral loop. Marchon and Runna both miss this.
```

### Sticky CTA

Bottom-fixed, always visible on mobile, safe-area-inset-bottom:

```
[ Start training — 7 days free → ]
```

Tap routes to: `/api/stripe/create-checkout-session` (which creates the Stripe session and redirects).

### Number animations

When day cards scroll into view, "60 min" counts up from 0 to 60 over 600ms via GSAP. Subtle premium signal.

### Acceptance

- [ ] Week 1 dated correctly (next Tuesday + 6 days)
- [ ] Calibration data flows through (man sees 152kg sled, woman sees 102kg)
- [ ] Equipment filters apply (home + no kettlebell = no kettlebell exercises)
- [ ] Injury substitutions work (knee = no box jumps)
- [ ] Paywall blur unbreakable via dev tools (verify: open dev tools, check Weeks 2-12 not in JS bundle)
- [ ] Native share works on mobile (test on real iPhone)
- [ ] Bottom sticky CTA above keyboard if any input focused
- [ ] Lighthouse mobile ≥95
- [ ] PostHog events fire: `plan_revealed`, `workout_expanded`, `paywall_clicked`

### Deploy and stop

Deploy via `vercel --yes --prod`. Tell me when ready.

---

## PHASE E.1 — Stripe Checkout + Webhook (2 hours)

### `/api/stripe/create-checkout-session`

```typescript
// app/api/stripe/create-checkout-session/route.ts

import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });

  // Look up customer record
  const { data: customer } = await supabaseAdmin()
    .from('customers')
    .select('id, email, stripe_customer_id, referral_code, referred_by_code')
    .eq('auth_user_id', user.id)
    .single();

  if (!customer) return Response.json({ error: 'CUSTOMER_NOT_FOUND' }, { status: 404 });

  // Look up quiz response for metadata
  const { data: quizResponse } = await supabaseAdmin()
    .from('quiz_responses')
    .select('program, path, answers')
    .eq('customer_id', customer.id)
    .single();

  // Create or reuse Stripe customer
  let stripeCustomerId = customer.stripe_customer_id;
  if (!stripeCustomerId) {
    const stripeCustomer = await stripe.customers.create({
      email: customer.email,
      metadata: { vyrek_customer_id: customer.id },
    });
    stripeCustomerId = stripeCustomer.id;
    await supabaseAdmin()
      .from('customers')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', customer.id);
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID_MONTHLY!,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        vyrek_customer_id: customer.id,
        programme: quizResponse?.program ?? 'unknown',
        referred_by_code: customer.referred_by_code ?? '',
      },
    },
    client_reference_id: customer.id,
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/plan?cancelled=true`,
    allow_promotion_codes: true,
    payment_method_types: ['card'],
    // Apple Pay + Google Pay enabled automatically by Stripe when domain verified
    metadata: {
      vyrek_customer_id: customer.id,
      programme: quizResponse?.program ?? 'unknown',
    },
  });

  // Track in PostHog
  // posthog.capture('checkout_started', { customer_id: customer.id, programme: quizResponse?.program });

  return Response.json({ url: session.url });
}
```

### `/api/stripe/webhook`

```typescript
// app/api/stripe/webhook/route.ts

import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendWelcomeEmail, sendPaymentFailedEmail, sendCancellationEmail } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) return Response.json({ error: 'NO_SIGNATURE' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return Response.json({ error: 'INVALID_SIGNATURE' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerId = session.client_reference_id!;
      const stripeSubscriptionId = session.subscription as string;

      // Fetch subscription details
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

      // Insert subscription record
      await supabaseAdmin().from('subscriptions').insert({
        id: stripeSubscriptionId,
        customer_id: customerId,
        stripe_subscription_id: stripeSubscriptionId,
        status: subscription.status,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        current_period_end: new Date(subscription.current_period_end * 1000),
      });

      // Mark abandoned plan as recovered
      await supabaseAdmin()
        .from('abandoned_plans')
        .update({ recovered_at: new Date() })
        .eq('quiz_uuid', customerId);

      // Send welcome email
      const { data: customer } = await supabaseAdmin()
        .from('customers')
        .select('email')
        .eq('id', customerId)
        .single();

      if (customer) {
        await sendWelcomeEmail({
          to: customer.email,
          trialEndsAt: new Date(subscription.trial_end! * 1000),
          programmeName: session.metadata?.programme ?? 'your',
        });
      }

      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await supabaseAdmin()
        .from('subscriptions')
        .update({
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await supabaseAdmin()
        .from('subscriptions')
        .update({ status: 'canceled', cancelled_at: new Date() })
        .eq('stripe_subscription_id', subscription.id);

      // Send cancellation email
      const { data: sub } = await supabaseAdmin()
        .from('subscriptions')
        .select('customer_id, customers(email)')
        .eq('stripe_subscription_id', subscription.id)
        .single();

      if (sub?.customers?.email) {
        await sendCancellationEmail({ to: sub.customers.email });
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      // Stripe sends this 3 days before trial ends
      // We could send our own day-5 / day-6 emails here instead of scheduled
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      // First paid invoice = trial converted to paid
      // Trigger referral bounty if customer was referred
      // Send "trial converted" email
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const stripeSubscriptionId = invoice.subscription as string;

      const { data: sub } = await supabaseAdmin()
        .from('subscriptions')
        .select('customer_id, customers(email)')
        .eq('stripe_subscription_id', stripeSubscriptionId)
        .single();

      if (sub?.customers?.email) {
        await sendPaymentFailedEmail({
          to: sub.customers.email,
          updatePaymentUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/account/billing`,
        });
      }
      break;
    }
  }

  return Response.json({ received: true });
}

export const config = {
  api: { bodyParser: false },
};
```

### Acceptance

- [ ] User clicks "Start training" on plan reveal → Stripe Checkout opens
- [ ] Test card (`4242 4242 4242 4242`, any future date, any CVC) completes signup
- [ ] User redirected to `/welcome?session_id=...`
- [ ] Subscription row created in Supabase
- [ ] Welcome email arrives via Resend
- [ ] Test failed card (`4000 0000 0000 0341`) triggers payment failed email
- [ ] Test cancellation via Stripe customer portal triggers cancellation email
- [ ] PostHog events: `checkout_started`, `checkout_completed`

### Deploy and stop

---

## PHASE E.2 — Welcome page (1 hour)

### Route

`/welcome?session_id={STRIPE_CHECKOUT_SESSION_ID}`

### Server-side verification

```typescript
// app/welcome/page.tsx

import Stripe from 'stripe';
import { redirect } from 'next/navigation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

export default async function WelcomePage({ searchParams }: { searchParams: { session_id?: string } }) {
  if (!searchParams.session_id) redirect('/pricing');

  const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    redirect('/pricing');
  }

  const subscription = session.subscription
    ? await stripe.subscriptions.retrieve(session.subscription as string)
    : null;

  const trialEndsAt = subscription?.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const firstWorkoutDate = nextTuesday(new Date());
  const programmeName = session.metadata?.programme ?? 'First Race';

  return <WelcomeContent
    trialEndsAt={trialEndsAt}
    firstWorkoutDate={firstWorkoutDate}
    programmeName={programmeName}
  />;
}
```

### Layout

```
┌─────────────────────────────────┐
│                                 │
│ You're in.                      │  Headline, text-4xl weight 900
│                                 │
│ Day 1 starts tomorrow.          │  Sub, text-xl secondary
│                                 │
│ ┌──────────────┬──────────────┐│  Stat row, 2 cols
│ │ TRIAL ENDS   │ FIRST WORKOUT││
│ │ 28 May       │ Tue 27 May   ││
│ └──────────────┴──────────────┘│
│                                 │
│ ─────────                       │
│                                 │
│ What happens next               │  Section header
│                                 │
│ [ 01 ] Add Vyrek to your        │
│        home screen              │  PWA install hint
│                                 │
│ [ 02 ] Open Tuesday morning     │
│                                 │
│ [ 03 ] Hit the session          │
│                                 │
│ ─────────                       │
│                                 │
│ Refer a friend. Earn £20.       │  Referral teaser
│ [ See how →]                    │
│                                 │
│ ─────────                       │
│                                 │
│ [ View your plan → ]            │  Primary CTA back to /plan
│                                 │
└─────────────────────────────────┘
```

### PWA install prompt

Fire `beforeinstallprompt` listener after 3 seconds (high-intent moment).

iOS Safari doesn't fire that event — show custom card with screenshot of "Tap share → Add to Home Screen".

### Acceptance

- [ ] Invalid `session_id` redirects to `/pricing`
- [ ] Valid session shows correct trial end + first workout dates
- [ ] PWA install prompt fires on Android Chrome
- [ ] iOS "Add to home screen" instructions appear on iPhone Safari
- [ ] "View your plan →" routes to `/plan` (now fully unlocked, paywall removed)

### Deploy and stop

---

## PHASE E.3 — Resend email templates (1.5 hours)

### React Email setup

```bash
pnpm add react-email @react-email/components
```

### Template structure

All emails: dark bg (#0A0A0A), Geist font (with SVG fallback for Outlook), accent CTA button, Vyrek monogram top, technical mark footer.

### Email 1 — Welcome (immediate)

`lib/email/welcome.tsx`

```typescript
import { Html, Body, Container, Heading, Text, Button, Section } from '@react-email/components';

export function WelcomeEmail({ trialEndsAt, firstWorkoutDate, programmeName }: Props) {
  return (
    <Html>
      <Body style={{ background: '#0A0A0A', color: '#F5F5F3', fontFamily: 'Geist, sans-serif' }}>
        <Container>
          {/* VYREK monogram */}
          <Heading style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em' }}>
            You're in.
          </Heading>

          <Text style={{ fontSize: 16, lineHeight: 1.6 }}>
            Day 1 of your {programmeName} programme starts tomorrow.
          </Text>

          <Section>
            <Text>Trial ends: {formatDate(trialEndsAt)}</Text>
            <Text>First workout: {formatDate(firstWorkoutDate)}</Text>
          </Section>

          <Button href="https://vyrek.vercel.app/plan" style={{ background: '#FF5A1F', color: '#FFF', padding: '16px 32px' }}>
            View your plan →
          </Button>

          <Text style={{ fontSize: 12, opacity: 0.55, marginTop: 32 }}>
            [ VYREK · FITNESS / 2026 · MADE IN UK ]
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Email 2 — Day 1 reminder (24hr after trial start)

Subject: "Day 1."

Body:
- "Today's workout: [title]"
- "[Duration]. [Brief description]."
- CTA: "Open today's session →"

### Email 3 — Day 3 (72hr after trial start)

Subject: "Three days in."

Body:
- "Most members say Day 3 is the hardest. You've got this."
- Brief encouragement, no hard sell
- CTA: "See tomorrow's session →"

### Email 4 — Day 5 ("2 days left in trial")

Subject: "Two days left."

Body:
- Stats: how many sessions logged so far
- "Tomorrow we'll show you what Week 2 looks like"
- CTA: "Open the app →"

### Email 5 — Day 6 ("Tomorrow: £4.99")

Subject: "Tomorrow: £4.99."

Body:
- Honest reminder of charge
- Cancel link prominent (low friction)
- **Week 2 teaser:** show 3 blurred workout titles from Week 2
- "Stay for these and the next 10 weeks"
- CTA: "Stay with Vyrek →" (links to /plan to confirm intent)
- Secondary: "Cancel my trial" (links to /account/cancel)

### Sending logic

In webhook `checkout.session.completed`:

```typescript
// Send welcome immediately
await sendWelcomeEmail(...);

// Schedule rest via Resend's scheduled send feature
// (or use a job queue — for Phase 1 we can use simple setTimeout
// via a cron on Vercel)

// Alternative: use Resend's scheduling
await resend.emails.send({
  from: 'Vyrek <hello@updates.resend.dev>',
  to: customerEmail,
  subject: 'Day 1.',
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  react: <Day1Email />,
});
```

### Acceptance

- [ ] Welcome email arrives within 30 seconds of checkout
- [ ] Day 1 email scheduled correctly
- [ ] Day 3 + 5 + 6 emails scheduled correctly
- [ ] All emails render correctly in Gmail (web + iOS app), Outlook, Apple Mail
- [ ] Unsubscribe link works (Resend provides this automatically)
- [ ] Test by signing up with your own email, fast-forwarding time in dev

### Deploy and stop

---

## Execution order (final)

| # | Sub-phase | Effort |
|---|---|---|
| 1 | User: set up Stripe + Resend accounts, hand keys to Claude Code | 30 min |
| 2 | Phase D: Plan reveal page | 2-3 hrs |
| 3 | Phase E.1: Stripe Checkout + webhook | 2 hrs |
| 4 | Phase E.2: Welcome page | 1 hr |
| 5 | Phase E.3: Email templates | 1.5 hrs |

**Total: ~7 hours of Claude Code work + 30 min of your setup.**

Deploy after each sub-phase. Stop and tell me when each is ready.

---

## Definition of done

End-to-end test that proves everything works:

1. New incognito browser, go to vyrek.vercel.app
2. Click "Find your plan" → complete 15-screen quiz
3. Create account (use a real email you can check)
4. See calculating cinematic
5. See plan reveal with Week 1 dated
6. Verify Weeks 2-12 blurred, paywall card shown
7. Tap "Start training — 7 days free" on sticky CTA
8. Stripe Checkout loads (test mode)
9. Enter test card `4242 4242 4242 4242`, any future date, any CVC, any postcode
10. Click "Start trial"
11. Land on `/welcome` with trial end date shown
12. Welcome email arrives in inbox within 60 seconds
13. Click "View your plan →"
14. Return to `/plan` with paywall removed, Weeks 2-12 visible
15. Verify Supabase has: customer row, quiz_responses row, subscriptions row (status: trialing)
16. Cancel via Stripe customer portal — verify cancellation email arrives, subscription marked canceled

If all 16 steps pass: Phase D + E is complete. You have a working, payable funnel.

---

## What's NOT in this brief (deferred)

These are intentionally out of scope for Phase D + E:

- Member dashboard (Stage 3 — separate 15-20 hour build)
- Login page for returning users (needs to exist but minimal — just `supabase.auth.signInWithPassword`)
- Forgot password flow (build alongside login)
- Account settings page (Stripe customer portal handles billing for now)
- Cancellation flow with retention (Stage 2)
- Referral hub (Stage 2)
- Real media polish (you have files, separate task)
- Stripe live mode activation (do this when you're actually launching)
- Custom domain (do this once final brand name locked)

---

**End of Phase D + E brief. Paste into Claude Code AFTER Quiz V3 is deployed and verified.**
