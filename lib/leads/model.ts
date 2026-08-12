import { randomBytes } from "node:crypto";

/**
 * A LEAD, AND THE LINK THAT OPENS IT.
 *
 * Ben gets a text with a link and taps it while the kettle boils. There is
 * no login on the other end, and that is a deliberate decision rather than
 * a shortcut: an admin login on a phone, at the moment somebody has just
 * raised their hand, is the difference between ringing them in two minutes
 * and ringing them tomorrow. Speed is the entire value of a lead alert.
 *
 * SO THE ID HAS TO CARRY THE SECURITY. Sixteen characters of a 32-symbol
 * alphabet is 80 bits. Guessing one at a thousand attempts a second, with
 * no rate limiting at all, would take longer than the universe has been
 * running; the endpoint is rate limited anyway. That is a very different
 * bar from the six-character booking reference, and it has to be, because
 * this page shows a name, an email, a phone number and whatever the person
 * typed about their injuries — special-category data under UK GDPR.
 *
 * The page is noindex, the link is never printed anywhere public, and the
 * record expires. It is a capability URL, and it is treated like one.
 */

export type Lead = {
  id: string;
  createdISO: string;

  name: string;
  email: string;
  phone: string | null;

  /** When Ben sent the account setup link, or null. Survives a refresh —
   * the old client-side-only "sent ✓" state vanished on reload and Ben
   * couldn't tell who he had already invited. */
  invitedAtISO: string | null;

  /** "Getting fit" or "Racing" — which quiz rail they came down. */
  rail: string | null;
  /** What they said they want, in their own words where we have them. */
  wants: string | null;
  readiness: string | null;
  goal: string | null;
  programme: string | null;
  injury: string | null;
  /** The full plain-text brief from lib/lead-brief.ts. */
  brief: string;

  /** Where they are, roughly, from the IP. */
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;

  landingPath: string | null;
  referrer: string | null;
  secondsOnSite: number | null;
  pageViews: number | null;
  sourcePath: string | null;
};

/** No vowels, no ambiguous glyphs — same reasoning as the booking ref. */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const ID_LENGTH = 16;

export function newLeadId(): string {
  const bytes = randomBytes(ID_LENGTH * 2);
  let id = "";
  for (let i = 0; id.length < ID_LENGTH && i < bytes.length; i++) {
    // 31 symbols: reject the top of the byte range so each stays equally
    // likely rather than letting modulo bias the first few.
    if (bytes[i] >= 248) continue;
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  while (id.length < ID_LENGTH) {
    id += ALPHABET[randomBytes(1)[0] % ALPHABET.length];
  }
  return id;
}

export function isLeadId(value: string): boolean {
  return (
    value.length === ID_LENGTH && [...value].every((c) => ALPHABET.includes(c))
  );
}

/** "Leeds, England" — the two parts worth saying out loud. */
export function shortPlace(lead: Pick<Lead, "city" | "region" | "country">): string | null {
  const parts = [lead.city, lead.region ?? lead.country].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
