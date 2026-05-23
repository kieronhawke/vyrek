import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyOnboardingToken } from "@/lib/partners/tokens";
import { OnboardingForm } from "@/components/partners/onboarding-form";

export const metadata: Metadata = {
  title: "Welcome to the Vyrek Partner Programme",
  description: "Set up your partner profile and payout details.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PartnersOnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return <Invalid reason="No token in URL." />;

  const verified = verifyOnboardingToken(token);
  if (!verified.ok) return <Invalid reason={verified.reason} />;

  // Look up the application + check status.
  type App = { id: string; email: string; name: string; status: string };
  let app: App | null = null;
  try {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("partner_applications")
      .select("id, email, name, status")
      .eq("id", verified.applicationId)
      .maybeSingle();
    app = data ? (data as App) : null;
  } catch {
    return <Invalid reason="Could not load your application." />;
  }

  if (!app) return <Invalid reason="Application not found." />;
  if (app.status !== "approved") {
    return (
      <Invalid
        reason={`Your application status is "${app.status}". Onboarding opens after approval.`}
      />
    );
  }

  // Check if a partner row already exists for this application, they've
  // already onboarded.
  let alreadyOnboarded = false;
  try {
    const sb = supabaseAdmin();
    const { data: existing } = await sb
      .from("partners")
      .select("id, partner_code")
      .eq("application_id", app.id)
      .maybeSingle();
    alreadyOnboarded = !!existing;
  } catch {
    // soft-fail; allow re-attempt
  }

  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-28 md:pt-36">
        <Container>
          <div className="mx-auto max-w-2xl">
            <Eyebrow>Partner onboarding</Eyebrow>
            <h1 className="mt-4 text-3xl font-black leading-[1.05] tracking-[-0.04em] text-vyrek-text md:text-5xl">
              Welcome, {firstName(app.name)}.
            </h1>
            <p className="mt-5 text-base text-vyrek-text-secondary md:text-lg">
              {alreadyOnboarded ? (
                <>
                  Your partner profile is already set up. Open the{" "}
                  <a
                    href="/partners/dashboard"
                    className="text-vyrek-accent underline underline-offset-4"
                  >
                    dashboard
                  </a>{" "}
                  to share your link and track referrals.
                </>
              ) : (
                <>
                  Three minutes to set up your partner profile. We&apos;ll use
                  these details to pay you and credit your referrals.
                </>
              )}
            </p>

            {!alreadyOnboarded ? (
              <OnboardingForm
                applicationId={app.id}
                email={app.email}
                name={app.name}
                token={token}
              />
            ) : null}
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}

function Invalid({ reason }: { reason: string }) {
  return (
    <>
      <MarketingNav />
      <main className="pb-24 pt-32 md:pt-40">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-accent">
              [ ONBOARDING LINK ]
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-vyrek-text md:text-4xl">
              This link can&apos;t be used.
            </h1>
            <p className="mt-4 text-base text-vyrek-text-secondary">{reason}</p>
            <p className="mt-6 text-sm text-vyrek-text-tertiary">
              If this looks wrong, email{" "}
              <a
                href="mailto:partners@vyrek.com"
                className="text-vyrek-accent underline underline-offset-4"
              >
                partners@vyrek.com
              </a>{" "}
              and we&apos;ll send a fresh link.
            </p>
          </div>
        </Container>
      </main>
      <MarketingFooter />
    </>
  );
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}
