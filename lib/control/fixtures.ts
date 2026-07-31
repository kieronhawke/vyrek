/**
 * Seed fixtures — docs/build-pack/spec/16 §11.
 *
 * Realistic shapes so the UI can be built, gated and screenshotted before
 * Postgres exists. Every consumer reads through the accessors at the bottom,
 * so swapping these for real queries in Phase A is one file.
 *
 * HARD-RULES §1: nothing here is presented anywhere as a real person, a real
 * result or a real testimonial. Names are obviously placeholder, and these
 * records never render on a public surface.
 */

export type ProgrammingStatus =
  | "current"
  | "due_soon"
  | "overdue"
  | "awaiting_race_debrief";

export type PaymentState = "paid" | "due" | "late" | "failed";

export type CoachClient = {
  id: string;
  name: string;
  /** Ben's key field. spec/10 §4. Days from today; negative is overdue. */
  programmedUntilDays: number;
  programmingStatus: ProgrammingStatus;
  payment: PaymentState;
  /** Human date or a phrase, shown as-is. */
  paymentLabel: string;
  /** Days until their next billing date. The split bar's target marker. */
  billingInDays: number;
  nextRace?: { name: string; inDays: number; priority: "A" | "B" | "C" };
  /** Plain English, never a flag name. spec/14 §9. */
  flags: string[];
  tier: "hub" | "programming" | "coaching" | "elite";
};

export type Lead = {
  id: string;
  name: string;
  segment: "beginner" | "hyrox" | "faster" | "unsure";
  status: "new" | "contacted" | "qualified" | "call_booked" | "trial";
  ageHours: number;
};

/**
 * Includes the two cases spec/16 §11 calls out by name: a client with the
 * three-race conflict, and one mid-dunning at day 7.
 */
export const CLIENTS: CoachClient[] = [
  {
    id: "c_01",
    name: "Sample A",
    programmedUntilDays: 2,
    programmingStatus: "due_soon",
    payment: "paid",
    paymentLabel: "12 Aug",
    billingInDays: 9,
    nextRace: { name: "Hyrox London", inDays: 42, priority: "A" },
    flags: ["Hasn't opened her plan in 8 days"],
    tier: "programming",
  },
  {
    id: "c_02",
    name: "Sample B",
    programmedUntilDays: 18,
    programmingStatus: "current",
    payment: "late",
    paymentLabel: "7 days late",
    billingInDays: 21,
    flags: ["Payment 7 days late"],
    tier: "coaching",
  },
  {
    id: "c_03",
    name: "Sample C",
    programmedUntilDays: -3,
    programmingStatus: "overdue",
    payment: "paid",
    paymentLabel: "3 Aug",
    billingInDays: 4,
    nextRace: { name: "Hyrox Manchester", inDays: 7, priority: "A" },
    flags: ["Race in 7 days", "Programming ran out 3 days ago"],
    tier: "programming",
  },
  {
    id: "c_04",
    name: "Sample D",
    programmedUntilDays: 26,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "28 Aug",
    billingInDays: 28,
    flags: ["New PB on the ski erg"],
    tier: "elite",
  },
  {
    id: "c_05",
    name: "Sample E",
    programmedUntilDays: 0,
    programmingStatus: "awaiting_race_debrief",
    payment: "paid",
    paymentLabel: "19 Aug",
    billingInDays: 19,
    nextRace: { name: "Great North Run", inDays: 13, priority: "B" },
    flags: ["Raced on Saturday, debrief not booked"],
    tier: "programming",
  },
  {
    id: "c_06",
    name: "Sample F",
    programmedUntilDays: 11,
    programmingStatus: "current",
    payment: "failed",
    paymentLabel: "Card declined",
    billingInDays: 12,
    flags: ["Payment failed"],
    tier: "hub",
  },
];

export const LEADS: Lead[] = [
  { id: "l_01", name: "Sample Lead A", segment: "beginner", status: "new", ageHours: 2 },
  { id: "l_02", name: "Sample Lead B", segment: "hyrox", status: "new", ageHours: 31 },
  { id: "l_03", name: "Sample Lead C", segment: "faster", status: "contacted", ageHours: 76 },
  { id: "l_04", name: "Sample Lead D", segment: "unsure", status: "call_booked", ageHours: 120 },
];

/* ─── Accessors — the seam Phase A replaces with real queries ────────── */

export function listCoachClients(): CoachClient[] {
  return CLIENTS;
}

export function listLeads(): Lead[] {
  return LEADS;
}

/**
 * The three counts above Ben's Today table. spec/10 §5 is explicit that these
 * are the only summary figures he sees, and that no financial metric ever
 * appears in Coach Mode.
 */
export function todayCounts(clients: CoachClient[] = CLIENTS) {
  return {
    plansDue: clients.filter(
      (c) => c.programmingStatus === "due_soon" || c.programmingStatus === "overdue",
    ).length,
    paymentsLate: clients.filter(
      (c) => c.payment === "late" || c.payment === "failed",
    ).length,
    racesSoon: clients.filter((c) => (c.nextRace?.inDays ?? 999) <= 14).length,
  };
}

/**
 * Sort order for Today: the people who need Ben first. Overdue programming
 * outranks everything, then payment trouble, then a race closing in.
 */
export function sortForToday(clients: CoachClient[]): CoachClient[] {
  const urgency = (c: CoachClient) => {
    if (c.programmingStatus === "overdue") return 0;
    if (c.payment === "late" || c.payment === "failed") return 1;
    if ((c.nextRace?.inDays ?? 999) <= 14) return 2;
    if (c.programmingStatus === "due_soon") return 3;
    if (c.programmingStatus === "awaiting_race_debrief") return 4;
    return 5;
  };
  return [...clients].sort(
    (a, b) => urgency(a) - urgency(b) || a.programmedUntilDays - b.programmedUntilDays,
  );
}
