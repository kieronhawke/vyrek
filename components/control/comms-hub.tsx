"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CUSTOM_KEY,
  CUSTOM_TOKENS,
  cost,
  create,
  sortCustom,
  validate,
  type CustomTemplate,
  type Problem,
} from "@/lib/comms/custom";
import { TOKENS, preview, type TokenId } from "@/lib/comms/templates";
import { useHydrated, readStored } from "@/hooks/use-hydrated";

/**
 * THE COMMUNICATIONS HUB.
 *
 * Everything the business says, in one place, in the form it will be read in.
 *
 * THE EMAIL PREVIEW IS THE REAL EMAIL.
 * Not a mock-up of one, not the body text in a box. The same React template
 * the sender uses, rendered to HTML on the server and shown in an iframe at
 * 390px — an iPhone 13, which is where most of these are actually read. Logos,
 * fonts, buttons, spacing: what lands in their inbox. A preview that only
 * approximates the thing is a preview you cannot approve from.
 *
 * THREE TABS, BECAUSE THERE ARE THREE DIFFERENT THINGS HERE.
 *  - Emails: what the app sends on its own, tied to a trigger.
 *  - Texts: the same, in the other channel.
 *  - Yours: what Ben sends by hand, and can write himself.
 *
 * The first two are deliberately read-only in this view. You cannot invent a
 * new lifecycle email, because nothing would fire it; editing the wording of
 * the ones that exist is a different job and lives in the editor below.
 */

export type EmailPreview = {
  id: string;
  audience: string;
  when: string;
  subject: string;
  /** Rendered on the server from the same template the sender uses. */
  html: string;
};

export type SmsPreview = {
  id: string;
  audience: string;
  when: string;
  text: string;
  segments: number;
  gsm7: boolean;
};

type Tab = "emails" | "texts" | "custom";

