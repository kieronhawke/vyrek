/**
 * Next.js instrumentation hook. Loads the Sentry runtime config on server
 * start (per runtime) and forwards otherwise-unhandled request errors to
 * Sentry. Everything here is gated on SENTRY_DSN, so with no DSN configured
 * the whole thing is inert — no imports pulled, no captures sent.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Catches errors thrown out of Server Components, route handlers and the like
 * that aren't caught by our own try/catch. The many errors we DO catch and
 * turn into friendly responses are reported explicitly via lib/observability.
 */
export async function onRequestError(
  ...args: Parameters<
    NonNullable<
      typeof import("@sentry/nextjs")["captureRequestError"]
    >
  >
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
