import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
  SignOff,
  trackedUrl,
} from "@/lib/email/templates/_layout";

/**
 * Nurture: the people who didn't finish, and the people who finished but
 * didn't act.
 *
 * This is the largest addressable group in the whole funnel and until the
 * mid-flow email capture landed we couldn't reach any of them. Roughly 60%
 * of quiz starters never reach the end.
 *
 * Every one of these is marketing mail, so they all carry the unsubscribe
 * footer. Tone stays useful rather than pleading: one idea per email, and
 * a real reason to come back.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 6.1.
 */

const RESUME = "/quiz";

/* ─── Abandoned quiz, 1 hour ────────────────────────────────────────── */

export const abandon1hSubject = "Your plan is saved";

export function AbandonHourEmail({ firstName }: { firstName?: string }) {
  return (
    <EmailLayout
      preview="You're about ninety seconds from the finished thing."
      marketing
      campaign="abandon-1h"
    >
      <Eyebrow>Saved</Eyebrow>
      <H1>{firstName ? `${firstName}, your ` : "Your "}answers are still
      here.</H1>

      <P>
        You got most of the way through. Everything you told us is saved, so
        picking it up again takes about ninety seconds and you won&apos;t
        repeat a single question.
      </P>

      <Btn href={trackedUrl(RESUME, "abandon-1h")}>Finish my plan →</Btn>

      <SignOff line="If something in there didn't make sense, reply and tell me which bit. I'd rather fix it than lose you." />
    </EmailLayout>
  );
}

/* ─── Abandoned quiz, day 2 ─────────────────────────────────────────── */

export const abandon2dSubject = "The two-day rule";

export function AbandonDayTwoEmail() {
  return (
    <EmailLayout
      preview="One idea that matters more than which programme you pick."
      marketing
      campaign="abandon-2d"
    >
      <Eyebrow>One idea</Eyebrow>
      <H1>Never miss twice.</H1>

      <P>
        It&apos;s the only rule I give every single person I coach. Miss one
        session and nothing has happened. Miss two in a row and you&apos;ve
        started building the other habit.
      </P>

      <P>
        It works because it removes the all-or-nothing thinking that ends
        most attempts. You&apos;re not aiming for perfect. You&apos;re
        aiming for never twice.
      </P>

      <Btn href={trackedUrl(RESUME, "abandon-2d")}>
        Pick up where you left off →
      </Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Abandoned quiz, day 5, last touch ─────────────────────────────── */

export const abandon5dSubject = "Want me to leave you be?";

export function AbandonDayFiveEmail() {
  return (
    <EmailLayout
      preview="Last one from me about this."
      marketing
      campaign="abandon-5d"
    >
      <Eyebrow>Last one</Eyebrow>
      <H1>I&apos;ll stop after this.</H1>

      <P>
        Your answers stay saved either way, so there&apos;s no deadline and
        nothing expires. If the timing isn&apos;t right, that&apos;s a
        perfectly good answer and I&apos;ll leave you to it.
      </P>

      <P>
        If it is right, the plan takes about ninety seconds to finish.
      </P>

      <Btn href={trackedUrl(RESUME, "abandon-5d")}>Finish it →</Btn>

      <SignOff line="After this you'll only hear from me in the weekly email, and you can drop that in one click." />
    </EmailLayout>
  );
}

/* ─── Finished, plan delivered ──────────────────────────────────────── */

export const planDeliveredSubject = "Your 12 weeks, start to finish";

export function PlanDeliveredEmail({
  firstName,
  programme,
  startDate,
  daysPerWeek,
  sessionLength,
}: {
  firstName: string;
  programme: string;
  startDate: string;
  daysPerWeek: string;
  sessionLength: string;
}) {
  return (
    <EmailLayout
      preview={`${programme}, starting ${startDate}.`}
      marketing
      campaign="plan-delivered"
    >
      <Eyebrow>Your plan</Eyebrow>
      <H1>Here it is, {firstName}.</H1>

      <Panel title="Built from your answers">
        <Row label="Programme" value={programme} />
        <Row label="Starts" value={startDate} />
        <Row label="Sessions" value={daysPerWeek} />
        <Row label="Each one" value={sessionLength} />
      </Panel>

      <P>
        Nothing in there is guesswork. Every line came from something you
        told us, which is why it will actually fit around your week rather
        than fighting it.
      </P>

      <Btn href={trackedUrl("/plan", "plan-delivered")}>Open my plan →</Btn>

      <SignOff line="Read it, and reply if anything looks wrong for you. I do read them." />
    </EmailLayout>
  );
}

/* ─── Finished, no action, day 2 ────────────────────────────────────── */

export const nudgeDay2Subject = "The bit most people get wrong in week one";

export function NudgeDayTwoEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="Start lighter than you think you should."
      marketing
      campaign="nudge-d2"
    >
      <Eyebrow>Week one</Eyebrow>
      <H1>Go easier than you want to.</H1>

      <P>
        {firstName}, the most common way a good plan dies is week one being
        heroic. You finish it wrecked, week two hurts, week three
        doesn&apos;t happen.
      </P>

      <P>
        Week one should feel almost too easy. That&apos;s deliberate.
        It&apos;s the week that buys you the other eleven.
      </P>

      <Btn href={trackedUrl("/plan", "nudge-d2")}>See week one →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Finished, no action, day 5, consultation offer ────────────────── */

export const nudgeDay5Subject = "Want me to look at yours?";

export function NudgeDayFiveEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="Fifteen minutes, no pitch."
      marketing
      campaign="nudge-d5"
    >
      <Eyebrow>An offer</Eyebrow>
      <H1>Fifteen minutes on your plan, {firstName}?</H1>

      <P>
        The plan you got is genuinely good, but it was built by a
        calculation from your answers. A conversation catches the things a
        form never will: the old injury you didn&apos;t think to mention,
        the week that&apos;s always chaos, the goal behind the goal.
      </P>

      <P>
        No pitch. If coaching isn&apos;t right for you I&apos;ll say so.
      </P>

      <Btn href={trackedUrl("/free-consultation", "nudge-d5")}>
        Book a free call →
      </Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Finished, no action, day 10, final ────────────────────────────── */

export const nudgeDay10Subject = "Two ways in, then I'll stop";

export function NudgeDayTenEmail() {
  return (
    <EmailLayout
      preview="Whichever suits, or neither."
      marketing
      campaign="nudge-d10"
    >
      <Eyebrow>Where to from here</Eyebrow>
      <H1>Two ways in.</H1>

      <Panel title="On your own">
        <Row label="Suth Club" value="7 days free, no card, cancel any time" />
      </Panel>

      <Panel title="With me">
        <Row label="Coaching" value="Starts with a free fifteen-minute call" />
      </Panel>

      <P>
        Or neither, and keep the plan you&apos;ve got. It&apos;s yours
        either way and I&apos;m not going to keep asking.
      </P>

      <Btn href={trackedUrl("/club", "nudge-d10")}>Start 7 days free →</Btn>

      <SignOff />
    </EmailLayout>
  );
}
