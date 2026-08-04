import { describe, it, expect } from "vitest";
import { PROVIDERS, isConnectable, isConfigured, STATUS_LABEL } from "./connections";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe("providers", () => {
  it("every provider says what it brings and why it is where it is", () => {
    for (const p of PROVIDERS) {
      expect(p.brings.length, `${p.key} has no "brings"`).toBeGreaterThan(20);
      expect(p.note.length, `${p.key} has no note`).toBeGreaterThan(40);
      expect(STATUS_LABEL[p.status], `${p.key} has an unlabelled status`).toBeTruthy();
    }
  });

  it("only offers a connect action for something that can actually connect", () => {
    /*
     * The whole point of this model. Three of these providers can never work
     * from a website, and a row of identical "Connect" buttons would send
     * somebody off to find that out by tapping.
     */
    expect(PROVIDERS.filter(isConnectable).map((p) => p.key)).toEqual(["strava"]);
  });

  it("does not claim Apple Health or Google Fit are connectable", () => {
    // Neither has a web API — the data is on the device.
    for (const key of ["apple-health", "google-fit"]) {
      const p = PROVIDERS.find((x) => x.key === key)!;
      expect(p.status).toBe("needs-app");
      expect(isConnectable(p)).toBe(false);
    }
  });

  it("says MyFitnessPal is closed and points somewhere useful instead", () => {
    const mfp = PROVIDERS.find((p) => p.key === "myfitnesspal")!;
    expect(mfp.status).toBe("closed");
    // Somebody who uses it should be told what to do, not just refused.
    expect(mfp.note).toMatch(/log your food here/i);
  });

  it("distinguishes an API existing from its keys being present", () => {
    // "Ready to switch on" and "actually switched on" are different states, and
    // a Connect button opening a broken OAuth screen is as bad as a dead one.
    expect(isConfigured("strava", env({}))).toBe(false);
    expect(isConfigured("strava", env({ STRAVA_CLIENT_ID: "x", STRAVA_CLIENT_SECRET: "y" }))).toBe(true);
    expect(isConfigured("strava", env({ STRAVA_CLIENT_ID: "x" }))).toBe(false);
  });

  it("never reports a non-Strava provider as configured", () => {
    const full = env({ STRAVA_CLIENT_ID: "x", STRAVA_CLIENT_SECRET: "y" });
    for (const p of PROVIDERS.filter((x) => x.key !== "strava")) {
      expect(isConfigured(p.key, full)).toBe(false);
    }
  });

  it("gives a source wherever it claims a fact about a provider's API", () => {
    // These claims are checkable, and somebody should be able to check them.
    for (const p of PROVIDERS.filter((x) => x.status !== "needs-app")) {
      expect(p.docs, `${p.key} makes a claim with no source`).toBeTruthy();
    }
  });
});
