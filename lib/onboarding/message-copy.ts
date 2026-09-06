import { isGsm7, segments, smsLength } from "@/lib/sms/messages";
import type { PaymentSchedule } from "./schedule";
import { scheduleLines, scheduleSms } from "./schedule";

/**
 * WHAT BEN'S INVITE ACTUALLY SAYS, AND WHAT HE MAY CHANGE ABOUT IT.
 *
 * Two jobs in one file, deliberately: the wording that goes out when Ben
 * changes nothing, and the rules for the wording when he does. Keeping them
 * together is what stops the edited version being held to a standard the
 * default would fail.
 *
 * ── THE TONE ──────────────────────────────────────────────────────────────
 * These messages are from a coach to somebody he already trains, about money
 * they have already agreed. The old text opened "Set your card up for £100
 * today" — an instruction, delivered by a machine, to a person who was doing
 * him a favour by moving onto a card at all. It now reads the way he would
 * actually put it: here is the link we talked about, here is what it takes,
 * any problems just say.
 *
 * ── THE LINK IS NOT PART OF THE MESSAGE ───────────────────────────────────
 * Ben edits the words; the server always appends the link. That is a
 * deliberate limit rather than a shortcut. A free-text box containing a URL
 * is a box somebody eventually sends without one — and a payment text with
 * no payment link is a message that costs money to send, reads as a scam,
 * and does nothing. The composer shows the link greyed on the end so the
 * whole message is still visible; it simply cannot be deleted.
 */

/** How long Ben's own SMS wording may be, before the link is added. */
export const SMS_MESSAGE_MAX = 320;
/** Subject lines beyond this are truncated by every mail client anyway. */
export const EMAIL_SUBJECT_MAX = 120;
/** The email body he can type. Long enough for a real note, short of an essay. */
export const EMAIL_BODY_MAX = 1200;

/**
 * Straighten what a keyboard or a paste turns into typography.
 *
 * A curly apostrophe is not in GSM-7, and one of them silently halves every
 * segment in the message: 160 characters becomes 70, so a one-segment text
 * becomes three. Ben types on a Mac and iOS, both of which produce curly
 * quotes and ellipses by default, so this is the normal case rather than the
 * unlucky one. Converted rather than refused — telling somebody their
 * apostrophe is illegal is not a thing software should do.
 */
