import { describe, expect, it } from "vitest";
import { CONFIDENT_AT, gymKey, isStationId, verdicts } from "@/lib/gym-intel/types";

/**
 * The whole value of this dataset is that it is more honest than asserting a
 * kit list we have not checked. It stops being that the moment one person's
 * report renders as a fact, so the thresholds are worth pinning down.
 */

describe("a single report is never presented as settled", () => {
  it("does not call one report confident", () => {
    const [v] = verdicts({ sled: { yes: 1, no: 0 } });
    expect(v.confident).toBe(false);
    expect(v.yes + v.no).toBe(1);
  });

  it("becomes confident only at the threshold", () => {
    expect(verdicts({ sled: { yes: CONFIDENT_AT - 1, no: 0 } })[0].confident).toBe(false);
    expect(verdicts({ sled: { yes: CONFIDENT_AT, no: 0 } })[0].confident).toBe(true);
  });

  it("reports an even split as unknown rather than picking a side", () => {
    const [v] = verdicts({ sled: { yes: 4, no: 4 } });
    expect(v.present).toBeNull();
    expect(v.confident).toBe(false);
  });

  it("follows the majority once there is one", () => {
    expect(verdicts({ sled: { yes: 5, no: 1 } })[0].present).toBe(true);
    expect(verdicts({ sled: { yes: 1, no: 5 } })[0].present).toBe(false);
  });

  it("omits stations nobody has answered rather than showing an empty claim", () => {
    expect(verdicts({ sled: { yes: 0, no: 0 } })).toEqual([]);
    expect(verdicts(undefined)).toEqual([]);
  });
});

describe("gym keys survive real gym names", () => {
  it("normalises punctuation, case and accents", () => {
    expect(gymKey("PureGym Leeds — City Centre")).toBe("puregym-leeds-city-centre");
    expect(gymKey("Fitness Éclat")).toBe("fitness-eclat");
  });

  it("keys the same gym identically however it is written", () => {
    expect(gymKey("The Edge")).toBe(gymKey("the  edge "));
  });

  it("bounds the key so a long name cannot blow up a Redis field", () => {
    expect(gymKey("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});

describe("station ids are validated, because they come from a POST body", () => {
  it("accepts the real ones and rejects anything else", () => {
    expect(isStationId("sled")).toBe(true);
    expect(isStationId("wall-ball")).toBe(true);
    expect(isStationId("__proto__")).toBe(false);
    expect(isStationId("treadmill")).toBe(false);
  });
});
