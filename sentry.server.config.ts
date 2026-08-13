import * as Sentry from "@sentry/nextjs";

/**
 * Server-side error reporting. Dormant until SENTRY_DSN is set in the
 * environment — with no DSN, Sentry.init disables the SDK and every capture
 * becomes a no-op, so this file is safe to ship before the DSN is provisioned.
 * The moment the var lands, server errors start flowing with no code change.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // We surface our own friendly messages; Sentry is for us, not the user.
    sendDefaultPii: false,
  });
}
