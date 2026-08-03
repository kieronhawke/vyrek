/**
 * Access control for everything that can move data or reach the source.
 *
 * Two different gates for two different callers (brief §13):
 *
 * - **Worker triggers** are machine-to-machine. They take a shared secret, so
 *   nobody can force a sync — or a backfill — by knowing a URL. A sync endpoint
 *   left open is a way for a stranger to make us hammer the source from our own
 *   IP, which is the failure this whole engine is designed to avoid.
 * - **Console controls** are human. They reuse the existing admin session, so
 *   there is one notion of "operator" in the codebase rather than two.
 *
 * `CRON_SECRET` unset in production is treated as *closed*, not open. A missing
 * secret must never mean "let everyone in".
 */

import { assertAdmin } from "@/lib/admin/auth";

export class UnauthorisedError extends Error {
  readonly status = 401;
  constructor(message = "Unauthorised") {
    super(message);
    this.name = "UnauthorisedError";
  }
}

/**
 * Constant-time-ish comparison. Node's `timingSafeEqual` needs equal lengths,
 * so length is checked first and the compare is done over a fixed digest.
 */
function secretsMatch(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isCronAuthorised(request: Request): boolean {
  const expected = process.env.CRON_SECRET;
  // No secret configured: closed. Never open.
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (bearer && secretsMatch(bearer, expected)) return true;

  const direct = request.headers.get("x-cron-secret") ?? "";
  return Boolean(direct) && secretsMatch(direct, expected);
}

export function assertCron(request: Request): void {
  if (!isCronAuthorised(request)) {
    throw new UnauthorisedError(
      "Worker trigger endpoints require the cron secret. Set CRON_SECRET and send it " +
        "as `Authorization: Bearer <secret>`.",
    );
  }
}

/** Human operator. Throws (or redirects) via the existing admin gate. */
export async function assertOperator(): Promise<void> {
  await assertAdmin();
}
