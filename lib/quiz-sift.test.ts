import { describe, expect, it } from "vitest";
import { recommendationLine, scoreAnswers, sift } from "@/lib/quiz-sift";
import type { QuizAnswers } from "@/lib/quiz-flow";

/**
 * The sift decides which of the three funnel outcomes someone gets, so it is
 * the highest-consequence pure function in the funnel: get it wrong and
 * either Ben's diary fills with people who were never going to buy coaching,
 * or buyers get quietly routed to a £12.99 subscription.
 */

const base: QuizAnswers = { intent: [] };

describe("explicit choices always win", () => {
  it("routes an explicit coached answer to coaching, however cold the signals", () => {
    const r = sift({ ...base, supportPreference: "coached", readiness: "just-looking", days: 2 });
    expect(r.route).toBe("coached");
    expect(r.explicit).toBe(true);
  });

  it("routes an explicit self answer to the club, however warm the signals", () => {
    const r = sift({
      ...base,
      supportPreference: "self",
      raceDate: new Date("2026-10-01"),
      triedBefore: "several",
      injuries: "knee",
      days: 5,
    });
    expect(r.route).toBe("club");
    expect(r.explicit).toBe(true);
  });
});

describe("scoring, when they asked us to decide", () => {
  const unsure = (extra: Partial<QuizAnswers>): QuizAnswers => ({
    ...base,
    supportPreference: "unsure",
    ...extra,
  });

  it("counts a booked date, a failed history, isolation, injury and a time goal", () => {
    const { score } = scoreAnswers(
      unsure({
        raceDate: new Date("2026-10-01"),
        triedBefore: "several",
        barriers: ["doing-it-alone"],
        injuries: "knee",
        intent: ["go-faster"],
      }),
    );
    // 2 + 2 + 2 + 2 + 2
    expect(score).toBe(10);
  });

  it("pulls hard the other way for someone just looking", () => {
    const r = sift(unsure({ readiness: "just-looking" }));
    expect(r.route).toBe("club");
    expect(r.explicit).toBe(false);
  });

  it("treats gym intimidation the same as isolation", () => {
    const a = scoreAnswers(unsure({ barriers: ["doing-it-alone"] })).score;
    const b = scoreAnswers(unsure({ barriers: ["gyms-intimidate"] })).score;
    expect(a).toBe(b);
  });

  it("does not double-count both isolation barriers", () => {
    const one = scoreAnswers(unsure({ barriers: ["doing-it-alone"] })).score;
    const both = scoreAnswers(
      unsure({ barriers: ["doing-it-alone", "gyms-intimidate"] }),
    ).score;
    expect(both).toBe(one);
  });

  it("ignores a declared absence of injury", () => {
    expect(scoreAnswers(unsure({ injuries: "none" })).score).toBe(
      scoreAnswers(unsure({})).score,
    );
  });

  it("routes an empty, goalless quiz to the club", () => {
    expect(sift(unsure({})).route).toBe("club");
  });

  it("sends a positive score to coaching", () => {
    expect(sift(unsure({ raceDate: new Date("2026-10-01"), days: 5 })).route).toBe(
      "coached",
    );
  });

  it("treats an exactly-zero score as club, not coached", () => {
    // The tie-break matters: a neutral quiz should not put someone in
    // Ben's diary. `score > 0` is deliberate.
    const answers = unsure({ days: 2, barriers: ["time"], goal: "lose-weight" });
    expect(scoreAnswers(answers).score).toBe(-1);
    expect(sift(answers).route).toBe("club");
  });
});

describe("reasons shown back to the user", () => {
  it("only shows reasons that agree with the verdict", () => {
    const r = sift({
      ...base,
      supportPreference: "unsure",
      raceDate: new Date("2026-10-01"),
      triedBefore: "several",
      days: 5,
    });
    expect(r.route).toBe("coached");
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.join(" ")).not.toMatch(/just looking|suits a plan you run yourself/);
  });

  it("says nothing when the user chose outright", () => {
    expect(recommendationLine(sift({ ...base, supportPreference: "coached" }))).toBeNull();
  });

  it("explains a recommendation in one sentence", () => {
    const line = recommendationLine(
      sift({
        ...base,
        supportPreference: "unsure",
        triedBefore: "several",
        barriers: ["doing-it-alone"],
      }),
    );
    expect(line).toMatch(/^Because .+ we'd start you with Ben\.$/);
  });

  it("explains a club recommendation too", () => {
    // An empty quiz is not silent: the "keeping things open" signal fires,
    // which is a better message than the generic fallback.
    const line = recommendationLine(sift({ ...base, supportPreference: "unsure" }));
    expect(line).toMatch(/^Because .+ we'd start you in Suth Club\.$/);
  });

  it("falls back to a plain sentence when no signal fires either way", () => {
    // A goal on its own scores zero and suppresses the "keeping things
    // open" signal, so there is genuinely nothing to cite.
    const answers = { ...base, supportPreference: "unsure" as const, goal: "lose-weight" as const };
    const r = sift(answers);
    expect(r.reasons).toEqual([]);
    expect(recommendationLine(r)).toBe(
      "Based on your answers, we'd start you in Suth Club.",
    );
  });
});
