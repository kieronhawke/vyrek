import { describe, expect, it } from "vitest";
import {
  INVITE_DAYS,
  createInvite,
  inviteUrl,
  readInvite,
} from "./token";
import {
  PLANS,
  blocker,
  emptyAnswers,
  planByKey,
  progress,
  stepsFor,
  summarise,
  type Answers,
} from "./model";

const NOW = Date.parse("2026-08-03T10:00:00Z");

function invite(over: Partial<Parameters<typeof createInvite>[0]> = {}) {
  return createInvite(
    { name: "Sam Reeves", email: "sam@example.com", phone: "+447700900001", kind: "full", ...over },
    NOW,
  );
}

describe("the invite token", () => {
  it("round-trips what Ben typed", () => {
    const result = readInvite(invite(), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invite).toMatchObject({
      name: "Sam Reeves",
      email: "sam@example.com",
      kind: "full",
    });
  });

  it("cannot be edited by the person holding it", () => {
    // The whole reason the link can carry data with no database behind it.
    const token = invite({ kind: "payment", plan: "club" });
    const [body, sig] = token.split(".");
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString());
    decoded.plan = "coaching-121";
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${sig}`;

    expect(readInvite(forged, NOW)).toEqual({ ok: false, reason: "tampered" });
  });

  it("cannot have its expiry extended", () => {
    const token = invite();
    const [body, sig] = token.split(".");
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString());
    decoded.exp = decoded.exp + 86400 * 365;
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${sig}`;
    expect(readInvite(forged, NOW).ok).toBe(false);
  });

  it("expires, and says so rather than saying invalid", () => {
    // Three different problems for the person holding the phone: a link
    // mangled by a text message, a tampered one, and one that ran out.
    const token = invite();
    const after = NOW + (INVITE_DAYS + 1) * 86400 * 1000;
    expect(readInvite(token, after)).toEqual({ ok: false, reason: "expired" });
    expect(readInvite(token, NOW + 86400 * 1000).ok).toBe(true);
  });

  it("rejects a mangled link as malformed", () => {
    for (const bad of ["", "nonsense", "only-one-part", "a.b.c", ".", "x."]) {
      const r = readInvite(bad, NOW);
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(["malformed", "tampered"]).toContain(r.reason);
    }
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on mismatched lengths; that has to be handled
    // before it is called or a malformed link is a 500.
    const [body] = invite().split(".");
    expect(() => readInvite(`${body}.short`, NOW)).not.toThrow();
    expect(readInvite(`${body}.short`, NOW).ok).toBe(false);
  });

  it("is URL-safe, so it survives being pasted into a text message", () => {
    const token = invite({ name: "Zoë O'Brien-Smith", email: "zoe+test@example.com" });
    expect(token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
    expect(encodeURIComponent(token)).toBe(token);
    const r = readInvite(token, NOW);
    expect(r.ok && r.invite.name).toBe("Zoë O'Brien-Smith");
  });

  it("builds a link without a double slash", () => {
    expect(inviteUrl("abc.def", "https://x.com/")).toBe("https://x.com/onboarding/abc.def");
    expect(inviteUrl("abc.def", "https://x.com")).toBe("https://x.com/onboarding/abc.def");
  });
});

describe("the steps", () => {
  it("a payment-only invite skips the questions", () => {
    const full = stepsFor("full").map((s) => s.key);
    const payment = stepsFor("payment").map((s) => s.key);
    expect(full).toContain("health");
    expect(payment).not.toContain("health");
    // The plan and the card are last in both.
    expect(full.at(-1)).toBe("pay");
    expect(payment.at(-1)).toBe("pay");
    expect(payment.length).toBeLessThan(full.length);
  });

  it("never asks for the card before the questions", () => {
    // Ask for a card first and the drop-off is the whole funnel.
    const keys = stepsFor("full").map((s) => s.key);
    expect(keys.indexOf("pay")).toBeGreaterThan(keys.indexOf("about"));
    expect(keys.indexOf("plan")).toBeGreaterThan(keys.indexOf("training"));
  });

  it("reports progress across the steps it actually has", () => {
    expect(progress(stepsFor("full"), 0)).toBe(0);
    expect(progress(stepsFor("full"), stepsFor("full").length - 1)).toBe(1);
    expect(progress(stepsFor("payment"), 1)).toBeCloseTo(0.5, 5);
  });
});

