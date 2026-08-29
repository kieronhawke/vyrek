/**
 * The coach thread.
 *
 * The one channel the product did not have. The athlete could answer back to a
 * specific session (SessionFeedback) but could not ask a question — which is
 * the thing people actually pay a coach for, and the thing they will cancel
 * over if it is missing.
 *
 * Modelled as a single thread per athlete rather than per topic. Ben is one
 * person; a threaded inbox would be a filing system for a conversation that is
 * really just a conversation. spec/09 §15 asks for a unified SMS + email inbox
 * on the coach side, and this is the in-app leg of it.
 *
 * NOT CONNECTED. Nothing here sends. The shape is what the schema has to
 * store, and the quick prompts are the part worth agreeing now: they decide
 * what most messages will be about, and therefore what Ben has to answer most.
 */

/**
 * "system" is not a person. It is the thread recording that something
 * happened — a call booked, a plan published — and it renders as a centred
 * line rather than a bubble, because attributing it to Ben would be a lie
 * and attributing it to the athlete would be confusing.
 */
export type MessageAuthor = "athlete" | "coach" | "system";

export type CoachMessage = {
  id: string;
  author: MessageAuthor;
  /** ISO date, so it can be grouped and formatted per locale. */
  sentAt: string;
  body: string;
  /** Set when the message is about a specific session. */
  about?: { day: string; title: string };
  /** Coach messages only: has the athlete opened it. */
  readByAthlete?: boolean;
  /**
   * A photo or a video of a set. The thing a written plan cannot do, and the
   * reason people pay for a coach rather than buy a programme.
   */
  attachment?: {
    kind: "image" | "video";
    src: string;
    name: string;
    size: number;
  };
  /**
   * Set on the entry a booking writes into the thread.
   *
   * A booked call is neither Ben talking nor the athlete talking — it is a
   * thing that happened — so it renders as a system line rather than a
   * bubble, and it doubles as the receipt.
   */
  booking?: { ref: string; startISO: string };
  /** Which topic the athlete picked, so a reply can be filed against it. */
  topic?: string;
};

/**
 * The prompts under an empty composer.
 *
 * Deliberately the four questions a HYROX athlete actually asks, phrased the
 * way they would say them. A blank box gets no messages; a blank box with
 * "I've got a niggle" gets the message that matters most.
 */
export const QUICK_PROMPTS = [
  { id: "niggle", label: "I've picked up a niggle", body: "I've picked up a niggle — " },
  { id: "swap", label: "Can I move a session?", body: "Can I move a session this week? " },
  { id: "technique", label: "Technique question", body: "Technique question about " },
  { id: "race", label: "Race day question", body: "Question about race day — " },
] as const;

export const DEMO_THREAD: CoachMessage[] = [
  {
    id: "m1",
    author: "coach",
    sentAt: "2026-07-26T09:12:00Z",
    body:
      "Morning. New block is up — we move into build this week. The runs get faster, not longer. Shout if Thursday feels rough, that's the one I'll adjust first.",
    readByAthlete: true,
  },
  {
    id: "m2",
    author: "athlete",
    sentAt: "2026-07-28T19:40:00Z",
    body:
      "Sled turned into a grind by round 4 tonight. Got through it but the last two were ugly.",
    about: { day: "Tue", title: "Hyrox hybrid: run + sled" },
  },
  {
    id: "m3",
    author: "coach",
    sentAt: "2026-07-28T21:05:00Z",
    body:
      "That's useful, thanks. Ugly at the end of six rounds is about right, but not if the technique goes. Next week I'll drop the sled to 50% and add a round — I'd rather you hold the position than move the weight.",
    readByAthlete: true,
  },
  {
    id: "m4",
    author: "athlete",
    sentAt: "2026-07-30T07:15:00Z",
    body: "Makes sense. Also — is the Saturday simulation full distance or half?",
  },
  {
    id: "m5",
    author: "coach",
    sentAt: "2026-07-30T08:02:00Z",
    body:
      "Half. Four stations and 4 km. Full simulation is week 8, once we've built into it.",
    readByAthlete: false,
  },
];

/** Newest first, for the coach inbox; oldest first is the thread view. */
export function unreadFromCoach(thread: CoachMessage[]): number {
  return thread.filter((m) => m.author === "coach" && m.readByAthlete === false)
    .length;
}

/** Group a thread into day buckets so the view can print a date separator. */
export function groupByDay(
  thread: CoachMessage[],
): { day: string; messages: CoachMessage[] }[] {
  const out: { day: string; messages: CoachMessage[] }[] = [];
  for (const m of thread) {
    const day = m.sentAt.slice(0, 10);
    const last = out[out.length - 1];
    if (last && last.day === day) last.messages.push(m);
    else out.push({ day, messages: [m] });
  }
  return out;
}

/** "Sunday 26 July" for a separator; "09:12" for a bubble. */
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${iso}T00:00:00Z`));
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}
