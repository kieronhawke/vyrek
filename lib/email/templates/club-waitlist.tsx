import {
  EmailLayout,
  Eyebrow,
  H1,
  P,
  SignOff,
} from "@/lib/email/templates/_layout";

/**
 * You're on the Suth Club waiting list.
 *
 * Sent the moment they join. Short and warm: confirm it worked, say what
 * happens next, and leave the door open to reply.
 */
export function ClubWaitlistEmail({
  firstName,
  goal,
}: {
  firstName: string;
  goal?: string | null;
}) {
  return (
    <EmailLayout
      preview="You're on the Suth Club waiting list."
      campaign="club-waitlist"
    >
      <Eyebrow>Suth Club</Eyebrow>
      <H1>You&apos;re on the list, {firstName}.</H1>

      <P>
        Suth Club opens soon: the same programming Ben uses to prepare for
        Elite 15 racing, scaled to wherever you are today. You&apos;ll be
        one of the first to hear the moment the doors open.
      </P>

      {goal ? (
        <P>
          You told us you&apos;re after: <strong>{goal}</strong>. That&apos;s
          exactly the kind of thing it&apos;s built for.
        </P>
      ) : null}

      <P>
        Nothing to do for now. If anything changes or you have a question,
        just reply to this email and it comes straight to Ben.
      </P>

      <SignOff />
    </EmailLayout>
  );
}
