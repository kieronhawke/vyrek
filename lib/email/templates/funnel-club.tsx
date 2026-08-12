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
 * Suth Club lifecycle: trial, conversion, retention, win-back.
 *
 * The trial is 7 days with no card, so the card ask has to be earned rather
 * than assumed. That means the first five emails do a job for the member
 * before day 5 asks for anything.
 *
 * The day-30 call offer is the single most valuable email here: the club is
 * the biggest warm-lead pool the business will ever have, and it is the one
 * moment we ask a self-serve member whether they'd rather be coached.
 *
 * Spec: docs/onboarding-funnel-proposal.md sections 3.1 and 6.1.
 */

/* ─── Day 0, trial started ──────────────────────────────────────────── */

export const clubWelcomeSubject = "You're in. Here's where to start";

export function ClubWelcomeEmail({
  firstName,
  programme,
  startDate,
}: {
  firstName: string;
  programme: string;
  startDate: string;
}) {
  return (
    <EmailLayout
      preview="Seven days, no card, cancel any time."
      campaign="club-welcome"
    >
      <Eyebrow>Welcome to Suth Club</Eyebrow>
      <H1>You&apos;re in, {firstName}.</H1>

      <P>
        Seven days free from today. No card, nothing to cancel if you decide
        it isn&apos;t for you, and nobody is going to ring you.
      </P>

      <Panel title="Your plan">
        <Row label="Programme" value={programme} />
        <Row label="First session" value={startDate} />
        <Row label="Rebuilds" value="Every Sunday, from what you logged" />
      </Panel>

      <P>
        Do one thing today: open your first session and read it. Not train
        it, just read it. People who look at week one on day one are the
        ones still here in week six.
      </P>

      <Btn href={trackedUrl("/plan", "club-welcome")}>Open week one →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Day 3, activation ─────────────────────────────────────────────── */

export const clubDay3Subject = "How's it going so far?";

export function ClubDayThreeEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="One habit that decides whether this works."
      campaign="club-d3"
    >
      <Eyebrow>Day three</Eyebrow>
      <H1>Log the session, {firstName}.</H1>

      <P>
        Even a bad one. Especially a bad one. The plan rebuilds every Sunday
        from what you actually did, so an empty log means next week is a
        guess and a half-finished session logged honestly means next week
        fits.
      </P>

      <P>
        It takes about ten seconds and it&apos;s the difference between a
        plan and a PDF.
      </P>

      <Btn href={trackedUrl("/plan", "club-d3")}>Log a session →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Day 5, the card ask ───────────────────────────────────────────── */

export const clubDay5Subject = "Your plan carries on from Tuesday";

export function ClubTrialEndingEmail({
  firstName,
  monthlyDisplay,
  annualDisplay,
  endsOn,
}: {
  firstName: string;
  monthlyDisplay: string;
  annualDisplay: string;
  endsOn: string;
}) {
  return (
    <EmailLayout
      preview={`Your free week ends ${endsOn}.`}
      campaign="club-d5"
    >
      <Eyebrow>Your free week</Eyebrow>
      <H1>Keep going, {firstName}?</H1>

      <P>
        Your free week ends {endsOn}. Add a card and nothing changes: the
        same plan carries on, rebuilding every Sunday. Don&apos;t, and it
        simply stops. No charge either way and no chasing.
      </P>

      <Panel title="What it costs">
        <Row label="Monthly" value={`${monthlyDisplay} a month`} />
        <Row label="Or yearly" value={`${annualDisplay} a year`} />
        <Row label="Cancel" value="From inside your account, any time" />
      </Panel>

      <Btn href={trackedUrl("/app/account", "club-d5")}>Keep my plan →</Btn>

      <SignOff line="If it hasn't been useful, reply and tell me why. That's worth more to me than the subscription." />
    </EmailLayout>
  );
}

/* ─── Trial ended, not converted ────────────────────────────────────── */

export const clubLapsedSubject = "Your week's up";

export function ClubLapsedEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="No charge, and your plan is still saved."
      marketing
      campaign="club-lapsed"
    >
      <Eyebrow>That&apos;s the week</Eyebrow>
      <H1>No charge, {firstName}.</H1>

      <P>
        Your free week has finished and you weren&apos;t charged a penny.
        Your plan and your history stay saved, so if you come back in a
        month you pick up where you stopped rather than starting again.
      </P>

      <Btn href={trackedUrl("/club", "club-lapsed")}>Pick it back up →</Btn>

      <SignOff line="And if it wasn't right, one line back telling me why would genuinely help." />
    </EmailLayout>
  );
}

/* ─── Day 30, the upgrade moment ────────────────────────────────────── */

export const clubUpgradeSubject = "A month in. Want me to look at it?";

export function ClubUpgradeOfferEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="One offer, once. Then I'll leave you to it."
      marketing
      campaign="club-upgrade"
    >
      <Eyebrow>One month in</Eyebrow>
      <H1>Nice work, {firstName}.</H1>

      <P>
        A month of logged sessions puts you ahead of most people who start
        something in January. You&apos;ve done that on your own, which is
        the harder way.
      </P>

      <P>
        If you ever want a person rather than a programme, that&apos;s what
        coaching is: I write it, I adjust it weekly, and I notice when you
        go quiet. Fifteen minutes to talk about whether it&apos;s worth it
        for you.
      </P>

      <P>
        This is the only time I&apos;ll ask. Ignore it and the club carries
        on exactly as it is.
      </P>

      <Btn href={trackedUrl("/free-consultation", "club-upgrade")}>
        Book a free call →
      </Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── Win-back, 90 days after cancelling ────────────────────────────── */

export const clubWinbackSubject = "Still here if you want it";

export function ClubWinbackEmail({ firstName }: { firstName: string }) {
  return (
    <EmailLayout
      preview="No offer, no discount, just a door left open."
      marketing
      campaign="club-winback"
    >
      <Eyebrow>A while back</Eyebrow>
      <H1>Door&apos;s open, {firstName}.</H1>

      <P>
        You trained with us a few months ago and stopped. That&apos;s
        normal, and it isn&apos;t a character flaw. Most people stop at
        least once.
      </P>

      <P>
        No discount and no countdown. Your history is still on your account,
        so starting again means starting from where you got to rather than
        from zero.
      </P>

      <Btn href={trackedUrl("/club", "club-winback")}>Start again →</Btn>

      <SignOff />
    </EmailLayout>
  );
}
