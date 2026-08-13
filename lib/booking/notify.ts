import { render } from "@react-email/components";
import { Resend } from "resend";
import { sendSms } from "@/lib/sms/send";
import { adminEmails, adminMobiles } from "@/lib/admin/recipients";
import { siteUrl } from "@/lib/site-url";
import {
  BookingCancelledEmail,
  BookingChangedEmail,
  BookingConfirmedEmail,
  InternalBookingChangedEmail,
  InternalBookingEmail,
  bookingCancelledSubject,
  bookingChangedSubject,
  bookingConfirmedSubject,
  internalBookingChangedSubject,
  internalBookingSubject,
} from "@/lib/email/templates/booking";
import {
  formatBookingTime,
  formatBookingTimeShort,
  type Booking,
} from "@/lib/booking/model";

/**
 * TELLING BOTH SIDES, EVERY TIME.
 *
 * Every change to the diary produces four messages: an email and a text to
 * the client, an email and a text to Ben. That is the brief, and it is also
 * the right number — an email nobody opens is how a consultation gets
 * missed, and a text with no detail is how it gets misremembered.
 *
 * NOTHING HERE THROWS. A booking that succeeded must not be reported as a
 * failure because Twilio was slow, and the person has already seen the
 * confirmation screen by the time these run. Every failure comes back as a
 * value and gets logged; the booking itself is already stored.
 *
 * THE CLIENT'S TEXT COMES FROM THE NUMBER, NOT THE BRAND NAME. "Your call
 * is Tuesday at 5:30" invites "can we make it 6?" — and the branded sender
 * cannot receive a reply. Ben's own alerts go from the brand, because he is
 * not going to text himself back.
 */

type Outcome = { channel: string; ok: boolean; detail?: string };

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

/**
 * Sent directly rather than through lib/email/send.ts because that module's
 * `send` is not exported — this keeps the same sender and the same
 * plain-text alternative without widening its surface.
 */
async function email(args: {
  to: string;
  subject: string;
  react: React.ReactElement;
}): Promise<Outcome> {
  const key = process.env.RESEND_API_KEY;
  // Fall back to Resend's default verified sender when RESEND_FROM is unset —
  // matching lib/email/send.ts. Booking was the only path that hard-required
  // RESEND_FROM, so clearing that one var silently killed booking confirmations
  // and admin booking alerts while every other email kept flowing.
  const from = process.env.RESEND_FROM || "Suth Performance <onboarding@resend.dev>";
  if (!key) {
    return { channel: `email:${args.to}`, ok: false, detail: "NOT_CONFIGURED" };
  }
  try {
    const resend = new Resend(key);
    const [html, text] = await Promise.all([
      render(args.react),
      render(args.react, { plainText: true }),
    ]);
    const res = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html,
      text,
    });
    return res.error
      ? { channel: `email:${args.to}`, ok: false, detail: res.error.message }
      : { channel: `email:${args.to}`, ok: true };
  } catch (e) {
    return {
      channel: `email:${args.to}`,
      ok: false,
      detail: e instanceof Error ? e.message : "unknown",
    };
  }
}

async function text(
  to: string | null,
  body: string,
  sender: "brand" | "number",
): Promise<Outcome> {
  if (!to) return { channel: "sms", ok: false, detail: "NO_NUMBER" };
  const r = await sendSms({ to, body, sender });
  return r.ok
    ? { channel: `sms:${to}`, ok: true }
    : { channel: `sms:${to}`, ok: false, detail: r.reason };
}

const adminUrl = () => `${siteUrl()}/admin/calendar`;
const manageUrl = (ref: string) => `${siteUrl()}/book/manage/${ref}`;

// The admin copy of a booking notice goes to every admin (Kieron and Ben),
// on email and by text. Returns the promises to spread into each event's
// Promise.all. A "not configured" outcome when nobody is set keeps the
// outcome log honest.
function adminEmailFanout(subject: string, react: React.ReactElement): Promise<Outcome>[] {
  const tos = adminEmails();
  if (tos.length === 0) {
    return [Promise.resolve<Outcome>({ channel: "email:admin", ok: false, detail: "no admin email" })];
  }
  return tos.map((to) => email({ to, subject, react }));
}
function adminSmsFanout(body: string): Promise<Outcome>[] {
  const tos = adminMobiles();
  if (tos.length === 0) {
    return [Promise.resolve<Outcome>({ channel: "sms:admin", ok: false, detail: "no admin number" })];
  }
  return tos.map((to) => text(to, body, "brand"));
}

