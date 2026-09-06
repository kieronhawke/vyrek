import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  scorePassword,
  type PasswordScore,
} from "./password-strength";

/**
 * THE METER ADVISES; ONLY LENGTH BLOCKS.
 *
 * The behaviour worth pinning is not the exact score of any one password —
 * that is a judgement call and will be tuned. It is the shape: nothing under
 * the minimum passes, nothing over it is refused, the three ways people
 * actually lose accounts are all called out by name, and every state says
 * something useful rather than just going red.
 */

const score = (p: string, personal: string[] = []) => scorePassword(p, personal);

describe("what blocks, and what does not", () => {
  it("nothing under the minimum is ok", () => {
    for (let n = 1; n < MIN_PASSWORD_LENGTH; n++) {
      const s = score("a".repeat(n));
      expect(s.ok, `${n} characters`).toBe(false);
      expect(s.tooShort).toBe(true);
      expect(s.hint).toMatch(/more character/);
    }
  });

  it("counts down to the minimum rather than restating the rule", () => {
    expect(score("abcdefg").hint).toBe("1 more character to go.");
    expect(score("abcde").hint).toBe("3 more characters to go.");
  });

  it("an empty box says nothing at all", () => {
    const s = score("");
    expect(s).toMatchObject({ score: 0, label: "", hint: null, ok: false, tooShort: false });
  });

  it("everything at or over the minimum may be submitted, however weak", () => {
    for (const weak of ["password", "aaaaaaaa", "12345678", "qwertyui"]) {
      const s = score(weak);
      expect(s.ok, weak).toBe(true);
      expect(s.score, weak).toBe(1);
    }
  });
});

describe("the three ways people actually lose an account", () => {
  it("names a password from the guessing lists", () => {
    for (const common of ["password", "Password1", "P@ssw0rd", "letmein1", "iloveyou"]) {
      const s = score(common);
      expect(s.score, common).toBe(1);
      expect(s.hint, common).toMatch(/guessing list/i);
    }
  });

  it("catches the brand and the coach, which is what this product invites", () => {
    for (const p of ["suth2026", "SuthPerformance", "hyrox123", "training1"]) {
      expect(score(p).score, p).toBe(1);
    }
  });

  it("objects to their own name or email address", () => {
    const s = score("sarahreeves99", ["Sarah Reeves", "sarah@example.com"]);
    expect(s.score).toBe(1);
    expect(s.hint).toMatch(/name or email/i);
  });

  it("does not object to a short coincidence inside a longer phrase", () => {
    // "sam" is three letters; too short to be a meaningful match.
    const s = score("brass monkey tuesday", ["Sam Reeves", "sam@example.com"]);
    expect(s.score).toBeGreaterThan(1);
  });

  it("catches repetition and keyboard runs however long they are", () => {
    expect(score("abababababab").score).toBe(1);
    expect(score("aaaaaaaaaaaa").score).toBe(1);
    expect(score("qwertyuiop123").score).toBeLessThanOrEqual(2);
    expect(score("abcdefghijkl").score).toBeLessThanOrEqual(2);
  });
});

describe("length beats punctuation, which is the whole point", () => {
  it("rates a plain passphrase above a short mangled word", () => {
    const phrase = score("walked the dog twice");
    const mangled = score("Xk9$mQ2");  // under the minimum, deliberately
    expect(phrase.score).toBe(4);
    expect(mangled.ok).toBe(false);
  });

  it("climbs with length", () => {
    const scores = ["quietriver", "quiet river bank", "quiet river bank at dawn"].map(
      (p) => score(p).score,
    );
    expect(scores[0]).toBeLessThan(scores[1]);
    expect(scores[1]).toBeLessThanOrEqual(scores[2]);
    expect(scores[2]).toBe(4);
  });

  it("gives a real mixed password full marks", () => {
    expect(score("Harbour-Lantern-42").score).toBe(4);
  });
});

describe("it always says something worth doing", () => {
  it("every score below strong carries exactly one instruction", () => {
    const samples = [
      "password", "aaaaaaaa", "quietriv", "quietriver", "quiet river",
      "abcdefgh", "sunshine1", "Harbour99",
    ];
    for (const p of samples) {
      const s = score(p);
      if (s.score < 4) {
        expect(s.hint, p).toBeTruthy();
        // One sentence, not a checklist.
        expect((s.hint ?? "").split(". ").length, p).toBeLessThanOrEqual(2);
      }
    }
  });

  it("stops talking once it is strong", () => {
    const s = score("copper kettle window latch");
    expect(s.score).toBe(4);
    expect(s.hint).toBeNull();
  });

  it("labels every score", () => {
    const labels = new Map<PasswordScore, string>();
    for (const p of ["password", "quietriver", "quiet river", "copper kettle window latch"]) {
      const s = score(p);
      labels.set(s.score, s.label);
    }
    for (const [n, label] of labels) {
      expect(label, `score ${n}`).not.toBe("");
    }
  });
});
