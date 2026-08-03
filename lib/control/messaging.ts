/**
 * THE MESSAGES THE APP SENDS.
 *
 * Ben's messaging was an inbox and a read-only list of template names. What he
 * asked for is the thing that actually matters: every automated SMS and email
 * in one place, editable, with a switch per client.
 *
 * CLASSIFICATION IS LOAD-BEARING, NOT A LABEL (HARD-RULES §11)
 * ------------------------------------------------------------
 * A transactional message is one the person needs because of something they
 * did — their plan is ready, their card failed. Marketing is anything sent to
 * make them buy. The law treats them differently: opting out of marketing must
 * stop marketing and must NOT stop transactional, or an athlete who unticks a
 * box stops being told their payment failed.
 *
 * So every template carries a classification, marketing templates must carry a
 * way out, and the per-client switches cannot turn a transactional message off
 * — the model refuses it rather than the UI hiding the control, because a rule
 * enforced only in a component is a rule until somebody writes a second
 * component.
 *
 * NOTHING SENDS YET. There is no Resend key and no Twilio key. Everything here
 * is authored, validated and previewed; the screen says so plainly rather than
 * implying an athlete received something.
 */

import { isGsm7, segments, smsLength } from "@/lib/sms/messages";

export type Channel = "sms" | "email";
export type Classification = "transactional" | "marketing";

export type Template = {
  id: string;
  /** Stable key the app would send by. Never changes once anything uses it. */
  key: string;
  name: string;
  /** What causes it to send, in plain English. */
  trigger: string;
  channel: Channel;
  classification: Classification;
  /** Email only. */
  subject: string;
  body: string;
  /** Off means the app would not send it at all, to anybody. */
  enabled: boolean;
};

/**
 * The variables a template may use.
 *
 * A closed list on purpose: an unrecognised variable is not a typo that
 * degrades gracefully, it is `{{frist_name}}` arriving in a client's inbox.
 */
export const VARIABLES: { token: string; describes: string; sample: string }[] = [
  { token: "first_name", describes: "The athlete's first name", sample: "Sam" },
  { token: "coach", describes: "Coach's name", sample: "Ben" },
  // The sample carries a plain hyphen because Ben's own sheet does. An en
  // dash here would make every SMS preview look like it costs two segments.
  { token: "week_label", describes: "The week the plan covers", sample: "Aug 3- 9" },
  { token: "plan_link", describes: "Link to their plan", sample: "suthperformance.com/app/plan" },
  { token: "onboarding_link", describes: "Link to finish setting up", sample: "suthperformance.com/welcome/xyz" },
  { token: "amount", describes: "Amount, formatted", sample: "£220" },
  { token: "due_date", describes: "When it is due", sample: "12 August" },
  { token: "race_name", describes: "Their next race", sample: "HYROX Manchester" },
  { token: "days_until", describes: "Days until that race", sample: "18" },
  { token: "unsubscribe_link", describes: "One-click opt out. Required on marketing.", sample: "suthperformance.com/unsub/xyz" },
];

const KNOWN = new Set(VARIABLES.map((v) => v.token));

/** Every `{{token}}` a body or subject uses, in order of appearance. */
export function usedVariables(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((m) => m[1]);
}

export function unknownVariables(t: Template): string[] {
  const all = [...usedVariables(t.subject), ...usedVariables(t.body)];
  return [...new Set(all.filter((v) => !KNOWN.has(v)))];
}

/** The message as the person would receive it, with the sample values in. */
export function preview(text: string): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (whole, token) => {
    const v = VARIABLES.find((x) => x.token === token);
    return v ? v.sample : whole;
  });
}

/* ── SMS length ────────────────────────────────────────────────────────── */

/**
 * Segment counting comes from lib/sms/messages.ts, which already had it.
 *
 * I wrote a second copy of the GSM-7 table and the segment arithmetic before
 * noticing. Two implementations of a billing rule is how they drift, and the
 * one that drifts is always the one nobody is looking at.
 */
