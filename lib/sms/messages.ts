/**
 * Pre-written SMS for every funnel scenario, ready to wire to a provider.
 *
 * Nothing here sends anything yet: there is no Twilio account and no number
 * for Ben. These are pure functions returning strings, so the day an
 * account exists the only new code is the transport.
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
    `Hi ${firstName}, it's Ben from Suth Performance. Got your plan and your answers. I'll be in touch shortly. Reply here any time.`,

  /** When a specific slot is agreed. */
  callBooked: ({ firstName, when }: { firstName: string; when: string }) =>
    `Hi ${firstName}, Ben from Suth Performance. You're booked in for ${when}. Reply here if you need to move it.`,

  /** Day before. The single biggest lever on no-show rate. */
  reminder24h: ({ when }: { when: string }) =>
    `Ben from Suth Performance. Reminder we're speaking ${when}. Reply here if the timing has changed.`,

  /** An hour before. Short on purpose. */
  reminder1h: ({ when }: { when: string }) =>
    `Ben here. We're on in about an hour (${when}). Speak shortly.`,

  /** Same day as a missed call. Warm, never disappointed. */
  noShow: ({ firstName }: { firstName: string }) =>
    `Hi ${firstName}, Ben from Suth Performance. Missed you today, no problem at all. Reply with a couple of times that suit and I'll work around them.`,

  /** They became a coaching client. */
  clientWelcome: ({ firstName }: { firstName: string }) =>
    `Welcome aboard ${firstName}. Ben here. Your first week is in your account now. Any questions, this number reaches me.`,

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
    `Hi ${firstName}, Ben from Suth Performance. Got your details. I'll call you ${window}. Reply here if that changes.`,
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
    `${name} did not show for their call. Rebook link not sent yet.`,

  /** A club member took the day-30 offer. Warmest lead there is. */
  clubUpgradeInterest: ({ name }: { name: string }) =>
    `${name} (Suth Club member) asked about coaching. Worth a call.`,
} as const;

/* ─── Club lifecycle ────────────────────────────────────────────────── */

export const clubSms = {
  /** Only if they opted in. The club promises nobody will ring them. */
  trialEnding: ({ endsOn }: { endsOn: string }) =>
    `Suth Club: your free week ends ${endsOn}. Add a card to carry on, or do nothing and it stops. No charge either way.${STOP}`,

  cardExpiring: ({ month }: { month: string }) =>
    `Suth Club: the card on your account expires ${month}. Update it and nothing changes. suthperformance.com/account${STOP}`,

  paymentFailed: () =>
    `Suth Club: your payment did not go through. Update your card and nothing else changes. suthperformance.com/account${STOP}`,
} as const;

/* ─── Registry, for the preview screen and tests ────────────────────── */

export type SmsSample = {
  id: string;
  audience: "Lead" | "Ben" | "Club member";
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
];
