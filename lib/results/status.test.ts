import { describe, it, expect } from "vitest";
import {
  isFinish,
  normaliseStatus,
  isListable,
  RESULT_STATUSES,
  STATUS_LABEL,
  STATUS_DESCRIPTION,
} from "./status";

/**
 * The gate every ranking, record and report goes through.
 *
 * The bug this replaces was a denylist — `status === "dnf" ? "dnf" :
 * "finished"` — which meant every value the feed could produce *except* one
 * became a valid finish. A disqualified athlete was eligible for the world
 * record book.
 */

describe("isFinish", () => {
  it("passes a real finish", () => {
    expect(isFinish("finished", 3600)).toBe(true);
  });

  it("rejects every non-finish outcome", () => {
    for (const status of ["dnf", "dsq", "dns"]) {
      expect(isFinish(status, 3600), `"${status}" was counted as a finish`).toBe(false);
    }
  });

  it("rejects anything it does not recognise", () => {
    /*
     * The load-bearing property. An unrecognised status must fail closed:
     * being wrong that way costs one missing row, being wrong the other way
     * puts a struck result on a leaderboard.
     */
    for (const status of ["", "DNF", "Finished", "pending", "withdrawn", "ok", null, undefined]) {
      expect(isFinish(status, 3600), `${JSON.stringify(status)} was counted as a finish`).toBe(false);
    }
  });

  it("rejects a finish with no time on it", () => {
    // A "finished" row with a zero time is a data fault, not a result — and a
    // zero sorts straight to the top of every leaderboard it touches.
    expect(isFinish("finished", 0)).toBe(false);
    expect(isFinish("finished", -1)).toBe(false);
    expect(isFinish("finished", Number.NaN)).toBe(false);
  });

  it("allows the time to be omitted when the caller only asks about status", () => {
    expect(isFinish("finished")).toBe(true);
  });
});

describe("normaliseStatus", () => {
  it("recognises the four outcomes", () => {
    expect(normaliseStatus("finished")).toBe("finished");
    expect(normaliseStatus("dnf")).toBe("dnf");
    expect(normaliseStatus("dsq")).toBe("dsq");
    expect(normaliseStatus("dns")).toBe("dns");
  });

  it("copes with the wording and casing feeds actually use", () => {
    // Organisers are not consistent, and CSV imports carry whatever the
    // spreadsheet column happened to contain.
    expect(normaliseStatus("DSQ")).toBe("dsq");
    expect(normaliseStatus("Disqualified")).toBe("dsq");
    expect(normaliseStatus("DQ")).toBe("dsq");
    expect(normaliseStatus(" Did Not Start ")).toBe("dns");
    expect(normaliseStatus("No Show")).toBe("dns");
    expect(normaliseStatus("Finisher")).toBe("finished");
  });

  it("never invents a finish out of something it does not understand", () => {
    for (const raw of ["", "   ", "banana", null, undefined, "pending"]) {
      expect(normaliseStatus(raw), `${JSON.stringify(raw)} became a finish`).not.toBe("finished");
    }
  });

  it("keeps a disqualification distinct from a did-not-finish", () => {
    // These used to collapse into one bucket. DNF is a hard day; DSQ is a
    // judgement about your race, and an athlete would not thank you for
    // treating them as the same thing.
    expect(normaliseStatus("dsq")).not.toBe(normaliseStatus("dnf"));
  });
});

describe("presentation", () => {
  it("labels and describes every status", () => {
    for (const status of RESULT_STATUSES) {
      expect(STATUS_LABEL[status], `${status} has no label`).toBeTruthy();
      // The codes mean nothing to somebody's first race, and nothing at all to
      // a screen reader.
      expect(STATUS_DESCRIPTION[status].length, `${status} has no description`)
        .toBeGreaterThan(STATUS_LABEL[status].length - 1);
    }
    expect(STATUS_DESCRIPTION.dsq).toMatch(/disqualified/i);
    expect(STATUS_DESCRIPTION.dns).toMatch(/did not start/i);
  });

  it("keeps no-shows off a public board but shows the rest", () => {
    // Somebody who never started has no result, and a board padded with
    // hundreds of them is harder to read and says nothing.
    expect(isListable("dns")).toBe(false);
    expect(isListable("finished")).toBe(true);
    expect(isListable("dnf")).toBe(true);
    // A DSQ stays visible: it happened, and hiding it would misrepresent the
    // race for everyone placed around them.
    expect(isListable("dsq")).toBe(true);
  });
});
