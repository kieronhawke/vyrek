import { describe, expect, it } from "vitest";
import { toE164 } from "./send";

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
