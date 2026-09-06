"use client";

import { useEffect, useRef, useState } from "react";
import {
  EMAIL_BODY_MAX,
  EMAIL_SUBJECT_MAX,
  SMS_MESSAGE_MAX,
  checkEmail,
  checkSmsMessage,
} from "@/lib/onboarding/message-copy";

/**
 * BEN REWRITES THE MESSAGE BEFORE IT GOES.
 *
 * The review step shows him the exact text and the exact email. These are the
 * two boxes that let him change them, and the whole design question was how
 * much to let him change.
 *
 * ── WHAT HE CAN EDIT, AND WHAT HE CANNOT ──────────────────────────────────
 * He edits the words. He cannot edit the link, the payment figures, the
 * button, or the sign-off, and that is not a limitation to apologise for:
 *
 *   THE LINK is appended by the server. A free-text box containing a URL is
 *   a box that eventually gets sent without one, and a payment text with no
 *   payment link costs money, reads as a scam, and does nothing. It is shown
 *   greyed on the end of the message so he can see the whole thing.
 *
 *   THE FIGURES come from the same schedule the checkout charges. If he could
 *   type "£50 a month" into a message whose link charges £60, the client would
 *   be told one number and billed another — which is the single worst thing
 *   this system could do.
 *
 * Everything else is his. Both boxes validate as he types, in the same
 * functions the server uses to accept the send, so nothing can pass here and
 * be refused there.
 *
 * ── LIVE, NOT ON SUBMIT ───────────────────────────────────────────────────
 * The segment count moves while he types. That matters more than it sounds:
 * a text is 160 characters, the 161st doubles the bill, and the only moment
 * that fact is useful is while somebody is still writing the sentence.
 */

const btn =
  "inline-flex h-9 items-center rounded-pill border border-suth-border px-3 text-xs text-suth-text-secondary transition-colors hover:border-suth-border-strong hover:text-suth-text disabled:opacity-50";
const btnPrimary =
  "inline-flex h-9 items-center rounded-pill bg-suth-accent px-4 text-xs font-semibold text-[#0A0A0A] hover:bg-suth-accent-hover disabled:opacity-50";
const area =
  "mt-2 block w-full rounded-md border border-suth-border bg-suth-elevated px-3 py-2.5 text-base text-suth-text outline-none focus:border-suth-accent";
const eyebrow =
  "font-mono text-[10px] uppercase tracking-[0.22em] text-suth-text-tertiary";

/** Grows with what is typed, so a long note is not read through a slot. */
function useAutoHeight(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, 480)}px`;
  }, [ref, value]);
}

export function SmsComposer({
  message,
  standard,
  link,
  onCancel,
  onSave,
}: {
  /** What is in the box when it opens: his last version, or the standard one. */
  message: string;
  /** The standard wording, for the reset control. */
  standard: string;
  /** The link the server will append. Shown, never editable. */
  link: string;
  onCancel: () => void;
  onSave: (message: string) => void;
}) {
  const [draft, setDraft] = useState(message);
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(ref, draft);

  /* The same check the server runs before it will send. Running it here as
     well is not duplication for its own sake: it is the difference between
     finding out about a third segment now and finding out after pressing
     send. */
  const check = checkSmsMessage(draft, link);
  const edited = draft.trim() !== standard.trim();

  return (
    <div className="mt-2 rounded-lg border border-suth-accent/30 bg-suth-accent/5 p-3">
      <label className="block">
        <span className={eyebrow}>Your message</span>
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={SMS_MESSAGE_MAX + 40}
          className={area}
          autoFocus
        />
      </label>

      {/* The link, visibly attached and visibly not editable. */}
      <p className="mt-2 text-xs text-suth-text-tertiary">
        The link is added automatically on the end:{" "}
        <span className="break-all font-mono text-suth-text-secondary">{link}</span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={`font-mono text-[11px] ${
            check.error
              ? "text-red-400"
              : check.warning
                ? "text-amber-300"
                : "text-suth-text-tertiary"
          }`}
        >
          {check.segments} text{check.segments === 1 ? "" : "s"} ·{" "}
          {check.body.length} characters
        </span>
        {edited ? (
          <button type="button" className={btn} onClick={() => setDraft(standard)}>
            Back to the standard wording
          </button>
        ) : null}
      </div>

      {check.error ? (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {check.error}
        </p>
      ) : check.warning ? (
        <p className="mt-2 text-xs text-amber-300">{check.warning}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!check.ok}
          onClick={() => onSave(check.message)}
        >
          Use this message
        </button>
        <button type="button" className={btn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function EmailComposer({
  subject,
  body,
  standardSubject,
  standardBody,
  onCancel,
  onSave,
}: {
  subject: string;
  body: string;
  standardSubject: string;
  standardBody: string;
  onCancel: () => void;
  onSave: (subject: string, body: string) => void;
}) {
  const [draftSubject, setDraftSubject] = useState(subject);
  const [draftBody, setDraftBody] = useState(body);
  const ref = useRef<HTMLTextAreaElement>(null);
  useAutoHeight(ref, draftBody);

  const check = checkEmail(draftSubject, draftBody);
  const edited =
    draftSubject.trim() !== standardSubject.trim() ||
    draftBody.trim() !== standardBody.trim();

  return (
    <div className="mt-2 rounded-lg border border-suth-accent/30 bg-suth-accent/5 p-3">
      <label className="block">
        <span className={eyebrow}>Subject</span>
        <input
          value={draftSubject}
          onChange={(e) => setDraftSubject(e.target.value)}
          maxLength={EMAIL_SUBJECT_MAX + 20}
          className="mt-2 block h-12 w-full rounded-md border border-suth-border bg-suth-elevated px-3 text-base text-suth-text outline-none focus:border-suth-accent"
          autoFocus
        />
      </label>

      <label className="mt-3 block">
        <span className={eyebrow}>Your message</span>
        <textarea
          ref={ref}
          value={draftBody}
          onChange={(e) => setDraftBody(e.target.value)}
          rows={6}
          maxLength={EMAIL_BODY_MAX + 200}
          className={area}
        />
      </label>

      {/* Said plainly, because the alternative is Ben retyping the payment
          figures into the body and creating two versions of the truth. */}
      <p className="mt-2 text-xs text-suth-text-tertiary">
        Leave a blank line between paragraphs. The greeting, the button, the
        payment table and your sign-off are added around this and stay as they
        are.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[11px] text-suth-text-tertiary">
          {check.paragraphs.length} paragraph
          {check.paragraphs.length === 1 ? "" : "s"} · {draftBody.length} characters
        </span>
        {edited ? (
          <button
            type="button"
            className={btn}
            onClick={() => {
              setDraftSubject(standardSubject);
              setDraftBody(standardBody);
            }}
          >
            Back to the standard wording
          </button>
        ) : null}
      </div>

      {check.error ? (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {check.error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!check.ok}
          onClick={() => onSave(check.subject, check.body)}
        >
          Use this email
        </button>
        <button type="button" className={btn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
