/**
 * The results engine's own Supabase connection.
 *
 * ⚠️ Deliberately separate from `lib/supabase/admin.ts`.
 *
 * The application's Supabase project holds identity, customers, quiz responses
 * and Stripe state. The results engine writes millions of rows of ingested race
 * data on a schedule. Those are different workloads with different blast
 * radii, and as of 3 August 2026 they are literally different projects.
 *
 * Repointing the shared `NEXT_PUBLIC_SUPABASE_URL` at the results project would
 * silently break admin login, the quiz and the customer list, because none of
 * those tables exist there. So the engine reads its own variables and only
 * falls back to the shared ones when it has none of its own — which keeps a
 * single-project setup working too.
 *
 *   RESULTS_SUPABASE_URL         → NEXT_PUBLIC_SUPABASE_URL
 *   RESULTS_SUPABASE_SECRET_KEY  → SUPABASE_SECRET_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * The two variables fall back **together or not at all**.
 *
 * Falling back independently pairs the results project's URL with the
 * application project's key, which authenticates against the wrong project and
 * fails with a confusing 401 rather than a missing-configuration error. Either
 * the engine has its own pair, or it uses the shared pair.
 */
function ownPair(): { url: string; key: string } | null {
  const url = process.env.RESULTS_SUPABASE_URL;
  const key = process.env.RESULTS_SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

function sharedPair(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return url && key ? { url, key } : null;
}

export function resultsSupabaseUrl(): string | undefined {
  return (ownPair() ?? sharedPair())?.url;
}

export function resultsSupabaseKey(): string | undefined {
  return (ownPair() ?? sharedPair())?.key;
}

/**
 * Set but incomplete: the URL is configured without its key, or the reverse.
 * Reported separately so the console can say "half configured" rather than
 * "not configured", which sends an operator looking in the wrong place.
 */
export function resultsSupabaseMisconfigured(): string | null {
  const url = process.env.RESULTS_SUPABASE_URL;
  const key = process.env.RESULTS_SUPABASE_SECRET_KEY;
  if (url && !key) return "RESULTS_SUPABASE_URL is set but RESULTS_SUPABASE_SECRET_KEY is not";
  if (key && !url) return "RESULTS_SUPABASE_SECRET_KEY is set but RESULTS_SUPABASE_URL is not";
  return null;
}

export function hasResultsSupabaseConfig(): boolean {
  return Boolean(resultsSupabaseUrl() && resultsSupabaseKey());
}

/** Which project the engine is pointed at, for the console. Never the key. */
export function resultsProjectRef(): string | null {
  // Trimmed: an environment variable set through a dashboard or a pipe can
  // carry a trailing newline, and a diagnostic that silently reads "unknown"
  // because of one is worse than no diagnostic.
  const url = resultsSupabaseUrl()?.trim();
  if (!url) return null;
  return /https:\/\/([^.]+)\.supabase\.co/.exec(url)?.[1] ?? null;
}

/**
 * Server-only, secret key, bypasses RLS.
 *
 * Every results table has RLS on with no policies, so this client is the only
 * thing that can read or write them. Public reads go through our own API, which
 * is what lets us cache, attribute and rate-limit them.
 */
export function resultsSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = resultsSupabaseUrl();
  const key = resultsSupabaseKey();
  if (!url || !key) {
    throw new Error(
      "The results engine has no database configured. Set RESULTS_SUPABASE_URL and " +
        "RESULTS_SUPABASE_SECRET_KEY (or the shared NEXT_PUBLIC_SUPABASE_URL / " +
        "SUPABASE_SECRET_KEY if results share the application's project).",
    );
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "public" },
  });
  return cached;
}

/** Tests and scripts that swap the client in. */
export function __setResultsSupabase(client: SupabaseClient | null) {
  cached = client;
}
