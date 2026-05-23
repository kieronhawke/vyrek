"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    await sb.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex h-8 items-center rounded-pill border border-vyrek-border bg-vyrek-elevated px-3 text-xs font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong disabled:opacity-50"
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
