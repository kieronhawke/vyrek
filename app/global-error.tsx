"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary. Catches errors thrown in the root layout or in the
 * ordinary error boundary itself — the cases app/error.tsx can't. It replaces
 * the whole document, so it renders its own <html>/<body> and leans on inline
 * styles rather than assuming the stylesheet loaded. Kept deliberately plain.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[suth] fatal error:", error);
    import("@sentry/nextjs")
      .then((S) => S.captureException(error))
      .catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
          color: "#F5F5F3",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "34rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#8A8A85",
            }}
          >
            Error
          </p>
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "30px",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              fontWeight: 800,
            }}
          >
            That didn&apos;t work.
          </h1>
          <p
            style={{
              margin: "18px 0 0",
              fontSize: "16px",
              lineHeight: 1.6,
              color: "#B5B5B0",
            }}
          >
            Something on our side broke. Try again, and if it keeps happening,
            email{" "}
            <a
              href="mailto:hello@suthperformance.com"
              style={{ color: "#F5F5F3" }}
            >
              hello@suthperformance.com
            </a>
            .
          </p>
          {error.digest ? (
            <p
              style={{
                margin: "16px 0 0",
                fontSize: "11px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8A8A85",
              }}
            >
              REF {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: "28px" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                height: "44px",
                padding: "0 22px",
                borderRadius: "999px",
                border: "none",
                background: "#C6FF3A",
                color: "#0A0A0A",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
