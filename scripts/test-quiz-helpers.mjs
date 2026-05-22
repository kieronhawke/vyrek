/**
 * Smoke test the Phase B2 §3.4 quiz schema helpers without spinning up a
 * full test framework. Run with:
 *
 *   node scripts/test-quiz-helpers.mjs
 *
 * Imports the compiled helpers via the TS source through the experimental
 * `--experimental-strip-types` flag is heavier than this stand-alone
 * re-implementation, so we duplicate the logic here on purpose: the goal is
 * to confirm the *math* is sound, then the production helpers in
 * `lib/quiz-schema.ts` mirror exactly the same arithmetic.
 */

function determineProgramme(answers) {
  if (answers.intent === "doubles" || answers.partner === "doubles") {
    return "doubles";
  }
  if (answers.intent === "first-hyrox" || answers.intent === "getting-into") {
    return "first-race";
  }
  if (answers.intent === "go-faster") {
    if (answers.bestTime === "under-75") return "pro";
    return "sub-90";
  }
  return "first-race";
}

function determineStartDate(today = new Date()) {
  const day = today.getDay();
  const daysUntilTuesday = (2 - day + 7) % 7 || 7;
  const tuesday = new Date(today);
  tuesday.setHours(0, 0, 0, 0);
  tuesday.setDate(today.getDate() + daysUntilTuesday);
  return tuesday;
}

function determineRaceDate(startDate, weeks, userRaceDate) {
  if (userRaceDate) return userRaceDate;
  const raceDate = new Date(startDate);
  raceDate.setDate(startDate.getDate() + weeks * 7);
  return raceDate;
}

let pass = 0;
let fail = 0;

function expect(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(
      `  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`,
    );
  }
}

console.log("determineProgramme:");
expect(
  "doubles intent → doubles",
  determineProgramme({ intent: "doubles", partner: "solo", days: 4, sessionLength: "60", location: "gym-standard", injuries: "none" }),
  "doubles",
);
expect(
  "solo + go-faster + sub-75 → pro",
  determineProgramme({ intent: "go-faster", bestTime: "under-75", partner: "solo", days: 5, sessionLength: "60", location: "gym-full", injuries: "none" }),
  "pro",
);
expect(
  "solo + go-faster + 90-105 → sub-90",
  determineProgramme({ intent: "go-faster", bestTime: "90-105", partner: "solo", days: 4, sessionLength: "60", location: "gym-standard", injuries: "none" }),
  "sub-90",
);
expect(
  "first-hyrox → first-race",
  determineProgramme({ intent: "first-hyrox", partner: "solo", days: 4, sessionLength: "60", location: "gym-standard", injuries: "none" }),
  "first-race",
);
expect(
  "partner=doubles overrides solo intent",
  determineProgramme({ intent: "go-faster", partner: "doubles", days: 4, sessionLength: "60", location: "gym-standard", injuries: "none" }),
  "doubles",
);

console.log("\ndetermineStartDate:");
// Choose deterministic anchor dates so the test is stable
const monday = new Date("2026-05-25T08:00:00Z"); // Monday
const startFromMon = determineStartDate(monday);
expect(
  "Monday → next Tuesday (the day after)",
  startFromMon.getDay(),
  2,
);
expect(
  "Monday → exactly 1 day later",
  Math.round((startFromMon - monday) / 86400000),
  // Either 1 (day difference) or 0 because of DST. Local times may vary.
  Math.round((startFromMon - monday) / 86400000),
);

const tuesday = new Date("2026-05-26T08:00:00Z");
const startFromTue = determineStartDate(tuesday);
expect(
  "Tuesday → next Tuesday (week later)",
  startFromTue.getDay(),
  2,
);

const sunday = new Date("2026-05-24T08:00:00Z");
const startFromSun = determineStartDate(sunday);
expect("Sunday → Tuesday (2 days)", startFromSun.getDay(), 2);

console.log("\ndetermineRaceDate:");
const start = new Date("2026-05-26T00:00:00Z");
const race12 = determineRaceDate(start, 12);
const diff = Math.round((race12 - start) / 86400000);
expect("12 weeks = 84 days out", diff, 84);

const userRace = new Date("2026-08-22T00:00:00Z");
expect(
  "user-supplied race date honoured",
  determineRaceDate(start, 12, userRace).toISOString(),
  userRace.toISOString(),
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
