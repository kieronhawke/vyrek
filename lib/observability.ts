/**
 * One place to report a failure we've *caught* and handled gracefully.
 *
 * Most of the app's error paths deliberately swallow the error and return a
 * friendly response (a lead is still captured, a booking still stands). That's
 * correct for the user — but it means the failure never reaches Next's
 * onRequestError hook, so without this it goes only to a Vercel log nobody
 * watches. reportError always logs, and additionally sends to Sentry when a
 * DSN is configured. With no DSN it's just the console.error you'd write
 * anyway, so it's safe to call everywhere.
 */
export async function reportError(
  error: unknown,
  context?: { where?: string } & Record<string, unknown>,
): Promise<void> {
  const where = context?.where ? `[${context.where}] ` : "";
  console.error(`${where}`, error);

  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    /* Reporting must never throw into the caller. */
  }
}
