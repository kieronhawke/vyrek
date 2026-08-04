import type { CoachClient, PaymentState } from "@/lib/control/fixtures";

/**
 * The logic behind the client hub, kept out of the component so it can be
 * tested without a DOM.
 *
 * The hub replaced two screens reading the same list: /clients as an editable
 * table and /tracker as the same list grouped by programming urgency. The
 * lens below is what used to be the second page.
 */

export const TIER_ORDER = ["elite", "coaching", "programming", "hub"] as const;

/**
 * "Elite" is the one-to-one tier. Labelled as what it is sold as rather than
 * what the enum calls it, because the operator reads the label and the code
 * reads the key.
 */
export const TIER_LABEL: Record<CoachClient["tier"], string> = {
  elite: "1-to-1 VIP",
  coaching: "Coaching",
  programming: "Programming",
  hub: "Hub",
};

export type Lens =
  | "all"
  | "needs_plan"
  | "payment"
  | "racing"
  | CoachClient["tier"];

export function matchesLens(c: CoachClient, lens: Lens): boolean {
  switch (lens) {
    case "all":
      return true;
    case "needs_plan":
      // What the tracker page existed to answer.
      return c.programmingStatus === "overdue" || c.programmingStatus === "due_soon";
    case "payment":
      return c.payment === "late" || c.payment === "failed" || c.payment === "due";
    case "racing":
      return Boolean(c.nextRace && c.nextRace.inDays >= 0 && c.nextRace.inDays <= 60);
    default:
      return c.tier === lens;
  }
}

export type LensChip = {
  key: Lens;
  label: string;
  count: number;
  tone?: "warn" | "danger";
};

/**
 * The filter chips, with counts, in the order they are worth looking at:
 * everything, then the two that mean somebody is waiting, then tiers.
 * A chip with nothing in it is dropped rather than shown as a zero, because
 * a row of zeroes is noise on a screen meant to be glanced at.
 */
export function clientLenses(clients: CoachClient[]): LensChip[] {
  const count = (l: Lens) => clients.filter((c) => matchesLens(c, l)).length;
  const chips: LensChip[] = [
    { key: "all", label: "Everyone", count: clients.length },
    { key: "needs_plan", label: "Needs a plan", count: count("needs_plan"), tone: "danger" },
    { key: "payment", label: "Payment", count: count("payment"), tone: "warn" },
    { key: "racing", label: "Racing soon", count: count("racing") },
    ...TIER_ORDER.map((t) => ({ key: t as Lens, label: TIER_LABEL[t], count: count(t) })),
  ];
  return chips.filter((c) => c.key === "all" || c.count > 0);
}

/**
 * An ISO date as a person reads it: "6 Aug", or "6 Aug 2025" with the year.
 *
 * The console was rendering raw `2026-08-06` in the same line as prose. Pinned
 * to en-GB and UTC on purpose — the locale keeps day-before-month regardless of
 * whose machine it renders on, and the fixed zone keeps the server's markup and
 * the browser's hydration identical.
 */
export function humanDate(iso: string, withYear = false): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(d);
}

export type Deadline = { label: string; urgent: boolean };

/**
 * The single line on a card that decides whether it gets opened today.
 *
 * Programming runs out before anything else matters: a client with no plan
 * on Monday is a problem regardless of what their race calendar says.
 */
export function nextDeadline(c: CoachClient): Deadline {
  const d = c.programmedUntilDays;
  if (c.programmingStatus === "awaiting_race_debrief") {
    return { label: "Race debrief not written", urgent: true };
  }
  if (d < 0) return { label: `Plan ran out ${Math.abs(d)}d ago`, urgent: true };
  if (d === 0) return { label: "Plan runs out today", urgent: true };
  if (d <= 7) return { label: `Plan runs out in ${d}d`, urgent: true };
  return { label: `Programmed for ${d} more days`, urgent: false };
}

export function paymentTone(p: PaymentState): "ok" | "warn" | "danger" {
  if (p === "paid") return "ok";
  if (p === "due") return "warn";
  return "danger";
}

/**
 * The payment state in words, for the one screen that has room for them.
 *
 * "Failed" rather than "declined": the card may be fine and the bank may have
 * blocked it, and telling Ben which is which is not something we can do from
 * a webhook. What he needs to know is that the money did not arrive.
 */
export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  paid: "Up to date",
  due: "Due",
  late: "Late",
  failed: "Failed",
};
