import { describe, expect, it } from "vitest";
import {
  SEED_TEMPLATES,
  canMute,
  canSend,
  isMuted,
  muteId,
  preview,
  problems,
  smsCost,
  unknownVariables,
  usedVariables,
  type Mute,
  type Template,
} from "./messaging";
import { isGsm7, segments } from "@/lib/sms/messages";

function template(over: Partial<Template> = {}): Template {
  return {
    id: "t",
    key: "k",
    name: "n",
    trigger: "t",
    channel: "sms",
    classification: "transactional",
    subject: "",
    body: "Hi {{first_name}}",
    enabled: true,
    ...over,
  };
}

describe("variables", () => {
  it("finds them, tolerating spacing", () => {
    expect(usedVariables("Hi {{first_name}}, {{ coach }} here")).toEqual([
      "first_name",
      "coach",
    ]);
  });

  it("names any that are not real", () => {
    // `{{frist_name}}` is not a typo that degrades gracefully — it arrives in
    // somebody's inbox exactly as written.
    const t = template({ body: "Hi {{frist_name}} and {{first_name}}" });
    expect(unknownVariables(t)).toEqual(["frist_name"]);
    expect(problems(t)[0].level).toBe("error");
    expect(problems(t)[0].message).toContain("{{frist_name}}");
  });

  it("substitutes samples for a preview and leaves unknowns visible", () => {
    expect(preview("Hi {{first_name}}, it's {{coach}}")).toBe("Hi Sam, it's Ben");
    // Left as-is on purpose: the preview should show the mistake, not hide it.
    expect(preview("Hi {{nope}}")).toBe("Hi {{nope}}");
  });
});

describe("SMS cost", () => {
  it("counts plain text in 160s", () => {
    expect(smsCost("")).toMatchObject({ characters: 0, segments: 0 });
    expect(smsCost("a".repeat(160))).toMatchObject({ segments: 1, remaining: 0, encoding: "GSM" });
    // Over one segment the per-segment capacity drops to 153, because the
    // concatenation header eats seven characters of every part.
    expect(smsCost("a".repeat(161))).toMatchObject({ segments: 2, encoding: "GSM" });
    expect(smsCost("a".repeat(306))).toMatchObject({ segments: 2, remaining: 0 });
    expect(smsCost("a".repeat(307))).toMatchObject({ segments: 3 });
  });

  it("notices a single character that doubles the bill", () => {
    // A curly apostrophe pasted from a word processor forces UCS-2 and cuts
    // the segment from 160 characters to 70. Nothing else in the interface
    // would ever explain that to Ben.
    const curly = smsCost("It’s ready");
    expect(curly.encoding).toBe("UCS-2");
    expect(smsCost("It's ready").encoding).toBe("GSM");

    const t = template({ body: "It’s ready" });
    expect(problems(t).some((p) => p.message.includes("70"))).toBe(true);
  });

  it("charges two for the extended characters", () => {
    expect(smsCost("[").characters).toBe(2);
    expect(smsCost("€").characters).toBe(2);
  });

  it("agrees with the SMS module it delegates to", () => {
    // There is only one implementation of this arithmetic now. This asserts
    // the delegation, so a future divergence shows up here rather than on a
    // phone bill.
    for (const text of ["short", "a".repeat(200), "It’s ready", "€€€"]) {
      expect(smsCost(text).segments).toBe(segments(text));
      expect(smsCost(text).encoding).toBe(isGsm7(text) ? "GSM" : "UCS-2");
    }
  });

  it("warns rather than blocks on a long message", () => {
    // Three segments is Ben's money, not a bug.
    const t = template({ body: "a".repeat(400) });
    const found = problems(t);
    expect(found.some((p) => p.level === "warning" && p.message.includes("segments"))).toBe(true);
    expect(found.some((p) => p.level === "error")).toBe(false);
    expect(canSend(t)).toBe(true);
  });
});

