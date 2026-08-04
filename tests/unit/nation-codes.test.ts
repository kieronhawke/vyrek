/**
 * The source speaks IOC, this component speaks ISO-3166.
 *
 * Results carry `GBR`, `USA`, `GER`, `NED` — Olympic codes — and every flag
 * here is keyed on the two-letter ISO code. So every lookup missed and every
 * row fell through to the text chip: a finished board showed a column of
 * "GBR" and "USA" in little boxes and not one flag. Not a rendering fault, a
 * vocabulary mismatch.
 */

import { describe, expect, it } from "vitest";
import { toIso2 } from "@/components/results/ui/flag";

describe("nation codes", () => {
  it("maps the codes the results source actually uses", () => {
    expect(toIso2("GBR")).toBe("gb");
    expect(toIso2("USA")).toBe("us");
  });

  it("⚠️ handles the ones that are not a truncation", () => {
    // These are why the two vocabularies have to be mapped rather than sliced:
    // GER is not "ge" (Georgia), NED is not "ne" (Niger), SUI is not "su".
    expect(toIso2("GER")).toBe("de");
    expect(toIso2("NED")).toBe("nl");
    expect(toIso2("SUI")).toBe("ch");
    expect(toIso2("RSA")).toBe("za");
    expect(toIso2("DEN")).toBe("dk");
    expect(toIso2("POR")).toBe("pt");
  });

  it("flies the Union flag for the home nations", () => {
    // HYROX records these separately; none is an ISO country.
    for (const code of ["ENG", "SCO", "WAL", "NIR"]) {
      expect(toIso2(code)).toBe("gb");
    }
  });

  it("passes an ISO code straight through", () => {
    expect(toIso2("gb")).toBe("gb");
    expect(toIso2("US")).toBe("us");
  });

  it("is unfazed by empty or unknown input", () => {
    expect(toIso2("")).toBe("");
    expect(toIso2("ZZZ")).toBe("zzz");
  });

  it("covers the nations that actually appear in the data", () => {
    // The top of the athlete table by count. Each must reach a two-letter code
    // — an unmapped one is a column of text where flags should be.
    const top = ["GBR","USA","GER","FRA","NED","ITA","AUS","ESP","MEX","POL",
                 "IND","IRL","SIN","BEL","HKG","AUT","CAN","NZL","THA","RSA",
                 "POR","SWE","SUI","DEN","BRA","PHI","MAS","JPN","KOR","INA",
                 "ENG","NOR","TPE","FIN","CHN","TUR","CZE","ARG","LTU","COL"];
    const unmapped = top.filter((c) => toIso2(c).length !== 2);
    expect(unmapped).toEqual([]);
  });
});
