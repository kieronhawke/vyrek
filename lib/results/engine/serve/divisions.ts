/**
 * Translation between the engine's division keys and the frontend's
 * `DivisionCode` union.
 *
 * Two vocabularies exist because they answer different questions. The engine
 * keys off what the source gives us (`open`, `pro`, `doubles` + a sex), and the
 * frontend union is a closed list that the UI, the URLs and the SEO templates
 * were built against. Rather than churn either, they meet here — one file,
 * bidirectional, with a test that walks every member of the union so a new
 * division cannot be added on one side and silently dropped on the other.
 */

import type { DivisionCode } from "../../types";

const ENGINE_TO_CODE: Record<string, DivisionCode> = {
  "open-men": "hyrox-men",
  "open-women": "hyrox-women",
  "pro-men": "hyrox-pro-men",
  "pro-women": "hyrox-pro-women",
  "doubles-men": "hyrox-doubles-men",
  "doubles-women": "hyrox-doubles-women",
  "doubles-mixed": "hyrox-doubles-mixed",
  "pro-doubles-men": "hyrox-pro-doubles-men",
  "pro-doubles-women": "hyrox-pro-doubles-women",
  "relay-men": "hyrox-team-relay-men",
  "relay-women": "hyrox-team-relay-women",
  "relay-mixed": "hyrox-team-relay-mixed",
  "adaptive-men": "hyrox-adaptive-men",
  "adaptive-women": "hyrox-adaptive-women",
  "elite-men": "hyrox-elite-men",
  "elite-women": "hyrox-elite-women",
  "elite-doubles-men": "hyrox-doubles-elite-men",
  "elite-doubles-women": "hyrox-doubles-elite-women",
};

const CODE_TO_ENGINE: Record<string, string> = Object.fromEntries(
  Object.entries(ENGINE_TO_CODE).map(([engine, code]) => [code, engine]),
);

/** Null rather than a guess: an unmapped division is a bug to surface, not to paper over. */
export function toDivisionCode(divisionKey: string): DivisionCode | null {
  return ENGINE_TO_CODE[divisionKey] ?? null;
}

export function toDivisionKey(code: string): string | null {
  return CODE_TO_ENGINE[code] ?? null;
}

export function allDivisionCodes(): DivisionCode[] {
  return Object.values(ENGINE_TO_CODE);
}

export function allDivisionKeys(): string[] {
  return Object.keys(ENGINE_TO_CODE);
}
