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
 * Engagement: the emails that go to people who are already training.
 *
 * These are the ones that decide whether someone is still here in month
 * three, and they are the cheapest retention there is. All marketing-class,
 * so all carry the unsubscribe footer.
 *
 * The weekly email is deliberately a frame rather than a fixed template:
 * it is Ben's voice, written weekly, and a rigid layout would make it feel
 * automated, which is exactly what it must not feel like.
 */

/* ─── Sunday plan rebuild ───────────────────────────────────────────── */

export const planRebuiltSubject = "Next week is ready";

export function PlanRebuiltEmail({
  firstName,
  weekNumber,
  sessionsLogged,
  sessionsPlanned,
  changeNote,
}: {
  firstName: string;
  weekNumber: number;
  sessionsLogged: number;
  sessionsPlanned: number;
  /** What actually changed, so the email proves the plan is alive. */
  changeNote: string;
}) {
  return (
    <EmailLayout
      preview={`Week ${weekNumber}, rebuilt around what you actually did.`}
      marketing
      campaign="plan-rebuilt"
    >
      <Eyebrow>Week {weekNumber}</Eyebrow>
      <H1>Next week is ready, {firstName}.</H1>

      <Panel title="Last week">
        <Row
          label="Sessions"
          value={`${sessionsLogged} of ${sessionsPlanned} logged`}
        />
        <Row label="What changed" value={changeNote} />
      </Panel>

      <P>
        This is the bit that makes it a plan rather than a PDF. It moved
        because of what you did, not because a calendar said so.
      </P>

      <Btn href={trackedUrl("/plan", "plan-rebuilt")}>
        Open week {weekNumber} →
      </Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Missed a week ─────────────────────────────────────────────────── */

export const missedWeekSubject = "Nothing logged last week";

export function MissedWeekEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="Not a telling off. The plan has already adjusted."
      marketing
      campaign="missed-week"
    >
      <Eyebrow>Last week</Eyebrow>
      <H1>Quiet week, {firstName}?</H1>

      <P>
        Nothing logged. That&apos;s not a telling off, and you haven&apos;t
        undone anything. One week off is a week off, not a failure.
      </P>

      <P>
        Your plan has already backed off the loading so this week starts
        where you actually are rather than where you would have been. Just
        pick up the next session.
      </P>

      <Btn href={trackedUrl("/plan", "missed-week")}>
        See this week &rarr;
      </Btn>

      <SignOff line="And if something's changed, tell me and I'll rebuild it properly." />
    </EmailLayout>
  );
}

/* ─── Milestone ─────────────────────────────────────────────────────── */

export const milestoneSubject = (n: number) => `${n} sessions in`;

export function MilestoneEmail({
  firstName,
  sessions,
}: {
  firstName: string;
  sessions: number;
}) {
  return (
    <EmailLayout
      preview={`${sessions} logged sessions. That's the hard part.`}
      marketing
      campaign="milestone"
    >
      <Eyebrow>Milestone</Eyebrow>
      <H1>
        {sessions} sessions, {firstName}.
      </H1>

      <P>
        Worth stopping on for a second. Most people who start something
        never get near this, and the ones who do almost always got there
        the boring way: turning up on the days they didn&apos;t fancy it.
      </P>

      <Btn href={trackedUrl("/plan", "milestone")}>See your progress →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Race week ─────────────────────────────────────────────────────── */

export const raceWeekSubject = "Race week";

export function RaceWeekEmail({
  firstName,
  raceName,
  raceDate,
}: {
  firstName: string;
  raceName: string;
  raceDate: string;
}) {
  return (
    <EmailLayout
      preview="The work is done. This week is about arriving fresh."
      marketing
      campaign="race-week"
    >
      <Eyebrow>Race week</Eyebrow>
      <H1>It&apos;s this week, {firstName}.</H1>

      <Panel>
        <Row label="Race" value={raceName} />
        <Row label="Date" value={raceDate} />
      </Panel>

      <P>
        The training is done. Nothing you do this week will make you fitter,
        and plenty could make you tired, so the job now is arriving fresh.
      </P>

      <P>
        Keep moving, keep it short and sharp, eat normally, sleep more than
        you think you need. Resist the urge to test yourself.
      </P>

      <Btn href={trackedUrl("/plan", "race-week")}>
        Your race-week plan →
      </Btn>

      <SignOff line="Good luck. Tell me how it goes, I do want to know." />
    </EmailLayout>
  );
}

/* ─── Weekly email from Ben ─────────────────────────────────────────── */

export const weeklySubject = (headline: string) => headline;

export function WeeklyEmail({
  headline,
  idea,
  session,
  nudge,
}: {
  headline: string;
  idea: string;
  session: string;
  nudge: string;
}) {
  return (
    <EmailLayout preview={idea.slice(0, 90)} marketing campaign="weekly">
      <Eyebrow>The weekly</Eyebrow>
      <H1>{headline}</H1>

      <P dim={false}>{idea}</P>

      <Panel title="Try this week">
        <Row label="Session" value={session} />
      </Panel>

      <P>{nudge}</P>

      <Btn href={trackedUrl("/blog", "weekly")}>Read more like this →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Referral ──────────────────────────────────────────────────────── */

export const referralSubject = "Give a month, get a month";

export function ReferralEmail({
  firstName,
  code,
}: {
  firstName: string;
  code: string;
}) {
  return (
    <EmailLayout
      preview="A month free for them, a month free for you."
      marketing
      campaign="referral"
    >
      <Eyebrow>Referral</Eyebrow>
      <H1>Know someone who&apos;d get on with this?</H1>

      <P>
        {firstName}, if you send someone your code they get their first
        month free, and so do you when they stay past it. No cap, and no
        pestering them if they don&apos;t.
      </P>

      <Panel title="Your code">
        <Row label="Code" value={code} />
      </Panel>

      <Btn href={trackedUrl("/account", "referral")}>Share my code →</Btn>

      <SignOff />
    </EmailLayout>
  );
}