describe("what cannot be sent", () => {
  it("refuses an empty message", () => {
    expect(problems(template({ body: "   " })).some((p) => p.level === "error")).toBe(true);
  });

  it("refuses an email with no subject", () => {
    const t = template({ channel: "email", subject: "", body: "Hello" });
    expect(problems(t).some((p) => p.message.includes("subject"))).toBe(true);
  });

  it("refuses marketing with no way out", () => {
    // PECR and UK GDPR both require it, and it cannot be bolted on afterwards
    // without mangling whatever Ben wrote.
    const without = template({ classification: "marketing", body: "Buy things" });
    expect(problems(without).some((p) => p.level === "error")).toBe(true);
    expect(canSend(without)).toBe(false);

    const with_ = template({
      classification: "marketing",
      body: "Buy things. Opt out: {{unsubscribe_link}}",
    });
    expect(problems(with_).some((p) => p.level === "error")).toBe(false);
  });

  it("does not require an opt-out on transactional", () => {
    // Requiring one would be worse than pointless: it invites somebody to opt
    // out of being told their payment failed.
    expect(problems(template({ body: "Your card failed" }))).toEqual([]);
  });

  it("puts errors before warnings", () => {
    const t = template({ body: "{{nope}} " + "a".repeat(400) });
    const found = problems(t);
    expect(found[0].level).toBe("error");
    expect(found.at(-1)!.level).toBe("warning");
  });

  it("a disabled template cannot send even when it is perfect", () => {
    expect(canSend(template({ enabled: false }))).toBe(false);
  });
});

describe("per-client switches", () => {
  const mutes: Mute[] = [
    { id: muteId("a_01", "marketing.winback"), clientId: "a_01", templateKey: "marketing.winback" },
    { id: muteId("a_01", "plan.ready"), clientId: "a_01", templateKey: "plan.ready" },
  ];

  it("mutes marketing for that client only", () => {
    const t = template({ key: "marketing.winback", classification: "marketing" });
    expect(isMuted(t, "a_01", mutes)).toBe(true);
    expect(isMuted(t, "a_02", mutes)).toBe(false);
  });

  it("cannot mute a transactional message, even with a mute on record", () => {
    // Somebody who turned off marketing must still be told their card failed.
    // Enforced in the model, not in whichever screen draws the switch.
    const t = template({ key: "plan.ready", classification: "transactional" });
    expect(isMuted(t, "a_01", mutes)).toBe(false);
    expect(canMute(t)).toBe(false);
  });
});

describe("the shipped set", () => {
  it("has a unique key per template", () => {
    // The key is what the app would send by; two templates sharing one means
    // an unknowable choice at send time.
    const keys = SEED_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is clean — every shipped template would send as written", () => {
    for (const t of SEED_TEMPLATES) {
      const errors = problems(t).filter((p) => p.level === "error");
      expect(errors, `${t.key}: ${errors.map((e) => e.message).join("; ")}`).toEqual([]);
    }
  });

  it("classifies the money and plan messages as transactional", () => {
    for (const key of ["payment.failed", "plan.ready", "welcome.sms"]) {
      const t = SEED_TEMPLATES.find((x) => x.key === key)!;
      expect(t.classification, key).toBe("transactional");
    }
  });

  it("ships the one marketing template switched off", () => {
    // Nothing markets anybody by default.
    const marketing = SEED_TEMPLATES.filter((t) => t.classification === "marketing");
    expect(marketing.length).toBeGreaterThan(0);
    expect(marketing.every((t) => !t.enabled)).toBe(true);
  });

  it("keeps every SMS to one segment", () => {
    for (const t of SEED_TEMPLATES.filter((x) => x.channel === "sms")) {
      const cost = smsCost(preview(t.body));
      expect(cost.segments, `${t.key} is ${cost.segments} segments`).toBeLessThanOrEqual(1);
      expect(cost.encoding, `${t.key} is not plain GSM`).toBe("GSM");
    }
  });

  it("says what triggers each one", () => {
    // A template nobody can explain the trigger for is one nobody dares edit.
    for (const t of SEED_TEMPLATES) {
      expect(t.trigger.length, t.key).toBeGreaterThan(10);
    }
  });
});
