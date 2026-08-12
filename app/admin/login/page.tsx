import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUserOrNull } from "@/lib/supabase/optional";
import { isAdminEmail } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Sign in. Suth Performance admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await currentUserOrNull();

  if (user && isAdminEmail(user.email)) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-suth-base px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-suth-accent">
          [ MISSION CONTROL ]
        </p>
        <h1 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl">
          Sign in.
        </h1>
        <p className="mt-3 text-sm text-suth-text-secondary">
          Suth Performance admin only. Sign in with the email on the allowlist.
        </p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