export function normaliseSmsText(text: string): string {
  return (text ?? "")
    // Curly quotes and primes, which iOS and macOS produce by default.
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    // En dash, em dash, minus sign.
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    // Non-breaking and narrow spaces: invisible, and not in GSM-7.
    .replace(/[\u00A0\u202F\u2007]/g, " ")
    // Zero-width joiners and the byte-order mark, which paste in unseen.
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/**
 * The text Ben sends when he changes nothing.
 *
 * Returned WITHOUT the link — see the note at the top. `assembleSms` puts the
 * two together, and it is the only thing that does.
 */
export function defaultInviteSmsMessage(
  firstName: string,
  kind: "full" | "payment",
  schedule: PaymentSchedule | null,
): string {
  if (kind !== "payment") {
    return `Hi ${firstName}, it's Ben. Welcome aboard - here's your set-up link, takes about 5 minutes:`;
  }
  if (!schedule) {
    return `Hi ${firstName}, it's Ben. Here's your account set-up link as we discussed:`;
  }
  /* The figures are what make this obviously genuine. A text carrying a link
     and asking for card details is exactly the shape of a scam; the amount
     and the date are the part only Ben could know.

     ⚠️ NO "JUST REPLY" IN THIS ONE. The invite goes out from the alphanumeric
     sender "SuthPerform" (see the `sender: "brand"` call in the invite route),
     which by definition cannot receive a reply — inviting one would point the
     client at a dead end at the exact moment they have a question about
     money. The email is the reply channel and says so. */
  return `Hi ${firstName}, it's Ben. Here's your payment link as we discussed - ${scheduleSms(
    schedule,
  )}:`;
}

/** Message plus link, the one place the two are joined. */
export function assembleSms(message: string, link: string): string {
  return `${normaliseSmsText(message)} ${link}`.trim();
}

export type SmsCheck = {
  ok: boolean;
  /** The full message as it will send, link included. */
  body: string;
  /** Ben's half, normalised. */
  message: string;
  segments: number;
  gsm: boolean;
  /** Why it cannot send, in Ben's words. Null when it can. */
  error: string | null;
  /** Worth knowing but not blocking — a second segment costs money. */
  warning: string | null;
};

/**
 * Can this text be sent, what will it cost, and what should Ben know.
 *
 * Three segments is the transport's hard limit (lib/sms/send.ts refuses
 * anything longer, silently sending nothing), so that is the only thing that
 * blocks. Two segments is merely twice the price, which is Ben's call to
 * make and not ours — so it warns and lets him send.
 */
export function checkSmsMessage(message: string, link: string): SmsCheck {
  const clean = normaliseSmsText(message);
  const body = assembleSms(clean, link);
  const n = segments(body);
  const gsm = isGsm7(body);

  if (!clean) {
    return {
      ok: false, body, message: clean, segments: n, gsm,
      error: "The text needs something in it. Reset it if you would rather send the standard one.",
      warning: null,
    };
  }
  if (clean.length > SMS_MESSAGE_MAX) {
    return {
      ok: false, body, message: clean, segments: n, gsm,
      error: `That is ${clean.length} characters. Keep it under ${SMS_MESSAGE_MAX} so it arrives as a text rather than three.`,
      warning: null,
    };
  }
  if (n > 3) {
    return {
      ok: false, body, message: clean, segments: n, gsm,
      error: `At ${smsLength(body)} characters this is ${n} texts, and the phone network will not take it. Shorten it a little.`,
      warning: null,
    };
  }

  let warning: string | null = null;
  if (!gsm) {
    /* Normalisation handles the characters people produce by accident;
       anything left is deliberate (an emoji, an accent) and genuinely does
       double the bill, so it is said plainly rather than silently stripped. */
    warning = `This contains characters the phone network charges double for, so it will send as ${n} texts.`;
  } else if (n > 1) {
    warning = `This is ${n} texts rather than one. It will still arrive as a single message.`;
  }
  return { ok: true, body, message: clean, segments: n, gsm, error: null, warning };
}

/* ── The email ───────────────────────────────────────────────────────────── */

export function defaultInviteEmailSubject(
  firstName: string,
  kind: "full" | "payment",
): string {
  /* Not "choose your plan". There is nothing to choose — this goes to somebody
     Ben already coaches, and a subject line inviting them to pick a package
     is the first thing they would have had to ignore. */
  return kind === "payment"
    ? `${firstName}, your payment link`
    : `${firstName}, let's get you set up`;
}

/**
 * The paragraphs above the button, as plain text with blank lines between.
 *
 * Plain text on purpose: it is what Ben edits, and a box he can put HTML into
 * is a box that eventually sends a broken email. The template renders each
 * paragraph as text, so anything he types is escaped by React on the way in.
 */
export function defaultInviteEmailBody(
  kind: "full" | "payment",
  schedule: PaymentSchedule | null,
): string {
  /* The greeting is the email's headline and is not part of this. Otherwise
     an edited body would sit under "Let's get you on card, Sam" and open by
     greeting him a second time. Ben edits the message; the headline, the
     button, the figures and the sign-off belong to the template. */
  if (kind !== "payment") {
    return [
      "Before I write your first week I need a few things from you: what you're training for, how you're training now, and anything I should know about injuries.",
      "It takes about five minutes, and it's all on your phone.",
    ].join("\n\n");
  }
  const lines = schedule ? scheduleLines(schedule) : null;
  return [
    "Here's the link to get your payments set up, as we discussed. Nothing changes about your training, this just moves things onto a card so neither of us has to think about it again.",
    lines
      ? `Exactly as we agreed: ${lines.today} ${lines.monthly}`
      : "It only takes a couple of minutes.",
    "Any questions at all, just reply to this and it comes straight to me.",
  ].join("\n\n");
}

/** Plain text into paragraphs, blank lines and single newlines both honoured. */
export function toParagraphs(body: string): string[] {
  return (body ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type EmailCheck = {
  ok: boolean;
  subject: string;
  body: string;
  paragraphs: string[];
  error: string | null;
};

export function checkEmail(subject: string, body: string): EmailCheck {
  /* The same straightening the text gets. An email can carry a curly quote
     perfectly well, but Ben writes one message in his head and edits two
     boxes, and the two arriving subtly different reads as carelessness. */
  const s = (subject ?? "").replace(/\s+/g, " ").trim();
  const b = (body ?? "").replace(/[\u00A0\u202F]/g, " ").trim();
  const paragraphs = toParagraphs(b);

  if (!s) {
    return { ok: false, subject: s, body: b, paragraphs, error: "The email needs a subject line." };
  }
  if (s.length > EMAIL_SUBJECT_MAX) {
    return {
      ok: false, subject: s, body: b, paragraphs,
      error: `Subject lines over about ${EMAIL_SUBJECT_MAX} characters get cut off in most inboxes.`,
    };
  }
  if (paragraphs.length === 0) {
    return { ok: false, subject: s, body: b, paragraphs, error: "The email needs something in it." };
  }
  if (b.length > EMAIL_BODY_MAX) {
    return {
      ok: false, subject: s, body: b, paragraphs,
      error: `That is ${b.length} characters. Keep it under ${EMAIL_BODY_MAX} — the link and the figures are underneath it.`,
    };
  }
  return { ok: true, subject: s, body: b, paragraphs, error: null };
}
