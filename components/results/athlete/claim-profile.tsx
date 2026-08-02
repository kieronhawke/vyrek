"use client";

import { useState } from "react";
import { BadgeCheck, ArrowRight } from "lucide-react";
import { MicroLabel } from "../ui/primitives";

/**
 * "Is this you? Claim this profile."
 *
 * The brief asks for this entry point to be excellent, because it is our
 * authorised user-submitted route and the one place a visitor turns into a
 * record we own. The reference site has no equivalent — profiles there are
 * scraped facts about you that you cannot touch.
 *
 * Deliberately a two-step: the pitch, then the form. Asking for an email
 * before saying what it buys is how you get a 2% conversion.
 *
 * NOT WIRED UP. Submitting is disabled until Kieron decides where claims land
 * (Supabase table, or the existing lead pipeline). Better an honest disabled
 * state than a form that silently drops what people type into it.
 */
export function ClaimProfile({
  athleteName,
}: {
  athleteName: string;
  athleteSlug: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-md border border-suth-border-subtle bg-suth-elevated p-5">
      <MicroLabel>[ IS THIS YOU? ]</MicroLabel>
      <h2 className="mt-2 text-base font-semibold text-suth-text md:text-lg">
        Claim this profile
      </h2>
      <p className="mt-1.5 max-w-xl text-sm text-suth-text-secondary">
        Verify that you are {athleteName} and this becomes yours: correct anything wrong, add
        races we do not have, and get your splits analysed against every race you run from here.
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-suth-accent px-5
                     text-sm font-semibold text-suth-base transition-colors hover:bg-suth-accent-hover
                     focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-suth-accent"
        >
          <BadgeCheck className="size-4" aria-hidden />
          This is me
        </button>
      ) : (
        <div className="mt-4 rounded-sm border border-suth-border bg-suth-base/60 p-4">
          <ul className="space-y-2 text-sm text-suth-text-secondary">
            <Step n={1}>Confirm your email so we can reach you.</Step>
            <Step n={2}>We match it against the race entry list for one of your events.</Step>
            <Step n={3}>Once matched, the profile is yours to edit.</Step>
          </ul>

          <p className="mt-4 rounded-sm border border-suth-warning/30 bg-suth-warning/5 px-3 py-2 text-xs text-suth-text-secondary">
            <span className="font-semibold text-suth-warning">Not live yet.</span>{" "}
            Profile claims open when verification is wired up. Nothing is collected here in the
            meantime — this is a preview of the flow, not a form.
          </p>

          <button
            type="button"
            disabled
            className="mt-4 inline-flex min-h-[44px] cursor-not-allowed items-center gap-2
                       rounded-sm border border-suth-border px-5 text-sm text-suth-text-disabled"
          >
            Start verification
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="results-num mt-0.5 flex size-5 shrink-0 items-center justify-center
                       rounded-full border border-suth-border text-[11px] text-suth-text-tertiary">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
