import * as Sentry from "@sentry/nextjs";

/**
 * Edge-runtime error reporting (middleware / edge routes). Same dormant-until-
 * DSN behaviour as the server config.
 */
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
