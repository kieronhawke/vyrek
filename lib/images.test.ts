import { describe, expect, it } from "vitest";
import { dataUrlBytes, fitInside } from "./images";

describe("fitting a photo inside a box", () => {
  it("scales the long edge down to the limit", () => {
    expect(fitInside(4032, 3024, 1400)).toEqual({ width: 1400, height: 1050 });
    expect(fitInside(3024, 4032, 1400)).toEqual({ width: 1050, height: 1400 });
  });

  /**
   * The half of this that matters. Upscaling a small photo makes it blurry
   * *and* bigger, which is both sides of the trade going the wrong way.
   */
  it("never makes a small photo bigger", () => {
    expect(fitInside(400, 300, 1400)).toEqual({ width: 400, height: 300 });
  });

  it("leaves a photo already at the limit alone", () => {
    expect(fitInside(1400, 900, 1400)).toEqual({ width: 1400, height: 900 });
  });

  /* A canvas floors a fractional width and drops the last column of pixels. */
  it("returns whole pixels", () => {
    const { width, height } = fitInside(1000, 333, 500);
    expect(Number.isInteger(width) && Number.isInteger(height)).toBe(true);
    expect(height).toBe(167);
  });

  /* A panorama scaled hard enough would otherwise round to a zero-height
     canvas, which throws rather than producing a thin image. */
  it("never returns a zero dimension", () => {
    expect(fitInside(10000, 3, 100).height).toBe(1);
  });
});

describe("reading the size of a data URL", () => {
  it("discounts the base64 overhead and the header", () => {
    /* "hello" is five bytes, whatever its encoded length. */
    const url = `data:image/jpeg;base64,${Buffer.from("hello").toString("base64")}`;
    expect(dataUrlBytes(url)).toBe(5);
  });

  it("accounts for padding", () => {
    for (const text of ["a", "ab", "abc", "abcd"]) {
      const url = `data:image/jpeg;base64,${Buffer.from(text).toString("base64")}`;
      expect(dataUrlBytes(url), text).toBe(text.length);
    }
  });

  it("returns nothing for something that is not a data URL", () => {
    expect(dataUrlBytes("blob:https://example.com/abc")).toBe(0);
  });
});
