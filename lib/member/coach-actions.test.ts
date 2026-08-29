import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  TOPICS,
  attachmentProblem,
  coachAlertText,
  topicById,
  assembleQuestion,
} from "./coach-actions";

describe("what an athlete can ask about", () => {
  it("gives every topic a hint and something to say", () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(5);
    for (const t of TOPICS) {
      expect(t.hint.length, t.id).toBeGreaterThan(0);
      expect(t.questions.length, t.id).toBeGreaterThanOrEqual(3);
      for (const q of t.questions) expect(q.trim().length).toBeGreaterThan(8);
    }
  });

  it("has unique ids, since they are what a message is filed under", () => {
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });

  /* Somebody in pain is not a "reply within a day" message. Exactly one topic
     should carry that, so the flag keeps meaning something. */
  it("marks pain as the urgent one", () => {
    expect(TOPICS.filter((t) => t.urgent).map((t) => t.id)).toEqual(["injury"]);
  });

  it("looks a topic up, and returns nothing for one that does not exist", () => {
    expect(topicById("injury")?.label).toBe("Something hurts");
    expect(topicById("nonsense")).toBeUndefined();
  });
});

describe("the text that reaches Ben", () => {
  /**
   * The rule this exists to hold.
   *
   * A coaching question carries health information — "my knee", "I'm losing
   * weight faster than I want to". A lock-screen notification is read by
   * whoever is holding the phone, on a train, over a shoulder. So the text
   * says somebody is waiting and where to go; what they actually asked stays
   * behind his login.
   */
  it("never carries what was asked", () => {
    const text = coachAlertText({
      firstName: "Amelia",
      topic: "injury",
      link: "https://suthperformance.com/admin/messages",
    });
    expect(text).toContain("Amelia");
    expect(text).toContain("https://suthperformance.com/admin/messages");
    expect(text.toLowerCase()).not.toContain("knee");
    expect(text.toLowerCase()).not.toContain("pain");
  });

  it("says when it is urgent, and does not when it is not", () => {
    const urgent = coachAlertText({ firstName: "A", topic: "injury", link: "x" });
    const normal = coachAlertText({ firstName: "A", topic: "plan", link: "x" });
    expect(urgent).toContain("urgent");
    expect(normal).not.toContain("urgent");
  });

  /* One segment where possible. A coach who pays for three texts every time
     somebody asks about their sled is a coach who turns the alerts off. */
  it("stays short enough to be one message", () => {
    const text = coachAlertText({
      firstName: "Christopher",
      topic: "injury",
      link: "https://suthperformance.com/a/abcd12",
    });
    expect(text.length).toBeLessThanOrEqual(160);
  });
});

describe("attachments", () => {
  it("takes photos and videos and nothing else", () => {
    expect(attachmentProblem({ type: "image/jpeg", size: 1000 })).toBeNull();
    /* The normal output of a current phone camera. It used to be refused. */
    expect(attachmentProblem({ type: "image/jpeg", size: 6 * 1024 * 1024 })).toBeNull();
    expect(attachmentProblem({ type: "video/mp4", size: 1000 })).toBeNull();
    expect(attachmentProblem({ type: "application/pdf", size: 10 })).toBe(
      "Send a photo or a video.",
    );
  });

  /* Photos are downscaled on the way in, so the image ceiling only catches
     a file too big to decode. Video cannot be re-encoded in the browser, so
     its limit is still about what the thread can hold. */
  it("refuses what it cannot hold", () => {
    expect(attachmentProblem({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toContain(
      "too big",
    );
    expect(attachmentProblem({ type: "video/mp4", size: MAX_VIDEO_BYTES + 1 })).toContain(
      "too long",
    );
  });
});

describe("building the question with them", () => {
  /**
   * Why this exists.
   *
   * "How should I pace it?" is a question Ben cannot answer without knowing
   * which race, how far out, and what the athlete has done before — so he
   * replies asking for exactly that, and they wait a day to be asked
   * something the app could have asked in three taps.
   */
  it("assembles the answers into one readable sentence", () => {
    const out = assembleQuestion("About race day —", [
      "my next race",
      "is two to four weeks away.",
      "How should I pace it?",
    ]);
    expect(out).toBe(
      "About race day — my next race is two to four weeks away. How should I pace it?",
    );
  });

  it("does not double up punctuation, and always ends as a question", () => {
    expect(assembleQuestion("Something hurts —", ["my knee."])).toBe(
      "Something hurts — my knee.",
    );
    expect(assembleQuestion("About the plan", ["is it working"])).toBe(
      "About the plan is it working?",
    );
  });

  it("survives an athlete skipping every follow-up", () => {
    expect(assembleQuestion("About race day —", [])).toBe("About race day —?");
    expect(assembleQuestion("About race day —", ["", "  "])).toBe("About race day —?");
  });

  /* The two topics where the answer genuinely depends on facts Ben would
     otherwise have to go and ask for. The rest are answerable as asked. */
  it("guides the topics that need it and leaves the others alone", () => {
    expect(topicById("race")?.build?.followUps.length).toBeGreaterThanOrEqual(2);
    expect(topicById("injury")?.build?.followUps.length).toBeGreaterThanOrEqual(2);
    expect(topicById("plan")?.build).toBeUndefined();
  });

  it("gives every follow-up something to tap", () => {
    for (const t of TOPICS) {
      if (!t.build) continue;
      expect(t.build.opener.length, t.id).toBeGreaterThan(0);
      for (const f of t.build.followUps) {
        expect(f.options.length, `${t.id}/${f.id}`).toBeGreaterThanOrEqual(2);
        for (const o of f.options) expect(o.text.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
