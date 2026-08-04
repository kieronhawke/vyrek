import { describe, expect, it } from "vitest";
import { play, shouldPlay } from "./sounds";

/**
 * The gate, not the noise. Whether a beep sounds right is a judgement; whether
 * the app is allowed to make one is a rule, and it is the half that matters.
 */
describe("deciding whether to make a sound", () => {
  const base = { enabled: true, interacted: true, reducedMotion: false };

  it("plays when it is on and the page has been touched", () => {
    expect(shouldPlay(base)).toBe(true);
  });

  /* A training app should never make a noise in a quiet room nobody asked
     it to. Browsers block it too, but that is not the reason. */
  it("stays silent before the member has interacted with the page", () => {
    expect(shouldPlay({ ...base, interacted: false })).toBe(false);
  });

  it("stays silent when the member has turned it off", () => {
    expect(shouldPlay({ ...base, enabled: false })).toBe(false);
  });

  /* Named for motion, but it is the closest a browser gives to "stop doing
     extra" — and people who set it do not want a surprise noise either. */
  it("respects reduced motion", () => {
    expect(shouldPlay({ ...base, reducedMotion: true })).toBe(false);
  });
});

describe("playing", () => {
  /* No AudioContext under vitest. Failing silently is the whole contract:
     a beep is never worth taking a screen down for. */
  it("does not throw where there is no audio", () => {
    expect(() => play("send")).not.toThrow();
    expect(() => play("receive")).not.toThrow();
  });
});
