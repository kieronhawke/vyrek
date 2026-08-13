import "server-only";

/**
 * WHO GETS ADMIN CORRESPONDENCE.
 *
 * One list for admin emails and one for admin texts, so every admin
 * notification — a new subscription, a lead, a cancellation, a failed
 * payment, a change request — reaches both Kieron and Ben, on email and by
 * text, from a single place. Before this the recipients were chosen
 * differently in each sender and Ben was missing from most of them.
 *
 * Kieron's addresses come from the environment (ADMIN_EMAILS /
 * CONSULTATION_INBOX / BEN_MOBILE). Ben's own contacts are added on top so
 * they can never be dropped by a missing env var.
 */

const BEN_EMAIL_PERSONAL = "benjaminsutherland33@gmail.com";
const BEN_MOBILE_PERSONAL = "07444858095";

/** Every admin email address, deduped and lowercased. */
export function adminEmails(): string[] {
  const set = new Set<string>();
  const add = (v?: string | null) => {
    const t = (v ?? "").trim().toLowerCase();
    if (t && t.includes("@")) set.add(t);
  };
  add(process.env.CONSULTATION_INBOX ?? "kieron.hawke@gmail.com");
  add(process.env.BEN_EMAIL ?? "ben@suthperformance.com");
  for (const e of (process.env.ADMIN_EMAILS ?? "").split(",")) add(e);
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

/** Every admin mobile number, deduped by handset. */
export function adminMobiles(): string[] {
  const byCanon = new Map<string, string>();
  const add = (v?: string | null) => {
    const t = (v ?? "").trim();
    if (!t) return;
    const key = canon(t);
    if (key && !byCanon.has(key)) byCanon.set(key, t);
  };
  add(process.env.BEN_MOBILE);
  add(process.env.ADMIN_MOBILE);
  add(BEN_MOBILE_PERSONAL);
  return [...byCanon.values()];
}
