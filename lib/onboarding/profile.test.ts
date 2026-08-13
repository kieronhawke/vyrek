import { describe, it, expect } from "vitest";
import { shapeAnswers } from "./profile";

describe("shapeAnswers", () => {
  it("keeps the fields Ben reads and drops unknown ones", () => {
    const out = shapeAnswers({
      goal: "Sub-90 HYROX",
      experience: "some",
      trainingDays: 4,
      availableDays: ["mon", "wed", "fri"],
      coachingStyle: "Tough but supportive",
      nonsense: "should be dropped",
      photoDataUrl: "data:image/png;base64,AAAA", // not part of StoredAnswers
    });
    expect(out.goal).toBe("Sub-90 HYROX");
    expect(out.experience).toBe("some");
    expect(out.trainingDays).toBe(4);
    expect(out.availableDays).toEqual(["mon", "wed", "fri"]);
    expect(out.coachingStyle).toBe("Tough but supportive");
    expect(out).not.toHaveProperty("nonsense");
    expect(out).not.toHaveProperty("photoDataUrl");
  });

  it("clamps training days to 1-7, null otherwise", () => {
    expect(shapeAnswers({ trainingDays: 0 }).trainingDays).toBeNull();
    expect(shapeAnswers({ trainingDays: 8 }).trainingDays).toBeNull();
    expect(shapeAnswers({ trainingDays: 7 }).trainingDays).toBe(7);
    expect(shapeAnswers({ trainingDays: "4" }).trainingDays).toBeNull();
  });

  it("rejects an invalid experience/preferredTime enum", () => {
    expect(shapeAnswers({ experience: "wizard" }).experience).toBe("");
    expect(shapeAnswers({ preferredTime: "midnight" }).preferredTime).toBe("");
  });

  it("shapes injuryDetails to the InjuryDetail contract", () => {
    const out = shapeAnswers({
      injuryAreas: ["knee"],
      injuryDetails: {
        knee: {
          recency: "current",
          care: "physio",
          triggers: ["running", "lunges"],
          note: "flares on sled push",
          extra: "dropped",
        },
      },
    });
    const knee = out.injuryDetails?.knee;
    expect(knee?.recency).toBe("current");
    expect(knee?.care).toBe("physio");
    expect(knee?.triggers).toEqual(["running", "lunges"]);
    expect(knee?.note).toBe("flares on sled push");
    expect(knee).not.toHaveProperty("extra");
  });

  it("caps very long free text", () => {
    const long = "x".repeat(5000);
    expect(shapeAnswers({ goal: long }).goal!.length).toBeLessThanOrEqual(500);
    expect(shapeAnswers({ currentTraining: long }).currentTraining!.length).toBeLessThanOrEqual(1000);
  });
});
