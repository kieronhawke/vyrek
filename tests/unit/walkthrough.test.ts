import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The tour is the first thing a paying member reads, and it tells them where
 * things are. A card that names the wrong tab sends somebody who has just paid
 * looking in the wrong place on their first day.
 *
 * Read as source rather than imported: the component is "use client" and
 * pulling it into a node test drags React and the store in with it, for an
 * assertion that is really about the copy.
 */
const SRC = readFileSync(
  join(process.cwd(), "components/member/walkthrough.tsx"),
  "utf8",
);
const NAV = readFileSync(join(process.cwd(), "components/member/nav.tsx"), "utf8");

function stepTabs(): string[] {
  return [...SRC.matchAll(/^\s*tab: "([^"]+)"/gm)].map((m) => m[1]);
}

/** Every label and abbreviation the navigation actually renders. */
function navWords(): Set<string> {
  const out = new Set<string>();
  for (const m of NAV.matchAll(/^\s*(?:label|short): "([^"]+)"/gm)) out.add(m[1]);
  return out;
}

describe("the first-run tour", () => {
  it("has one card per tab, in the navigation's own order", () => {
    expect(stepTabs()).toEqual(["Today", "Plan", "Fuel", "Coach", "You"]);
  });

  /**
   * The failure this exists for: the last card was headed "You" — the Account
   * tab — and described filming a set for Ben, which happens inside a session.
   * Naming a tab is a promise about where to go, so the name has to be one the
   * navigation actually shows.
   */
  it("never names a tab the navigation does not have", () => {
    const words = navWords();
    for (const tab of stepTabs()) {
      expect(words.has(tab), `"${tab}" is not a tab in the navigation`).toBe(true);
    }
  });

  /**
   * The last card promises the tour can be replayed from Account. If that
   * button is ever dropped, the copy becomes a lie — and the sort of lie
   * nobody notices, because the person reading it has no way to check.
   */
  it("only promises a replay while the replay control exists", () => {
    const promises = /replay this tour/i.test(SRC);
    if (!promises) return;
    const replay = readFileSync(
      join(process.cwd(), "components/member/replay-tour.tsx"),
      "utf8",
    );
    expect(replay).toContain("WALKTHROUGH_REPLAY_KEY");
    const account = readFileSync(
      join(process.cwd(), "components/member/screens/account-screen.tsx"),
      "utf8",
    );
    expect(account, "Account must mount ReplayTour").toContain("ReplayTour");
  });

  /* Escape has to close it. A modal that only a mouse can dismiss traps
     everybody else on the page behind it. */
  it("can be dismissed from the keyboard", () => {
    expect(SRC).toContain('e.key === "Escape"');
  });
});
