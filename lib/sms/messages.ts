/**
 * Pre-written SMS for every funnel scenario.
 *
 * These are pure functions returning strings; sendSms in ./send.ts is the
 * transport, and it is live. Twilio is wired, the account is active, and the
 * onboarding invite in app/api/onboarding/invite/route.ts sends through it.
 *
 * This header used to say "there is no Twilio account and no number for Ben".
 * That was true when it was written and stopped being true when the transport
 * landed, and on 4 August 2026 it caused a full round of "SMS cannot be sent"
 * before anyone checked the other worktree's env. If the transport changes,
 * change this paragraph with it.
 *
 * Rules these are written to, and they are not stylistic preferences:
 *
 *  - **160 characters** is one GSM-7 segment. Go over and you pay for two,
 *    and long messages get truncated in some clients. Every message here is
 *    checked by `smsLength` and the tests assert it.
 *  - **No emoji, no curly quotes, no en dashes.** A single non-GSM-7
 *    character silently switches the whole message to UCS-2, which drops
 *    the limit from 160 to 70. `isGsm7` catches it.
 *  - **No links without context.** A bare shortlink from an unknown number
 *    reads as phishing. Name the sender before the link, every time.
 *  - **Say who it is.** These come from a number nobody has saved.
 *  - **Give an opt-out** on anything that isn't a direct reply to something
 *    the person just did. UK PECR expects it and it costs seven characters.
 *  - **"Reply here" only works from the NUMBER.** The messaging service holds
 *    two senders: the brand name SUTH, which cannot receive anything, and the
 *    UK number, which can. Anything below that invites a reply must be sent
 *    with the default sender, never `sender: "brand"` — see lib/sms/send.ts.
 *    The onboarding invite is the one client-facing message sent from the
 *    brand name, and it deliberately does not ask for a reply.
 *  - **It is a person texting, not a system.** These go out under Ben's name
 *    to people he coaches. Reviewed 5 September 2026 and rewritten where they
 *    had drifted into instructions: "Set your card up for £100" became "here's
 *    your payment link as we discussed". The information is identical; the
 *    difference is whether the person on the other end feels chased or
 *    looked after. Terseness is a budget, not a tone.
 *
 * Spec: docs/onboarding-funnel-proposal.md section 6.
 */

/** The GSM-7 basic set plus the escaped extension characters. */
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXTENDED = "^{}\\[~]|€";

export function isGsm7(text: string): boolean {
  return [...text].every(
    (c) => GSM7.includes(c) || GSM7_EXTENDED.includes(c),
  );
}

/**
 * Billable length. Extended characters cost two, which is why a message
 * that looks like 158 characters can still spill into a second segment.
 */
export function smsLength(text: string): number {
  return [...text].reduce(
    (n, c) => n + (GSM7_EXTENDED.includes(c) ? 2 : 1),
    0,
  );
}

