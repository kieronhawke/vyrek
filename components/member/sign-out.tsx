"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export function MemberSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
    await sb.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      /* text-red-300 was chosen for a near-black ground and is 1.49:1 on a
         light one. Danger comes from the surface token now, so it follows
         whichever theme is in play. */
      className="inline-flex h-12 w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-[var(--surface)] px-5 text-sm font-semibold text-[color:var(--danger)] transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
