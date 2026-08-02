/**
 * The training plan, modelled on what Ben actually writes.
 *
 * Read from "Haseeb Training.xlsx" (supplied 2 August 2026), which is the real
 * artefact he sends clients. Nine sheets, one per week, named by date range:
 * "6-14 June", "15-21 June" … "Aug 10 - 16".
 *
 * Each sheet is the same shape:
 *
 *              Mon      Tue      Wed      Thu      Fri      Sat      Sun    | Weekly running volume
 *      AM    [ session free text                                          ] |
 *      PM    [ session free text, often empty                             ] |
 *      Notes [ one line for the week                                      ] |
 *
 * WHAT THIS CHANGES
 * -----------------
 * The app modelled one session per day, written as structured intervals. Ben
 * works in **AM and PM slots**, seven days at a time, in free text. The
 * structured-interval model was mine, not his, and a builder that forces him
 * to fill in fields would be slower than the spreadsheet he already has.
 *
 * So the session body stays free text — exactly what he types — and structure
 * is *derived* from it for display, never required to author it. He writes:
 *
 *     2km easy
 *     10km progression run
 *     2km @ 5:00
 *     …
 *
 * and the athlete sees numbered lines with the quantity picked out. If the
 * derivation fails, the line renders as he typed it. That is the rule: his
 * text is the source of truth, our parsing is a rendering nicety.
 */

export type Slot = "am" | "pm";

export type PlanDay = {
  /** ISO date. Ben's sheets carry a real date per column. */
  date: string;
  /** "Monday" … "Sunday", as printed in his header row. */
  dayName: string;
  /** Free text exactly as Ben types it. Empty string means nothing set. */
  am: string;
  pm: string;
};

export type PlanWeek = {
  id: string;
  /** The sheet name he uses: "Aug 3- 9". Kept verbatim. */
  label: string;
  /** Monday of the week, ISO. */
  weekOf: string;
  days: PlanDay[];
  /** His per-week note row. */
  notes: string;
  /** The "Weekly Running Volume total" column. Free text: "30km". */
  runningVolume: string;
  /** Set when Ben has attached a voice note or video talking the week through. */
  coachMedia?: { kind: "audio" | "video"; label: string; durationSec: number };
};

/** A single line of a session, after parsing. */
export type SessionLine = {
  raw: string;
  /** Leading quantity, when the line starts with one: "2km", "8x1km", "30". */
  quantity?: string;
  /** Whatever follows it. */
  rest: string;
  /** RPE, when he writes "@ 7-8/10 effort" or "8/10". */
  effort?: string;
  /** True for structural markers he uses as connectors: "into", "x3". */
  connector?: boolean;
};

const UNIT = "(?:km|k|m|mins?|minutes?|secs?|seconds?|reps?|kg|cals?)";
const QUANTITY = new RegExp(
  "^(" +
    // "3x30 sec", "8x1km", "2x" — reps by quantity, unit optional and may be
    // separated by a space, which is how he writes "3x30 sec strides".
    `\\d+\\s*x\\s*\\d+(?:\\.\\d+)?\\s*${UNIT}?` +
    "|" +
    // "20 mins", "2km", "100"
    `\\d+(?:\\.\\d+)?\\s*${UNIT}?` +
    "|x\\d+" +
    ")(?=\\s|$)",
  "i",
);
const EFFORT = /@?\s*(\d(?:[-–]\d)?\s*\/\s*10)(?:\s*effort)?/i;
const CONNECTORS = /^(into|then|straight into|x\d+|rest|w\/up|w\/d)$/i;

/**
 * Split a session into lines and pick out the scannable parts.
 *
 * Deliberately forgiving. Ben's text is inconsistent — "2km easy jog",
 * "3x30 sec strides", "6x1km @ 7-8/effort off 90 seconds static recovery",
 * "100 wall balls @ 6kg" — and any line this cannot parse is shown as typed.
 */
export function parseSession(text: string): SessionLine[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw) => {
      if (CONNECTORS.test(raw)) return { raw, rest: raw, connector: true };

      const effortMatch = raw.match(EFFORT);
      const effort = effortMatch ? effortMatch[1].replace(/\s+/g, "") : undefined;

      const qMatch = raw.match(QUANTITY);
      if (!qMatch) return { raw, rest: raw, ...(effort ? { effort } : {}) };

      return {
        raw,
        quantity: qMatch[1].trim(),
        rest: raw.slice(qMatch[1].length).trim(),
        ...(effort ? { effort } : {}),
      };
    });
}

/** Does this day have anything programmed at all? */
export function isRestDay(day: PlanDay): boolean {
  const both = `${day.am} ${day.pm}`.trim().toLowerCase();
  return both === "" || both === "rest";
}

/** A slot counts as a session unless it is empty or the word "rest". */
function isSession(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t !== "" && t !== "rest";
}

export function sessionCount(week: PlanWeek): number {
  return week.days.reduce(
    (n, d) => n + (isSession(d.am) ? 1 : 0) + (isSession(d.pm) ? 1 : 0),
    0,
  );
}

/**
 * Haseeb's real week, 3–9 August 2026, transcribed from the spreadsheet.
 *
 * Used as the seed so Ben opens the builder and sees his own work rather than
 * invented placeholder sessions. The names are Kieron's own client data,
 * supplied for this purpose.
 */
export const SEED_WEEK: PlanWeek = {
  id: "w_2026-08-03",
  label: "Aug 3- 9",
  weekOf: "2026-08-03",
  runningVolume: "42km",
  notes: "Keep the ski and row easy. Push the wall balls.",
  coachMedia: { kind: "audio", label: "Ben talks through the week", durationSec: 96 },
  days: [
    {
      date: "2026-08-03",
      dayName: "Monday",
      am: `20 mins ski
20 mins row
into
15 min EMOM
1. 15 wall balls @ 9kg
2. 20m burpee
3. 12.5m sled pull
4. 25m sled push @ pro
5. Rest
x3`,
      pm: "",
    },
    {
      date: "2026-08-04",
      dayName: "Tuesday",
      am: `2km easy
3x30 sec strides
8x1km off 90
2km easy
See where you are here but lets try and average sub 4:00`,
      pm: "",
    },
    {
      date: "2026-08-05",
      dayName: "Wednesday",
      am: `15 mins ski
30 CTP burpees
15 mins row
30 CTP burpees
15 mins bike
30 CTP burpees
on these - practice hitting the ground quickly.`,
      pm: "",
    },
    {
      date: "2026-08-06",
      dayName: "Thursday",
      am: `1km easy
10km progression run
2km @ 5:00
2km @ 4:45
2km @ 4:30
2km @ 4:15
2km @ 4:00
1km easy`,
      pm: "",
    },
    { date: "2026-08-07", dayName: "Friday", am: "Rest", pm: "" },
    {
      date: "2026-08-08",
      dayName: "Saturday",
      am: `2km easy jog
3x30 sec strides
2x
2.5km @ 4:15 off 2 mins
2 mins
1km @ 4:10
50m push @ 205kg
1km @ 4:10`,
      pm: `10 mins easy bike
30 mins Hyrox EMOM
1: 12.5m sled push @ open weight
2: 20m burpee
3: 15 wall balls @ 9kg
4: 12.5m sled pull @ open weight
5: 20 reverse lunges @ 30kg
6: rest
x5
10 mins easy bike`,
    },
    {
      date: "2026-08-09",
      dayName: "Sunday",
      am: `10km easy run
finish with 100 hand release press ups for time.`,
      pm: "",
    },
  ],
};
