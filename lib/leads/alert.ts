import { isGsm7, segments, smsLength } from "@/lib/sms/messages";
import type { Lead } from "@/lib/leads/model";
import { shortPlace } from "@/lib/leads/model";

/**
 * THE TEXT BEN GETS WHEN A LEAD LANDS.
 *
 * BUILT TO COST ONE SEGMENT, because it fires on every enquiry and the
 * bill is per segment, per message, for ever. One segment is 160
 * characters of GSM-7; a single character outside that alphabet — an emoji,
 * a curly quote, an en dash — silently re-encodes the whole message as
 * UCS-2, cuts every segment to 70 characters, and doubles or triples the
 * cost of every text from then on. Hence the typewriter punctuation, and
 * hence the test that holds the line.
 *
 * WHAT IT CARRIES is exactly what Kieron asked for and nothing else: who,
 * their number, roughly where, and a link straight into the full enquiry
 * with no login. The link is the whole reason it can be this short — every
 * other detail is one tap away, so the text does not need to try.
 *
 * THE LINK HAS NO SCHEME. "https://www." is twelve characters, every phone
 * linkifies a bare domain, and twelve characters is the difference between
 * one segment and two for anybody with a long name.
 *
 * IT DEGRADES BY DROPPING, NOT BY TRUNCATING. If a long name and a long
 * place would push it over, the place goes first — a half-written town is
 * worse than no town, and the link still has everything.
 */

const LIMIT = 160;

/**
 * Strip accents for the text message, and only for the text message.
 *
 * "Zoë" costs double. Not metaphorically — ë is outside GSM-7, so one
 * character in a name re-encodes the entire message as UCS-2, drops the
 * segment size from 160 to 70, and turns a one-segment alert into two.
 * Measured, not assumed: the test for this failed on exactly that name
 * before this existed.
 *
 * Folding somebody's own name in a message TO them would be rude and
 * wrong. This is an internal operational alert to Ben, telling him who to
 * ring; the full enquiry page and the email both carry the correct
 * spelling, and he sees it there before he speaks to them.
 */
export function asciiFold(input: string): string {
  return input
    .normalize("NFD")
    // Combining accents, once NFD has split them off the base letter.
    .replace(/[̀-ͯ]/g, "")
    // The ones that are their own letter rather than a letter plus a mark,
    // so NFD leaves them alone.
    .replace(/ø/g, "o")
    .replace(/Ø/g, "O")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "AE")
    .replace(/œ/g, "oe")
    .replace(/Œ/g, "OE")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/þ/g, "th")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...");
}

function host(siteUrl: string): string {
  return siteUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function buildLeadSms(lead: Lead, link: string): string {
  const phone = lead.phone ?? "no number";
  const place = shortPlace(lead);

  const name = asciiFold(lead.name);
  const town = place ? asciiFold(place) : null;

  const withPlace = town
    ? `New lead: ${name}, ${phone}, ${town}. ${link}`
    : `New lead: ${name}, ${phone}. ${link}`;

  if (segments(withPlace) <= 1) return withPlace;

  // Drop the place rather than cut it in half.
  const withoutPlace = `New lead: ${name}, ${phone}. ${link}`;
  if (segments(withoutPlace) <= 1) return withoutPlace;

  // A genuinely enormous name. Keep the link and the number whole — they
  // are the two things that are useless partially — and trim the name.
  const fixed = `New lead: , ${phone}. ${link}`;
  const room = Math.max(0, LIMIT - smsLength(fixed));
  return `New lead: ${name.slice(0, room).trim()}, ${phone}. ${link}`;
}

export function leadAlertSms(lead: Lead, siteUrl: string): string {
  return buildLeadSms(lead, `${host(siteUrl)}/l/${lead.id}`);
}

/**
 * The same alert for the case where the lead couldn't be stored, so the
 * per-lead /l/{id} page doesn't exist. Ben still gets the who and the number
 * to ring — the highest-value message in the funnel shouldn't vanish on a
 * storage blip — with the admin list as the link instead of a dead page.
 */
export function leadAlertSmsUnstored(lead: Lead, siteUrl: string): string {
  return buildLeadSms(lead, `${host(siteUrl)}/admin/leads`);
}

/** Exposed so the test can assert on the real thing rather than a guess. */
export function leadAlertCost(body: string): {
  characters: number;
  segments: number;
  gsm7: boolean;
} {
  return {
    characters: smsLength(body),
    segments: segments(body),
    gsm7: isGsm7(body),
  };
}
