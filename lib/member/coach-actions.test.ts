import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  TOPICS,
  attachmentProblem,
  coachAlertText,
  topicById,
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
    expect(attachmentProblem({ type: "video/mp4", size: 1000 })).toBeNull();
    expect(attachmentProblem({ type: "application/pdf", size: 10 })).toBe(
      "Send a photo or a video.",
    );
  });

  /* The thread persists to this browser. A file past these sizes would blow
     the storage quota and take the whole conversation with it. */
  it("refuses what it cannot hold", () => {
    expect(attachmentProblem({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 })).toContain(
      "too large",
    );
    expect(attachmentProblem({ type: "video/mp4", size: MAX_VIDEO_BYTES + 1 })).toContain(
      "too long",
    );
  });
});
