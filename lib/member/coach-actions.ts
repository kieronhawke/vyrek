/**
 * WHAT AN ATHLETE CAN ASK, AND HOW THEY GET TO IT.
 *
 * A blank composer gets no messages. That is not a design opinion, it is what
 * the thread looked like: one text box, four prompt chips, and most people
 * never typing anything — which is the "most of the people I coach never
 * complete anything" problem showing up in the product rather than in a
 * paragraph about it.
 *
 * So asking is a route, not a box. Pick what it is about, pick a question
 * close to yours or write your own, send. Three taps and no blank page.
 *
 * WHY THE QUESTIONS ARE WRITTEN OUT
 * ---------------------------------
 * Not to put words in anybody's mouth — every one of them is editable before
 * it sends. They exist because "ask your coach anything" is paralysing and
 * "is this knee pain something to train through?" is answerable. They are
 * also the questions Ben says he gets asked most, so they shape the thread
 * towards things he can actually act on rather than "how's it going".
 *
 * Pure. No React, no fetch. The composer renders these; it does not decide
 * them.
 */

export type TopicId =
  | "injury"
  | "session"
  | "technique"
  | "nutrition"
  | "race"
  | "plan";

export type Topic = {
  id: TopicId;
  label: string;
  /** One line under the label, so the choice is obvious without guessing. */
  hint: string;
  /**
   * Whether Ben should be told immediately rather than at his next sit-down.
   * An athlete in pain is not a "reply within a day" message.
   */
  urgent?: boolean;
  /** Openers. Editable before sending — they are a starting point, not a form. */
  questions: string[];
};

export const TOPICS: Topic[] = [
  {
    id: "injury",
    label: "Something hurts",
    hint: "A niggle, a pain, or an injury",
    urgent: true,
    questions: [
      "I've picked up a niggle in my ",
      "Is this something to train through, or should I stop?",
      "I felt something go during ",
      "How should I change this week around an injury?",
    ],
  },
  {
    id: "session",
    label: "A session",
    hint: "Moving it, missing it, or how it went",
    questions: [
      "Can I move this week's sessions around? ",
      "I missed a session — what should I do about it?",
      "That session felt much harder than it should have. ",
      "I finished well under the target time. Should I go heavier?",
    ],
  },
  {
    id: "technique",
    label: "Technique",
    hint: "Send a video and get it checked",
    questions: [
      "Can you check my form on this? ",
      "Where am I losing time on the sled?",
      "My grip goes before my legs on farmers carries. ",
      "Am I breathing wrong on the ski erg?",
    ],
  },
  {
    id: "nutrition",
    label: "Food and fuelling",
    hint: "What to eat, and when",
    questions: [
      "What should I be eating before this session?",
      "Am I eating enough for this training load?",
      "How should I fuel on race morning?",
      "I'm losing weight faster than I want to. ",
    ],
  },
  {
    id: "race",
    label: "Race day",
    hint: "Pacing, kit, and the day itself",
    questions: [
      "How should I pace this?",
      "What should I take with me on the day?",
      "What's a realistic target time for me now?",
      "How do I warm up for it?",
    ],
  },
  {
    id: "plan",
    label: "The plan",
    hint: "Where this is all going",
    questions: [
      "What's the thinking behind this block?",
      "Am I on track for my race?",
      "Can we change what we're aiming at?",
      "What should I be seeing by now?",
    ],
  },
];

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/**
 * What Ben's phone says.
 *
 * Deliberately short and deliberately without the question in it. A coaching
 * question can carry health information — "my knee", "I'm losing weight" —
 * and a lock-screen notification is read by whoever is holding the phone.
 * The text says somebody is waiting and where to go; the thread says what
 * they asked, behind his login.
 */
export function coachAlertText(args: {
  firstName: string;
  topic: TopicId;
  link: string;
}): string {
  const topic = topicById(args.topic);
  const urgency = topic?.urgent ? "Flagged as urgent. " : "";
  return `${args.firstName} asked you something in the app${
    topic ? ` about ${topic.label.toLowerCase()}` : ""
  }. ${urgency}Reply here: ${args.link}`;
}

/** Attachments an athlete can send. Video is the one that changes coaching. */
export type AttachmentKind = "image" | "video";

export type Attachment = {
  kind: AttachmentKind;
  /** Object URL or data URL. Local-only until there is somewhere to put it. */
  src: string;
  name: string;
  /** Bytes, so the thread can refuse something it cannot store. */
  size: number;
};

/**
 * The ceiling on what can be attached.
 *
 * The thread persists to this browser, and a phone video is tens of megabytes.
 * Storing one would blow the quota and take the whole thread with it — so a
 * video is held as an object URL for this session and the entry is explicit
 * that it uploads when Ben's side is connected. Better to say that than to
 * silently lose it.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export function attachmentProblem(file: {
  type: string;
  size: number;
}): string | null {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return "Send a photo or a video.";
  if (isImage && file.size > MAX_IMAGE_BYTES) return "That photo is too large.";
  if (isVideo && file.size > MAX_VIDEO_BYTES) return "That video is too long.";
  return null;
}
