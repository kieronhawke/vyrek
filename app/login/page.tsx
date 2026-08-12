import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserOrNull } from "@/lib/supabase/optional";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { CustomerLoginForm } from "@/components/account/login-form";

export const metadata: Metadata = {
  /* The root layout appends " \u00b7 Suth Performance" to every child title.
     Naming the brand here printed it twice. */
  title: "Sign in",
  description:
    "Sign in to your Suth Performance account to see your week, log sessions, and manage your subscription.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function safeNext(next: string | undefined): string {
  if (!next) return "/app/today";
  if (!next.startsWith("/") || next.startsWith("//")) return "/app/today";
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  // If already signed in, send them where they were trying to go (or
  // to the member app by default).
  // Missing Supabase keys means "signed out", not a 500 — this page is how
  // someone gets in, so it has to render even when auth is unavailable.
  const user = await currentUserOrNull();
  if (user) redirect(next);

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-md">
            <Eyebrow>Sign in</Eyebrow>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-suth-text md:text-4xl">
              Welcome back.
            </h1>
            <p className="mt-4 text-base text-suth-text-secondary">
              Pop in your email and we&apos;ll send you a sign-in link — no
              password needed.
            </p>
            <CustomerLoginForm />
            <p className="mt-12 text-center text-sm text-suth-text-tertiary">
              First time here?{" "}
              <Link
                href="/quiz"
                className="text-suth-accent underline underline-offset-4"
              >
                Find your plan in 3 minutes
              </Link>
              .
            </p>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}
