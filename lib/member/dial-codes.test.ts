import { describe, expect, it } from "vitest";
import {
  DIAL_CODES,
  dialByIso,
  flagFor,
  joinNumber,
  looksLikeNumber,
  splitNumber,
} from "./dial-codes";

describe("flags", () => {
  /* Derived from the ISO code rather than stored beside it, so a country
     cannot be added with the wrong flag against it. */
  it("comes from the country code", () => {
    expect(flagFor("GB")).toBe("🇬🇧");
    expect(flagFor("IN")).toBe("🇮🇳");
    expect(flagFor("au")).toBe("🇦🇺");
  });

  it("has one for every country offered", () => {
    for (const d of DIAL_CODES) {
      expect(flagFor(d.iso).length, d.iso).toBeGreaterThan(0);
      expect(d.dial.startsWith("+"), d.iso).toBe(true);
    }
  });
});

describe("splitting a stored number", () => {
  it("recognises the country from the code", () => {
    expect(splitNumber("+447398790378")).toEqual({ iso: "GB", rest: "7398790378" });
    expect(splitNumber("+919876543210")).toEqual({ iso: "IN", rest: "9876543210" });
  });

  /**
   * Longest match first. A naive scan could take "+1" out of a longer code
   * and leave a number that dials somewhere else entirely.
   */
  it("matches the longest code, not the first one that fits", () => {
    expect(splitNumber("+35312345678").iso).toBe("IE");
    expect(splitNumber("+441234567890").iso).toBe("GB");
  });

  /* A bare "07…" is almost certainly UK given where the audience is, and
     guessing that beats throwing the digits away. */
  it("assumes the UK for a bare national number, and drops the trunk zero", () => {
    expect(splitNumber("07398790378")).toEqual({ iso: "GB", rest: "7398790378" });
  });
});

describe("joining one back together", () => {
  /**
   * The bug this exists to stop: a leading zero is a national trunk prefix
   * and is wrong once a country code is in front of it. "+44 07398…" is not
   * a number and will not deliver.
   */
  it("drops the trunk zero", () => {
    expect(joinNumber("GB", "07398790378")).toBe("+447398790378");
    expect(joinNumber("IE", "087 1234567")).toBe("+353871234567");
  });

  it("strips spaces, brackets and dashes", () => {
    expect(joinNumber("GB", "(0739) 879-0378")).toBe("+447398790378");
  });

  it("returns nothing for nothing, rather than a bare country code", () => {
    expect(joinNumber("GB", "")).toBe("");
    expect(joinNumber("GB", "   ")).toBe("");
  });
});

describe("validation", () => {
  /* Deliberately loose. National numbering plans vary from 6 to 14 digits and
     rejecting a valid foreign number is worse than accepting a typo. */
  it("accepts real lengths and rejects obvious rubbish", () => {
    expect(looksLikeNumber("GB", "07398790378")).toBe(true);
    expect(looksLikeNumber("IN", "9876543210")).toBe(true);
    expect(looksLikeNumber("GB", "123")).toBe(false);
    expect(looksLikeNumber("GB", "1234567890123456")).toBe(false);
    expect(looksLikeNumber("ZZ", "07398790378")).toBe(false);
  });
});

describe("the list itself", () => {
  it("covers the markets the site already targets", () => {
    const isos = new Set(DIAL_CODES.map((d) => d.iso));
    for (const need of ["GB", "IE", "US", "AU", "CA", "NZ", "ZA", "IN", "AE"]) {
      expect(isos.has(need), need).toBe(true);
    }
  });

  it("has no duplicate countries", () => {
    expect(new Set(DIAL_CODES.map((d) => d.iso)).size).toBe(DIAL_CODES.length);
  });

  it("looks a country up, and does not invent one", () => {
    expect(dialByIso("in")?.dial).toBe("+91");
    expect(dialByIso("ZZ")).toBeUndefined();
  });
});
