import { describe, expect, it } from "vitest";
import { consultationGoal, leadBrief } from "@/lib/lead-brief";
import { sift } from "@/lib/quiz-sift";
import type { QuizAnswers } from "@/lib/quiz-flow";

/**
 * The brief is what Ben reads before he rings someone. It travels in the
 * consultation endpoint's `message` field, which caps at 2000 characters, so
 * both its content and its length are load-bearing.
 */

const beginner: QuizAnswers = {
  intent: [],
  rail: "beginner",
  goal: "lose-weight",
  startingPoint: "years-off",
  triedBefore: "several",
  barriers: ["doing-it-alone", "time"],
  days: 3,
  sessionLength: "45",
  location: "gym-standard",
  injuries: "knee",
  injuryRecency: "current",
  readiness: "this-week",
  supportPreference: "coached",
};

describe("goal mapping to the endpoint's fixed set", () => {
  it("maps a beginner losing weight to lose-weight", () => {
    expect(consultationGoal(beginner)).toBe("lose-weight");
  });

  it("maps other beginner goals to get-fit", () => {
    expect(consultationGoal({ ...beginner, goal: "more-energy" })).toBe("get-fit");
    expect(consultationGoal({ ...beginner, goal: "confidence" })).toBe("get-fit");
  });

  it("maps a beginner with no goal to not-sure", () => {
    expect(consultationGoal({ intent: [], rail: "beginner" })).toBe("not-sure");
  });

  it("maps a faster-seeking athlete to improve-hyrox-time", () => {
    expect(consultationGoal({ intent: ["go-faster"] })).toBe("improve-hyrox-time");
    expect(consultationGoal({ intent: [], experience: "raced-many" })).toBe(
      "improve-hyrox-time",
    );
  });

  it("maps a first-timer to first-hyrox", () => {
    expect(consultationGoal({ intent: ["first-hyrox"] })).toBe("first-hyrox");
    expect(consultationGoal({ intent: [], experience: "never" })).toBe("first-hyrox");
  });

  it("maps a sub-60 athlete to elite-ambitions", () => {
    expect(consultationGoal({ intent: [], bestTime: "under-60" })).toBe(
      "elite-ambitions",
    );
  });

  it("falls back to not-sure when nothing is known", () => {
    expect(consultationGoal({ intent: [] })).toBe("not-sure");
  });

  it("only ever returns a value the endpoint accepts", () => {
    // The endpoint validates against a fixed list and 400s otherwise, so a
    // new quiz answer must never produce an unrecognised goal.
    const allowed = [
      "get-fit",
      "lose-weight",
      "first-hyrox",
      "improve-hyrox-time",
      "elite-ambitions",
      "not-sure",
    ];
    const cases: QuizAnswers[] = [
      beginner,
      { intent: [] },
      { intent: ["doubles"] },
      { intent: [], rail: "athlete", experience: "signed-up" },
      { intent: [], rail: "beginner", goal: "family-health" },
    ];
    for (const c of cases) expect(allowed).toContain(consultationGoal(c));
  });
});

describe("the brief itself", () => {
  it("leads with what they want and how warm they are", () => {
    const brief = leadBrief(beginner, sift(beginner));
    expect(brief).toMatch(/FROM THE QUIZ \(beginner path\)/);
    expect(brief).toMatch(/Wants: COACHING WITH BEN/);
    expect(brief).toMatch(/Readiness: Could start THIS WEEK/);
  });

  it("surfaces an injury prominently, since Ben needs it before he calls", () => {
    expect(leadBrief(beginner)).toMatch(/INJURY: Knee \(bothering me now\)/);
  });

  it("states plainly when there is no injury", () => {
    const brief = leadBrief({ ...beginner, injuries: "none", injuryRecency: undefined });
    expect(brief).toMatch(/Injuries: No injuries/);
    expect(brief).not.toMatch(/INJURY:/);
  });

  it("includes the beginner history and barriers", () => {
    const brief = leadBrief(beginner);
    expect(brief).toMatch(/Starting from: Hasn't trained in years/);
    expect(brief).toMatch(/History: Started and stopped several times/);
    expect(brief).toMatch(/doing it alone/);
  });

  it("switches to race detail on the athlete path", () => {
    const brief = leadBrief({
      intent: ["go-faster"],
      rail: "athlete",
      experience: "raced-few",
      raceDate: new Date("2026-10-11T00:00:00Z"),
      days: 4,
    });
    expect(brief).toMatch(/HYROX path/);
    expect(brief).toMatch(/Experience: Raced once or twice/);
    expect(brief).toMatch(/Race booked: 11 October 2026/);
    expect(brief).not.toMatch(/Starting from:/);
  });

  it("shows the working when we recommended rather than they chose", () => {
    const answers: QuizAnswers = { ...beginner, supportPreference: "unsure" };
    const brief = leadBrief(answers, sift(answers));
    expect(brief).toMatch(/recommended by us, score/);
    expect(brief).toMatch(/Why we suggested that:/);
  });

  it("omits the working when they chose outright", () => {
    expect(leadBrief(beginner, sift(beginner))).not.toMatch(/recommended by us/);
  });

  it("stays inside the endpoint's 2000-character limit", () => {
    // Everything populated, longest labels, both optional sections present.
    const maximal: QuizAnswers = {
      ...beginner,
      supportPreference: "unsure",
      intent: ["go-faster"],
      raceDate: new Date("2026-12-25"),
      bestTime: "90-105",
      barriers: ["time", "didnt-know-what", "boredom", "gyms-intimidate", "injury", "doing-it-alone"],
    };
    expect(leadBrief(maximal).length).toBeLessThanOrEqual(1990);
  });

  it("never emits a run of blank lines", () => {
    // Sections are conditional, so an absent block must not leave a gap that
    // makes the email look broken.
    expect(leadBrief({ intent: [] })).not.toMatch(/\n{3,}/);
  });
});