export function segments(text: string): number {
  if (!isGsm7(text)) return Math.ceil([...text].length / 70);
  const len = smsLength(text);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

const STOP = " Reply STOP to opt out.";

/* ─── To the lead ───────────────────────────────────────────────────── */

export const leadSms = {
  /**
   * Instant, on submitting the quiz. The single highest-leverage message in
   * the system: contact inside five minutes transforms reach rates.
   */
  confirmation: ({ firstName }: { firstName: string }) =>
    `Hi ${firstName}, it's Ben from Suth Performance. Thanks for that. I've got your plan and your answers, and I'll be in touch shortly. Reply here any time.`,

  /** When a specific slot is agreed. */
  callBooked: ({ firstName, when }: { firstName: string; when: string }) =>
    `Hi ${firstName}, it's Ben from Suth Performance. You're booked in for ${when}. Just reply here if you need to move it.`,

  /** Day before. The single biggest lever on no-show rate. */
  reminder24h: ({ when }: { when: string }) =>
    `It's Ben from Suth Performance. Just a reminder we're speaking ${when}. Reply here if anything has changed and we'll move it.`,

  /** An hour before. Short on purpose. */
  reminder1h: ({ when }: { when: string }) =>
    `It's Ben. We're on in about an hour, ${when}. Speak to you shortly.`,

  /** Same day as a missed call. Warm, never disappointed. */
  noShow: ({ firstName }: { firstName: string }) =>
    `Hi ${firstName}, it's Ben from Suth Performance. Missed you today, no problem at all. Send me a couple of times that suit and I'll work around them.`,

  /** They became a coaching client. */
  clientWelcome: ({ firstName }: { firstName: string }) =>
    `Welcome aboard, ${firstName}. It's Ben. Your first week is in your account now. Any questions at all, this number reaches me.`,

  /** Morning of a race. Coaching clients only, and never automated blind. */
  raceDay: ({ firstName }: { firstName: string }) =>
    `Morning ${firstName}, Ben here. Today is just the victory lap on work you already did. Stick to the pacing plan. Go well.`,

  /** They asked for a callback rather than booking a slot. */
  callbackAcknowledged: ({
    firstName,
    window,
  }: {
    firstName: string;
    window: string;
  }) =>
    `Hi ${firstName}, it's Ben from Suth Performance. Thanks for those details. I'll give you a call ${window}. Reply here if that changes.`,
} as const;

/* ─── To Ben, internal ──────────────────────────────────────────────── */

export const benSms = {
  /**
   * Fired the moment a lead lands. Deliberately dense: Ben reads this on a
   * phone and decides whether to ring now.
   */
  newLead: ({
    name,
    summary,
    phone,
    leadUrl,
  }: {
    name: string;
    summary: string;
    phone?: string | null;
    leadUrl: string;
  }) =>
    `New lead: ${name}. ${summary}.${phone ? ` ${phone}.` : " No phone."} ${leadUrl}`,

  /** Someone picked a slot in the scheduler. */
  callBooked: ({ name, when }: { name: string; when: string }) =>
    `${name} booked a call for ${when}.`,

  /** Nobody turned up. Prompts Ben to send the rebook link himself. */
  noShow: ({ name }: { name: string }) =>
    `${name} did not make their call. No rebook link has gone out yet.`,

  /** A club member took the day-30 offer. Warmest lead there is. */
  clubUpgradeInterest: ({ name }: { name: string }) =>
    `${name} (Suth Club member) asked about coaching. Worth a call.`,
} as const;

/* ─── To a coached athlete ──────────────────────────────────────────── */

export const memberSms = {
  /**
   * Ben has answered a question in the app.
   *
   * The one message that closes the loop. An athlete asks something on
   * Tuesday, Ben answers on Wednesday, and without this they find out on
   * Friday when they next happen to open the app — by which point the answer
   * is about a session they have already done.
   *
   * WHAT IT DOES NOT CONTAIN
   * The reply itself. Same rule as the alert going the other way: these
   * questions are frequently about an injury, and an answer about somebody's
   * knee on a lock screen is read by whoever is holding the phone. The text
   * says there is a reply and where to read it.
   *
   * No STOP line. This is a direct response to something they did, which is
   * what PECR calls a service message — and adding an opt-out to "your coach
   * answered you" invites somebody to opt out of the thing they are paying
   * for. The blanket opt-out lives in the account settings.
   */
  coachReplied: ({
    firstName,
    link,
  }: {
    firstName: string;
    link: string;
  }) =>
    `Hi ${firstName}, Ben has replied to your message. Have a read here: ${link}`,
} as const;

/* ─── Club lifecycle ────────────────────────────────────────────────── */

export const clubSms = {
  /** Only if they opted in. The club promises nobody will ring them. */
  trialEnding: ({ endsOn }: { endsOn: string }) =>
    `Suth Club: your free week ends ${endsOn}. Add a card to carry on, or do nothing and it stops. No charge either way.${STOP}`,

  cardExpiring: ({ month }: { month: string }) =>
    `Suth Club: the card on your account expires ${month}. Update it and nothing changes. suthperformance.com/app/account${STOP}`,

  paymentFailed: () =>
    `Suth Club: we could not take this month's payment. Update your card and nothing else changes. suthperformance.com/app/account${STOP}`,
} as const;

/* ─── Registry, for the preview screen and tests ────────────────────── */

export type SmsSample = {
  id: string;
  audience: "Lead" | "Ben" | "Club member" | "Coached athlete";
  when: string;
  text: string;
};

/**
 * Every message with realistic sample data. Drives the preview screen and
 * the length tests, so a message that is too long or non-GSM-7 cannot ship
 * unnoticed.
 */
export const SMS_SAMPLES: SmsSample[] = [
  {
    id: "lead-confirmation",
    audience: "Lead",
    when: "Instantly, on finishing the quiz",
    text: leadSms.confirmation({ firstName: "Jamie" }),
  },
  {
    id: "lead-call-booked",
    audience: "Lead",
    when: "When a slot is agreed",
    text: leadSms.callBooked({ firstName: "Jamie", when: "Thu 6:30pm" }),
  },
  {
    id: "lead-callback",
    audience: "Lead",
    when: "They asked for a callback",
    text: leadSms.callbackAcknowledged({
      firstName: "Jamie",
      window: "tomorrow evening",
    }),
  },
  {
    id: "lead-reminder-24h",
    audience: "Lead",
    when: "24 hours before the call",
    text: leadSms.reminder24h({ when: "tomorrow at 6:30pm" }),
  },
  {
    id: "lead-reminder-1h",
    audience: "Lead",
    when: "1 hour before the call",
    text: leadSms.reminder1h({ when: "6:30pm" }),
  },
  {
    id: "lead-no-show",
    audience: "Lead",
    when: "Same day as a missed call",
    text: leadSms.noShow({ firstName: "Jamie" }),
  },
  {
    id: "ben-new-lead",
    audience: "Ben",
    when: "Instantly, on every coached lead",
    text: benSms.newLead({
      name: "Jamie",
      summary: "beginner, lose weight, 3 days, tried and stopped twice",
      phone: "07700900123",
      leadUrl: "suthperformance.com/admin",
    }),
  },
  {
    id: "ben-call-booked",
    audience: "Ben",
    when: "Someone books a slot",
    text: benSms.callBooked({ name: "Jamie", when: "Thu 6:30pm" }),
  },
  {
    id: "ben-club-upgrade",
    audience: "Ben",
    when: "A club member asks about coaching",
    text: benSms.clubUpgradeInterest({ name: "Jamie" }),
  },
  {
    id: "lead-client-welcome",
    audience: "Lead",
    when: "They sign up for coaching",
    text: leadSms.clientWelcome({ firstName: "Jamie" }),
  },
  {
    id: "lead-race-day",
    audience: "Lead",
    when: "Morning of their race",
    text: leadSms.raceDay({ firstName: "Jamie" }),
  },
  {
    id: "ben-no-show",
    audience: "Ben",
    when: "A booked call was missed",
    text: benSms.noShow({ name: "Jamie" }),
  },
  {
    id: "club-card-expiring",
    audience: "Club member",
    when: "Card expires within 30 days",
    text: clubSms.cardExpiring({ month: "next month" }),
  },
  {
    id: "club-trial-ending",
    audience: "Club member",
    when: "Day 5 of the free trial",
    text: clubSms.trialEnding({ endsOn: "Tuesday" }),
  },
  {
    id: "club-payment-failed",
    audience: "Club member",
    when: "A card payment fails",
    text: clubSms.paymentFailed(),
  },
  {
    id: "member-coach-replied",
    audience: "Coached athlete",
    when: "When Ben answers a question in the app",
    text: memberSms.coachReplied({
      firstName: "Jamie",
      link: "suthperformance.com/app/coach",
    }),
  },
];
