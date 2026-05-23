"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Container } from "@/components/shared/container";
import { Eyebrow } from "@/components/shared/eyebrow";
import { capture } from "@/lib/posthog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function WelcomeContent({
  trialEndsAt,
  firstWorkoutDate,
  programmeName,
}: {
  trialEndsAt: Date | null;
  firstWorkoutDate: Date;
  programmeName: string;
}) {
  const [installPrompt, setInstallPrompt] = useState<
    BeforeInstallPromptEvent | null
  >(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    capture("welcome_viewed", { programme: programmeName });
  }, [programmeName]);

  useEffect(() => {
    const isIos =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS standalone flag
        (navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) return;

    const onPromptable = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPromptable);

    // After 3 seconds, surface either the Android prompt or the iOS hint.
    const id = window.setTimeout(() => {
      if (!installPrompt && isIos) setShowIosHint(true);
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPromptable);
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onInstall = async () => {
    if (!installPrompt) return;
    capture("pwa_install_prompted");
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    capture("pwa_install_outcome", { outcome });
    if (outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <main className="flex min-h-svh flex-col bg-vyrek-base pt-[var(--safe-top)]">
      <Container className="flex flex-1 flex-col py-12">
        <Eyebrow>Trial confirmed</Eyebrow>
        <h1 className="mt-3 text-4xl font-black leading-[1] tracking-[-0.04em] text-vyrek-text md:text-5xl">
          You&apos;re in.
        </h1>
        <p className="mt-4 max-w-md text-xl leading-snug text-vyrek-text-secondary">
          Day 1 of {programmeName} starts {format(firstWorkoutDate, "EEEE")}.
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              Trial ends
            </dt>
            <dd className="mt-1 text-base font-semibold text-vyrek-text">
              {trialEndsAt
                ? format(trialEndsAt, "d MMM")
                : "+ 7 days"}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-vyrek-text-tertiary">
              First workout
            </dt>
            <dd className="mt-1 text-base font-semibold text-vyrek-text">
              {format(firstWorkoutDate, "EEE d MMM")}
            </dd>
          </div>
        </dl>

        <hr className="my-8 border-t border-vyrek-border-subtle" />

        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-vyrek-text-tertiary">
          What happens next
        </h2>

        <ol className="mt-3 space-y-3" role="list">
          <li className="flex items-start gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4">
            <span className="font-mono text-xs font-bold text-vyrek-accent">
              01
            </span>
            <div className="flex-1">
              <p className="text-base font-medium text-vyrek-text">
                Add Vyrek to your home screen
              </p>
              <p className="mt-1 text-sm text-vyrek-text-secondary">
                Easier to open on day 1 if it&apos;s right there.
              </p>
              {installPrompt ? (
                <button
                  type="button"
                  onClick={onInstall}
                  className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-pill border border-vyrek-accent bg-vyrek-accent/10 px-4 text-sm font-medium text-vyrek-accent transition-colors hover:bg-vyrek-accent/20"
                >
                  Install Vyrek →
                </button>
              ) : showIosHint ? (
                <p className="mt-3 rounded-md border border-vyrek-border bg-vyrek-overlay p-3 text-sm text-vyrek-text-secondary">
                  On iPhone: tap the Share icon ↑ in Safari, then{" "}
                  <span className="text-vyrek-text">Add to Home Screen</span>.
                </p>
              ) : null}
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4">
            <span className="font-mono text-xs font-bold text-vyrek-accent">
              02
            </span>
            <div className="flex-1">
              <p className="text-base font-medium text-vyrek-text">
                Open it on {format(firstWorkoutDate, "EEEE")} morning
              </p>
              <p className="mt-1 text-sm text-vyrek-text-secondary">
                We&apos;ll send you the session via email too.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4">
            <span className="font-mono text-xs font-bold text-vyrek-accent">
              03
            </span>
            <div className="flex-1">
              <p className="text-base font-medium text-vyrek-text">
                Hit the session
              </p>
              <p className="mt-1 text-sm text-vyrek-text-secondary">
                Then log it. Then come back tomorrow.
              </p>
            </div>
          </li>
        </ol>

        <hr className="my-8 border-t border-vyrek-border-subtle" />

        <div className="rounded-md border border-vyrek-border-subtle bg-vyrek-elevated p-4">
          <p className="text-base font-medium text-vyrek-text">
            Refer a friend. Earn £20.
          </p>
          <p className="mt-1 text-sm text-vyrek-text-secondary">
            One paid month for them. Twenty quid for you. Cash, BACS, or
            credit.
          </p>
          <Link
            href="/account/refer"
            className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-pill border border-vyrek-border bg-vyrek-overlay px-4 text-sm font-medium text-vyrek-text transition-colors hover:border-vyrek-border-strong"
          >
            See how →
          </Link>
        </div>

        <hr className="my-8 border-t border-vyrek-border-subtle" />

        <Link
          href="/plan"
          className="inline-flex h-14 w-full items-center justify-center rounded-pill bg-vyrek-accent px-6 text-base font-medium tracking-tight text-[#0A0A0A] transition-[background,transform] duration-fast ease-out hover:bg-vyrek-accent-hover active:scale-[0.98]"
        >
          View your plan →
        </Link>
      </Container>
    </main>
  );
}
