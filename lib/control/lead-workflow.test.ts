import { describe, expect, it } from "vitest";
import {
  applyAction,
  needsAction,
  nextActions,
  stageProgress,
  STAGE_ORDER,
  type LeadStage,
} from "./lead-workflow";

/**
 * The pipeline is the part of the admin that decides what Ben does next, so
 * the transitions matter more than anything drawn on top of them.
 */
describe("lead workflow", () => {
  it("gives every unfinished stage something to do", () => {
    for (const stage of STAGE_ORDER) {
      if (stage === "client") continue;
      expect(nextActions(stage).length, `${stage} has no next action`).toBeGreaterThan(0);
    }
  });

  it("finishes: client and lost are terminal", () => {
    expect(nextActions("client")).toEqual([]);
    expect(nextActions("lost")).toEqual([]);
  });

  it("walks the happy path from new to paying client", () => {
    let stage: LeadStage = "new";
    const path = ["contact", "book", "call-done", "outcome-ready", "send-onboarding", "await", "activated"];
    for (const id of path) stage = applyAction(stage, id).stage;
    expect(stage).toBe("client");
  });

  it("texts on first contact and again when they are deciding", () => {
    expect(applyAction("new", "contact").effects).toContainEqual({
      kind: "sms",
      template: "first-contact",
    });
    const deciding = applyAction("call_made", "outcome-deciding");
    expect(deciding.stage).toBe("deciding");
    expect(deciding.effects).toContainEqual({ kind: "sms", template: "follow-up" });
    // A follow-up without a reminder is a lead that goes quiet forever.
    expect(deciding.effects).toContainEqual({ kind: "reminder", inDays: 3 });
  });

  it("only emails the onboarding invite from the stage that means it", () => {
    const sending = STAGE_ORDER.filter((s) =>
      nextActions(s).some((a) =>
        (a.effects ?? []).some((e) => e.kind === "email" && e.template === "onboarding-invite"),
      ),
    );
    expect(sending).toEqual(["ready_to_onboard", "onboarding_sent"]);
  });

  it("celebrates once, and only when they actually become a client", () => {
    const celebrating = STAGE_ORDER.flatMap((s) =>
      nextActions(s).flatMap((a) => (a.effects ?? []).filter((e) => e.kind === "celebrate").map(() => ({ from: s, to: a.to }))),
    );
    expect(celebrating).toEqual([{ from: "onboarding_pending", to: "client" }]);
  });

  it("does not ask Ben to chase somebody who has already signed up", () => {
    expect(needsAction("client")).toBe(false);
    expect(needsAction("lost")).toBe(false);
    // Waiting on them is not an action for him either.
    expect(needsAction("onboarding_pending")).toBe(false);
    expect(needsAction("new")).toBe(true);
  });

  it("ignores a stale action id rather than throwing", () => {
    expect(applyAction("new", "not-a-real-action")).toEqual({ stage: "new", effects: [] });
  });

  it("progresses monotonically along the rail", () => {
    const values = STAGE_ORDER.map(stageProgress);
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
    expect(stageProgress("client")).toBe(1);
    expect(stageProgress("lost")).toBe(0);
  });
});
