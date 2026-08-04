import { describe, expect, it } from "vitest";
import {
  CUSTOM_TOKENS,
  cost,
  create,
  renderCustom,
  sortCustom,
  validate,
  type CustomTemplate,
} from "./custom";
import { TOKENS } from "./templates";

const NOW = new Date("2026-08-04T12:00:00Z");

function tpl(over: Partial<CustomTemplate> = {}): CustomTemplate {
  return {
    id: "custom_x_1",
    name: "Reschedule",
    channel: "sms",
    body: "Hi {{firstName}}, can we move to {{when}}?",
    createdISO: NOW.toISOString(),
    ...over,
  };
}

describe("validation", () => {
  it("reports every problem at once, not the first", () => {
    // Being told about one, fixing it, and being told about the next is the
    // most irritating form a validator takes.
    const problems = validate({ name: "", body: "  " }, []);
    expect(problems.map((p) => p.field).sort()).toEqual(["body", "name"]);
  });

  /* Two templates called "Reschedule" is two templates nobody can tell apart
     in a list, which is the only place they are ever seen. */
  it("refuses a duplicate name, whatever the casing", () => {
    const existing = [tpl({ name: "Reschedule" })];
    expect(validate({ name: "reschedule", body: "x" }, existing)).toHaveLength(1);
    expect(validate({ name: "  RESCHEDULE  ", body: "x" }, existing)).toHaveLength(1);
  });

  it("lets a template keep its own name while being edited", () => {
    const existing = [tpl({ id: "keep", name: "Reschedule" })];
    expect(validate({ name: "Reschedule", body: "x" }, existing, "keep")).toEqual([]);
  });

  it("passes a template that is fine", () => {
    expect(validate({ name: "Session check-in", body: "How did that feel?" }, [])).toEqual([]);
  });
});

describe("creating", () => {
  it("keeps the name readable and the id unique", () => {
    const a = create({ name: "Session check-in", channel: "sms", body: "x" }, NOW);
    expect(a.name).toBe("Session check-in");
    expect(a.id).toContain("session-check-in");

    // A template written in one tab must not collide with one in another.
    const b = create(
      { name: "Session check-in", channel: "sms", body: "x" },
      new Date(NOW.getTime() + 1000),
    );
    expect(b.id).not.toBe(a.id);
  });

  it("survives a name with nothing sluggable in it", () => {
    expect(create({ name: "!!!", channel: "sms", body: "x" }, NOW).id).toContain("untitled");
  });

  it("trims the name, so a stray space is not a different template", () => {
    expect(create({ name: "  Nudge  ", channel: "sms", body: "x" }, NOW).name).toBe("Nudge");
  });
});

describe("cost", () => {
  /**
   * Measured on the filled-in message, not the template.
   *
   * "Hi {{firstName}}" is 17 characters and "Hi Jess" is 7, so counting the
   * raw template reports a number that is never the one being charged for.
   */
  it("counts the message as it will send, not as it is written", () => {
    const written = "Hi {{firstName}}";
    expect(cost(written).characters).toBe(`Hi ${TOKENS.firstName.example}`.length);
  });

  it("notices a character that halves the limit", () => {
    // A curly apostrophe is not in GSM-7, which drops the limit to 70.
    expect(cost("Ben’s plan").gsm7).toBe(false);
    expect(cost("Bens plan").gsm7).toBe(true);
  });

  it("counts a long message as more than one segment", () => {
    expect(cost("a".repeat(200)).segments).toBeGreaterThan(1);
    expect(cost("short").segments).toBe(1);
  });
});

describe("rendering", () => {
  it("fills the tokens in for a real person", () => {
    const out = renderCustom(tpl(), { firstName: "Dean", when: "Thursday 7am" });
    expect(out.body).toBe("Hi Dean, can we move to Thursday 7am?");
    expect(out.subject).toBeUndefined();
  });

  it("renders an email subject as well as its body", () => {
    const out = renderCustom(
      tpl({ channel: "email", subject: "{{firstName}}, your plan" }),
      { firstName: "Dean" },
    );
    expect(out.subject).toBe("Dean, your plan");
  });
});

describe("the token list", () => {
  /**
   * The catalogue restricts each template to the tokens its trigger can
   * supply — a booking confirmation knows the time, a payment failure does
   * not. A hand-sent message has no trigger, so there is nothing to derive a
   * restriction from and every token is offered.
   */
  it("offers everything, because there is no trigger to narrow it", () => {
    expect(CUSTOM_TOKENS.sort()).toEqual(Object.keys(TOKENS).sort());
  });
});

describe("ordering", () => {
  it("puts the newest first, which is the one being looked for", () => {
    const list = [
      tpl({ id: "old", createdISO: "2026-01-01T00:00:00.000Z" }),
      tpl({ id: "new", createdISO: "2026-08-01T00:00:00.000Z" }),
    ];
    expect(sortCustom(list).map((t) => t.id)).toEqual(["new", "old"]);
  });
});
