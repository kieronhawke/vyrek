import "server-only";

/**
 * WHO GETS ADMIN CORRESPONDENCE.
 *
 * One list for admin emails and one for admin texts, so every admin
 * notification — a new subscription, a lead, a cancellation, a failed
 * payment, a change request — reaches Ben from a single place rather than
 * being chosen differently in each sender.
 *
 * ── BEN ONLY, ON PURPOSE (Kieron, 2026-09-06) ─────────────────────────────
 * These used to fold in Kieron's addresses and his mobile as well, so a real
 * client signing up texted Kieron and emailed kieron.hawke@gmail.com. This is
 * Ben's business and Ben's inbox; Kieron is the person who built it, not the
 * person who needs telling when somebody pays. If he ever wants copying back
 * in, add the address here rather than in an individual sender.
 *
 * Note that ADMIN_EMAILS is deliberately NOT read here. That variable is the
 * sign-in allowlist in lib/admin/auth.ts and Kieron has to stay on it to keep
 * his own admin access. Reading it for notifications is what put him back on
 * every alert no matter what else changed.
 */

/**
 * Both of Ben's addresses. The work address is the one Kieron named, but the
 * domain is configured in Resend as a SENDING identity and a sending identity
 * is not proof of a mailbox, so his personal address rides along. Delivery to
 * one of the two is certain; delivery to the work address alone is not.
 */
const BEN_EMAIL_WORK = "ben@suthperformance.com";
const BEN_EMAIL_PERSONAL = "benjaminsutherland33@gmail.com";

/** Ben's own handset. Verified against his consultation booking. */
const BEN_MOBILE_FALLBACK = "07444858095";

/** Every admin email address, deduped and lowercased. */
export function adminEmails(): string[] {
  const set = new Set<string>();
  const add = (v?: string | null) => {
    const t = (v ?? "").trim().toLowerCase();
    if (t && t.includes("@")) set.add(t);
  };
  add(process.env.BEN_EMAIL ?? BEN_EMAIL_WORK);
  add(BEN_EMAIL_PERSONAL);
  return [...set];
}

/**
 * UK numbers canonicalised so 07…, +447… and 447… don't send twice to the
 * same handset. Returned in whatever form each was configured; the SMS
 * sender does the final E.164 conversion.
 */
function canon(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+44")) return "0" + digits.slice(3);
  if (digits.startsWith("44")) return "0" + digits.slice(2);
  return digits;
}

/**
 * Every admin mobile number, deduped by handset.
 *
 * ADMIN_MOBILE is no longer read: it is Kieron's number by definition. Only
 * BEN_MOBILE is, and it falls back to Ben's real number so a wrong or missing
 * value cannot silently send a client alert to somebody else.
 */
export function adminMobiles(): string[] {
  const byCanon = new Map<string, string>();
  const add = (v?: string | null) => {
    const t = (v ?? "").trim();
    if (!t) return;
    const key = canon(t);
    if (key && !byCanon.has(key)) byCanon.set(key, t);
  };
  add(process.env.BEN_MOBILE ?? BEN_MOBILE_FALLBACK);
  return [...byCanon.values()];
}
