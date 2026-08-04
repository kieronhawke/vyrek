"use client";

import { useState } from "react";
import Image from "next/image";
import {
  REASONS,
  cancellationNote,
  reasonById,
  stageAfterReason,
  type ReasonId,
  type StageId,
} from "@/lib/member/cancel";
import { BEN_PHOTOS, pickPhoto } from "@/lib/photo-library";

/**
 * THE OFFBOARDING FLOW.
 *
 * Staged, with Ben's face on it, asking why — and with a visible, one-tap way
 * out of every single stage. That balance is the whole design and it is
 * enforced in `lib/member/cancel.ts`, where a test asserts no stage can
 * become a dead end.
 *
 * BEN'S PHOTO IS HERE FOR A REASON, NOT AS PRESSURE.
 * Somebody cancelling a coaching membership is ending a relationship with a
 * person, and a flow that pretends otherwise — a form, a spinner, a
 * "subscription terminated" — is both colder and less likely to get an honest
 * answer about why. The photo is the same portrait used everywhere else in
 * the app; it is not a sad face selected to make anybody feel guilty.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It does not cancel the Stripe subscription itself. Stripe's own billing
 * portal does that, and routing the final step there is deliberate: the
 * portal is the record of truth for what somebody is paying, it handles
 * proration and the end-of-period date correctly, and it cannot get out of
 * step with what Stripe actually believes. A bespoke "cancelled" flag in our
 * database that disagrees with Stripe is how people end up charged after
 * cancelling.
 */
export function CancelFlow({
  firstName,
  onClose,
}: {
  firstName: string;
  onClose: () => void;
}) {
  const [stage, setStage] = useState<StageId>("why");
  const [reason, setReason] = useState<ReasonId | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const portrait = pickPhoto(BEN_PHOTOS, "cancel-flow");
  const offer = reason ? reasonById(reason)?.offer : null;

  /** The last step hands over to Stripe, which is the record of truth. */
  async function toPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const body = (await res.json()) as { url?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      /* No portal means Stripe is not connected yet. Say so plainly and give
         them a route that a person will answer — never a dead end. */
      setError(
        "Billing is not connected to this account yet, so it cannot be cancelled here. Message Ben and it will be done the same day.",
      );
      setStage("done");
    } catch {
      setError(
        "Could not reach Stripe. Message Ben and he will cancel it for you the same day.",
      );
      setStage("done");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cx" role="dialog" aria-modal="true" aria-labelledby="cx-title">
      <div className="cx__card">
        <div className="cx__ben">
          <span className="cx__portrait">
            <Image
              src={portrait.src}
              alt="Ben Sutherland"
              fill
              sizes="72px"
              /* Not greyscaled here, unlike everywhere else in the app. This
                 is the one screen whose whole point is that a person is
                 asking — and a dark portrait, desaturated, at 56px on a dark
                 modal was effectively invisible. */
              style={{ objectFit: "cover" }}
            />
          </span>
          <span className="cx__benwho">
            <span className="cx__benname">Ben Sutherland</span>
            <span className="cx__bensub">Your coach</span>
          </span>
          <button type="button" className="cx__x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* ── Why ──────────────────────────────────────────────────────── */}
        {stage === "why" ? (
          <>
            <h2 id="cx-title" className="cx__title">
              Before you go — what happened?
            </h2>
            <p className="cx__lede">
              Honestly, this is the most useful thing you can tell me. It
              changes what I write for the next person.
            </p>
            <div className="cx__reasons">
              {REASONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="cx__reason"
                  aria-pressed={reason === r.id}
                  onClick={() => setReason(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <label className="cx__field">
              <span>Anything else? (optional)</span>
              <textarea
                className="cx__textarea"
                rows={3}
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="You do not have to fill this in."
              />
            </label>
            {/*
              Keeping is the emphasised button and cancelling is the plain
              one — not the other way round, which is how this first shipped.
              An accent-coloured "Continue to cancel" is the brightest thing
              on the screen actively recommending that somebody leaves.

              This is the whole of "a little bit tricky": the exit is one tap,
              never disabled, and never hidden. It just is not the thing the
              page is nudging you towards.
            */}
            <div className="cx__actions">
              <button type="button" className="cx__go" onClick={onClose}>
                Keep my membership
              </button>
              <button
                type="button"
                className="cx__stay"
                onClick={() => setStage(reason ? stageAfterReason(reason) : "confirm")}
              >
                Continue to cancel
              </button>
            </div>
            {/* Skipping the question is allowed. Requiring an answer to leave
                is the obstruction this flow is built not to be. */}
            <button type="button" className="cx__skip" onClick={() => setStage("confirm")}>
              Skip this and cancel
            </button>
          </>
        ) : null}

        {/* ── Offer ────────────────────────────────────────────────────── */}
        {stage === "offer" && offer ? (
          <>
            <h2 id="cx-title" className="cx__title">
              {offer.label}
            </h2>
            <p className="cx__lede">{offer.body}</p>
            <div className="cx__actions">
              <button
                type="button"
                className="cx__go"
                onClick={() => {
                  /* The save offers are real actions, and none of them is
                     wired to anything yet — so this says what will happen
                     rather than pretending it already has. */
                  setError(null);
                  setStage("done");
                }}
              >
                {offer.action}
              </button>
              <button type="button" className="cx__stay" onClick={() => setStage("confirm")}>
                No thanks, cancel my membership
              </button>
            </div>
          </>
        ) : null}

        {/* ── Confirm ──────────────────────────────────────────────────── */}
        {stage === "confirm" ? (
          <>
            <h2 id="cx-title" className="cx__title">
              Cancel your membership
            </h2>
            {/* What actually happens, before they act rather than after. This
                is the one legitimate speed bump in the flow. */}
            <ul className="cx__facts">
              <li>You keep access until the end of the period you have paid for.</li>
              <li>Your plans, sessions and history stay in your account.</li>
              <li>You can come back and pick up where you left off.</li>
              <li>Nothing is charged again once it is cancelled.</li>
            </ul>
            <div className="cx__actions">
              <button
                type="button"
                className="cx__danger"
                onClick={() => void toPortal()}
                disabled={busy}
              >
                {busy ? "Opening…" : "Cancel my membership"}
              </button>
              <button type="button" className="cx__stay" onClick={onClose}>
                Keep my membership
              </button>
            </div>
            <p className="cx__note">
              The last step happens in Stripe, which is where your billing
              actually lives.
            </p>
          </>
        ) : null}

        {/* ── Done ─────────────────────────────────────────────────────── */}
        {stage === "done" ? (
          <>
            <h2 id="cx-title" className="cx__title">
              {error ? "One more step" : "Thanks for telling me"}
            </h2>
            <p className="cx__lede">
              {error ??
                "I have got what you said. If you want that pause or that rewrite, message me and it is done."}
            </p>
            {reason ? (
              <p className="cx__note">
                Ben will see: “{cancellationNote(
                  { reason, detail, atISO: new Date().toISOString() },
                  firstName,
                )}”
              </p>
            ) : null}
            <div className="cx__actions">
              <button type="button" className="cx__stay" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
