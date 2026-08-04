import { describe, expect, it } from "vitest";
import { isReservedTestNumber, sendSms, toE164 } from "./send";

/**
 * The number formatting is the part that will actually bite.
 *
 * Ben types "07700 900123" because that is how a phone number is written in
 * this country. Twilio wants "+447700900123" and rejects anything else with an
 * error that reads like a bug in our code rather than a typo in his.
 */
describe("normalising a phone number", () => {
  it("accepts the ways a UK number is actually written", () => {
    for (const input of [
      "07700900123",
      "07700 900123",
      "07700 900 123",
      "(07700) 900123",
      "+447700900123",
      "+44 7700 900123",
      "44 7700 900123",
      "07700-900-123",
    ]) {
      expect(toE164(input), input).toBe("+447700900123");
    }
  });

  it("passes an international number through rather than guessing", () => {
    // Twilio knows more about Irish numbering than a regex here does.
    expect(toE164("+353871234567")).toBe("+353871234567");
    expect(toE164("+1 415 555 0100")).toBe("+14155550100");
  });

  it("refuses what is not a phone number", () => {
    for (const bad of ["", "hello", "07700", "not a number", "0770090012345678", "++44770"]) {
      expect(toE164(bad), bad).toBeNull();
    }
  });

  it("never returns something Twilio would reject as malformed", () => {
    for (const input of ["07700900123", "+447700900123", "+353871234567"]) {
      const out = toE164(input)!;
      expect(out).toMatch(/^\+\d{8,15}$/);
    }
  });
});

/**
 * Ofcom's 07700 900xxx range is reserved for testing, so Twilio rejects it
 * with 21211 and the failure lands in the live message log. Our own
 * onboarding spec uses 07700900001, which is how 78 of them got there.
 */
describe("reserved test numbers", () => {
  it("recognises the whole Ofcom drama range and nothing either side of it", () => {
    expect(isReservedTestNumber("+447700900000")).toBe(true);
    expect(isReservedTestNumber("+447700900001")).toBe(true);
    expect(isReservedTestNumber("+447700900999")).toBe(true);
    // One digit outside the range is a real, allocatable number.
    expect(isReservedTestNumber("+447700901000")).toBe(false);
    expect(isReservedTestNumber("+447700899999")).toBe(false);
    expect(isReservedTestNumber("+447398790378")).toBe(false);
  });

  it("refuses to send to one, whatever format it arrives in", async () => {
    for (const input of ["07700900001", "07700 900 001", "+447700900001"]) {
      const result = await sendSms({ to: input, body: "Should never leave the process." });
      expect(result.ok).toBe(false);
      // The point is that it fails HERE, before the network, so the reason is
      // ours and not Twilio's 21211.
      expect(result.ok === false && result.reason).toMatch(/RESERVED_TEST_NUMBER/);
    }
  });
});
