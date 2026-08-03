import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { CtaButton } from "@/components/shared/cta-button";
import { FAQS } from "@/lib/faqs";
import { faqPageJsonLd, JsonLd } from "@/lib/blog/jsonld";
import { siteUrl } from "@/lib/blog/urls";

// Pricing is deliberately not published (Kieron, 2026-07-29). Every
// option routes to a free consultation with Ben; packages are agreed on
// the call. This page describes the coaching options without numbers.

export const metadata: Metadata = {
  title: "Coaching options: personalised Hyrox plans",
  description:
    "Three ways to train with Suth Performance: the coaching hub, online coaching, and 1:1 with Ben Sutherland. Every option starts with a free consultation.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Coaching options · Suth Performance",
    description:
      "The coaching hub, online coaching, and 1:1 with Ben Sutherland. Every option starts with a free consultation.",
    url: "/pricing",
    type: "website",
    images: [
      {
        url: "/media/images/track/straight-elevated-bw.jpg",
        width: 1200,
        height: 630,
        alt: "Open Suth Performance dated weekly plan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coaching options · Suth Performance",
    description:
      "The coaching hub, online coaching, and 1:1 with Ben Sutherland. Every option starts with a free consultation.",
    images: ["/media/images/track/straight-elevated-bw.jpg"],
  },
};

const OPTIONS = [
  {
    tag: "THE HUB",
    title: "Train with structure",
    body: "A personalised, dated programme that rebuilds every Sunday from what you log, plus the full station video library. For self-starters who want elite structure without the hand-holding.",
    points: [
      "Personalised 12-week programme, dated to your calendar",
      "Full station video library",
      "Adapts every week from your logged sessions",
    ],
  },
  {
    tag: "ONLINE COACHING",
    title: "Ben in your corner",
    badge: "MOST POPULAR",
    body: "Everything in the Hub, plus a programme written personally for you, weekly adjustments, private messaging, and a monthly call. Real coaching, without local-PT session prices.",
    points: [
      "Programme written for you, not generated",
      "Weekly review and adjustments from your logs",
      "Private messaging and a monthly 1:1 call",
    ],
  },
  {
    tag: "1:1 WITH BEN",
    title: "The full programme",
    body: "Ben personally, end to end: programming, weekly calls, race strategy, race-week support. Capacity is genuinely limited by Ben's calendar; places open by application.",
    points: [
      "Everything, personally from Ben",
      "Weekly calls and race-week support",
      "By application",
    ],
  },
];

const PRICING_FAQS = FAQS.filter((f) =>
  [
    "How much does it cost?",
    "Can I cancel?",
    "What equipment do I need?",
    "Will my plan change as I improve?",
  ].includes(f.question),
);

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={faqPageJsonLd(
          PRICING_FAQS.map((f) => ({ q: f.question, a: f.answer })),
        )}
      />
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <header className="mx-auto max-w-2xl text-center">
            <Eyebrow>Coaching options</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.05em] text-suth-text md:text-[44px]"
            >
              Three ways to train with Ben.
            </SplitHeading>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              Every option is personalised, and every option starts the same
              way: a free consultation with Ben about where you are and where
              you want to get to. Pricing is agreed on the call and tailored
              to your goals, with a cost-effective option for every budget.
            </p>
          </header>

          <section className="mx-auto mt-14 grid max-w-5xl gap-4 md:grid-cols-3 md:gap-5">
            {OPTIONS.map((o) => (
              <article
                key={o.tag}
                className={`relative flex flex-col rounded-lg border bg-suth-elevated p-7 ${
                  o.badge
                    ? "border-suth-accent/50"
                    : "border-suth-border-subtle"
                }`}
              >
                {o.badge ? (
                  <span className="absolute right-4 top-4 rounded-pill border border-suth-accent/40 bg-suth-accent/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-suth-accent">
                    {o.badge}
                  </span>
                ) : null}
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                  [ {o.tag} ]
                </p>
                <h2 className="mt-3 text-xl font-black tracking-[-0.02em] text-suth-text">
                  {o.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-suth-text-secondary">
                  {o.body}
                </p>
                <ul role="list" className="mt-5 flex-1 space-y-2">
                  {o.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-3 text-sm text-suth-text"
                    >
                      <span
                        aria-hidden
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-suth-accent"
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          <section className="mx-auto mt-12 max-w-xl text-center">
            <CtaButton href="/quiz" size="lg">
              Start with the free quiz →
            </CtaButton>
            <p className="mt-4 text-sm text-suth-text-tertiary">
              Three minutes, then a free consultation with Ben. No card, no
              commitment. Or{" "}
              <a
                href="/free-consultation"
                className="text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
              >
                book the consultation directly
              </a>
              .
            </p>
          </section>

          <section className="mx-auto mt-20 max-w-2xl">
            <h2 className="text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl">
              Common questions
            </h2>
            <dl className="mt-6 space-y-6">
              {PRICING_FAQS.map((f) => (
                <div
                  key={f.question}
                  className="border-b border-suth-border-subtle pb-6 last:border-b-0"
                >
                  <dt className="text-base font-semibold text-suth-text">
                    {f.question}
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                    {f.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