export type SmsCost = {
  characters: number;
  segments: number;
  encoding: "GSM" | "UCS-2";
  /** Characters left in the current segment. */
  remaining: number;
};

export function smsCost(text: string): SmsCost {
  const gsm = isGsm7(text);
  const characters = gsm ? smsLength(text) : [...text].length;
  const count = characters === 0 ? 0 : segments(text);
  const single = gsm ? 160 : 70;
  const concat = gsm ? 153 : 67;
  const capacity = count <= 1 ? single : concat * count;

  return {
    characters,
    segments: count,
    encoding: gsm ? "GSM" : "UCS-2",
    remaining: Math.max(0, capacity - characters),
  };
}

/* ── Validation ────────────────────────────────────────────────────────── */

export type Problem = { level: "error" | "warning"; message: string };

/**
 * What is wrong with a template, worst first.
 *
 * Errors are things that must not be sent. Warnings are things Ben should
 * know and may accept — an SMS costing three segments is his money, not a bug.
 */
export function problems(t: Template): Problem[] {
  const out: Problem[] = [];

  const unknown = unknownVariables(t);
  if (unknown.length) {
    out.push({
      level: "error",
      message: `Unknown ${unknown.length === 1 ? "variable" : "variables"}: ${unknown
        .map((u) => `{{${u}}}`)
        .join(", ")}. That would be sent to the client exactly as written.`,
    });
  }

  if (!t.body.trim()) {
    out.push({ level: "error", message: "There is no message." });
  }

  if (t.channel === "email" && !t.subject.trim()) {
    out.push({ level: "error", message: "An email with no subject line." });
  }

  if (t.classification === "marketing" && !usedVariables(t.body).includes("unsubscribe_link")) {
    // PECR and UK GDPR both require it, and the app cannot add it afterwards
    // without mangling whatever Ben wrote.
    out.push({
      level: "error",
      message: "Marketing must include {{unsubscribe_link}}. It is a legal requirement, not a preference.",
    });
  }

  if (t.channel === "sms") {
    const cost = smsCost(t.body);
    if (cost.encoding === "UCS-2") {
      out.push({
        level: "warning",
        message:
          "A character outside the plain SMS set — usually a curly quote or a dash pasted from elsewhere — cuts each segment from 160 characters to 70.",
      });
    }
    if (cost.segments > 2) {
      out.push({
        level: "warning",
        message: `${cost.segments} segments. Every send costs ${cost.segments} messages.`,
      });
    }
  }

  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
}

export function canSend(t: Template): boolean {
  return t.enabled && !problems(t).some((p) => p.level === "error");
}

/* ── Per-client switches ───────────────────────────────────────────────── */

export const MUTES_KEY = "messaging.mutes";
export const TEMPLATES_KEY = "messaging.templates";

/** One row per (client, template) that has been switched off. */
export type Mute = { id: string; clientId: string; templateKey: string };

export function muteId(clientId: string, templateKey: string): string {
  return `${clientId}::${templateKey}`;
}

/**
 * Whether this client would receive this template.
 *
 * A transactional message cannot be muted per client. Somebody who has turned
 * off marketing must still be told their card failed, and the place to enforce
 * that is here rather than in whichever screen happens to draw the switch.
 */
export function isMuted(t: Template, clientId: string, mutes: Mute[]): boolean {
  if (t.classification === "transactional") return false;
  return mutes.some((m) => m.id === muteId(clientId, t.key));
}

export function canMute(t: Template): boolean {
  return t.classification === "marketing";
}

/* ── Seed ──────────────────────────────────────────────────────────────── */

/**
 * The messages this product actually sends, written out.
 *
 * Not invented marketing copy — each one corresponds to something the app
 * already does or is about to: a plan being sent, a payment failing, an
 * onboarding link going out. Ben edits the words; the triggers are the
 * product's.
 */
