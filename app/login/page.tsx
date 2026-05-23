import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CustomerLoginForm } from "@/components/account/login-form";

export const metadata: Metadata = {
  title: "Sign in. Vyrek",
  description:
    "Sign in to your Vyrek account to see your week, log sessions, and manage your subscription.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // If already signed in, send them straight to the plan.
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user) redirect("/plan");

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-md">
            <Eyebrow>Sign in</Eyebrow>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-4xl">
              Welcome back.
            </h1>
            <p className="mt-4 text-base text-vyrek-text-secondary">
              Sign in with the email and password you used to save your plan.
            </p>
            <CustomerLoginForm />
            <p className="mt-12 text-center text-sm text-vyrek-text-tertiary">
              First time here?{" "}
              <a
                href="/quiz"
                className="text-vyrek-accent underline underline-offset-4"
              >
                Find your plan in 3 minutes
              </a>
              .
            </p>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
