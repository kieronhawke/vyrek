/**
 * The gap between "sent the invite" and "is a client".
 *
 * A lead Ben has sent onboarding to is not a lead any more — he has stopped
 * selling to them — but they are not a client either, because they have not
 * created an account or paid. Until now they existed only on the leads screen,
 * so the clients screen said nothing about the four people currently signing
 * up, and the only way to find out was to go and look somewhere else.
 *
 * That is the whole reason the two screens felt disconnected: the handover
 * between them was invisible. This makes it a state you can see from either
 * side.
 *
 * WHY THEY ARE NOT REAL CLIENT RECORDS
 * A pending client has no tier, no plan, no billing date and no payment
 * method, because none of those exist until they finish. Writing them into
 * `CLIENTS` with placeholder values would put four people into every count on
 * the console — revenue, tier totals, who needs a plan — who are not paying
 * and may never. So they are a separate, derived list, and every count that
 * means money keeps meaning money.
 */

import { formatBookingTime } from "@/lib/booking/model";
import { isTerminal, type LeadRecord } from "@/lib/control/lead-record";
import type { LeadStage } from "@/lib/control/lead-workflow";

/** The two stages where the invite is out and the account is not made yet. */
const SIGNING_UP: LeadStage[] = ["onboarding_sent", "onboarding_pending"];

export type PendingClient = {
  /** The lead's id. They are the same person, so they keep the same one. */
  id: string;
  name: string;
  email: string;
  phone: string;
  /** How long the invite has been out, in whole days. */
  waitingDays: number;
  /**
   * True once it has been out longer than anyone reasonably needs.
   *
   * Five days is where the automatic chasing stops (see lead-record.ts), so
   * it is also the point at which this stops being "in progress" and starts
   * being "stuck", which is a different thing and needs a different colour.
   */
  stuck: boolean;
  /** Their consultation, if they had one, in words. */
  calledOn?: string;
};

export function isSigningUp(lead: LeadRecord): boolean {
  return !isTerminal(lead.stage) && SIGNING_UP.includes(lead.stage);
}

const DAY = 86_400_000;

/** Everyone mid-signup, longest wait first — the one most likely to fall out. */
export function pendingClients(leads: LeadRecord[], now: Date): PendingClient[] {
  return leads
    .filter(isSigningUp)
    .map((l) => {
      const waitingDays = Math.floor(
        (now.getTime() - new Date(l.stageSinceISO).getTime()) / DAY,
      );
      return {
        id: l.id,
        name: l.name,
        email: l.email,
        phone: l.phone,
        waitingDays,
        stuck: waitingDays >= 5,
        calledOn: l.booking ? formatBookingTime(l.booking.startISO) : undefined,
      };
    })
    .sort((a, b) => b.waitingDays - a.waitingDays);
}

/**
 * How it reads on the card.
 *
 * "Invited today" rather than "0 days", because nobody counts the day they
 * are on, and a zero on a card looks like a bug.
 */
export function waitingLabel(p: PendingClient): string {
  if (p.waitingDays <= 0) return "Invited today";
  if (p.waitingDays === 1) return "Invited yesterday";
  return `Invited ${p.waitingDays} days ago`;
}