export const SEED_TEMPLATES: Template[] = [
  {
    id: "t_welcome_sms",
    key: "welcome.sms",
    name: "Welcome — set up your account",
    trigger: "Ben adds a client and sends the onboarding link",
    channel: "sms",
    classification: "transactional",
    subject: "",
    body: "Hi {{first_name}}, it's {{coach}} at Suth Performance. Here's your link to finish setting up and get your first week: {{onboarding_link}}",
    enabled: true,
  },
  {
    id: "t_welcome_email",
    key: "welcome.email",
    name: "Welcome — the long version",
    trigger: "Sent alongside the welcome SMS",
    channel: "email",
    classification: "transactional",
    subject: "Welcome to Suth Performance, {{first_name}}",
    body:
      "Hi {{first_name}},\n\n" +
      "Great to have you on board. Before I write your first week I need a few things from you — how you're training now, anything I should know about injuries, and which days you can train.\n\n" +
      "It takes about five minutes: {{onboarding_link}}\n\n" +
      "Any questions, reply to this email and it comes straight to me.\n\n" +
      "{{coach}}",
    enabled: true,
  },
  {
    id: "t_plan_ready",
    key: "plan.ready",
    name: "Your week is ready",
    trigger: "Ben presses Send on a plan",
    channel: "email",
    classification: "transactional",
    subject: "Your training for {{week_label}}",
    body:
      "{{first_name}},\n\n" +
      "{{week_label}} is up. The PDF and the spreadsheet are attached, and it's in your account here: {{plan_link}}\n\n" +
      "Tick sessions off as you go so I can see how the week went before I write the next one.\n\n" +
      "{{coach}}",
    enabled: true,
  },
  {
    id: "t_plan_ready_sms",
    key: "plan.ready.sms",
    name: "Your week is ready — SMS",
    trigger: "Sent with the plan email",
    channel: "sms",
    classification: "transactional",
    subject: "",
    body: "{{first_name}} - {{week_label}} is in your account: {{plan_link}}",
    enabled: true,
  },
  {
    id: "t_payment_failed",
    key: "payment.failed",
    name: "Card declined",
    trigger: "Stripe reports a failed payment",
    channel: "email",
    classification: "transactional",
    subject: "Your payment didn't go through",
    body:
      "{{first_name}},\n\n" +
      "Your {{amount}} payment didn't go through — usually an expired card. You can update it here and nothing else changes: {{plan_link}}\n\n" +
      "{{coach}}",
    enabled: true,
  },
  {
    id: "t_payment_failed_sms",
    key: "payment.failed.sms",
    name: "Card declined — SMS",
    trigger: "Sent two days after the email if it is still unpaid",
    channel: "sms",
    classification: "transactional",
    subject: "",
    body: "{{first_name}}, your {{amount}} payment to Suth Performance didn't go through. Update your card here: {{plan_link}}",
    enabled: true,
  },
  {
    id: "t_checkin",
    key: "checkin.quiet",
    name: "Quiet week check-in",
    trigger: "No sessions ticked off for seven days",
    channel: "sms",
    classification: "transactional",
    subject: "",
    body: "{{first_name}}, haven't seen anything ticked off this week - everything alright? {{coach}}",
    enabled: true,
  },
  {
    id: "t_race_week",
    key: "race.week",
    name: "Race week",
    trigger: "Seven days before their next race",
    channel: "email",
    classification: "transactional",
    subject: "{{race_name}} — {{days_until}} days",
    body:
      "{{first_name}},\n\n" +
      "{{race_name}} is {{days_until}} days out. This week is about arriving fresh, not proving anything.\n\n" +
      "Your plan is here: {{plan_link}}\n\n" +
      "{{coach}}",
    enabled: true,
  },
  {
    id: "t_winback",
    key: "marketing.winback",
    name: "Come back — lapsed client",
    trigger: "Manually, to somebody who left over 60 days ago",
    channel: "email",
    classification: "marketing",
    subject: "Fancy another block, {{first_name}}?",
    body:
      "{{first_name}},\n\n" +
      "It's been a while. If you're thinking about another race, I've got space from next month.\n\n" +
      "{{coach}}\n\n" +
      "Don't want these? {{unsubscribe_link}}",
    enabled: false,
  },
];

/** The clients a mute can be set against, for the screen's per-client list. */
export type MessageAudience = { id: string; name: string };
