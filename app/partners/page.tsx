import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Partner Programme. Recurring revenue with Vyrek",
  description:
    "Earn 30% to 50% lifetime recurring commission referring athletes to Vyrek. Flat tiered rates, monthly BACS payouts, no spammy gimmicks.",
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    n: "01",
    label: "APPLY",
    body:
      "Tell us about your audience. We review every application within 48 hours.",
  },
  {
    n: "02",
    label: "GET YOUR LINK",
    body:
      "Custom partner link, your choice of slug. Real-time tracking dashboard.",
  },
  {
    n: "03",
    label: "EARN RECURRING",
    body: "30% to 50% of every subscription, for life. Payouts monthly via BACS.",
  },
];

const TIERS = [
  {
    name: "Starter",
    range: "0 to 9 active referrals",
    rate: "30%",
    note: "Every new partner starts here.",
  },
  {
    name: "Growth",
    range: "10 to 49 active referrals",
    rate: "40%",
    note: "Automatic upgrade once you cross 10.",
  },
  {
    name: "Elite",
    range: "50+ active referrals",
    rate: "50%",
    note: "Half the subscription, paid back to you. For life.",
  },
];

const FOR = [
  {
    tag: "Coaches",
    body: "Hyrox coaches with athletes who need structured weekly programming between sessions.",
  },
  {
    tag: "Creators",
    body: "Fitness creators with audiences interested in functional training, race prep, or running.",
  },
  {
    tag: "Communities",
    body: "Clubs and run groups running Hyrox prep blocks. Bulk-onboard your members.",
  },
];

const FAQS = [
  {
    q: "How is commission calculated?",
    a: "Flat tiered recurring: Starter 30%, Growth 40%, Elite 50% of every subscription month your referral pays. We do not pay a flat sign-up bounty; everything is recurring.",
  },
  {
    q: "When do I get paid?",
    a: "Monthly via BACS, once your balance reaches £50. Below £50 the balance rolls to the next month. Commission only accrues after the referee's first paid invoice clears (8 days after they sign up).",
  },
  {
    q: "What about clawback?",
    a: "If a referee cancels or charges back within 30 days of their first paid invoice, the commission for that referee is reversed. After 30 days you keep the recurring commission for as long as they stay subscribed.",
  },
  {
    q: "How do you stop fraud?",
    a: "Self-referrals are blocked at signup (email and IP checks). We rate-limit signups per IP. Suspicious patterns are reviewed manually before payout. Persistent abuse means immediate suspension.",
  },
  {
    q: "Can I run paid ads?",
    a: "Yes, with two rules. No bidding on Vyrek brand terms (Google, Meta). No misleading creative claiming results we have not made. Send us your creative if you are unsure.",
  },
  {
    q: "Can I share my link in private communities?",
    a: "Yes, that is one of the best places to share it. Discord servers, club WhatsApp groups, newsletters, etc.",
  },
  {
    q: "What does the dashboard show?",
    a: "Total referrals, active subscribers, this month's earnings, lifetime earnings. A recent-referrals table with signup status. Your custom link, QR code, and downloadable marketing assets.",
  },
  {
    q: "Why no flat bounty?",
    a: "Because flat bounties incentivise volume over fit. Recurring rewards aligning your audience to Vyrek long-term. The partners who do best on Vyrek build steady, trustworthy referrals over months, not one-off campaigns.",
  },
];

