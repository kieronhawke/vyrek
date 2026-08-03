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
}: {
  name: string;
  planKey: string;
  confirmed: boolean;
  trialing: boolean;
  hadSession: boolean;
}) {
  const plan = planByKey(planKey);
  const first = name.split(/\s+/)[0];
  const [lit, setLit] = useState(false);

  // One frame later, so the transition has a start state to move from.
  useEffect(() => {
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, []);

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
          {plan ? ` ${plan.name}, ${plan.display} ${plan.cadence}.` : ""}
        </p>

        <ol className="obw-next">
          <li>
            <span className="obw-next__n num">1</span>
            <span>
              <strong>Ben writes your first week.</strong>{" "}He has everything you
              sent &mdash; usually within a day.
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
        </ol>

        <div className="obw-actions">
          <Link href="/app" className="obw-go">
            Go to my account
          </Link>
          <Link href="/app/plan" className="obw-second">
            See what&apos;s there
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