export function CommsHub({
  emails,
  texts,
}: {
  emails: EmailPreview[];
  texts: SmsPreview[];
}) {
  const [tab, setTab] = useState<Tab>("emails");
  const [q, setQ] = useState("");

  const term = q.trim().toLowerCase();
  const shownEmails = emails.filter(
    (e) => !term || `${e.subject} ${e.when} ${e.audience}`.toLowerCase().includes(term),
  );
  const shownTexts = texts.filter(
    (t) => !term || `${t.text} ${t.when} ${t.audience}`.toLowerCase().includes(term),
  );

  return (
    <section className="hub">
      <div className="hub-tabs" role="tablist" aria-label="Message type">
        <button
          type="button"
          role="tab"
          className="hub-tab"
          aria-selected={tab === "emails"}
          onClick={() => setTab("emails")}
        >
          Emails <span className="hub-tab__n">{emails.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          className="hub-tab"
          aria-selected={tab === "texts"}
          onClick={() => setTab("texts")}
        >
          Texts <span className="hub-tab__n">{texts.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          className="hub-tab"
          aria-selected={tab === "custom"}
          onClick={() => setTab("custom")}
        >
          Yours
        </button>
      </div>

      {tab !== "custom" && (
        <input
          className="hub-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "emails" ? "Find an email" : "Find a text"}
          aria-label="Search messages"
        />
      )}

      {tab === "emails" && <EmailList emails={shownEmails} />}
      {tab === "texts" && <TextList texts={shownTexts} />}
      {tab === "custom" && <CustomTemplates />}
    </section>
  );
}

/* ── Emails ─────────────────────────────────────────────────────────────*/

function EmailList({ emails }: { emails: EmailPreview[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!emails.length) return <p className="hub-empty">Nothing matching that.</p>;

  return (
    <ul className="hub-list" role="list">
      {emails.map((e) => (
        <li key={e.id} className="hub-row" data-open={openId === e.id || undefined}>
          <button
            type="button"
            className="hub-row__head"
            aria-expanded={openId === e.id}
            onClick={() => setOpenId(openId === e.id ? null : e.id)}
          >
            <span className="hub-row__main">
              <span className="hub-row__subject">{e.subject}</span>
              <span className="hub-row__meta">
                {e.audience} · {e.when}
              </span>
            </span>
            <span className="hub-row__cta">
              {openId === e.id ? "Hide" : "See it"}
            </span>
          </button>

          {openId === e.id && (
            <div className="hub-preview">
              {/* A phone, because that is where it will be read. The frame is
                  not decoration: an email that looks fine at 1200px and falls
                  apart at 390 is an email nobody has actually checked. */}
              <div className="hub-phone">
                <iframe
                  title={`${e.id} preview`}
                  srcDoc={e.html}
                  /* Sandboxed with no permissions at all. This is our own
                     markup, but a preview pane is exactly the surface where
                     that assumption stops being true one day. */
                  sandbox=""
                  className="hub-phone__frame"
                />
              </div>
              <p className="hub-preview__note">
                Exactly what lands in their inbox, at the width most of them
                read it. Nothing on this page sends anything.
              </p>
              {/* Email images must be absolute URLs — clients will not resolve
                  a relative one — so the logo is fetched from the site origin
                  rather than from this page. If it shows as alt text here, the
                  origin is wrong or unreachable, which is worth knowing
                  *before* it happens in somebody's inbox rather than after. */}
              <p className="hub-preview__note">
                Images load from the live site. A logo showing as text means
                that origin is unreachable, not that the email is broken.
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ── Texts ──────────────────────────────────────────────────────────────*/

function TextList({ texts }: { texts: SmsPreview[] }) {
  if (!texts.length) return <p className="hub-empty">Nothing matching that.</p>;
  return (
    <ul className="hub-list" role="list">
      {texts.map((t) => (
        <li key={t.id} className="hub-row hub-row--sms">
          <p className="hub-row__meta">
            {t.audience} · {t.when}
          </p>
          {/* A text message shown as a text message. The bubble is the point:
              it is how you notice a message that reads fine in a form field
              and badly on a phone. */}
          <p className="hub-bubble">{t.text}</p>
          <p className="hub-cost" data-warn={t.segments > 1 || !t.gsm7 ? "" : undefined}>
            {t.text.length} characters · {t.segments} segment
            {t.segments === 1 ? "" : "s"}
            {!t.gsm7 && " · a non-GSM character drops the limit to 70"}
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ── Ben's own ──────────────────────────────────────────────────────────*/

function CustomTemplates() {
  /*
   * Seeded from storage rather than patched in by an effect that called both
   * `setItems` and `setHydrated` — two synchronous state updates on mount,
   * re-rendering the whole send queue. `useHydrated` reads the same flag
   * through a store, so the value still flips after hydration but costs no
   * extra render, and `items` shows the server's empty list until it does.
   */
  const hydrated = useHydrated();
  const [storedItems, setItems] = useState<CustomTemplate[]>(() =>
    readStored<CustomTemplate[]>(CUSTOM_KEY, []),
  );
  const items: CustomTemplate[] = hydrated ? storedItems : [];
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [problems, setProblems] = useState<Problem[]>([]);

  const persist = (next: CustomTemplate[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked; the in-memory value still updated */
    }
  };

  const shown = useMemo(() => sortCustom(items), [items]);
  const c = cost(body);
  const problemFor = (field: Problem["field"]) =>
    problems.find((p) => p.field === field)?.message;

  function save() {
    const found = validate({ name, body }, items);
    setProblems(found);
    if (found.length) return;
    persist([
      create(
        {
          name,
          channel,
          subject: channel === "email" ? subject : undefined,
          body,
        },
        new Date(),
      ),
      ...items,
    ]);
    setName("");
    setBody("");
    setSubject("");
  }

  /** Insert at the caret. Anything that appends to the end is a toy. */
  function insert(id: TokenId) {
    const el = document.getElementById("hub-body") as HTMLTextAreaElement | null;
    const token = `{{${id}}}`;
    if (!el) {
      setBody(body + token);
      return;
    }
    const s = el.selectionStart ?? body.length;
    const e = el.selectionEnd ?? s;
    setBody(body.slice(0, s) + token + body.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + token.length, s + token.length);
    });
  }

  if (!hydrated) return <p className="hub-empty">Loading…</p>;

  return (
    <div className="hub-custom">
      <p className="hub-lede">
        The messages you send by hand, over and over. Write one once, name it,
        and it is there next time. These are yours — nothing fires them
        automatically.
      </p>

      <div className="hub-form">
        <div className="hub-field">
          <label className="hub-label" htmlFor="hub-name">
            Name it
          </label>
          <input
            id="hub-name"
            className="hub-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Reschedule a session"
            aria-invalid={Boolean(problemFor("name"))}
          />
          {problemFor("name") && <p className="hub-problem">{problemFor("name")}</p>}
        </div>

        <div className="hub-field">
          <span className="hub-label">Send as</span>
          <div className="hub-choice" role="group" aria-label="Channel">
            <button
              type="button"
              className="hub-chip"
              aria-pressed={channel === "sms"}
              onClick={() => setChannel("sms")}
            >
              Text
            </button>
            <button
              type="button"
              className="hub-chip"
              aria-pressed={channel === "email"}
              onClick={() => setChannel("email")}
            >
              Email
            </button>
          </div>
        </div>

        {channel === "email" && (
          <div className="hub-field">
            <label className="hub-label" htmlFor="hub-subject">
              Subject
            </label>
            <input
              id="hub-subject"
              className="hub-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your plan for this week"
            />
          </div>
        )}

        <div className="hub-field">
          <label className="hub-label" htmlFor="hub-body">
            Message
          </label>
          <textarea
            id="hub-body"
            className="hub-textarea"
            rows={channel === "sms" ? 4 : 8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {{firstName}}, can we move to {{when}}?"
            aria-invalid={Boolean(problemFor("body"))}
          />
          {problemFor("body") && <p className="hub-problem">{problemFor("body")}</p>}
        </div>

        {/* Nobody types curly braces. The button says "First name", never
            "{{firstName}}", and it lands where the cursor is. */}
        <div className="hub-field">
          <span className="hub-label">Click to drop in</span>
          <div className="hub-choice">
            {CUSTOM_TOKENS.map((id) => (
              <button
                key={id}
                type="button"
                className="hub-chip"
                onClick={() => insert(id)}
                title={TOKENS[id].hint ?? `Becomes "${TOKENS[id].example}"`}
              >
                {TOKENS[id].label}
              </button>
            ))}
          </div>
        </div>

        {/* Always on, filled in. An editor that shows you the template rather
            than the message asks the writer to compile it in their head. */}
        {body.trim() && (
          <div className="hub-field">
            <span className="hub-label">How it sends</span>
            {channel === "sms" ? (
              <>
                <p className="hub-bubble">{preview(body)}</p>
                <p className="hub-cost" data-warn={c.segments > 1 || !c.gsm7 ? "" : undefined}>
                  {c.characters} characters · {c.segments} segment
                  {c.segments === 1 ? "" : "s"}
                  {!c.gsm7 && c.segments > 1 && " · a non-GSM character halved the limit to 70, which is what split this"}
                  {!c.gsm7 && c.segments === 1 && " · contains a non-GSM character, so the limit here is 70 rather than 160"}
                  {c.gsm7 && c.segments > 1 && " · over 160, so it sends as two and costs twice"}
                </p>
              </>
            ) : (
              <div className="hub-mail">
                {subject && <p className="hub-mail__subject">{preview(subject)}</p>}
                <p className="hub-mail__body">{preview(body)}</p>
              </div>
            )}
          </div>
        )}

        <div>
          <button type="button" className="hub-save" onClick={save}>
            Save template
          </button>
        </div>
      </div>

      {shown.length > 0 ? (
        <ul className="hub-list" role="list">
          {shown.map((t) => (
            <li key={t.id} className="hub-row hub-row--sms">
              <p className="hub-row__meta">
                {t.name} · {t.channel === "sms" ? "Text" : "Email"}
              </p>
              {t.subject && <p className="hub-mail__subject">{preview(t.subject)}</p>}
              <p className="hub-bubble">{preview(t.body)}</p>
              <button
                type="button"
                className="hub-chip"
                onClick={() => persist(items.filter((x) => x.id !== t.id))}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hub-empty">
          Nothing saved yet. The first one is usually the message you have
          typed out most often this week.
        </p>
      )}
    </div>
  );
}
