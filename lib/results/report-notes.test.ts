import { describe, it, expect } from "vitest";
import {
  pacingNote, roxzoneNote, stationNote, potentialNote, progressNote,
  type NoteContext,
} from "./report-notes";

function context(over: Partial<NoteContext> = {}): NoteContext {
  return {
    runVariationPercent: 4,
    fadeSeconds: 0,
    roxzoneDeltaSeconds: 0,
    roxzoneShare: 0.08,
    overallPercentile: 60,
    weakestLabel: "Wall Balls",
    weakestPercentile: 55,
    strongestLabel: "Row",
    strongestPercentile: 65,
    secondsAvailable: 90,
    netVsPreviousSeconds: null,
    racesLogged: 3,
    ...over,
  };
}

const ALL = [pacingNote, roxzoneNote, stationNote, potentialNote, progressNote];

describe("coach notes", () => {
  it("always returns a note, whatever the numbers", () => {
    for (const note of ALL) {
      const result = note(context());
      expect(result.heading.length).toBeGreaterThan(3);
      expect(result.body.length).toBeGreaterThan(0);
    }
  });

  it("never returns an empty or placeholder paragraph", () => {
    for (const note of ALL) {
      for (const para of note(context()).body) {
        expect(para.trim().length).toBeGreaterThan(40);
        expect(para).not.toMatch(/lorem|TODO|TBC/i);
      }
    }
  });
});

describe("pacingNote", () => {
  it("talks about fading when the athlete faded", () => {
    expect(pacingNote(context({ fadeSeconds: 90 })).heading).toMatch(/faded/i);
  });

  it("recognises a negative split rather than warning about pacing", () => {
    const note = pacingNote(context({ fadeSeconds: -60 }));
    expect(note.heading).toMatch(/negative-split/i);
    expect(note.body.join(" ")).not.toMatch(/you faded/i);
  });

  it("praises very even running instead of prescribing a pacing fix", () => {
    expect(pacingNote(context({ runVariationPercent: 2 })).heading).toMatch(/metronomic/i);
  });

  it("prioritises a bad fade over an otherwise even variation", () => {
    // Both rules could match; the fade is the more important thing to say.
    const note = pacingNote(context({ fadeSeconds: 120, runVariationPercent: 2 }));
    expect(note.heading).toMatch(/faded/i);
  });
});

describe("roxzoneNote", () => {
  it("calls out a leaking roxzone as the cheapest time available", () => {
    expect(roxzoneNote(context({ roxzoneDeltaSeconds: 90 })).heading).toMatch(/cheapest/i);
  });

  it("tells a sharp athlete to look elsewhere rather than inventing a fix", () => {
    const note = roxzoneNote(context({ roxzoneDeltaSeconds: -60 }));
    expect(note.heading).toMatch(/sharp/i);
    expect(note.body.join(" ")).toMatch(/not here/i);
  });
});

describe("stationNote", () => {
  it("names the weakest station when it is well behind the athlete's standard", () => {
    const note = stationNote(context({
      overallPercentile: 80, weakestPercentile: 40, weakestLabel: "Sled Push",
    }));
    expect(note.heading).toContain("Sled Push");
    expect(note.body.join(" ")).toContain("80th percentile");
  });

  it("names a standout strength when one is well ahead", () => {
    const note = stationNote(context({
      overallPercentile: 50, strongestPercentile: 90, strongestLabel: "Ski Erg",
    }));
    expect(note.heading).toContain("Ski Erg");
  });

  it("says the profile is even when nothing stands out", () => {
    expect(stationNote(context()).heading).toMatch(/even/i);
  });
});

describe("potentialNote", () => {
  it("warns against fixing everything at once when a lot is available", () => {
    const note = potentialNote(context({ secondsAvailable: 400 }));
    expect(note.body.join(" ")).toMatch(/not try to fix all of it/i);
  });

  it("tells an athlete near their ceiling that the answer is fitness", () => {
    expect(potentialNote(context({ secondsAvailable: 20 })).heading).toMatch(/ceiling/i);
  });
});

describe("progressNote", () => {
  it("recognises a first race rather than comparing against nothing", () => {
    const note = progressNote(context({ netVsPreviousSeconds: null, racesLogged: 1 }));
    expect(note.heading).toMatch(/baseline/i);
  });

  it("does not treat a slower race as a failure", () => {
    const note = progressNote(context({ netVsPreviousSeconds: 120 }));
    expect(note.body.join(" ")).toMatch(/not automatically a worse one/i);
  });

  it("celebrates a clear improvement", () => {
    expect(progressNote(context({ netVsPreviousSeconds: -180 })).heading).toMatch(/progress/i);
  });
});
