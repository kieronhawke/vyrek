import { describe, it, expect } from "vitest";
import { segments, isGsm7 } from "./messages";

/**
 * The club-waitlist confirmation used to spill to two billed segments for any
 * real first name (an em dash was forcing UCS-2). This guards the trimmed,
 * ASCII-only body at one segment across a range of name lengths — the length
 * test the other SMS bodies get, which this one lacked.
 */
function waitlistBody(firstName: string): string {
  return `Hi ${firstName}, it's Ben. You're on the Suth Club waiting list - you'll be first to know when it opens. Reply here with any questions.`;
}

describe("club waitlist confirmation SMS", () => {
  it("is one GSM-7 segment for names short and long", () => {
    for (const name of ["there", "Sam", "Christopher", "Alexandria"]) {
      const body = waitlistBody(name);
      expect(isGsm7(body), `${name} gsm7`).toBe(true);
      expect(segments(body), `${name} segments`).toBe(1);
    }
  });
});
