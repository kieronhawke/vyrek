"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useHydrated, readStored } from "@/hooks/use-hydrated";
import {
  TEMPLATES,
  TOKENS,
  OVERRIDES_KEY,
  draftSegments,
  draftIsGsm7,
  draftLength,
  effective,
  preview,
  render,
  unknownTokens,
  type OverrideMap,
  type TemplateDef,
  type TokenId,
} from "@/lib/comms/templates";

/**
 * Editing the words that go out, for somebody who does not write code.
 *
 * The rules this is built to:
 *
 *  - Nobody types curly braces. Tokens are buttons; clicking one inserts it
 *    at the cursor. The button says "First name", never "{{firstName}}".
 *  - The preview is filled in, always visible, and updates as you type. An
 *    editor that shows you the template rather than the message is asking
 *    the writer to compile it in their head.
 *  - A text message says how many segments it is *before* it is sent, and
 *    says why when a single character has doubled the cost.
 *  - Reset is always there. An edit is never destructive to the original.
 */

export function CommsEditor() {
  /* Starts empty, which is the original wording — exactly what the server
     can render. Ben's edits live in this browser and replace it after mount,
     the same swap the rest of the console makes. Returning a "Loading"
     placeholder instead meant the server sent nothing at all. */
  // Read up front rather than through an effect that then calls `setOverrides`
  // — that re-rendered every message card on mount. `hydrated` keeps the first
  // client render identical to the server's, which is what makes seeding from
  // storage safe.
  const hydrated = useHydrated();
  const [storedOverrides, setOverrides] = useState<OverrideMap>(() =>
    readStored<OverrideMap>(OVERRIDES_KEY, {}),
  );
  const overrides = hydrated ? storedOverrides : ({} as OverrideMap);
  const [openId, setOpenId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);


  const persist = (next: OverrideMap) => {
    setOverrides(next);
    window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  };

  const byStage = useMemo(() => {
    const m = new Map<string, TemplateDef[]>();
    for (const t of TEMPLATES) {
      const list = m.get(t.stage) ?? [];
      list.push(t);
      m.set(t.stage, list);
    }
    return [...m.entries()];
  }, []);

  const editedCount = Object.keys(overrides).length;

  return (
    <div className="ce">
      <div className="ce-summary">
        <span>
          <strong>{TEMPLATES.length}</strong> messages
        </span>
        <span>
          <strong>{editedCount}</strong> edited
        </span>
        {editedCount > 0 && (
          <button type="button" className="ce-reset-all" onClick={() => persist({})}>
            Reset all to the original wording
          </button>
        )}
      </div>

      {byStage.map(([stage, defs]) => (
        <section key={stage} className="ce-stage">
          <h3 className="ce-stage__title">{stage}</h3>
          <ul className="ce-list" role="list">
            {defs.map((def) => (
              <TemplateCard
                key={def.id}
                def={def}
                overrides={overrides}
                open={openId === def.id}
                onToggle={() => setOpenId(openId === def.id ? null : def.id)}
                onSave={(subject, body) => {
                  persist({
                    ...overrides,
                    [def.id]: { subject, body, editedAt: new Date().toISOString() },
                  });
                  setSaved(def.id);
                  setTimeout(() => setSaved(null), 2500);
                }}
                onReset={() => {
                  const next = { ...overrides };
                  delete next[def.id];
                  persist(next);
                }}
                justSaved={saved === def.id}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TemplateCard({
  def,
  overrides,
  open,
  onToggle,
  onSave,
  onReset,
  justSaved,
}: {
  def: TemplateDef;
  overrides: OverrideMap;
  open: boolean;
  onToggle: () => void;
  onSave: (subject: string | undefined, body: string) => void;
  onReset: () => void;
  justSaved: boolean;
}) {
  const current = effective(def, overrides);
  const [body, setBody] = useState(current.body);
  const [subject, setSubject] = useState(current.subject ?? "");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  /** Which field the cursor was last in, so a token lands in the right one. */
  const lastFocused = useRef<"body" | "subject">("body");

  /*
   * Re-sync when an override is reset from outside this card.
   *
   * Adjusted DURING RENDER rather than in an effect. This is React's own
   * documented pattern for "reset state when a prop changes": the update is
   * queued before anything commits, so React re-runs this component
   * immediately and the browser never paints the stale value. The effect
   * version painted the old wording first, then replaced it — a visible flicker
   * in the textarea every time Ben reset a message, and a second render of the
   * whole card each time.
   *
   * The two `prev` values are the change detector. Comparing against `body`
   * directly would fight the user's own typing.
   */
  const [prevBody, setPrevBody] = useState(current.body);
  const [prevSubject, setPrevSubject] = useState(current.subject ?? "");
  if (prevBody !== current.body || prevSubject !== (current.subject ?? "")) {
    setPrevBody(current.body);
    setPrevSubject(current.subject ?? "");
    setBody(current.body);
    setSubject(current.subject ?? "");
  }

  const dirty = body !== current.body || (subject || undefined) !== current.subject;

  /** Insert at the caret, not at the end. Anything else is a toy. */
  const insert = (id: TokenId) => {
    const token = `{{${id}}}`;
    if (lastFocused.current === "subject" && subjectRef.current) {
      const el = subjectRef.current;
      const s = el.selectionStart ?? subject.length;
      const e = el.selectionEnd ?? s;
      const next = subject.slice(0, s) + token + subject.slice(e);
      setSubject(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(s + token.length, s + token.length);
      });
      return;
    }
    const el = bodyRef.current;
    if (!el) return;
    const s = el.selectionStart ?? body.length;
    const e = el.selectionEnd ?? s;
    const next = body.slice(0, s) + token + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  };

  /**
   * Drop a token where the pointer is, not at the end.
   *
   * The browser gives no caret position for a drop, so this uses
   * caretPositionFromPoint (and the WebKit spelling) to find it. Where
   * neither exists the token lands at the existing caret, which is worse
   * than the pointer but far better than silently appending.
   */
  const dropAt = (
    e: React.DragEvent<HTMLTextAreaElement | HTMLInputElement>,
    field: "body" | "subject",
  ) => {
    const token = e.dataTransfer.getData("text/plain");
    if (!token.startsWith("{{")) return;
    e.preventDefault();
    const el = e.currentTarget;
    const value = field === "body" ? body : subject;

    type WithCaret = Document & {
      caretPositionFromPoint?: (x: number, y: number) => { offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => { startOffset: number } | null;
    };
    const d = document as WithCaret;
    let at =
      d.caretPositionFromPoint?.(e.clientX, e.clientY)?.offset ??
      d.caretRangeFromPoint?.(e.clientX, e.clientY)?.startOffset ??
      el.selectionStart ??
      value.length;
    at = Math.max(0, Math.min(at, value.length));

    const next = value.slice(0, at) + token + value.slice(at);
    if (field === "body") setBody(next);
    else setSubject(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(at + token.length, at + token.length);
    });
  };

  const shown = preview(body);
  const segs = draftSegments(shown);
  const gsm = draftIsGsm7(shown);
  const bad = unknownTokens(`${subject} ${body}`, def.tokens);

  return (
    <li className="ce-card" data-open={open || undefined}>
      <button type="button" className="ce-card__head" onClick={onToggle} aria-expanded={open}>
        <span className="ce-card__chan" data-chan={def.channel}>
          {def.channel === "sms" ? "Text" : "Email"}
        </span>
        <span className="ce-card__when">{def.when}</span>
        {current.edited && <span className="ce-card__edited">Edited</span>}
        <span aria-hidden className="ce-card__chev">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="ce-card__body">
          {def.channel === "email" && (
            <label className="ce-field">
              <span className="ce-label">Subject</span>
              <input
                ref={subjectRef}
                className="ce-input"
                value={subject}
                onFocus={() => (lastFocused.current = "subject")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => dropAt(e, "subject")}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
          )}

          <label className="ce-field">
            <span className="ce-label">Message</span>
            <textarea
              ref={bodyRef}
              className="ce-textarea"
              rows={def.channel === "sms" ? 4 : 10}
              value={body}
              onFocus={() => (lastFocused.current = "body")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => dropAt(e, "body")}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <div className="ce-tokens">
            <span className="ce-label">Click to insert, or drag into the message</span>
            <div className="ce-tokens__row">
              {def.tokens.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="ce-token"
                  draggable
                  onDragStart={(e) => {
                    /* text/plain so dropping into any other text field also
                       does something sensible rather than nothing. */
                    e.dataTransfer.setData("text/plain", `{{${id}}}`);
                    e.dataTransfer.setData("application/x-suth-token", id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => insert(id)}
                  title={TOKENS[id].hint ?? `Becomes "${TOKENS[id].example}"`}
                >
                  {TOKENS[id].label}
                </button>
              ))}
            </div>
          </div>

          {bad.length > 0 && (
            <p className="ce-warn">
              Nothing will fill {bad.map((b) => `{{${b}}}`).join(", ")}. It will send exactly
              as written. Use the buttons above, or delete it.
            </p>
          )}

          <div className="ce-preview">
            <span className="ce-label">How it sends</span>
            <p className="ce-preview__text">
              {def.channel === "email" && subject ? (
                <>
                  <strong>{preview(subject)}</strong>
                  <br />
                </>
              ) : null}
              {shown}
            </p>
            {def.channel === "sms" && (
              <p className="ce-meta" data-warn={segs > 1 || !gsm ? "" : undefined}>
                {draftLength(shown)} characters · {segs} segment{segs === 1 ? "" : "s"}
                {/* Say what is true, not what is dramatic. A non-GSM
                    character halves the limit whether or not it has actually
                    pushed this message over yet, and claiming it "doubled
                    this" at one segment is simply wrong. */}
                {!gsm && segs > 1 && " · a non-GSM character halved the limit to 70, which is what split this"}
                {!gsm && segs === 1 && " · contains a non-GSM character, so the limit here is 70 rather than 160"}
                {gsm && segs > 1 && " · over 160, so it sends as two and costs twice"}
              </p>
            )}
          </div>

          <div className="ce-actions">
            <button
              type="button"
              className="ce-btn"
              data-primary
              disabled={!dirty}
              onClick={() => onSave(def.channel === "email" ? subject : undefined, body)}
            >
              {justSaved ? "Saved" : "Save"}
            </button>
            {current.edited && (
              <button type="button" className="ce-btn" data-muted onClick={onReset}>
                Reset to original
              </button>
            )}
            {dirty && (
              <button
                type="button"
                className="ce-btn"
                data-muted
                onClick={() => {
                  setBody(current.body);
                  setSubject(current.subject ?? "");
                }}
              >
                Discard changes
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** Render a template with real values, for anything that actually sends. */
export function renderTemplate(
  id: string,
  values: Partial<Record<TokenId, string>>,
  overrides: OverrideMap = {},
): { subject?: string; body: string } | null {
  const def = TEMPLATES.find((t) => t.id === id);
  if (!def) return null;
  const e = effective(def, overrides);
  return {
    subject: e.subject ? render(e.subject, values) : undefined,
    body: render(e.body, values),
  };
}