describe("what blocks a step", () => {
  const base = (over: Partial<Answers> = {}): Answers => ({
    ...emptyAnswers("Sam", "sam@example.com", ""),
    ...over,
  });

  it("says why, rather than just disabling a button", () => {
    // A disabled button with no explanation is the commonest reason somebody
    // abandons a form.
    expect(blocker("account", base({ email: "" }))).toMatch(/email/i);
    expect(blocker("account", base({ email: "not-an-email" }))).toMatch(/does not look right/i);
    expect(blocker("about", base({ name: "  " }))).toMatch(/call you/i);
    expect(blocker("training", base())).toMatch(/sounds most like you/i);
    expect(blocker("availability", base())).toMatch(/at least one day/i);
    expect(blocker("plan", base())).toMatch(/choose a plan/i);
  });

  it("lets the optional steps through", () => {
    // Health and photo can be skipped. Blocking on an injury question is how
    // you get an empty injury question.
    expect(blocker("health", base())).toBeNull();
    expect(blocker("photo", base())).toBeNull();
    expect(blocker("welcome", base())).toBeNull();
  });

  it("clears once answered", () => {
    expect(blocker("account", base({ email: "sam@example.com" }))).toBeNull();
    expect(blocker("training", base({ experience: "first", trainingDays: 4 }))).toBeNull();
    expect(blocker("availability", base({ availableDays: ["mon"] }))).toBeNull();
    expect(blocker("plan", base({ plan: "club" }))).toBeNull();
  });
});

describe("the plans", () => {
  it("matches the prices Ben actually charges", () => {
    // From lib/control/tracker.ts and lib/pricing.ts, not invented.
    expect(planByKey("coaching-121")!.pence).toBe(22000);
    expect(planByKey("club")!.pence).toBe(1299);
  });

  it("features exactly one", () => {
    // Two "recommended" plans recommends nothing.
    expect(PLANS.filter((p) => p.featured)).toHaveLength(1);
  });

  it("has a unique key and a real price for every plan", () => {
    expect(new Set(PLANS.map((p) => p.key)).size).toBe(PLANS.length);
    for (const p of PLANS) {
      expect(p.pence, p.key).toBeGreaterThan(0);
      expect(p.includes.length, p.key).toBeGreaterThan(2);
      expect(p.display, p.key).toContain("£");
    }
  });

  it("returns nothing for a key that does not exist", () => {
    // A forged plan key must not fall back to the cheapest or the dearest.
    expect(planByKey("free-forever")).toBeUndefined();
    expect(planByKey(undefined)).toBeUndefined();
  });
});

describe("the summary before paying", () => {
  it("shows what they just spent five minutes on", () => {
    const a: Answers = {
      ...emptyAnswers("Sam", "sam@example.com", ""),
      goal: "Sub-1:20 at Manchester",
      nextRace: "HYROX Manchester",
      raceDate: "2027-01-16",
      experience: "some",
      trainingDays: 4,
      availableDays: ["mon", "wed", "sat"],
    };
    const rows = summarise(a);
    expect(rows.find((r) => r.label === "Goal")!.value).toBe("Sub-1:20 at Manchester");
    expect(rows.find((r) => r.label === "Next race")!.value).toContain("2027-01-16");
    expect(rows.find((r) => r.label === "Training days")!.value).toBe("Mon, Wed, Sat");
  });

  it("never prints health answers back on the screen", () => {
    // They are Article 9 data and the summary is shown on a phone in public.
    const a = {
      ...emptyAnswers("Sam", "s@e.com", ""),
      injuries: "Left calf tear, still sore",
      conditions: "Asthma",
    };
    const rows = summarise(a);
    const text = JSON.stringify(rows);
    expect(text).not.toContain("calf");
    expect(text).not.toContain("Asthma");
    expect(rows.find((r) => r.label === "Health notes")!.value).toBe("Given to Ben");
  });

  it("leaves out what they did not answer", () => {
    expect(summarise(emptyAnswers("Sam", "s@e.com", ""))).toEqual([]);
  });
});