export default function PartnersPage() {
  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero band */}
        <section
          aria-labelledby="partners-heading"
          className="relative isolate flex min-h-[68svh] flex-col justify-end overflow-hidden bg-vyrek-base pb-16 pt-[max(7rem,calc(var(--safe-top)+6rem))]"
        >
          <div aria-hidden className="absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/images/v2/bento-coaches.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover grayscale"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-vyrek-base/70 via-vyrek-base/55 to-vyrek-base" />
          </div>
          <Container>
            <Eyebrow>Partner Programme</Eyebrow>
            <SplitHeading
              id="partners-heading"
              as="h1"
              className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-vyrek-text md:text-6xl"
            >
              Start making recurring revenue with the Vyrek Partner Programme.
            </SplitHeading>
            <p className="mt-5 max-w-2xl text-base text-vyrek-text-secondary md:text-lg">
              Our partners earn an average of £300 per month. Top partners
              earn over £2,000.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <CtaButton href="/partners/apply" size="lg">
                Apply to join →
              </CtaButton>
              <Link
                href="/partners/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-elevated px-5 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
              >
                Partner login
              </Link>
            </div>
          </Container>
        </section>

        {/* How it works */}
        <section
          aria-labelledby="how-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>How it works</Eyebrow>
              <h2
                id="how-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
              >
                Three steps. No spreadsheets.
              </h2>
            </div>
            <ol
              role="list"
              className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
            >
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                    [ {s.n} ] {s.label}
                  </p>
                  <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                    {s.body}
                  </p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* Commission tiers */}
        <section
          aria-labelledby="tiers-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Commission tiers</Eyebrow>
              <h2
                id="tiers-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
              >
                The more you refer, the higher your rate.
              </h2>
              <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
                Flat tiered recurring commission. No sign-up bounty. Lifetime
                rate locks the moment you cross each threshold.
              </p>
            </div>
            <ul
              role="list"
              className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
            >
              {TIERS.map((t) => (
                <li
                  key={t.name}
                  className="flex flex-col rounded-lg border border-vyrek-border bg-vyrek-elevated p-6"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                    {t.name}
                  </p>
                  <p className="mt-3 text-sm text-vyrek-text-secondary">
                    {t.range}
                  </p>
                  <p className="mt-6 text-5xl font-black tracking-[-0.04em] text-vyrek-text tabular-nums">
                    {t.rate}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
                    lifetime recurring
                  </p>
                  <p className="mt-6 text-sm leading-relaxed text-vyrek-text-secondary">
                    {t.note}
                  </p>
                </li>
              ))}
            </ul>

            {/* Worked example callout */}
            <div className="mx-auto mt-10 max-w-3xl rounded-lg border border-vyrek-accent/40 bg-vyrek-elevated p-6 md:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
                [ WORKED EXAMPLE · ELITE TIER ]
              </p>
              <p className="mt-4 text-base leading-relaxed text-vyrek-text md:text-lg">
                If 100 of your audience start training with Vyrek, you earn{" "}
                <span className="font-bold tabular-nums">£249.50</span> every
                month for as long as they are subscribed. That is{" "}
                <span className="font-bold tabular-nums">£2,994</span> a year,
                growing each month as more sign up.
              </p>
            </div>
          </Container>
        </section>

        {/* Who this is for */}
        <section
          aria-labelledby="who-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Who this is for</Eyebrow>
              <h2
                id="who-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
              >
                Built for people whose audience already trains.
              </h2>
            </div>
            <ul
              role="list"
              className="mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3 md:gap-5"
            >
              {FOR.map((f) => (
                <li
                  key={f.tag}
                  className="rounded-lg border border-vyrek-border-subtle bg-vyrek-elevated p-6"
                >
                  <Eyebrow>{f.tag}</Eyebrow>
                  <p className="mt-4 text-base leading-relaxed text-vyrek-text-secondary md:text-lg">
                    {f.body}
                  </p>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* FAQ */}
        <section
          aria-labelledby="faq-heading"
          className="border-t border-vyrek-border-subtle py-24 md:py-32"
        >
          <Container>
            <div className="mx-auto max-w-3xl">
              <Eyebrow>Frequently asked</Eyebrow>
              <h2
                id="faq-heading"
                className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl"
              >
                Common questions.
              </h2>
              <div className="mt-8">
                <Accordion>
                  {FAQS.map((f, i) => (
                    <AccordionItem
                      key={i}
                      value={`q-${i}`}
                      className="border-b border-vyrek-border-subtle last:border-b-0"
                    >
                      <AccordionTrigger className="py-5 text-left text-base font-medium text-vyrek-text hover:no-underline md:text-lg">
                        {f.q}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5 text-base leading-relaxed text-vyrek-text-secondary">
                        {f.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </Container>
        </section>

        {/* Final CTA */}
        <section className="border-t border-vyrek-border-subtle py-24 md:py-32">
          <Container>
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <Eyebrow>Apply</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl">
                Three minutes to apply.
              </h2>
              <p className="mt-4 text-base text-vyrek-text-secondary md:text-lg">
                We reply within 48 hours.
              </p>
              <div className="mt-8">
                <CtaButton href="/partners/apply" size="lg">
                  Apply to join →
                </CtaButton>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
