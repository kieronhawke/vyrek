import { describe, expect, it } from "vitest";
import {
  DUNNING_LADDER,
  HUMAN_DECISION_DAY,
  SUGGEST_PAUSE_DAY,
  evaluateDunning,
  mayAutoCancelForNonPayment,
} from "@/lib/control/dunning";

/**
 * spec/16 §6 asks for the dunning ladder to be tested on "every transition,
 * every edge". These are those, plus the rule the whole module exists to
 * make unbreakable: HARD-RULES §6, never auto-cancel.
 */

describe("the ladder itself", () => {
  it("matches spec/09 §5: six rungs at -3, 0, 3, 7, 10, 14", () => {
    expect(DUNNING_LADDER.map((s) => s.dayOffset)).toEqual([-3, 0, 3, 7, 10, 14]);
  });

  it("stops messaging the client once a human is involved", () => {
    for (const step of DUNNING_LADDER) {
      if (step.humanDecision) {
        expect(step.channel, `step ${step.step} messages the client`).toBe("none");
      }
    }
  });

  it("hands over to a human at day 10 and suggests pause at 14", () => {
    const ten = DUNNING_LADDER.find((s) => s.dayOffset === HUMAN_DECISION_DAY);
    const fourteen = DUNNING_LADDER.find((s) => s.dayOffset === SUGGEST_PAUSE_DAY);
    expect(ten?.humanDecision).toBe(true);
    expect(ten?.adminAction).toBe("review");
    expect(fourteen?.adminAction).toBe("suggest_pause");
  });

  it("never mentions cancelling anywhere in the ladder", () => {
    // HARD-RULES §6. A "cancel" template would be the first step toward
    // someone wiring it up to an automation.
    for (const step of DUNNING_LADDER) {
      expect(step.template).not.toMatch(/cancel/i);
      expect(step.adminAction ?? "").not.toMatch(/cancel/i);
    }
  });

  it("keeps step ids unique and stable", () => {
    const ids = DUNNING_LADDER.map((s) => s.step);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("evaluation by day", () => {
  it("does nothing before the first rung", () => {
    const s = evaluateDunning({ daysOverdue: -10 });
    expect(s.currentStep).toBeNull();
    expect(s.due).toEqual([]);
    expect(s.awaitingHuman).toBe(false);
  });

  it("fires the heads-up exactly three days before due", () => {
    expect(evaluateDunning({ daysOverdue: -4 }).due).toEqual([]);
    expect(evaluateDunning({ daysOverdue: -3 }).due.map((s) => s.step)).toEqual([1]);
  });

  it("walks every rung in order as days pass", () => {
    const seen: number[][] = [];
    for (const day of [-3, 0, 3, 7, 10, 14]) {
      seen.push(evaluateDunning({ daysOverdue: day }).due.map((s) => s.step));
    }
    expect(seen).toEqual([
      [1],
      [1, 2],
      [1, 2, 3],
      [1, 2, 3, 4],
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5, 6],
    ]);
  });

  it("treats each boundary as inclusive", () => {
    // Day 3 exactly must fire step 3, not wait for day 4.
    expect(evaluateDunning({ daysOverdue: 3 }).currentStep?.step).toBe(3);
    expect(evaluateDunning({ daysOverdue: 2 }).currentStep?.step).toBe(2);
  });

  it("stops escalating past the last rung", () => {
    const s = evaluateDunning({ daysOverdue: 400, sentSteps: [1, 2, 3, 4, 5, 6] });
    expect(s.due).toEqual([]);
    expect(s.currentStep?.step).toBe(6);
  });
});

describe("idempotency", () => {
  it("returns only what has not been sent", () => {
    const s = evaluateDunning({ daysOverdue: 7, sentSteps: [1, 2] });
    expect(s.due.map((x) => x.step)).toEqual([3, 4]);
  });

  it("re-running after a crash sends nothing twice", () => {
    const first = evaluateDunning({ daysOverdue: 7 });
    const sent = first.due.map((s) => s.step);
    const second = evaluateDunning({ daysOverdue: 7, sentSteps: sent });
    expect(second.due).toEqual([]);
  });

  it("tolerates unknown or duplicated step ids in the sent list", () => {
    const s = evaluateDunning({ daysOverdue: 3, sentSteps: [1, 1, 99] });
    expect(s.due.map((x) => x.step)).toEqual([2, 3]);
  });
});

describe("stopping conditions", () => {
  it("stops dead once paid, at any day", () => {
    for (const day of [-3, 0, 7, 14, 90]) {
      const s = evaluateDunning({ daysOverdue: day, paid: true });
      expect(s.due).toEqual([]);
      expect(s.awaitingHuman).toBe(false);
    }
  });

  it("stops while paused, because that is the point of pausing", () => {
    const s = evaluateDunning({ daysOverdue: 20, paused: true });
    expect(s.due).toEqual([]);
    expect(s.awaitingHuman).toBe(false);
  });
});

describe("the human handover", () => {
  it("is false before day 10 and true from day 10 on", () => {
    expect(evaluateDunning({ daysOverdue: 9 }).awaitingHuman).toBe(false);
    expect(evaluateDunning({ daysOverdue: 10 }).awaitingHuman).toBe(true);
    expect(evaluateDunning({ daysOverdue: 30 }).awaitingHuman).toBe(true);
  });

  it("stays true even after the alert has been sent", () => {
    // Acknowledging the alert does not hand the client back to automation.
    const s = evaluateDunning({ daysOverdue: 12, sentSteps: [1, 2, 3, 4, 5] });
    expect(s.awaitingHuman).toBe(true);
  });
});

describe("HARD-RULES §6 — never auto-cancel", () => {
  it("never reports shouldCancel, at any day or state", () => {
    for (const day of [-5, 0, 10, 14, 60, 365]) {
      for (const paid of [true, false]) {
        for (const paused of [true, false]) {
          expect(evaluateDunning({ daysOverdue: day, paid, paused }).shouldCancel).toBe(
            false,
          );
        }
      }
    }
  });

  it("refuses at the guard, so no code path can route around the ladder", () => {
    expect(mayAutoCancelForNonPayment()).toBe(false);
  });
});
