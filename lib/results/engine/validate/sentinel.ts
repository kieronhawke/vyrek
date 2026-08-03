/**
 * The parser-shape sentinel.
 *
 * There are two failures that look identical from inside a worker — "the source
 * is down" and "the source changed shape" — and they need opposite responses.
 * Source down: wait, retry, it will come back. Source changed: nothing will fix
 * itself, and every hour spent retrying is an hour of results not collected.
 *
 * The tell is that a shape change *succeeds*. The fetch is fine, the page is
 * 200, the markup parses — and produces nothing, or produces rows missing a
 * field that was there yesterday. Without this check that state is
 * indistinguishable from a quiet weekend, and the failure mode is a mid-season
 * structure change discovered in February when someone notices January is
 * missing (brief §13).
 *
 * So: quarantine is for a bad *row*. This is for a bad *batch*, and it shouts.
 */

import type { RowParseDiagnostics } from "../source/mika-parse";

/** Fields every results row must carry for the row to be worth anything. */
export const REQUIRED_FIELDS = ["fullname", "place_all"] as const;

/** Below this parse rate across a non-trivial batch, assume the parser broke. */
export const MIN_PARSE_RATE = 0.5;

export type SentinelVerdict =
  | { ok: true }
  | {
      ok: false;
      kind: "parser_shape";
      message: string;
      detail: Record<string, unknown>;
    };

export function checkParseShape(
  diagnostics: RowParseDiagnostics,
  context: { sourceDivisionId: string; via: string },
): SentinelVerdict {
  const { headerFields, candidateRows, parsedRows, emptyShell } = diagnostics;

  // The header is checked FIRST, before the empty-shell short-circuit.
  //
  // A renamed column usually *also* stops rows rendering, so checking
  // emptyShell first meant the loudest possible signal — the schema changed —
  // was swallowed as "quiet event". The header is the thing that tells the two
  // apart, so it has to be read before anything is excused.
  const missing = REQUIRED_FIELDS.filter((field) => !headerFields.includes(field));
  if (headerFields.length > 0 && missing.length > 0) {
    return {
      ok: false,
      kind: "parser_shape",
      message:
        `Parser may be broken: the results header no longer carries ${missing.join(", ")}. ` +
        `Seen: ${headerFields.join(", ") || "none"}.`,
      detail: { ...context, missing, headerFields },
    };
  }

  // An empty shell with an intact header is the normal response for an
  // upcoming event, or for a board that declines to render unfiltered.
  if (emptyShell || candidateRows === 0) return { ok: true };

  const rate = parsedRows / candidateRows;
  if (rate < MIN_PARSE_RATE) {
    return {
      ok: false,
      kind: "parser_shape",
      message:
        `Parser may be broken: ${parsedRows} of ${candidateRows} rows parsed ` +
        `(${Math.round(rate * 100)}%), below the ${Math.round(MIN_PARSE_RATE * 100)}% floor.`,
      detail: { ...context, candidateRows, parsedRows, rate },
    };
  }

  return { ok: true };
}

/**
 * Batch-level view across a whole sync.
 *
 * One broken division is a broken division. Every division broken at once is a
 * platform change, and that distinction is what decides whether a human is
 * woken up.
 */
export function summariseShape(verdicts: SentinelVerdict[]): SentinelVerdict {
  const broken = verdicts.filter((v) => !v.ok);
  if (broken.length === 0) return { ok: true };

  const proportion = broken.length / verdicts.length;
  if (verdicts.length >= 3 && proportion >= 0.8) {
    return {
      ok: false,
      kind: "parser_shape",
      message:
        `Parser may be broken across the platform: ${broken.length} of ${verdicts.length} ` +
        `divisions failed shape checks. This looks like a source structure change, not a bad batch.`,
      detail: { broken: broken.length, total: verdicts.length },
    };
  }

  return broken[0];
}
