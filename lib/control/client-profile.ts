/**
 * THE CLIENT PROFILE.
 *
 * The coach tracker holds what Ben opens daily: who is programmed until when.
 * Everything else about a person — how to reach them, what they are training
 * for, what he must not make them do, what he thought last month — lives here,
 * keyed by the same id, so the tracker stays the fast sheet it is modelled on
 * and this is the drawer behind it.
 *
 * WHY IT IS A SEPARATE RECORD
 * A tracker row is edited every week and read at a glance. A profile is
 * written once and read when something changes. Putting the medical history in
 * the row Ben tabs through every Monday makes the sheet unusable, and putting
 * it nowhere means it stays in WhatsApp.
 *
 * SPECIAL-CATEGORY DATA (spec/09 §14)
 * Injuries and conditions are Article 9 data. Two consequences the model has
 * to carry rather than the UI improvising: the athlete is told plainly who can
 * see it, and a note is explicitly either internal or shared — there is no
 * default, because "I assumed it was private" is how a coach's shorthand ends
 * up in front of the person it is about.
 *
 * PRIVACY: github.com/kieronhawke/vyrek is public. Seeds are placeholders.
 */

export type ClientNote = {
  id: string;
  /** ISO date. Sorted newest first for reading, oldest first for history. */
  date: string;
  body: string;
  /**
   * False: Ben's own note, never rendered in the athlete's account.
   * True: written to be read by them.
   */
  shared: boolean;
};

export type ClientProfile = {
  /** Matches the tracker athlete's id. */
  id: string;
  email: string;
  phone: string;
  /** ISO date they started. */
  joined: string;
  /**
   * The athlete's slug in our own results database, when they have raced.
   * Null when unlinked — never guessed from the name, because two people
   * genuinely share one and attaching the wrong race history to a client is
   * worse than showing none.
   */
  hyroxSlug: string | null;
  goal: string;
  nextRace: string;
  /** Article 9. Shown with an explicit "who can see this". */
  medical: string;
  heightCm: number | null;
  weightKg: number | null;
  /** Their best HYROX finish as they reported it, "1:12:40". */
  bestTime: string;
  notes: ClientNote[];
};

export const PROFILE_KEY = "clients.profiles";

export function emptyProfile(id: string, today: string): ClientProfile {
  return {
    id,
    email: "",
    phone: "",
    joined: today,
    hyroxSlug: null,
    goal: "",
    nextRace: "",
    medical: "",
    heightCm: null,
    weightKg: null,
    bestTime: "",
    notes: [],
  };
}

/** Newest first — what Ben wants when he opens someone before a call. */
export function sortNotes(notes: ClientNote[]): ClientNote[] {
  return [...notes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * How complete a profile is, as a fraction.
 *
 * Not decoration: an incomplete profile is why a reminder does not send and
 * why a plan cannot be emailed. Ben should be able to see at a glance which of
 * his people are half set up.
 */
const REQUIRED: (keyof ClientProfile)[] = ["email", "phone", "goal"];

export function completeness(p: ClientProfile): number {
  const filled = REQUIRED.filter((k) => String(p[k] ?? "").trim().length > 0).length;
  return filled / REQUIRED.length;
}

export function missingFields(p: ClientProfile): string[] {
  const label: Record<string, string> = {
    email: "email address",
    phone: "phone number",
    goal: "goal",
  };
  return REQUIRED.filter((k) => !String(p[k] ?? "").trim()).map((k) => label[k as string]);
}

/** Years and months, for "with Ben since". */
export function membershipLength(joined: string, today: string): string {
  if (!joined) return "—";
  const a = new Date(`${joined}T00:00:00Z`);
  const b = new Date(`${today}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || b < a) return "—";
  let months =
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  if (months < 1) return "less than a month";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest
    ? `${years} year${years === 1 ? "" : "s"}, ${rest} month${rest === 1 ? "" : "s"}`
    : `${years} year${years === 1 ? "" : "s"}`;
}

/** Body-mass index, or null when either half is missing. Never guessed. */
export function bmi(p: ClientProfile): number | null {
  if (!p.heightCm || !p.weightKg) return null;
  const m = p.heightCm / 100;
  return Math.round((p.weightKg / (m * m)) * 10) / 10;
}

/**
 * Sample profiles for the seeded tracker athletes.
 *
 * Only the first three, deliberately: a console where every row is filled in
 * looks finished and hides exactly the state Ben will actually be in, which is
 * most of them empty. The empty ones are the point.
 */
export function seedProfiles(today: string): ClientProfile[] {
  return [
    {
      ...emptyProfile("a_01", today),
      email: "athlete.a@example.com",
      phone: "+44 7700 900001",
      joined: "2025-02-10",
      hyroxSlug: null,
      goal: "Sub-1:20 at Manchester. Sled push is the limiter.",
      nextRace: "HYROX Manchester",
      medical: "Left calf strain, Jun 2026. Cleared, but flag if run volume jumps.",
      heightCm: 178,
      weightKg: 76,
      bestTime: "1:24:10",
      notes: [
        {
          id: "n_1",
          date: "2026-07-26",
          body: "Sled push is where the time goes. Building the block around it.",
          shared: false,
        },
        {
          id: "n_2",
          date: "2026-07-12",
          body: "Great work on the compromised runs this month — that is the gain showing up.",
          shared: true,
        },
      ],
    },
    {
      ...emptyProfile("a_02", today),
      email: "athlete.b@example.com",
      phone: "+44 7700 900002",
      joined: "2026-05-04",
      goal: "First HYROX, finish strong.",
      heightCm: 165,
      weightKg: 61,
      notes: [
        {
          id: "n_3",
          date: "2026-07-30",
          body: "Two sessions missed, no message. Check in before writing the next block.",
          shared: false,
        },
      ],
    },
    {
      ...emptyProfile("a_03", today),
      email: "athlete.c@example.com",
      joined: "2025-11-18",
      goal: "Doubles with a partner in the spring.",
      notes: [],
    },
  ];
}
