// Hard guard: this module holds the service-role key. Importing it from a
// client component becomes a build error rather than a silent secret leak.
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-only client using the secret (service role) key.
 * Bypasses RLS. Never import this from a Client Component.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)",
    );
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
