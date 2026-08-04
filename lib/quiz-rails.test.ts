import { describe, expect, it } from "vitest";
import {
  applyIntent,
  applyRailPreSelect,
  isBeginnerRail,
  programmeLabel,
  railForIntent,
  type IntentValue,
  type QuizAnswers,
} from "@/lib/quiz-flow";

/**
 * WHICH JOURNEY SOMEBODY GETS.
 *
 * The bug these exist for: screen one offered four options, all four named
 * HYROX, and the rail could only be set from the URL. So anybody arriving
 * at /quiz directly — which is nearly everybody — was put on the racing
 * rail whatever they said they wanted, and somebody who came to lose
 * weight was asked their best race time three screens later.
 *
 * The rule is one line and it is the whole funnel: the answer to screen
 * one decides the route.
 */

const empty = (): QuizAnswers => ({ intent: [] });

describe("which rail an answer leads to", () => {
  it("sends the two non-racing answers to the beginner rail", () => {
    expect(railForIntent("get-fit")).toBe("beginner");
    expect(railForIntent("lose-weight")).toBe("beginner");
  });

  it("keeps every racing answer on the athlete rail", () => {
    for (const v of ["first-hyrox", "go-faster", "doubles"] as IntentValue[]) {
      expect(railForIntent(v), v).toBe("athlete");
    }
  });

  it("sets the rail from the answer, which is what screen one is for", () => {
    expect(isBeginnerRail(applyIntent(empty(), "get-fit"))).toBe(true);
    expect(isBeginnerRail(applyIntent(empty(), "first-hyrox"))).toBe(false);
  });
});

describe("switching answers on screen one", () => {
  it("replaces rather than accumulates", () => {
    // It used to allow two answers. On a screen that now picks the route,
    // "my first race" plus "just get fit" is a contradiction with no
    // sensible resolution.
    const a = applyIntent(applyIntent(empty(), "first-hyrox"), "get-fit");
    expect(a.intent).toEqual(["get-fit"]);
    expect(a.rail).toBe("beginner");
  });

  it("drops the race answers when somebody switches to the fitness rail", () => {
    // Answer two racing questions, go back, change your mind. Without this
    // the race date survives into a plan that must never mention racing —
    // and summarise() prints it back to them.
    const raced: QuizAnswers = {
      ...applyIntent(empty(), "go-faster"),
      experience: "raced-many",
      bestTime: "60-75",
      raceDate: new Date("2026-11-01"),
    };
    const switched = applyIntent(raced, "get-fit");
    expect(switched.experience).toBeUndefined();
    expect(switched.bestTime).toBeUndefined();
    expect(switched.raceDate).toBeUndefined();
  });

  it("drops the beginner answers when somebody switches to racing", () => {
    const beginner: QuizAnswers = {
      ...applyIntent(empty(), "get-fit"),
      goal: "more-energy",
      startingPoint: "years-off",
      barriers: ["time"],
    };
    const switched = applyIntent(beginner, "first-hyrox");
    expect(switched.goal).toBeUndefined();
    expect(switched.startingPoint).toBeUndefined();
    expect(switched.barriers).toBeUndefined();
  });

  it("answers the goal question when the answer already contained it", () => {
    // "Losing weight and getting stronger" then "what matters most?" is
    // asking somebody what they want immediately after being told.
    expect(applyIntent(empty(), "lose-weight").goal).toBe("lose-weight");
    // "Getting fit" spans several goals, so that one still gets asked.
    expect(applyIntent(empty(), "get-fit").goal).toBeUndefined();
  });
});

describe("skipping screen one", () => {
  it("is skipped only when the rail came from the entry surface", () => {
    // railLocked, not rail. Screen one is what sets the rail now, so
    // keying the skip on `rail` made the screen delete itself the instant
    // it was answered and threw the user onto screen two mid-tap.
    const fromUrl = applyRailPreSelect(empty(), "beginner");
    expect(fromUrl.railLocked).toBe(true);

    const fromScreen = applyIntent(empty(), "get-fit");
    expect(fromScreen.rail).toBe("beginner");
    expect(fromScreen.railLocked).toBeUndefined();
  });

  it("ignores a rail it does not recognise", () => {
    expect(applyRailPreSelect(empty(), "elite").railLocked).toBeUndefined();
    expect(applyRailPreSelect(empty(), null).rail).toBeUndefined();
  });
});

describe("what the beginner rail is allowed to say", () => {
  it("never names the sport in a programme label", () => {
    // The label is the one piece of routing output shown on screen. On the
    // beginner rail it must come from what they said they wanted.
    const a = applyIntent(empty(), "lose-weight");
    const label = programmeLabel(a);
    expect(label).toBe("Weight loss");
    expect(label?.toLowerCase()).not.toContain("hyrox");
    expect(label?.toLowerCase()).not.toContain("race");
  });

  it("still names the programme on the athlete rail", () => {
    expect(programmeLabel(applyIntent(empty(), "first-hyrox"))).toBe(
      "First Race",
    );
  });

  it("shows no label until there is something to name", () => {
    expect(programmeLabel(empty())).toBeNull();
    expect(programmeLabel(applyIntent(empty(), "get-fit"))).toBeNull();
  });
});
