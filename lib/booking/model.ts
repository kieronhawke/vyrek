import { randomBytes } from "node:crypto";

/**
 * A booked consultation.
 *
 * Stored with the start as an ISO instant, because that is the one moment
 * both parties agree on regardless of where either of them is. Everything
 * shown on a screen is derived from it in Europe/London.
 */

export type BookingStatus = "confirmed" | "cancelled";

export type Booking = {
  /** Short, readable, and safe to print in a text message. */
  ref: string;
  name: string;
  email: string;
  phone: string;
  /** ISO instant the call starts. */
  startISO: string;
  minutes: number;
  status: BookingStatus;
  /** What they said they wanted, carried over from the quiz or the form. */
  note?: string;
  /** Which rail they came in on, so Ben knows the shape of the call. */
  rail?: "beginner" | "athlete";
  createdISO: string;
  /** Set when Ben moves it, so the notification can say "was". */
  rescheduledFromISO?: string;
  cancelledReason?: string;
};

/**
 * Six characters, no vowels, no ambiguous glyphs.
 *
 * No vowels because a random string of letters produces real words often
 * enough to matter, and Ben reads these out on the phone. No I/O/0/1
 * because they are the ones misheard.
 */
const ALPHABET = "BCDFGHJKMNPQRSTVWXYZ23456789";

export function newBookingRef(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; out.length < 6 && i < bytes.length; i++) {
    // 28 symbols: mask to 0–223 so every symbol stays equally likely.
    if (bytes[i] >= 224) continue;
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  while (out.length < 6) out += ALPHABET[randomBytes(1)[0] % ALPHABET.length];
  return out;
}

export function isBookingRef(value: string): boolean {
  return /^[BCDFGHJKMNPQRSTVWXYZ23456789]{6}$/.test(value.trim().toUpperCase());
}

/** "Tuesday 5 August, 5:30pm" — how a person says an appointment. */
export function formatBookingTime(
  startISO: string,
  tz = "Europe/London",
): string {
  const at = new Date(startISO);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(at)
    // "5:30 pm" → "5:30pm", which is how it reads in a sentence.
    .replace(/\s?(am|pm)/i, (s) => s.trim().toLowerCase());
  return `${day}, ${time}`;
}

/** Short form for a text message, where every character is billed. */
export function formatBookingTimeShort(
  startISO: string,
  tz = "Europe/London",
): string {
  const at = new Date(startISO);
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(at)
    .replace(/\s?(am|pm)/i, (s) => s.trim().toLowerCase());
  return `${day} ${time}`;
}
