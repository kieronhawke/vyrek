/**
 * SENDING SOMEBODY THEIR SETUP LINK.
 *
 * Two screens do this — the leads list, where Ben has just come off the phone
 * to an enquiry, and the add-a-client panel — and they were drifting. One
 * could set a plan and the other could not; one explained a failure and the
 * other said "Couldn't send". This is the shared half: what gets posted, what
 * comes back, and what each failure means in words Ben can act on.
 *
 * WHY THE ERROR COPY LIVES HERE
 * A message like "PRICE_INVALID" is the API being precise, which is correct
 * of an API and useless on a screen. Translating it at each call site means
 * two translations, and the second one is always the one that goes stale.
 */

import { parsePrice } from "@/lib/onboarding/model";

export type InviteKind = "full" | "payment";

export type SetupRequest = {
  name: string;
  email: string;
  phone: string;
  kind: InviteKind;
  /** A standard plan key, or empty to let them choose. */
  plan?: string;
  /** A price agreed with this person, as typed: "150", "£150". */
  agreedPrice?: string;
  /** What to call the agreed plan on their screen. */
  agreedName?: string;
  /** "beginner" keeps racing language out of their onboarding. */
  rail?: "beginner";
};

export type SetupResult = {
  link: string;
  linkLength?: number;
  shortLink?: boolean;
  secured: boolean;
  agreedPence?: number | null;
  email: { attempted: boolean; ok: boolean; reason: string | null; sandbox: boolean };
  sms: {
    attempted: boolean;
    ok: boolean;
    reason: string | null;
    configured?: boolean;
    sentAs?: string | null;
    text: string | null;
  };
};

/**
 * What is stopping this being sent, in Ben's words, or nothing.
 *
 * A message rather than a boolean, so the button can say why it is not lit.
 * A dead button with no explanation is the commonest reason anybody gives up
 * on a form.
 */
export function setupBlocker(req: SetupRequest): string | null {
  if (!req.name.trim()) return "A name, so the link can greet them.";
  if (!req.email.trim() && !req.phone.trim()) {
    return "An email or a mobile — otherwise there is nowhere to send it.";
  }
  if (req.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(req.email.trim())) {
    return "That email address does not look right.";
  }
  /* Refused rather than ignored. Dropping an unreadable price would send a
     link offering the published tiers to somebody Ben had just quoted £150,
     and he would not find out until they rang back. */
  const price = req.agreedPrice?.trim();
  if (price && parsePrice(price) === null) {
    return "That price does not look right. A monthly figure between £1 and £2,000.";
  }
  return null;
}

/** API error codes to something Ben can do something about. */
export function setupErrorText(code: string | undefined): string {
  switch (code) {
    case "CONTACT_REQUIRED":
      return "Give an email address or a mobile number — otherwise there is nowhere to send it.";
    case "EMAIL_INVALID":
      return "That email address does not look right.";
    case "PRICE_INVALID":
      return "That agreed price does not look right. A monthly figure between £1 and £2,000.";
    case "NAME_REQUIRED":
      return "It needs a name to greet them with.";
    default:
      return "Could not create the invite. Nothing was sent — try again.";
  }
}

/**
 * One line saying what actually happened, rather than a tick.
 *
 * A green tick for a message that was never transmitted is the worst thing
 * either of these screens could do: Ben would stop chasing somebody who never
 * heard from him.
 */
export function deliveryLine(result: SetupResult): string {
  const bits: string[] = [];

  if (result.email.attempted) {
    bits.push(
      result.email.ok
        ? result.email.sandbox
          ? "Email sent, but the sending domain is unverified so it only reaches your own address"
          : "Email sent"
        : `Email failed (${result.email.reason ?? "unknown"})`,
    );
  }
  if (result.sms.attempted) {
    bits.push(result.sms.ok ? "Text sent" : `Text failed (${result.sms.reason ?? "unknown"})`);
  }
  if (bits.length === 0) return "Nothing was sent — copy the link and send it yourself.";
  return `${bits.join(". ")}.`;
}

/** Post it. Never throws — a network failure is a result, not an exception. */
export async function sendSetupInvite(
  req: SetupRequest,
): Promise<{ ok: true; result: SetupResult } | { ok: false; message: string }> {
  const blocked = setupBlocker(req);
  if (blocked) return { ok: false, message: blocked };

  try {
    const res = await fetch("/api/onboarding/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: req.name.trim(),
        email: req.email.trim(),
        phone: req.phone.trim(),
        kind: req.kind,
        plan: req.plan || undefined,
        agreedPrice: req.agreedPrice?.trim() || undefined,
        agreedName: req.agreedName?.trim() || undefined,
        rail: req.rail,
      }),
    });
    const data = (await res.json()) as SetupResult & { error?: string };
    if (!res.ok || !data.link) {
      return { ok: false, message: setupErrorText(data?.error) };
    }
    return { ok: true, result: data };
  } catch {
    return { ok: false, message: "No connection. Nothing was sent." };
  }
}