/* ── The three events ──────────────────────────────────────────────────── */

export async function notifyBooked(b: Booking): Promise<Outcome[]> {
  const when = formatBookingTime(b.startISO);
  const short = formatBookingTimeShort(b.startISO);
  const first = firstNameOf(b.name);

  return Promise.all([
    email({
      to: b.email,
      subject: bookingConfirmedSubject(when),
      react: BookingConfirmedEmail({
        firstName: first,
        when,
        ref: b.ref,
        manageUrl: manageUrl(b.ref),
      }),
    }),
    // From the number: this one gets replied to.
    text(
      b.phone,
      `${first}, it's Ben. You're booked in for ${short}. I'll call you then. Need to move it? ${manageUrl(b.ref)}`,
      "number",
    ),
    ...adminEmailFanout(
      internalBookingSubject(b.name, when),
      InternalBookingEmail({
        name: b.name,
        email: b.email,
        phone: b.phone,
        when,
        ref: b.ref,
        rail: b.rail,
        note: b.note,
        adminUrl: adminUrl(),
      }),
    ),
    ...adminSmsFanout(
      `New consultation: ${b.name}, ${short}. ${b.phone || "no number"}`,
    ),
  ]);
}

export async function notifyRescheduled(
  b: Booking,
  previousISO: string,
): Promise<Outcome[]> {
  const when = formatBookingTime(b.startISO);
  const short = formatBookingTimeShort(b.startISO);
  const previous = formatBookingTime(previousISO);
  const first = firstNameOf(b.name);

  return Promise.all([
    email({
      to: b.email,
      subject: bookingChangedSubject(when),
      react: BookingChangedEmail({
        firstName: first,
        when,
        previous,
        ref: b.ref,
        manageUrl: manageUrl(b.ref),
      }),
    }),
    // "Your call is Tuesday 5:30" with no "was" reads exactly like the
    // original confirmation arriving twice, and gets ignored.
    text(
      b.phone,
      `${first}, it's Ben. I've had to move our call - it's now ${short}. Doesn't work? Pick another: ${manageUrl(b.ref)}`,
      "number",
    ),
    ...adminEmailFanout(
      internalBookingChangedSubject(b.name, false),
      InternalBookingChangedEmail({
        name: b.name,
        when,
        previous,
        adminUrl: adminUrl(),
      }),
    ),
    ...adminSmsFanout(`Moved: ${b.name} now ${short}.`),
  ]);
}

export async function notifyCancelled(b: Booking): Promise<Outcome[]> {
  const when = formatBookingTime(b.startISO);
  const short = formatBookingTimeShort(b.startISO);
  const first = firstNameOf(b.name);

  return Promise.all([
    email({
      to: b.email,
      subject: bookingCancelledSubject(),
      react: BookingCancelledEmail({
        firstName: first,
        when,
        rebookUrl: `${siteUrl()}/book`,
      }),
    }),
    text(
      b.phone,
      `${first}, it's Ben. Our call on ${short} is cancelled. Book another time whenever suits: ${siteUrl()}/book`,
      "number",
    ),
    ...adminEmailFanout(
      internalBookingChangedSubject(b.name, true),
      InternalBookingChangedEmail({
        name: b.name,
        when,
        cancelled: true,
        adminUrl: adminUrl(),
      }),
    ),
    ...adminSmsFanout(`Cancelled: ${b.name}, was ${short}.`),
  ]);
}

/** Logged rather than returned to the browser — the booking already stood. */
export function logOutcomes(label: string, outcomes: Outcome[]): void {
  const failed = outcomes.filter((o) => !o.ok);
  if (failed.length) {
    console.warn(
      `[booking] ${label}: ${failed.length}/${outcomes.length} notifications failed`,
      failed,
    );
  }
}
