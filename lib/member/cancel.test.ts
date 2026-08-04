import { describe, expect, it } from "vitest";
import {
  REASONS,
  STAGES,
  cancellationNote,
  nextStage,
  reasonById,
  stageAfterReason,
  stageById,
  type StageId,
} from "./cancel";

describe("the exit is always there", () => {
  /**
   * The rule the whole flow is built around.
   *
   * Kieron asked for cancelling to be "a little bit tricky but still allow
   * them to cancel". Every stage therefore carries a visible, one-tap way
   * forward to cancelling, and this asserts it for all of them — so a later
   * change that quietly removes one from a stage fails here rather than
   * shipping.
   *
   * It is not only decency. A flow that traps people produces chargebacks,
   * one-star reviews, and in the UK a case under the Consumer Protection
   * from Unfair Trading Regulations. A member retained because they could
   * not find the exit is worth less than nothing.
   */
  it("gives every stage a way forward to cancelling", () => {
    expect(STAGES.length).toBeGreaterThan(0);
    for (const stage of STAGES) {
      expect(stage.exit.trim().length, stage.id).toBeGreaterThan(0);
    }
  });

  /* No stage may be a dead end: following the exit from anywhere has to end
     at "done" in a small number of steps. */
  it("reaches the end from every stage", () => {
    for (const start of STAGES.map((s) => s.id)) {
      let at: StageId = start;
      let steps = 0;
      while (at !== "done" && steps < 10) {
        at = nextStage(at);
        steps++;
      }
      expect(at, `${start} never reaches done`).toBe("done");
      expect(steps, `${start} takes too many steps`).toBeLessThanOrEqual(3);
    }
  });

  it("does not loop back on itself once finished", () => {
    expect(nextStage("done")).toBe("done");
  });
});

describe("why they are leaving", () => {
  it("offers a real set of reasons with an escape hatch", () => {
    expect(REASONS.length).toBeGreaterThanOrEqual(5);
    expect(REASONS.some((r) => r.id === "other")).toBe(true);
    expect(new Set(REASONS.map((r) => r.id)).size).toBe(REASONS.length);
  });

  /**
   * Offering the wrong thing is what makes these flows feel like a fight.
   * Somebody injured does not want a discount, they want a pause; somebody
   * who came for a race and ran it should be congratulated and let go rather
   * than haggled with.
   */
  it("makes no offer where there is not an honest one", () => {
    expect(reasonById("goal_reached")?.offer).toBeNull();
    expect(reasonById("injured")?.offer?.action).toContain("Pause");
    expect(reasonById("too_expensive")?.offer).not.toBeNull();
  });

  /* A stage headed "one thing worth considering" with nothing in it wastes
     somebody's time to no purpose, which is the obstruction this avoids. */
  it("skips the offer stage entirely when there is no offer", () => {
    expect(stageAfterReason("goal_reached")).toBe("confirm");
    expect(stageAfterReason("other")).toBe("confirm");
    expect(stageAfterReason("too_expensive")).toBe("offer");
  });

  /* Never "Stay" — every button says what actually happens if it is pressed. */
  it("labels every offer with what it does", () => {
    for (const r of REASONS) {
      if (!r.offer) continue;
      expect(r.offer.action.toLowerCase(), r.id).not.toBe("stay");
      expect(r.offer.body.length, r.id).toBeGreaterThan(20);
    }
  });
});

describe("what Ben is told", () => {
  it("is one line he can read on a phone", () => {
    const note = cancellationNote(
      { reason: "no_time", detail: "", atISO: "2026-08-04T12:00:00Z" },
      "Amelia",
    );
    expect(note).toBe('Amelia cancelled — "I have not got the time".');
    expect(note.length).toBeLessThan(160);
  });

  /**
   * The reason keeps its own casing.
   *
   * An earlier version lowercased it to make it read as part of the
   * sentence, which turned "I am injured" into "i am injured" — a lowercase
   * first-person pronoun in the line Ben reads about somebody leaving. This
   * test previously asserted the broken output, so it encoded the bug rather
   * than catching it.
   */
  it("never mangles a reason that starts with I", () => {
    for (const r of REASONS) {
      const note = cancellationNote(
        { reason: r.id, detail: "", atISO: "2026-08-04T12:00:00Z" },
        "Amelia",
      );
      expect(note, r.id).toContain(r.label);
      expect(note, r.id).not.toContain("i am");
      expect(note, r.id).not.toContain("i have");
    }
  });

  /* The sentence somebody types on the way out is usually more use than the
     option they picked from a list. */
  it("carries their own words when they wrote any", () => {
    const note = cancellationNote(
      { reason: "other", detail: "Moving abroad", atISO: "2026-08-04T12:00:00Z" },
      "Dean",
    );
    expect(note).toContain("Moving abroad");
  });
});

describe("stages", () => {
  it("can be looked up, and unknown ones are not invented", () => {
    expect(stageById("confirm")?.title).toContain("Cancel");
    expect(stageById("nope" as StageId)).toBeUndefined();
  });
});
