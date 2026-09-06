"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Confetti } from "@/components/onboarding/confetti";
import { planByKey } from "@/lib/onboarding/model";
import { parseStartDate } from "@/lib/onboarding/start-date";
import { paymentSchedule, scheduleAfterLines } from "@/lib/onboarding/schedule";

/** How long they get to read the page before it moves. */
const REDIRECT_SECONDS = 15;

/**
 * THE MOMENT AFTER THEY PAY.
 *
 * This is the only page in the product that exists purely to make somebody
 * feel good about a decision they have just made. It gets one orchestrated
 * beat — a mark that draws itself, then the words, then what happens next —
 * and then it gets out of the way.
 *
 * IT DOES GET CONFETTI, AS OF 6 SEPTEMBER 2026, ON KIERON'S INSTRUCTION.
 * This paragraph used to say the opposite — "not a confetti cannon, the brand
 * is a coach who writes training plans at six in the morning" — and that
 * reasoning is why the burst is two seconds of brand colours from the bottom
 * corners rather than a shower of primary colours from the top. The tick
 * still draws itself first; the confetti is the punctuation, not the
 * sentence. See components/onboarding/confetti.tsx.
 *
 * IT NEVER CLAIMS MORE THAN IT KNOWS. When Stripe could not be reached the
 * heading is the same but the line underneath says the confirmation is still
 * coming. Telling somebody their subscription is live when it might not be is
 * the worst thing this page could do.
 *
 * The whole sequence is off under prefers-reduced-motion — everything is in
 * its final position from the first frame.
 */
