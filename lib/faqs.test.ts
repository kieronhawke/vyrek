import { describe, it, expect } from "vitest";
import { FAQS } from "./faqs";

/**
 * These entries are rendered into `FAQPage` JSON-LD on the home page, so they
 * are not only copy — they are structured data a search engine may quote
 * directly. The rules worth enforcing are the ones that make the difference
 * between a rich result and a wasted one.
 */
describe("home FAQs", () => {
  it("has enough entries to cover what people actually ask", () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(18);
  });

  it("asks questions, not headings", () => {
    for (const f of FAQS) {
      expect(f.question.endsWith("?"), `"${f.question}" is not a question`).toBe(true);
    }
  });

  it("has no duplicate questions", () => {
    // A duplicate in FAQPage markup is a structured-data warning, not just
    // sloppy copy.
    const seen = FAQS.map((f) => f.question.toLowerCase().trim());
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("answers substantively but within snippet length", () => {
    for (const f of FAQS) {
      expect(f.answer.length, `"${f.question}" is answered too thinly`).toBeGreaterThan(30);
      // Rich results truncate hard. Past roughly 500 characters the tail is
      // written for nobody.
      expect(f.answer.length, `"${f.question}" runs too long for a snippet`).toBeLessThan(520);
    }
  });

  it("does not advertise a competitor's price", () => {
    /*
     * Deliberate positioning: the race report is free, and that is the whole
     * claim. Naming what somebody else charges anchors the reader on a price
     * and makes free sound like a discount rather than the offer.
     */
    for (const f of FAQS) {
      expect(`${f.question} ${f.answer}`).not.toMatch(/\$\s?\d|24\.99/);
    }
  });

  it("leaves no unresolved placeholder copy", () => {
    for (const f of FAQS) {
      expect(`${f.question} ${f.answer}`).not.toMatch(/\bTBC\b|\[.*?\]|lorem/i);
    }
  });
});
