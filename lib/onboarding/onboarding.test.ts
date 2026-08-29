import { describe, expect, it } from "vitest";
import {
  INVITE_DAYS,
  createInvite,
  inviteUrl,
  readInvite,
} from "./token";
import {
  CUSTOM_MAX_PENCE,
  CUSTOM_MIN_PENCE,
  PLANS,
  blocker,
  displayPrice,
  emptyAnswers,
  parsePrice,
  planByKey,
  planFor,
  plansFor,
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
  it("carries the first name and the kind, and nothing it does not need", () => {
    // Email and phone came out of the token: together they were half its
    // length, spent on two fields the athlete types anyway. The surname went
    // for the same reason — the screen greets them by first name.
    const result = readInvite(invite(), NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invite).toMatchObject({ name: "Sam", kind: "full" });
    expect(result.invite.email).toBe("");
  });

  it("round-trips a payment invite and its plan", () => {
    const result = readInvite(invite({ kind: "payment", plan: "club" }), NOW);
    expect(result.ok && result.invite.kind).toBe("payment");
    expect(result.ok && result.invite.plan).toBe("club");
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
    // Accented and punctuated first names survive; the surname is dropped.
    expect(readInvite(token, NOW)).toMatchObject({ ok: true, invite: { name: "Zoë" } });
  });

  it("stays short enough for one line of a text message", () => {
    // The whole point of trimming it. A long name must not blow it back out.
    const long = invite({ name: "Christopher Worthington-Fairbairn", email: "x".repeat(60) + "@example.com" });
    expect(long.length).toBeLessThan(100);
  });

  it("builds a link without a double slash, on the short path", () => {
    // Short because it rides in an SMS — see lib/onboarding/invite-cost.test.ts.
    expect(inviteUrl("abc.def", "https://x.com/")).toBe("https://x.com/o/abc.def");
    expect(inviteUrl("abc.def", "https://x.com")).toBe("https://x.com/o/abc.def");
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

  it("reads the experience back the way it was asked", () => {
    // The row was hardcoded to racing labels whatever route the client came
    // down, so somebody asked "starting from scratch / a bit active / I
    // train regularly" was shown "A few races in" on the screen where they
    // hand over a card.
    const a = { ...emptyAnswers("Sam", "s@e.com", ""), experience: "some" as const };
    expect(summarise(a).find((r) => r.label === "Experience")!.value).toBe(
      "A few races in",
    );
    expect(
      summarise(a, true).find((r) => r.label === "Experience")!.value,
    ).toBe("A bit active");
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

/* ── A price agreed with one person ──────────────────────────────────── */

describe("a bespoke monthly price", () => {
  it("reads the ways a coach types a number", () => {
    expect(parsePrice("150")).toBe(15000);
    expect(parsePrice("£150")).toBe(15000);
    expect(parsePrice("149.50")).toBe(14950);
    expect(parsePrice("1,500")).toBe(150000);
    expect(parsePrice(" 99 ")).toBe(9900);
  });

  /**
   * Null, never zero. Zero is a real amount that sails through a truthiness
   * check and sets up a free subscription nobody agreed to.
   */
  it("returns null for anything it cannot read", () => {
    for (const bad of ["", "free", "-40", "40.999", "0", "£"]) {
      expect(parsePrice(bad), bad).toBeNull();
    }
  });

  /* A guard against the extra digit, not a policy about what Ben may
     charge: £1,500 typed as £15,000 is the mistake that actually happens. */
  it("refuses a figure outside the plausible range", () => {
    expect(parsePrice("0.50")).toBeNull();
    expect(parsePrice("2000")).toBe(200000);
    expect(parsePrice("2000.01")).toBeNull();
    expect(parsePrice("15000")).toBeNull();
  });

  it("writes a round price without a pointless .00", () => {
    expect(displayPrice(15000)).toBe("£150");
    expect(displayPrice(14950)).toBe("£149.50");
  });

  /* His agreed price leads, and nothing else keeps a star: two recommended
     options is no recommendation, and they came here for the one he quoted. */
  it("puts the agreed plan first and unfeatures the rest", () => {
    const list = plansFor({ pence: 15000 });
    expect(list[0].key).toBe("custom");
    expect(list[0].display).toBe("£150");
    expect(list.filter((p) => p.featured)).toHaveLength(1);
    expect(list).toHaveLength(PLANS.length + 1);
  });

  it("shows the standard plans untouched when nothing was agreed", () => {
    expect(plansFor(null)).toEqual(PLANS);
  });

  it("resolves the custom key only when there is a price behind it", () => {
    expect(planFor("custom", { pence: 15000 })?.pence).toBe(15000);
    expect(planFor("custom", null)).toBeUndefined();
    expect(planFor("club", { pence: 15000 })?.key).toBe("club");
  });
});

describe("carrying an agreed price in the link", () => {
  /* Named `amountPence` and encoded as `a`. Both branches of the August merge
     had built this independently — `main` as `amountPence`/`a`, `origin/main`
     as `customPence`/`c` — and the merge kept one. `c` is still READ so that
     any link minted on the other branch resolves; only `a` is ever written. */
  it("survives a round trip", () => {
    const token = createInvite({
      name: "Sam Reeves",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 15000,
    });
    const read = readInvite(token);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.invite.amountPence).toBe(15000);
  });

  /**
   * The point of signing the thing. Editing the price has to break the
   * link, or an athlete sets their own.
   */
  it("refuses a token whose price has been edited", () => {
    const token = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 15000,
    });
    const [body, sig] = token.split(".");
    const json = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    json.a = 100;
    const forged = Buffer.from(JSON.stringify(json))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const read = readInvite(`${forged}.${sig}`);
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.reason).toBe("tampered");
  });

  /* Signed is not the same as sane. A token minted with a stray extra digit
     would otherwise offer somebody a £15,000 a month plan. */
  it("drops a price outside the plausible range even though it verifies", () => {
    const token = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 9_999_999,
    });
    const read = readInvite(token);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.invite.amountPence).toBeUndefined();
  });

  /* The band is declared once, in model.ts, and both the parser Ben's typing
     goes through and the reader the token comes back out of use it. They used
     to disagree — £1–£2,000 against £1–£1,000 — so a legitimate £1,500 parsed
     cleanly and then silently vanished, and the client was quoted the PUBLIC
     price instead. */
  it("accepts the whole band the price parser accepts", () => {
    for (const pence of [CUSTOM_MIN_PENCE, 15000, 150000, CUSTOM_MAX_PENCE]) {
      const read = readInvite(
        createInvite({ name: "S", email: "", phone: "", kind: "payment", amountPence: pence }),
      );
      expect(read.ok).toBe(true);
      if (read.ok) expect(read.invite.amountPence, String(pence)).toBe(pence);
    }
  });

  /* These go out by SMS and characters are money. An ordinary invite must
     not grow because the feature exists. */
  it("does not lengthen an invite that has no agreed price", () => {
    const plain = createInvite({ name: "Sam", email: "", phone: "", kind: "full" });
    const withPrice = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "full",
      amountPence: 15000,
    });
    expect(plain.length).toBeLessThan(withPrice.length);
    expect(plain.length).toBeLessThan(120);
  });
});