export function OnboardingWelcome({
  name,
  planKey,
  confirmed,
  trialing,
  hadSession,
  sessionId,
  billingOnly = false,
  amountPence = null,
  dueTodayPence = null,
  startsOn = null,
  signedIn = false,
}: {
  name: string;
  planKey: string;
  confirmed: boolean;
  trialing: boolean;
  hadSession: boolean;
  /** The agreed monthly rate in pence, when there is one. */
  amountPence?: number | null;
  /** A balance taken at checkout, in pence, when there was one. */
  dueTodayPence?: number | null;
  /** "2026-09-01" when the first monthly payment is deferred, else null. */
  startsOn?: string | null;
  /**
   * Whether this browser can actually reach the account. The flow signs them
   * in at the password screen, so it is usually true; when it is not, the
   * page offers a way in rather than marching them at a login form.
   */
  signedIn?: boolean;
  /** The Stripe session. Creating the account is authorised by it, not by us. */
  sessionId?: string;
  /** Payment-only invite: an existing client whose training stays with Ben.
      Promising "Ben writes your first week" here would promise a feature
      that is deliberately not switched on for them yet. */
  billingOnly?: boolean;
}) {
  const plan = planByKey(planKey);
  const first = name.split(/\s+/)[0];
  const startDay = startsOn ? parseStartDate(startsOn) : null;
  /* What happened and what happens next, in the past and future tense, from
     the figures the checkout stamped on the session. A date the link was
     built with can have passed while it sat in somebody's messages, in which
     case checkout collected today — the schedule says so rather than
     promising a date that has gone. Null for a published tier, which has no
     agreed figures. */
  const after =
    typeof amountPence === "number" && amountPence > 0
      ? scheduleAfterLines(
          paymentSchedule({ amountPence, dueTodayPence, startDay }),
        )
      : null;
  const router = useRouter();
  const [emailedTo, setEmailedTo] = useState<string | null>(null);
  /* Null until activation answers. The two outcomes need different sentences
     and guessing at one of them is how somebody ends up hunting for an email
     that was never sent. */
  const [signInBy, setSignInBy] = useState<"email" | "password" | null>(null);

  /* CREATE THE ACCOUNT THEY HAVE JUST BEEN TOLD THEY HAVE.
     This page has said "your account is set up" since it was written, and
     nothing created one — the journey stopped at Stripe. The endpoint is
     idempotent and authorised by the Stripe session, so a refresh, a shared
     link or a double mount all produce the same account and the same email
     rather than duplicates. */
  useEffect(() => {
    if (!sessionId || !confirmed) return;
    let live = true;
    fetch("/api/onboarding/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((d: { ok?: boolean; email?: string; emailed?: boolean }) => {
        if (!live || !d.ok || !d.email) return;
        setEmailedTo(d.email);
        setSignInBy(d.emailed ? "email" : "password");
      })
      .catch(() => {
        /* They have paid and are looking at the confirmation. A failure here
           is for the logs and for Ben, not for this screen. */
      });
    return () => {
      live = false;
    };
  }, [sessionId, confirmed]);

  /*
   * TAKING THEM TO THEIR ACCOUNT, WITHOUT TAKING THE DECISION AWAY.
   *
   * Fifteen seconds: long enough to read what was charged and when the next
   * payment lands, short enough that nobody is left wondering whether the
   * page is finished with them. The countdown is on screen the whole time and
   * there is a control to stop it, because a page that moves under somebody
   * who is still reading is worse than one that never moves at all — and
   * every reason to stay is a real one: reading it twice, taking a
   * screenshot, showing it to someone.
   *
   * It only ever runs when they are signed in AND the payment is confirmed.
   * Counting somebody down to a login screen would be a strange reward for
   * having just paid.
   */
  const canLand = signedIn && confirmed;
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [holding, setHolding] = useState(false);

  const goToAccount = useCallback(() => {
    router.push("/app/account");
  }, [router]);

  useEffect(() => {
    if (!canLand || holding) return;
    if (secondsLeft <= 0) {
      goToAccount();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [canLand, holding, secondsLeft, goToAccount]);

  // The entrance animation lives entirely in CSS now. Gating it on a
  // script-set attribute once left the page blank on the live site, and
  // this is the one screen that must never be blank.
  return (
    <div className="ob obw">
      {/* Only when it is actually true. A burst over "the confirmation is
          still coming through" would be celebrating something we cannot
          see. */}
      {confirmed ? <Confetti /> : null}
      <main className="obw-main">
        <div className="obw-mark" aria-hidden>
          <svg viewBox="0 0 64 64" width="76" height="76">
            <circle className="obw-ring" cx="32" cy="32" r="29" />
            <path className="obw-tick" d="M19 33.5 28 42.5 45.5 24" />
          </svg>
        </div>

        <h1 className="obw-title">
          {first ? `You're in, ${first}.` : "You're in."}
        </h1>

        <p className="obw-lead">
          {/* ⚠️ THIS LINE MUST NOT SAY MONEY MOVED WHEN IT DID NOT.
              With a deferred start date the session total is £0 and nothing has
              been charged — "your subscription is live" would be the first
              thing a client checked against their bank and found missing. */}
          {confirmed
            ? after
              ? `${after.today} ${after.monthly}`
              : trialing
                ? "Your trial has started. Nothing has been charged yet."
                : "Your subscription is live."
            : hadSession
              ? "Payment received. The confirmation is still coming through. Nothing more for you to do."
              : "Your account is set up."}
          {/* The plan name, not the price — for a published tier.
            *
            * Somebody who has just paid does not need reminding what it cost
            * — they chose it two screens ago and they have a receipt coming.
            * An AGREED rate has no plan name to print, and inventing one is
            * what this whole flow exists to stop. */}
          {plan && !billingOnly ? ` You're on ${plan.name}.` : ""}
        </p>

        <ol className="obw-next">
          {billingOnly ? (
            <>
              <li>
                <span className="obw-next__n num">1</span>
                <span>
                  {after ? (
                    <>
                      <strong>{after.monthly}</strong> Nothing to remember.
                    </>
                  ) : (
                    <>
                      <strong>Your payment collects automatically</strong> each
                      month from now on. Nothing to remember.
                    </>
                  )}
                </span>
              </li>
              <li>
                <span className="obw-next__n num">2</span>
                <span>
                  <strong>Your account shows every payment.</strong> Update
                  your card or make changes any time.
                </span>
              </li>
              <li>
                <span className="obw-next__n num">3</span>
                <span>
                  <strong>Training carries on with Ben</strong> exactly as it
                  does now.
                </span>
              </li>
            </>
          ) : (
            <>
              <li>
                <span className="obw-next__n num">1</span>
                <span>
                  <strong>Ben writes your first week.</strong>{" "}He has everything
                  you sent, usually within a day.
                </span>
              </li>
              <li>
                <span className="obw-next__n num">2</span>
                <span>
                  <strong>It lands in your account</strong> and you get a text.
                </span>
              </li>
              <li>
                <span className="obw-next__n num">3</span>
                <span>
                  <strong>Tick sessions off as you go.</strong> That is what he
                  reads before writing the next one.
                </span>
              </li>
            </>
          )}
        </ol>

        {/* "Go to my account" sent them to /app, where the gate bounced them
            to a login they had no password for — the flow deliberately never
            asks for one. The way in is the link in the email, so that is
            what this says. */}
        {/* Two outcomes, two sentences.
            A sign-in email only goes out when activation created the account,
            and it usually does not: the flow sets the password before the card,
            so by the time this runs the account already exists. Telling
            everybody to "check your email" sent most clients looking for a
            message that was never sent — which is a bad first minute for
            somebody who has just handed over a card. */}
        {emailedTo && signInBy === "email" ? (
          <p className="obw-note" aria-live="polite">
            Check <strong>{emailedTo}</strong>. There&apos;s a link in there
            that signs you straight in.
          </p>
        ) : emailedTo ? (
          <p className="obw-note" aria-live="polite">
            {/* "the password you just chose" is not safe to say here. If the
                account already existed, the endpoint left the original
                password alone rather than letting a link overwrite it — so
                the one they typed a minute ago may not be the one that works.
                "your password" is true either way. */}
            Sign in with <strong>{emailedTo}</strong> and your password.
          </p>
        ) : null}

        <div className="obw-actions">
          {canLand ? (
            <>
              <button type="button" className="obw-go" onClick={goToAccount}>
                Go to my account
              </button>
              {holding ? (
                <Link href="/" className="obw-second">
                  Back to the site
                </Link>
              ) : (
                <button
                  type="button"
                  className="obw-second"
                  onClick={() => setHolding(true)}
                >
                  Stay on this page
                </button>
              )}
            </>
          ) : (
            <>
              <Link href="/login" className="obw-go">
                Sign in to my account
              </Link>
              <Link href="/" className="obw-second">
                Back to the site
              </Link>
            </>
          )}
        </div>

        {/* Said in words, and announced once rather than on every tick: a live
            region that fires every second is a screen reader counting out
            loud over the top of everything else on the page. */}
        {canLand ? (
          <p className="obw-countdown" role="status" aria-live="polite">
            {holding ? (
              <>Take your time. Your account is there whenever you want it.</>
            ) : (
              <>
                <span aria-hidden>
                  Taking you to your account in{" "}
                  <strong className="num">{secondsLeft}</strong>
                  {secondsLeft === 1 ? " second" : " seconds"}.
                </span>
                <span className="obw-sr">
                  Taking you to your account shortly. Choose Stay on this page
                  to remain here.
                </span>
              </>
            )}
          </p>
        ) : null}

        <p className="ob-note obw-receipt">
          A receipt is on its way from Stripe. Manage or cancel any time from
          your account.
        </p>
      </main>
    </div>
  );
}
