import { describe, it, expect } from "vitest";
import { looksLikePhone } from "./phone";

describe("looksLikePhone", () => {
  it("accepts the ways people really write UK numbers", () => {
    for (const v of [
      "07700 900000",
      "+44 7700 900000",
      "+447700900000",
      "(0161) 496 0000",
      "0161-496-0000",
      "01614960000",
    ]) {
      expect(looksLikePhone(v), v).toBe(true);
    }
  });

  it("rejects the junk a length-only check waved through", () => {
    for (const v of ["", "   ", "aaaaaaa", "call me", "12345", "07700 90000a"]) {
      expect(looksLikePhone(v), v).toBe(false);
    }
  });

  it("rejects too-many-digits (beyond E.164)", () => {
    expect(looksLikePhone("1234567890123456")).toBe(false);
  });
});
