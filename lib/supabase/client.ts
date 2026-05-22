"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client using the publishable (anon) key. Honours RLS.
 */
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
