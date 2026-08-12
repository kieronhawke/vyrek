"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { planByKey } from "@/lib/onboarding/model";

/**
 * THE MOMENT AFTER THEY PAY.
 *
 * This is the only page in the product that exists purely to make somebody
 * feel good about a decision they have just made. It gets one orchestrated
 * beat — a mark that draws itself, then the words, then what happens next —
 * and then it gets out of the way.
 *
 * NOT A CONFETTI CANNON. The brand is a coach who writes training plans at
 * six in the morning, not a consumer app celebrating a streak. One tick, one
 * rise, done.
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
}: {
  name: string;
  planKey: string;
  confirmed: boolean;
  trialing: boolean;
  hadSession: boolean;
  /** The Stripe session. Creating the account is authorised by it, not by us. */
  sessionId?: string;
  /** Payment-only invite: an existing client whose training stays with Ben.
      Promising "Ben writes your first week" here would promise a feature
      that is deliberately not switched on for them yet. */
  billingOnly?: boolean;
}) {
  const plan = planByKey(planKey);
  const first = name.split(/\s+/)[0];
  const [lit, setLit] = useState(false);
  const [emailedTo, setEmailedTo] = useState<string | null>(null);

  // One frame later, so the transition has a start state to move from.
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
      .then((d: { ok?: boolean; email?: string }) => {
        if (live && d.ok && d.email) setEmailedTo(d.email);
      })
      .catch(() => {
        /* They have paid and are looking at the confirmation. A failure here
           is for the logs and for Ben, not for this screen. */
      });
    return () => {
      live = false;
    };
  }, [sessionId, confirmed]);

  return (
    <div className="ob obw" data-lit={lit || undefined}>
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
          {confirmed
            ? trialing
              ? "Your trial has started — nothing has been charged yet."
              : "Your subscription is live."
            : hadSession
              ? "Payment received. The confirmation is still coming through — nothing more for you to do."
              : "Your account is set up."}
          {/* The plan name, not the price.
            *
            * Somebody who has just paid does not need reminding what it cost
            * — they chose it two screens ago and they have a receipt coming.
            * Repeating the figure at the moment of celebration reads as a
            * charge notification rather than a welcome. */}
          {plan ? ` You're on ${plan.name}.` : ""}
        </p>

        <ol className="obw-next">
          {billingOnly ? (
            <>
              <li>
                <span className="obw-next__n num">1</span>
                <span>
                  <strong>Your payment collects automatically</strong> each
                  month from now on — nothing to remember.
                </span>
              </li>
              <li>
                <span className="obw-next__n num">2</span>
                <span>
                  <strong>Your account shows every payment</strong> — update
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
                  you sent &mdash; usually within a day.
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
        {emailedTo ? (
          <p className="obw-note" aria-live="polite">
            Check <strong>{emailedTo}</strong> — I&apos;ve sent you a link
            that signs you straight in. No password to remember.
          </p>
        ) : null}

        <div className="obw-actions">
          <Link href="/login" className="obw-go">
            {emailedTo ? "Sign in" : "Go to my account"}
          </Link>
          <Link href="/" className="obw-second">
            Back to the site
          </Link>
        </div>

        <p className="ob-note obw-receipt">
          A receipt is on its way from Stripe. Manage or cancel any time from
          your account.
        </p>
      </main>
    </div>
  );
}
