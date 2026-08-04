/**
 * Editable message templates.
 *
 * THE PROBLEM THIS SOLVES
 *
 * Every text and email is currently a TypeScript function:
 *
 *   confirmation: ({ firstName }) => `Hi ${firstName}, it's Ben...`
 *
 * which is fine until the person who wants to change the wording is Ben. He
 * should not need a pull request to soften a sentence, and the wording is the
 * part most likely to want changing.
 *
 * So a template is a string with tokens in it — "Hi {{firstName}}, it's Ben"
 * — plus a list of which tokens it is allowed to use. The editor offers those
 * tokens as buttons; clicking one inserts it. Nobody types curly braces.
 *
 * NOTHING BREAKS WHILE THIS LANDS
 *
 * The functions in lib/sms/messages.ts and lib/email/templates are still the
 * source of truth for what sends today. This module holds *overrides*: if an
 * override exists for a template id it wins, otherwise the code default does.
 * That means the editor can ship before every template is migrated, and a bad
 * edit is one "reset to default" away from the original.
 */

export type TokenId =
  | "firstName"
  | "coachName"
  | "when"
  | "link"
  | "planName"
  | "amount"
  | "raceName"
  | "daysLeft";

export type Token = {
  id: TokenId;
  /** What the button says. Never the raw token. */
  label: string;
  /** Shown under the label, and used in the preview. */
  example: string;
  hint?: string;
};

export const TOKENS: Record<TokenId, Token> = {
  firstName: { id: "firstName", label: "First name", example: "Jess" },
  coachName: { id: "coachName", label: "Coach name", example: "Ben" },
  when: { id: "when", label: "Date and time", example: "Tuesday at 6pm" },
  link: { id: "link", label: "Link", example: "suthperformance.com/o/b2fv", hint: "The invite or booking link for this message." },
  planName: { id: "planName", label: "Programme", example: "First Race" },
  amount: { id: "amount", label: "Amount", example: "£8.99" },
  raceName: { id: "raceName", label: "Race", example: "HYROX Manchester" },
  daysLeft: { id: "daysLeft", label: "Days left", example: "3" },
};

export type Channel = "sms" | "email";

export type TemplateDef = {
  id: string;
  channel: Channel;
  /** Where in the funnel this fires. Shown as the grouping in the editor. */
  stage: string;
  /** One line: when this sends. */
  when: string;
  /** Tokens this template may use. The editor shows exactly these. */
  tokens: TokenId[];
  /** Email only. */
  defaultSubject?: string;
  defaultBody: string;
};

/**
 * Render a template. Unknown tokens are left visible rather than blanked:
 * "Hi {{firstname}}" going out with a hole in it is worse than going out
 * obviously wrong, because the second one gets noticed and fixed.
 */
export function render(text: string, values: Partial<Record<TokenId, string>>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key: string) => {
    const v = values[key as TokenId];
    return v === undefined || v === "" ? whole : v;
  });
}

/** Preview using each token's example value. */
export function preview(text: string): string {
  const values = Object.fromEntries(
    Object.values(TOKENS).map((t) => [t.id, t.example]),
  ) as Record<TokenId, string>;
  return render(text, values);
}

/** Tokens actually used in a body, in order of first appearance. */
export function tokensUsed(text: string): TokenId[] {
  const found: TokenId[] = [];
  for (const m of text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    const id = m[1] as TokenId;
    if (TOKENS[id] && !found.includes(id)) found.push(id);
  }
  return found;
}

/**
 * Tokens in the body that this template is not allowed to use. Surfaced in
 * the editor as a warning, because a token nothing will ever fill is a hole
 * in a message somebody receives.
 */
export function unknownTokens(text: string, allowed: TokenId[]): string[] {
  const bad: string[] = [];
  for (const m of text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) {
    const id = m[1];
    if (!TOKENS[id as TokenId] || !allowed.includes(id as TokenId)) {
      if (!bad.includes(id)) bad.push(id);
    }
  }
  return bad;
}

/* ── The catalogue ──────────────────────────────────────────────────────
   Bodies lifted verbatim from lib/sms/messages.ts, with the interpolations
   swapped for tokens. Same words, so nothing reads differently the day the
   editor ships. */

