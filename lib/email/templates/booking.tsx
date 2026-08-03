import { Section, Text } from "@react-email/components";
import {
  Btn,
  EmailLayout,
  Eyebrow,
  H1,
  P,
  Panel,
  Row,
  SignOff,
  url,
} from "@/lib/email/templates/_layout";
import { TEXT_DIM, fontStack } from "@/lib/email/templates/_styles";

/**
 * THE CONSULTATION EMAILS.
 *
 * Four of them, and the split matters: two go to the person who booked and
 * two go to Ben, and they are not the same email with the names swapped.
 *
 * The client's job is to turn up. So the time is the largest thing on the
 * screen, it says what the call is and is not, and there is one link — to
 * move it — because the alternative to an easy reschedule is a no-show.
 *
 * Ben's job is to be ready. So his carries who they are, what they said
 * they wanted, and a number he can press to ring them.
 *
 * A CHANGED TIME ALWAYS SHOWS THE OLD ONE. "Your call is Tuesday 5:30pm"
 * arriving out of the blue is indistinguishable from a duplicate of the
 * original confirmation, and the one thing somebody must not do with a
 * reschedule notice is ignore it.
 */

type Common = {
  firstName: string;
  when: string;
  ref: string;
};

/* ── To the client ─────────────────────────────────────────────────────── */

export function BookingConfirmedEmail({
  firstName,
  when,
  ref,
  manageUrl,
}: Common & { manageUrl: string }) {
  return (
    <EmailLayout
      preview={`Your call with Ben is ${when}.`}
      campaign="booking-confirmed"
    >
      <Eyebrow>Booked</Eyebrow>
      <H1>You&apos;re in, {firstName}.</H1>

      <P>
        I&apos;ll call you {when}. It takes about half an hour and it costs
        nothing.
      </P>

      <Panel title="Your call">
        <Row label="When" value={when} />
        <Row label="How long" value="About 30 minutes" />
        <Row label="Reference" value={ref} />
      </Panel>

      <P>
        There&apos;s nothing to prepare. I&apos;ll ask what you&apos;re
        training for now, what has and hasn&apos;t worked before, and what
        your week actually looks like. Then I&apos;ll tell you honestly
        whether I can help.
      </P>

      <Btn href={manageUrl}>Change or cancel</Btn>

      <Section>
        <P>
          If something comes up, move it rather than missing it — the link
          above takes two taps.
        </P>
      </Section>

      <SignOff />
    </EmailLayout>
  );
}

export const bookingConfirmedSubject = (when: string) =>
  `Your free consultation — ${when}`;

export function BookingChangedEmail({
  firstName,
  when,
  ref,
  previous,
  manageUrl,
}: Common & { previous: string; manageUrl: string }) {
  return (
    <EmailLayout
      preview={`Your call has moved to ${when}.`}
      campaign="booking-changed"
    >
      <Eyebrow>Time changed</Eyebrow>
      <H1>Your call has moved.</H1>

      <P>
        {firstName}, sorry — I&apos;ve had to move our call. It&apos;s now{" "}
        {when}.
      </P>

      <Panel title="What changed">
        {/* The old time is here so this cannot be mistaken for a repeat of
            the original confirmation, which is the one way a reschedule
            gets ignored. */}
        <Row label="Was" value={previous} />
        <Row label="Now" value={when} />
        <Row label="Reference" value={ref} />
      </Panel>

      <P>
        If the new time doesn&apos;t work, pick another one — there&apos;s no
        need to reply.
      </P>

      <Btn href={manageUrl}>Pick a different time</Btn>

      <SignOff />
    </EmailLayout>
  );
}

export const bookingChangedSubject = (when: string) =>
  `Your consultation has moved — now ${when}`;

export function BookingCancelledEmail({
  firstName,
  when,
  rebookUrl,
}: {
  firstName: string;
  when: string;
  rebookUrl: string;
}) {
  return (
    <EmailLayout
      preview="Your call has been cancelled."
      campaign="booking-cancelled"
    >
      <Eyebrow>Cancelled</Eyebrow>
      <H1>That&apos;s cancelled.</H1>
      <P>
        {firstName}, your call on {when} is cancelled and nothing is booked
        in.
      </P>
      <P>
        If you still want to talk it through, pick a new time whenever suits
        you.
      </P>
      <Btn href={rebookUrl}>Book another time</Btn>
      <SignOff />
    </EmailLayout>
  );
}

export const bookingCancelledSubject = () => "Your consultation is cancelled";

/* ── To Ben ────────────────────────────────────────────────────────────── */

/**
 * The one Ben reads on a phone before ringing somebody.
 *
 * Deliberately not pretty. The name, the time and the number come first
 * because those are the three things he needs in the ten seconds before
 * the call; everything else is below them.
 */
export function InternalBookingEmail({
  name,
  email,
  phone,
  when,
  ref,
  rail,
  note,
  adminUrl,
}: {
  name: string;
  email: string;
  phone: string;
  when: string;
  ref: string;
  rail?: string;
  note?: string;
  adminUrl: string;
}) {
  return (
    <EmailLayout
      preview={`${name} booked a consultation — ${when}`}
      campaign="internal-booking"
    >
      <Eyebrow>New booking</Eyebrow>
      <H1>{name}</H1>

      <Panel title="The call">
        <Row label="When" value={when} />
        <Row label="Phone" value={phone || "not given"} />
        <Row label="Email" value={email} />
        <Row label="Route" value={rail === "beginner" ? "Getting fit" : "Racing"} />
        <Row label="Reference" value={ref} />
      </Panel>

      {note ? (
        <Panel title="What they said">
          <Text
            style={{
              color: TEXT_DIM,
              fontFamily: fontStack,
              fontSize: 15,
              lineHeight: "1.7",
              margin: 0,
            }}
          >
            {note}
          </Text>
        </Panel>
      ) : null}

      <Btn href={adminUrl}>Open the diary</Btn>
    </EmailLayout>
  );
}

export const internalBookingSubject = (name: string, when: string) =>
  `Booking · ${name} · ${when}`;

export function InternalBookingChangedEmail({
  name,
  when,
  previous,
  cancelled,
  adminUrl,
}: {
  name: string;
  when: string;
  previous?: string;
  cancelled?: boolean;
  adminUrl: string;
}) {
  return (
    <EmailLayout
      preview={`${name}: ${cancelled ? "cancelled" : `moved to ${when}`}`}
      campaign="internal-booking-changed"
    >
      <Eyebrow>{cancelled ? "Cancelled" : "Moved"}</Eyebrow>
      <H1>{name}</H1>
      <Panel title="The change">
        {previous ? <Row label="Was" value={previous} /> : null}
        <Row label={cancelled ? "Cancelled" : "Now"} value={when} />
      </Panel>
      <Btn href={adminUrl}>Open the diary</Btn>
    </EmailLayout>
  );
}

export const internalBookingChangedSubject = (
  name: string,
  cancelled: boolean,
) => `${cancelled ? "Cancelled" : "Moved"} · ${name}`;

export function bookingManageUrl(ref: string): string {
  return url(`/book/manage/${ref}`);
}
