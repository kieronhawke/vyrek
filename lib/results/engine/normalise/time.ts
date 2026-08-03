/**
 * Time parsing. Boring, and the single most likely place to silently corrupt a
 * whole season.
 *
 * The source prints `HH:MM:SS`, but not only that: `MM:SS` turns up on station
 * splits, `H:MM:SS` on slower finishers, and `–` / `-` / `DNF` where a time
 * should be. Every one of those has to become either a number of milliseconds
 * or an explicit null. What it must never become is `NaN` or `0`, because a
 * zero finish time sorts to the top of a leaderboard and looks like a world
 * record.
 */

const TIME_RE = /^(?:(\d{1,3}):)?(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?$/;

/** Milliseconds, or null when there is no usable time. Never NaN, never 0. */
export function parseTimeToMs(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^(dnf|dns|dq|-{1,2}|–|—|n\/?a)$/i.test(value)) return null;

  const match = TIME_RE.exec(value);
  if (!match) return null;

  const [, h, m, s, frac] = match;
  const hours = h ? Number(h) : 0;
  const minutes = Number(m);
  const seconds = Number(s);

  // ⚠️ Minutes may exceed 59 when they are the *leading* unit.
  //
  // The Elite boards print `MM:SS.hh` — "60:08.73" is a sixty-minute race, not
  // a malformed one. Rejecting any minutes over 59 outright quarantined 516
  // real elite results, which are the fastest and most-read races on the site.
  // With an hours component present, minutes are a subdivision and 60 really is
  // malformed. Seconds are always a subdivision.
  if (seconds > 59) return null;
  if (h !== undefined && minutes > 59) return null;

  const ms =
    hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + (frac ? Number(frac.padEnd(3, "0")) : 0);
  return ms > 0 ? ms : null;
}

/** `MM:SS` when under an hour, `H:MM:SS` above. For logs and the console. */
export function formatMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** `"12"` → 12, `"—"` → null. Ranks arrive as strings and sometimes as dashes. */
export function parseRank(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const digits = /(\d+)/.exec(String(raw));
  if (!digits) return null;
  const value = Number(digits[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}