export const TEMPLATES: TemplateDef[] = [
  {
    id: "sms.first-contact",
    channel: "sms",
    stage: "New lead",
    when: "Sent the moment Ben marks a lead contacted.",
    tokens: ["firstName", "coachName"],
    defaultBody:
      "Hi {{firstName}}, it's {{coachName}} from Suth Performance. Got your plan and your answers. I'll be in touch shortly. Reply here any time.",
  },
  {
    id: "sms.call-booked",
    channel: "sms",
    stage: "Call booked",
    when: "When a call goes in the diary.",
    tokens: ["firstName", "coachName", "when"],
    defaultBody:
      "Hi {{firstName}}, {{coachName}} from Suth Performance. You're booked in for {{when}}. Reply here if you need to move it.",
  },
  {
    id: "sms.reminder-24h",
    channel: "sms",
    stage: "Call booked",
    when: "A day before the call.",
    tokens: ["firstName", "coachName", "when"],
    defaultBody:
      "{{firstName}}, reminder: your call with {{coachName}} is {{when}}. Reply if you need to move it.",
  },
  {
    id: "sms.follow-up",
    channel: "sms",
    stage: "Deciding",
    when: "After a call where they wanted to think about it, and on each nudge.",
    tokens: ["firstName", "coachName"],
    defaultBody:
      "{{firstName}}, it's {{coachName}}. No rush at all, just checking whether you had any other questions about the plan.",
  },
  {
    id: "sms.no-show",
    channel: "sms",
    stage: "Call booked",
    when: "When they miss the call.",
    tokens: ["firstName", "coachName"],
    defaultBody:
      "{{firstName}}, {{coachName}} here. Sorry we missed each other. Reply with a couple of times that suit and I'll work round you.",
  },
  {
    id: "sms.onboarding-invite",
    channel: "sms",
    stage: "Ready to onboard",
    when: "Alongside the onboarding email, so the link is on their phone.",
    tokens: ["firstName", "coachName", "link"],
    defaultBody:
      "{{firstName}}, it's {{coachName}}. Welcome aboard! 5 mins to set up: {{link}}",
  },
  {
    /*
     * The one the pipeline actually fires on its own (see
     * lead-record.ts: pendingAutomations). It was the only automated message
     * with no way to change its wording, which is the worst combination:
     * sends itself, and Ben cannot touch it.
     */
    id: "sms.reminder-1h",
    channel: "sms",
    stage: "Call booked",
    when: "An hour before the call. Sent automatically.",
    tokens: ["coachName", "when"],
    defaultBody:
      "{{coachName}} here. We're on in about an hour ({{when}}). Speak shortly.",
  },
  {
    id: "sms.callback",
    channel: "sms",
    stage: "New lead",
    when: "They asked for a callback rather than booking a slot.",
    tokens: ["firstName", "coachName", "when"],
    defaultBody:
      "Hi {{firstName}}, {{coachName}} from Suth Performance. Got your details. I'll call you {{when}}. Reply here if that changes.",
  },
  {
    id: "sms.client-welcome",
    channel: "sms",
    stage: "Client",
    when: "The first message after they become a coaching client.",
    tokens: ["firstName", "coachName"],
    defaultBody:
      "Welcome aboard {{firstName}}. {{coachName}} here. Your first week is in your account now. Any questions, this number reaches me.",
  },
  {
    /* Never automated blind — Ben sends this one, which is exactly why the
       words have to be his rather than ours. */
    id: "sms.race-day",
    channel: "sms",
    stage: "Client",
    when: "The morning of a race. Coaching clients only, sent by hand.",
    tokens: ["firstName", "coachName", "raceName"],
    defaultBody:
      "Morning {{firstName}}, {{coachName}} here. Today is just the victory lap on work you already did. Stick to the pacing plan. Go well.",
  },
  {
    id: "email.onboarding-invite",
    channel: "email",
    stage: "Ready to onboard",
    when: "The invite that starts their account.",
    tokens: ["firstName", "coachName", "link", "planName"],
    defaultSubject: "Your {{planName}} plan is ready, {{firstName}}",
    defaultBody:
      "Hi {{firstName}},\n\nGreat to speak. Your {{planName}} programme is set up and waiting.\n\nSetting up takes about five minutes: {{link}}\n\nAny questions, just reply to this email and it comes straight to me.\n\n{{coachName}}",
  },
  {
    id: "email.follow-up",
    channel: "email",
    stage: "Deciding",
    when: "The written version of the follow-up, when a text is not enough.",
    tokens: ["firstName", "coachName", "planName"],
    defaultSubject: "No rush, {{firstName}}",
    defaultBody:
      "Hi {{firstName}},\n\nNo pressure at all. I wanted to leave the door open in case anything about the {{planName}} block was unclear.\n\nHappy to answer anything, or to leave you to it.\n\n{{coachName}}",
  },
];

export function templateById(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/* ── Overrides ──────────────────────────────────────────────────────────
   Stored per template id. Kept separate from the defaults so "reset" is
   always available and a default can be improved without stamping on an
   edit somebody made deliberately. */

export type TemplateOverride = { subject?: string; body: string; editedAt: string };
export type OverrideMap = Record<string, TemplateOverride>;

export const OVERRIDES_KEY = "control.commsOverrides.v1";

/** The wording that would actually send right now. */
export function effective(
  def: TemplateDef,
  overrides: OverrideMap,
): { subject?: string; body: string; edited: boolean } {
  const o = overrides[def.id];
  if (!o) return { subject: def.defaultSubject, body: def.defaultBody, edited: false };
  return {
    subject: o.subject ?? def.defaultSubject,
    body: o.body,
    edited: true,
  };
}

/* ── SMS length, duplicated deliberately ────────────────────────────────
   lib/sms/messages.ts owns the real implementation and the tests that pin
   it. These are the same rules, re-stated here so the editor can count a
   draft without importing the send path into a client component. If they
   ever disagree, messages.ts wins. */

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

export function draftIsGsm7(text: string): boolean {
  return [...text].every((c) => GSM7.includes(c) || GSM7_EXT.includes(c));
}

export function draftLength(text: string): number {
  return [...text].reduce((n, c) => n + (GSM7_EXT.includes(c) ? 2 : 1), 0);
}

export function draftSegments(text: string): number {
  const gsm = draftIsGsm7(text);
  const len = gsm ? draftLength(text) : [...text].length;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (len === 0) return 0;
  return len <= single ? 1 : Math.ceil(len / multi);
}
