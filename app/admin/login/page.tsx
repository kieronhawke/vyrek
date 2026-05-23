import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in. Vyrek admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (user && isAdminEmail(user.email)) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-vyrek-base px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
          [ MISSION CONTROL ]
        </p>
        <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl">
          Sign in.
        </h1>
        <p className="mt-3 text-sm text-vyrek-text-secondary">
          Vyrek admin only. Sign in with the email on the allowlist.
        </p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
