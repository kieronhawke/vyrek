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
 * The coached lifecycle: everything between "they left their number" and
 * "they're a client".
 *
 * Every one of these is from Ben, not from a brand, because the thing being
 * sold is Ben. Subject lines are lower case and specific, the way a person
 * writes, rather than title-case marketing.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 6.1.
 */

/* ─── 1. Lead confirmation ──────────────────────────────────────────── */

export const leadConfirmationSubject = "Your plan is with Ben";

export function LeadConfirmationEmail({
  firstName,
  programme,
  hasPhone,
}: {
  firstName: string;
  programme: string;
  hasPhone: boolean;
}) {
  return (
    <EmailLayout
      preview="Ben reads every plan personally before he gets in touch."
      campaign="lead-confirmation"
    >
      <Eyebrow>Your next step</Eyebrow>
      <H1>Thanks {firstName}. I&apos;ve got your plan.</H1>

      <P>
        I read every set of answers myself before I get in touch, so when we
        speak I already know where you are and what you&apos;re working
        towards. No repeating yourself.
      </P>

      <Panel title="What I've got">
        <Row label="Your plan" value={programme} />
        <Row
          label="Next"
          value={
            hasPhone
              ? "I'll give you a ring"
              : "I'll email you back shortly"
          }
        />
        <Row label="Length" value="Fifteen minutes, video or phone" />
      </Panel>

      <P>
        It&apos;s a conversation, not a pitch. If coaching isn&apos;t the
        right thing for you I&apos;ll say so and point you at what is.
      </P>

      <Btn href={trackedUrl("/plan", "lead-confirmation")}>
        See your plan again →
      </Btn>

      <SignOff line="Anything you want me to look at before we speak, just reply to this." />
    </EmailLayout>
  );
}

/* ─── 2. Call booked ────────────────────────────────────────────────── */

export const callBookedSubject = (when: string) => `We're on for ${when}`;

export function CallBookedEmail({
  firstName,
  when,
  joinUrl,
}: {
  firstName: string;
  when: string;
  joinUrl?: string;
}) {
  return (
    <EmailLayout
      preview={`Your call with Ben is booked for ${when}.`}
      campaign="call-booked"
    >
      <Eyebrow>Confirmed</Eyebrow>
      <H1>You&apos;re booked in, {firstName}.</H1>

      <Panel title="Your call">
        <Row label="When" value={when} />
        <Row label="How long" value="About fifteen minutes" />
        <Row label="Where" value={joinUrl ? "Video, link below" : "I'll ring you"} />
      </Panel>

      <P>
        Come as you are. There&apos;s nothing to prepare and nothing to read
        first. If something comes up and you need to move it, just reply and
        we&apos;ll find another slot.
      </P>

      {joinUrl ? <Btn href={joinUrl}>Join the call →</Btn> : null}

      <SignOff />
    </EmailLayout>
  );
}

/* ─── 3. Reminders ──────────────────────────────────────────────────── */

export const callReminderSubject = (when: string) => `Tomorrow: our call at ${when}`;

export function CallReminderEmail({
  firstName,
  when,
  joinUrl,
  hoursBefore,
}: {
  firstName: string;
  when: string;
  joinUrl?: string;
  hoursBefore: 24 | 1;
}) {
  return (
    <EmailLayout
      preview={`A quick reminder about your call ${
        hoursBefore === 24 ? "tomorrow" : "in an hour"
      }.`}
      campaign={`call-reminder-${hoursBefore}h`}
    >
      <Eyebrow>Reminder</Eyebrow>
      <H1>
        {hoursBefore === 24
          ? `See you tomorrow, ${firstName}.`
          : `We're on in an hour, ${firstName}.`}
      </H1>

      <Panel>
        <Row label="When" value={when} />
        <Row label="How long" value="About fifteen minutes" />
      </Panel>

      <P>
        If the timing no longer works, reply and say so. I&apos;d much
        rather move it than have you sit there feeling rushed.
      </P>

      {joinUrl ? <Btn href={joinUrl}>Join the call →</Btn> : null}

      <SignOff />
    </EmailLayout>
  );
}

/* ─── 4. No-show ────────────────────────────────────────────────────── */

export const noShowSubject = "Missed you today";

export function NoShowEmail({
  firstName,
  rebookUrl,
}: {
  firstName: string;
  rebookUrl: string;
}) {
  return (
    <EmailLayout
      preview="No problem at all. Here's a link to pick another time."
      campaign="no-show"
    >
      <Eyebrow>Let&apos;s rearrange</Eyebrow>
      <H1>Missed you today, {firstName}.</H1>

      <P>
        Life happens, genuinely no problem. Your plan and your answers are
        still here whenever you want to pick this up.
      </P>

      <Btn href={rebookUrl}>Pick another time →</Btn>

      <SignOff line="Or reply with a couple of times that suit you and I'll work around them." />
    </EmailLayout>
  );
}

/* ─── 5. Post-call, not closed ──────────────────────────────────────── */

export const postCallSubject = "Following up on our chat";

export function PostCallEmail({
  firstName,
  note,
}: {
  firstName: string;
  /** Ben's own line from the call. This template is a frame, not a script. */
  note?: string;
}) {
  return (
    <EmailLayout
      preview="No rush, and no hard sell. Here's where we got to."
      campaign="post-call"
    >
      <Eyebrow>After our call</Eyebrow>
      <H1>Good to speak, {firstName}.</H1>

      {note ? <P dim={false}>{note}</P> : null}

      <P>
        No rush on deciding. If you want to start, reply and I&apos;ll get
        you set up the same day. If the timing isn&apos;t right, that&apos;s
        a completely fine answer and I&apos;m not going to chase you about
        it.
      </P>

      <P>
        In the meantime your plan is still there, and Suth Club is the
        cheaper way in if you&apos;d rather run it yourself for now.
      </P>

      <Btn href={trackedUrl("/club", "post-call")}>Look at Suth Club →</Btn>

      <SignOff />
    </EmailLayout>
  );
}

/* ─── 6. Client welcome ─────────────────────────────────────────────── */

export const clientWelcomeSubject = "Right, let's get to work";

export function ClientWelcomeEmail({
  firstName,
  startDate,
  programme,
}: {
  firstName: string;
  startDate: string;
  programme: string;
}) {
  return (
    <EmailLayout
      preview={`Your first week starts ${startDate}.`}
      campaign="client-welcome"
    >
      <Eyebrow>You&apos;re in</Eyebrow>
      <H1>Welcome aboard, {firstName}.</H1>

      <P>
        I&apos;ve written your first block and it&apos;s waiting in your
        account. Here&apos;s how this works from here.
      </P>

      <Panel title="The rhythm">
        <Row label="Your programme" value={programme} />
        <Row label="First session" value={startDate} />
        <Row label="Every Sunday" value="I review your week and adjust it" />
        <Row label="Messages" value="Any time. I reply within 24h, Mon to Fri" />
      </Panel>

      <P>
        One ask: log your sessions honestly, including the bad ones. A week
        where you managed two of four tells me more than a week that looks
        perfect on paper.
      </P>

      <Btn href={trackedUrl("/plan", "client-welcome")}>
        Open your first week →
      </Btn>

      <SignOff />
    </EmailLayout>
  );
}
