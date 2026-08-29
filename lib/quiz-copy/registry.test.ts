import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { QUIZ_COPY, allCopyKeys, copyKey, interpolate } from "./registry";

/**
 * THE GUARD THAT STOPS THE EDITOR LYING.
 *
 * The registry copies each screen's shipped text so the admin editor can
 * show it as the placeholder — "this is what it says now". If somebody
 * rewords a question in its component and not here, the editor starts
 * describing a screen that no longer exists, and Ben edits against a
 * description of the past. That is a quiet, plausible-looking wrong, which
 * is the kind worth a test.
 *
 * It matches text rather than structure deliberately: the components hold
 * their strings as literals and this reads them back, so the check keeps
 * working whatever shape the components take.
 */

const SCREEN_DIR = join(process.cwd(), "components/quiz-v3/screens");

function allScreenSource(): string {
  return readdirSync(SCREEN_DIR)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => readFileSync(join(SCREEN_DIR, f), "utf8"))
    .join("\n");
}

/** JSX literals escape apostrophes; the registry stores the real character. */
function normalise(s: string): string {
  return s
    .replace(/&apos;|&#39;|\\u2019|’/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

describe("the quiz copy registry", () => {
  const source = normalise(allScreenSource());

  for (const screen of QUIZ_COPY) {
    for (const field of ["question", "helper", "cta"] as const) {
      const shipped = screen[field];
      if (!shipped) continue;
      // Token placeholders stand in for computed words, so only the fixed
      // part of those lines can be compared.
      const fixed = shipped.split(/\{\w+\}/).filter((p) => p.trim().length > 8);
      if (!fixed.length) continue;

      it(`${screen.kind}.${field} still matches the screen`, () => {
        for (const part of fixed) {
          expect(
            source.includes(normalise(part)),
            `"${part}" is in the registry but no screen says it any more`,
          ).toBe(true);
        }
      });
    }
  }

  it("offers a button field for every screen", () => {
    const keys = allCopyKeys();
    for (const s of QUIZ_COPY) {
      expect(keys).toContain(copyKey(s.kind, "cta"));
    }
  });

  it("has no duplicate screen kinds", () => {
    const kinds = QUIZ_COPY.map((s) => s.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });
});

describe("token interpolation", () => {
  it("fills what it knows", () => {
    expect(interpolate("When shall Ben call {first}?", { first: "Sam" })).toBe(
      "When shall Ben call Sam?",
    );
  });

  it("leaves an unknown token visible rather than eating the word", () => {
    // A typo should look like a typo. Blanking it would produce "Tell us
    // about your ." and read as a rendering bug nobody could trace back.
    expect(interpolate("Tell us about your {arae}.", { area: "knee" })).toBe(
      "Tell us about your {arae}.",
    );
  });

  it("survives a missing value", () => {
    expect(interpolate("Hello {first}", {})).toBe("Hello {first}");
  });
});
