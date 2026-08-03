import type { Race } from "@/lib/control/race-conflicts";

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
  /* Kieron asked for a full operation to test against, with every record
     pointing at his own inbox and handset so nothing can reach a stranger
     if a send is ever wired to these. Optional so the existing constructors
     in clients-manager and the fixture tests stay valid. */
  email?: string;
  phone?: string;
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
  email?: string;
  phone?: string;
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
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
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
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
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
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
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
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
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
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
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
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 11,
    programmingStatus: "current",
    payment: "failed",
    paymentLabel: "Card declined",
    billingInDays: 12,
    flags: ["Payment failed"],
    tier: "hub",
  },
  {
    id: "c_07",
    name: "Sample G",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: -3,
    programmingStatus: "overdue",
    payment: "paid",
    paymentLabel: "3 Sep",
    billingInDays: 26,
    nextRace: { name: "Hyrox Manchester", inDays: 68, priority: "A" },
    flags: ["Plan ran out three days ago"],
    tier: "coaching",
  },
  {
    id: "c_08",
    name: "Sample H",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 11,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "28 Aug",
    billingInDays: 20,
    nextRace: { name: "Hyrox Birmingham", inDays: 85, priority: "B" },
    flags: [],
    tier: "programming",
  },
  {
    id: "c_09",
    name: "Sample I",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 1,
    programmingStatus: "due_soon",
    payment: "failed",
    paymentLabel: "Card declined",
    billingInDays: 0,
    flags: ["Card declined twice"],
    tier: "coaching",
  },
  {
    id: "c_10",
    name: "Sample J",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 25,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "19 Sep",
    billingInDays: 42,
    nextRace: { name: "Hyrox Glasgow", inDays: 219, priority: "C" },
    flags: [],
    tier: "hub",
  },
  {
    id: "c_11",
    name: "Sample K",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: -8,
    programmingStatus: "overdue",
    payment: "late",
    paymentLabel: "8 days late",
    billingInDays: 13,
    flags: ["Plan overdue and payment late"],
    tier: "programming",
  },
  {
    id: "c_12",
    name: "Sample L",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 6,
    programmingStatus: "due_soon",
    payment: "paid",
    paymentLabel: "22 Aug",
    billingInDays: 14,
    nextRace: { name: "Hyrox Dublin", inDays: 100, priority: "B" },
    flags: ["First race, wants a call"],
    tier: "coaching",
  },
  {
    id: "c_13",
    name: "Sample M",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 30,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "1 Oct",
    billingInDays: 54,
    flags: [],
    tier: "elite",
  },
  {
    id: "c_14",
    name: "Sample N",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 0,
    programmingStatus: "awaiting_race_debrief",
    payment: "paid",
    paymentLabel: "30 Aug",
    billingInDays: 22,
    nextRace: { name: "Hyrox London", inDays: -2, priority: "A" },
    flags: ["Raced Saturday, debrief not written"],
    tier: "elite",
  },
  {
    id: "c_15",
    name: "Sample O",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 4,
    programmingStatus: "due_soon",
    payment: "due",
    paymentLabel: "Due tomorrow",
    billingInDays: 1,
    flags: [],
    tier: "programming",
  },
  {
    id: "c_16",
    name: "Sample P",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 17,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "15 Sep",
    billingInDays: 38,
    nextRace: { name: "Hyrox Cardiff", inDays: 290, priority: "C" },
    flags: [],
    tier: "hub",
  },
  {
    id: "c_17",
    name: "Sample Q",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: -1,
    programmingStatus: "overdue",
    payment: "paid",
    paymentLabel: "5 Sep",
    billingInDays: 28,
    flags: ["Plan ran out yesterday", "Hasn't logged a session in 11 days"],
    tier: "coaching",
  },
  {
    id: "c_18",
    name: "Sample R",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 9,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "26 Aug",
    billingInDays: 18,
    nextRace: { name: "Hyrox Manchester", inDays: 68, priority: "B" },
    flags: [],
    tier: "programming",
  },
  {
    id: "c_19",
    name: "Sample S",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 22,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "12 Sep",
    billingInDays: 35,
    flags: ["Asked about doubles partner"],
    tier: "coaching",
  },
  {
    id: "c_20",
    name: "Sample T",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 3,
    programmingStatus: "due_soon",
    payment: "late",
    paymentLabel: "3 days late",
    billingInDays: 17,
    nextRace: { name: "Hyrox Birmingham", inDays: 85, priority: "A" },
    flags: ["Payment 3 days late"],
    tier: "elite",
  },
  {
    id: "c_21",
    name: "Sample U",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 14,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "2 Sep",
    billingInDays: 25,
    flags: [],
    tier: "hub",
  },
  {
    id: "c_22",
    name: "Sample V",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: -5,
    programmingStatus: "overdue",
    payment: "failed",
    paymentLabel: "Card declined",
    billingInDays: 0,
    flags: ["Plan overdue", "Card declined"],
    tier: "programming",
  },
  {
    id: "c_23",
    name: "Sample W",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 8,
    programmingStatus: "due_soon",
    payment: "paid",
    paymentLabel: "24 Aug",
    billingInDays: 16,
    nextRace: { name: "Hyrox Dublin", inDays: 100, priority: "C" },
    flags: [],
    tier: "coaching",
  },
  {
    id: "c_24",
    name: "Sample X",
    email: "kieronhawke@gmail.com",
    phone: "07398790378",
    programmedUntilDays: 19,
    programmingStatus: "current",
    payment: "paid",
    paymentLabel: "10 Sep",
    billingInDays: 31,
    flags: ["Returning after injury"],
    tier: "programming",
  },
];