describe("carrying a first-payment date in the link", () => {
  it("survives a round trip", () => {
    const day = 20700; // an arbitrary day well inside the valid band
    const read = readInvite(
      createInvite({
        name: "Sam",
        email: "",
        phone: "",
        kind: "payment",
        amountPence: 15000,
        startDay: day,
      }),
    );
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.invite.startDay).toBe(day);
  });

  /* The date is half the arrangement. Somebody who could move it could take a
     month of coaching before the first collection. */
  it("refuses a token whose start date has been edited", () => {
    const token = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 15000,
      startDay: 20700,
    });
    const [body, sig] = token.split(".");
    const json = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    );
    json.s = 20900;
    const forged = Buffer.from(JSON.stringify(json))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const read = readInvite(`${forged}.${sig}`);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.reason).toBe("tampered");
  });

  /* A nonsense day is dropped rather than charged on. "I cannot tell when this
     should start" has to mean "collect at checkout", never a guessed date. */
  it("drops an implausible day even though it verifies", () => {
    for (const bad of [0, 1, 999_999_999]) {
      const read = readInvite(
        createInvite({
          name: "S",
          email: "",
          phone: "",
          kind: "payment",
          amountPence: 15000,
          startDay: bad,
        }),
      );
      expect(read.ok).toBe(true);
      if (read.ok) expect(read.invite.startDay, String(bad)).toBeUndefined();
    }
  });

  it("does not lengthen an invite that charges today", () => {
    const today = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 15000,
    });
    const dated = createInvite({
      name: "Sam",
      email: "",
      phone: "",
      kind: "payment",
      amountPence: 15000,
      startDay: 20700,
    });
    expect(today.length).toBeLessThan(dated.length);
  });
});
