/**
 * Templates Ben writes himself.
 *
 * The catalogue is what the app sends on its own: thirty-three emails and
 * fifteen texts, each tied to a trigger. It is deliberately closed — you
 * cannot invent a new lifecycle email, because nothing would fire it.
 *
 * This is the other half. The messages Ben sends *by hand*, over and over,
 * and currently retypes every time: "can we move to Thursday", "how did the
 * session feel", "your plan is up, have a look". Those are not a lifecycle,
 * they are his own shorthand, and there is no reason he should have to ask
 * anyone to add one.
 *
 * WHY IT IS A SEPARATE MODEL
 * A custom template has no trigger and no legal classification to inherit, so
 * it cannot be poured into `TEMPLATES` without one of those two being a lie.
 * Keeping it separate means the catalogue stays the honest list of what sends
 * itself, and this stays the honest list of what Ben sends.
 */

import { TOKENS, draftSegments, draftIsGsm7, preview, render, type TokenId } from "@/lib/comms/templates";

export const CUSTOM_KEY = "comms.custom.v1";

export type CustomTemplate = {
  id: string;
  /** What Ben calls it. This is how he will find it again. */
  name: string;
  channel: "sms" | "email";
  /** Emails only. Empty for a text. */
  subject?: string;
  body: string;
  /** ISO. Newest first in the list. */
  createdISO: string;
};

/**
 * Every token is offered to a custom template.
 *
 * The catalogue restricts each template to the tokens its trigger can
 * actually supply — a booking confirmation knows the time, a payment failure
 * does not. A hand-sent message has no trigger, so the restriction has nothing
 * to derive from; Ben picks the person and fills the gaps himself.
 */
export const CUSTOM_TOKENS: TokenId[] = Object.keys(TOKENS) as TokenId[];

export type Problem = { field: "name" | "body"; message: string };

/**
 * What is wrong with it, in the words the writer needs.
 *
 * Returns every problem rather than the first, because fixing one and being
 * told about the next is the most irritating form a validator takes.
 */
export function validate(
  draft: Pick<CustomTemplate, "name" | "body">,
  existing: CustomTemplate[],
  editingId?: string,
): Problem[] {
  const problems: Problem[] = [];
  const name = draft.name.trim();

  if (!name) {
    problems.push({ field: "name", message: "Give it a name so you can find it again." });
  } else if (
    existing.some(
      (t) => t.id !== editingId && t.name.trim().toLowerCase() === name.toLowerCase(),
    )
  ) {
    // Two templates called "Reschedule" is two templates nobody can tell
    // apart in a list, which is the only place they are ever seen.
    problems.push({ field: "name", message: "You already have one with that name." });
  }

  if (!draft.body.trim()) {
    problems.push({ field: "body", message: "An empty message will not send." });
  }

  return problems;
}

/**
 * Create one.
 *
 * The id is derived from the name and the moment, not a counter, so a
 * template created in one tab cannot collide with one created in another.
 */
export function create(
  draft: Omit<CustomTemplate, "id" | "createdISO">,
  now: Date,
): CustomTemplate {
  const slug = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    ...draft,
    name: draft.name.trim(),
    id: `custom_${slug || "untitled"}_${now.getTime()}`,
    createdISO: now.toISOString(),
  };
}

/** Newest first — the one just written is the one being looked for. */
export function sortCustom(list: CustomTemplate[]): CustomTemplate[] {
  return [...list].sort((a, b) => (a.createdISO < b.createdISO ? 1 : -1));
}

/**
 * What it costs to send, before it is sent.
 *
 * Measured on the *filled-in* message, not the template. "Hi {{firstName}}"
 * is 17 characters and "Hi Christopher" is 14, so counting the raw template
 * tells you a number that is never the one you are charged for.
 */
export function cost(body: string): { characters: number; segments: number; gsm7: boolean } {
  const shown = preview(body);
  return {
    characters: shown.length,
    segments: draftSegments(shown),
    gsm7: draftIsGsm7(shown),
  };
}

/** Fill it in for a real person. */
export function renderCustom(
  template: CustomTemplate,
  values: Partial<Record<TokenId, string>>,
): { subject?: string; body: string } {
  return {
    subject: template.subject ? render(template.subject, values) : undefined,
    body: render(template.body, values),
  };
}
