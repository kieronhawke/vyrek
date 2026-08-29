import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SplitHeading } from "@/components/shared/split-heading";
import { LoopingVideo } from "@/components/shared/looping-video";
import { CLUB } from "@/lib/pricing";
import { BEN } from "@/lib/ben";
import { ogImages } from "@/lib/seo/og";

/**
 * Suth Club: the self-serve tier, and the destination for everyone the
 * quiz sifts away from coaching.
 *
 * Until this page existed the club branch of the funnel linked to a 404,
 * so a third of every quiz finisher hit a dead end at the exact moment
 * they'd decided to buy.
 *
 * IMPORTANT, on honesty: every inclusion listed here is something the
 * member area actually does today. The wider club offer in
 * docs/onboarding-funnel-proposal.md §3.1 also promises Ben's video
 * courses, a monthly members' Q&A and a form-check reel. Those need Ben's
 * filming time and do not exist yet, so they are deliberately absent
 * rather than sold in advance. Add them here as they ship.
 */

export const metadata: Metadata = {
  /* The root layout appends " \u00b7 Suth Performance" to every child title.
     Naming the brand here printed it twice. */
  title: "Suth Club: elite structure, no elite price",
  description:
    "A personalised 12-week programme that rebuilds around what you actually train. Seven days free, no card needed, cancel any time.",
  alternates: { canonical: "/club" },
  openGraph: {
    // Without this the page inherits no card: a child `openGraph`
    // replaces the root layout's entirely rather than merging with it.
    images: ogImages(),
    title: "Suth Club · Suth Performance",
    description:
      "A personalised 12-week programme that rebuilds around what you actually train. Seven days free, no card needed.",
    url: "/club",
    type: "website",
  },
};

/** Only what the member area does today. Nothing aspirational. */
const INCLUDED = [
  {
    tag: "01",
    title: "A programme built around you",
    body: "Twelve weeks, dated, built from your answers: your days, your session length, your kit, and anything you need to train around.",
  },
  {
    tag: "02",
    title: "Today's session, ready when you open it",
    body: "No deciding at the gym door. Open the app, do the session that's waiting, tick it off.",
  },
  {
    tag: "03",
    title: "It rebuilds around what you actually did",
    body: "Log your sessions and the plan adjusts. Miss a week and it absorbs it instead of leaving you behind.",
  },
  {
    tag: "04",
    title: "See the work adding up",
    body: "Volume over time, session history, and a race countdown if you've got a date in the diary.",
  },
  {
    tag: "05",
    title: "The station guides and race tools",
    body: "All eight stations broken down, plus the pacing calculator, so you know what the numbers should look like.",
  },
  {
    tag: "06",
    title: "Cancel any time, from inside your account",
    body: "No phone call, no retention script, no notice period. If it isn't for you, leave.",
  },
];

const FOR_YOU = [
  "You want structure, not conversations",
  "You'll do the work if someone tells you what the work is",
  "You'd rather get on with it than book a call",
  "You want to try it before you spend anything",
];

const NOT_FOR_YOU = [
  "You want Ben watching your training week to week",
  "You want someone to notice when you go quiet",
  "You've got an injury that needs a human eye on it",
  "You're chasing a specific time and want it planned personally",
];

export default function ClubPage() {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <header className="mx-auto max-w-3xl text-center">
            <Eyebrow>{CLUB.name}</Eyebrow>
            <SplitHeading
              as="h1"
              className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.05em] text-suth-text md:text-[52px]"
            >
              Elite structure, without the elite price tag.
            </SplitHeading>
            <p className="mt-5 text-base text-suth-text-secondary md:text-lg">
              The same programming Ben uses to prepare for Elite 15 racing,
              scaled to wherever you are today. You get the plan and the
              tools. You run it yourself, at your own pace.
            </p>

            {/* Club hasn't opened yet, so the door is a waiting list, not
                a trial. The price stays visible: people join lists for
                things they can afford. */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/club/waitlist"
                className="inline-flex h-14 w-full max-w-xs items-center justify-center rounded-pill bg-suth-accent px-8 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover active:scale-[0.99]"
              >
                Join the waiting list →
              </Link>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
                Coming soon. {CLUB.monthlyDisplay}/mo when it opens.
              </p>
              <p className="text-sm text-suth-text-tertiary">
                Or {CLUB.annualDisplay} a year. {CLUB.anchorCopy}.
              </p>
            </div>
          </header>

          <div className="mx-auto mt-16 max-w-5xl overflow-hidden rounded-lg border border-suth-border-subtle">
            <LoopingVideo
              src="/media/videos/gym-row-loop.mp4"
              poster="/media/images/camp/camp-row-erg-front-wide.jpg"
              grayscale={false}
              className="aspect-[16/9] w-full"
            />
          </div>

          <section className="mx-auto mt-20 max-w-5xl">
            <h2 className="text-center text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl">
              What you get
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-5">
              {INCLUDED.map((item) => (
                <article
                  key={item.tag}
                  className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-7"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                    [ {item.tag} ]
                  </p>
                  <h3 className="mt-3 text-lg font-bold text-suth-text">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-suth-text-secondary">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* The honest filter. Telling people what this isn't converts the
              right ones harder and saves Ben calls with the wrong ones. */}
          <section className="mx-auto mt-20 max-w-4xl">
            <h2 className="text-center text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl">
              Is it the right thing for you?
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              <div className="rounded-lg border border-suth-accent/40 bg-suth-accent/[0.05] p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
                  The club is for you if
                </p>
                <ul role="list" className="mt-4 space-y-3">
                  {FOR_YOU.map((line) => (
                    <li
                      key={line}
                      className="text-sm leading-relaxed text-suth-text"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-suth-border-subtle bg-suth-elevated p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-text-tertiary">
                  Talk to Ben instead if
                </p>
                <ul role="list" className="mt-4 space-y-3">
                  {NOT_FOR_YOU.map((line) => (
                    <li
                      key={line}
                      className="text-sm leading-relaxed text-suth-text-secondary"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/free-consultation"
                  className="mt-5 inline-block text-sm font-medium text-suth-accent underline decoration-suth-accent/40 underline-offset-4 hover:decoration-suth-accent"
                >
                  Free assessment with Ben →
                </Link>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-20 max-w-3xl rounded-lg border border-suth-border-subtle bg-suth-elevated p-8 md:p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
              Who writes it
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl">
              {BEN.name}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-suth-text-secondary">
              {BEN.intro}
            </p>
            <ul role="list" className="mt-6 flex flex-wrap gap-2">
              {BEN.racing.slice(0, 4).map((item) => (
                <li
                  key={item}
                  className="rounded-pill border border-suth-border bg-suth-base px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-suth-text"
                >
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="mx-auto mt-20 max-w-2xl text-center">
            <h2 className="text-2xl font-black tracking-[-0.03em] text-suth-text md:text-3xl">
              Opening soon. Get in first.
            </h2>
            <p className="mt-4 text-base text-suth-text-secondary">
              Leave your details and you&apos;ll hear the moment the doors
              open. No card, no commitment, and nobody will ring you.
            </p>
            <Link
              href="/club/waitlist"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-pill bg-suth-accent px-8 text-base font-semibold text-[#0A0A0A] transition-colors hover:bg-suth-accent-hover active:scale-[0.99]"
            >
              Join the waiting list →
            </Link>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-suth-text-tertiary">
              First to know, first in.
            </p>
          </section>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