export const LEADS: Lead[] = [
  { id: "l_01", name: "Sample Lead A", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "beginner", status: "new", ageHours: 2 },
  { id: "l_02", name: "Sample Lead B", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "hyrox", status: "new", ageHours: 31 },
  { id: "l_03", name: "Sample Lead C", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "faster", status: "contacted", ageHours: 76 },
  { id: "l_04", name: "Sample Lead D", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "unsure", status: "call_booked", ageHours: 120 },
  { id: "l_05", name: "Sample Lead E", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "beginner", status: "new", ageHours: 1 },
  { id: "l_06", name: "Sample Lead F", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "hyrox", status: "new", ageHours: 4 },
  { id: "l_07", name: "Sample Lead G", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "faster", status: "new", ageHours: 9 },
  { id: "l_08", name: "Sample Lead H", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "unsure", status: "contacted", ageHours: 28 },
  { id: "l_09", name: "Sample Lead I", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "hyrox", status: "qualified", ageHours: 52 },
  { id: "l_10", name: "Sample Lead J", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "beginner", status: "call_booked", ageHours: 71 },
  { id: "l_11", name: "Sample Lead K", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "faster", status: "trial", ageHours: 96 },
  { id: "l_12", name: "Sample Lead L", email: "kieronhawke@gmail.com", phone: "07398790378", segment: "hyrox", status: "new", ageHours: 15 },
];

/**
 * spec/16 §11 names this fixture explicitly: "One client with the three-race
 * conflict (ultra -> GNR -> Hyrox Pro Doubles) to exercise the resolver."
 * It is Ben's own example from spec/10 §2.
 */
export const CONFLICT_CLIENT_ID = "c_01";

export const RACE_ENTRIES: Array<{ accountId: string } & Race> = [
  {
    accountId: CONFLICT_CLIENT_ID,
    id: "r_ultra",
    name: "Ultra marathon",
    date: new Date("2026-09-05T00:00:00Z"),
    discipline: "ultra",
    priority: "A",
  },
  {
    accountId: CONFLICT_CLIENT_ID,
    id: "r_gnr",
    name: "Great North Run",
    date: new Date("2026-09-19T00:00:00Z"),
    discipline: "half_marathon",
    priority: "A",
  },
  {
    accountId: CONFLICT_CLIENT_ID,
    id: "r_hyrox",
    name: "Hyrox Pro Doubles",
    date: new Date("2026-09-26T00:00:00Z"),
    discipline: "hyrox",
    priority: "A",
  },
];

export function listRacesForAccount(accountId: string): Race[] {
  return RACE_ENTRIES.filter((r) => r.accountId === accountId).map(
    ({ accountId: _drop, ...race }) => race,
  );
}

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
