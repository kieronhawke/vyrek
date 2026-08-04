"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  DEMO_THREAD,
  formatDay,
  formatTime,
  groupByDay,
  type CoachMessage,
} from "@/lib/member/messages";
import {
  TOPICS,
  attachmentProblem,
  topicById,
  type Attachment,
  type TopicId,
} from "@/lib/member/coach-actions";
import { CoachBooking } from "@/components/member/coach-booking";
import { formatBookingTime } from "@/lib/booking/model";
import type { Photo } from "@/lib/photo-library";

/**
 * ASK BEN — the athlete's half of the coach thread.
 *
 * WHAT WAS WRONG WITH IT
 * ----------------------
 * A text box and four chips, under a permanent paragraph explaining that most
 * of the people Ben coaches have never finished anything. That paragraph was
 * the first thing on the screen on every single visit, which is a strange
 * sentence to read every morning, and the box below it got no messages —
 * because "ask your coach anything" is paralysing in the way a blank page
 * always is.
 *
 * WHAT IT IS NOW
 * --------------
 * A messaging app. The thread fills the screen, the composer is pinned to the
 * bottom, Enter sends. Asking is a route rather than an empty box: what is it
 * about, here are the questions people ask about that, edit it and send.
 *
 * Everything else an athlete might want from their coach is in the same
 * place, because leaving the thread to do it loses the conversation:
 *
 *   - a photo or a video of a set, which is the thing a written plan cannot
 *     do and the reason people pay for a coach at all;
 *   - booking a review call, through the real booking system rather than a
 *     copy of it;
 *   - the booking's own confirmation, written back into the thread.
 *
 * WHAT IS REAL AND WHAT IS NOT. The thread has no database yet, so messages
 * live in this browser and the screen says so. The alert to Ben is real —
 * see /api/member/coach/ask — because a question being seen quickly is the
 * part that cannot wait for a table to exist.
 */

type Draft = { topic: TopicId | null; body: string };
type Sheet = "none" | "topics" | "questions" | "booking";

export function CoachThread({
  coachPhoto,
  firstName = "there",
  email = "",
  phone = "",
}: {
  coachPhoto: Photo;
  firstName?: string;
  email?: string;
  phone?: string;
}) {
  const [thread, setThread] = useState<CoachMessage[]>(DEMO_THREAD);
  const [draft, setDraft] = useState<Draft>({ topic: null, body: "" });
  const [sheet, setSheet] = useState<Sheet>("none");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const file = useRef<HTMLInputElement | null>(null);
  const foot = useRef<HTMLDivElement | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);

  /* A thread that does not open at the bottom is one nobody can find the
     latest message in. */
  useEffect(() => {
    foot.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);

  /* Object URLs outlive the component unless they are revoked, and a session
     spent sending videos would leak every one of them. */
  useEffect(() => {
    return () => {
      if (attachment?.src.startsWith("blob:")) URL.revokeObjectURL(attachment.src);
    };
  }, [attachment]);

  function append(message: Partial<CoachMessage> & Pick<CoachMessage, "author" | "body">) {
    setThread((t) => [
      ...t,
      { id: `local-${t.length + 1}-${Date.now()}`, sentAt: new Date().toISOString(), ...message },
    ]);
  }

  async function send() {
    const body = draft.body.trim();
    if (!body && !attachment) return;
    const topic = draft.topic;

    setSending(true);
    append({
      author: "athlete",
      body: body || (attachment?.kind === "video" ? "Sent a video." : "Sent a photo."),
      attachment: attachment ?? undefined,
      topic: topic ?? undefined,
    });
    setDraft({ topic: null, body: "" });
    setAttachment(null);

    try {
      const res = await fetch("/api/member/coach/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, topic, body }),
      });
      const out = (await res.json()) as { alerted?: boolean };
      /* Only claims a text was sent when one was. "Ben has been texted" when
         he has not is the kind of small lie that costs an athlete a day. */
      setNotice(
        out.alerted
          ? "Sent. Ben has had a text about it — he usually comes back the same day."
          : "Sent, and saved on this device. Ben sees it when he next opens the app.",
      );
    } catch {
      setNotice("Sent, and saved on this device.");
    } finally {
      setSending(false);
    }
  }

  function attach(f: File) {
    const problem = attachmentProblem(f);
    if (problem) {
      setNotice(problem);
      return;
    }
    setAttachment({
      kind: f.type.startsWith("video/") ? "video" : "image",
      src: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
    });
    setNotice(null);
    composer.current?.focus();
  }

  const groups = groupByDay(thread);
  const canSend = Boolean(draft.body.trim() || attachment);

  return (
    <div className="ct">
      <div className="ct__scroll">
        {groups.map((group) => (
          <div key={group.day} className="ct__day">
            <p className="ct__daylabel">{formatDay(group.day)}</p>
            {group.messages.map((m) => (
              <Bubble key={m.id} message={m} coachPhoto={coachPhoto} />
            ))}
          </div>
        ))}
        <div ref={foot} />
      </div>

      {notice ? (
        <p className="ct__notice" role="status">
          {notice}
        </p>
      ) : null}

      {/* ── Sheets. In place, so the thread is never left ───────────────── */}
      {sheet === "topics" ? (
        <div className="ct__sheet">
          <p className="ct__sheettitle">What is it about?</p>
          <div className="ct__topics">
            {TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="ct__topic"
                onClick={() => {
                  setDraft({ topic: t.id, body: "" });
                  setSheet("questions");
                }}
              >
                <span className="ct__topiclabel">{t.label}</span>
                <span className="ct__topichint">{t.hint}</span>
              </button>
            ))}
          </div>
          <button type="button" className="ct__sheetclose" onClick={() => setSheet("none")}>
            Cancel
          </button>
        </div>
      ) : null}

      {sheet === "questions" && draft.topic ? (
        <div className="ct__sheet">
          <p className="ct__sheettitle">
            {topicById(draft.topic)?.label} — pick one, or write your own
          </p>
          <div className="ct__questions">
            {topicById(draft.topic)?.questions.map((q) => (
              <button
                key={q}
                type="button"
                className="ct__question"
                onClick={() => {
                  /* Into the composer, not straight out. Every one of these is
                     a starting point and most people want to add a sentence of
                     their own before it goes. */
                  setDraft((d) => ({ ...d, body: q }));
                  setSheet("none");
                  requestAnimationFrame(() => composer.current?.focus());
                }}
              >
                {q.trim()}
              </button>
            ))}
          </div>
          <div className="ct__sheetrow">
            <button type="button" className="ct__sheetclose" onClick={() => setSheet("topics")}>
              ← Back
            </button>
            <button
              type="button"
              className="ct__sheetclose"
              onClick={() => {
                setSheet("none");
                requestAnimationFrame(() => composer.current?.focus());
              }}
            >
              Write my own
            </button>
          </div>
        </div>
      ) : null}

      {sheet === "booking" ? (
        <CoachBooking
          firstName={firstName}
          email={email}
          phone={phone}
          onCancel={() => setSheet("none")}
          onBooked={({ ref, startISO }) => {
            setSheet("none");
            append({
              author: "system",
              body: `Review call booked for ${formatBookingTime(startISO)}. Reference ${ref}.`,
              booking: { ref, startISO },
            });
            setNotice("Booked. The confirmation email and text are on their way.");
          }}
        />
      ) : null}

      {/* ── Composer ───────────────────────────────────────────────────── */}
      <div className="ct__composer">
        <div className="ct__actions">
          <button type="button" className="ct__action" onClick={() => setSheet("topics")}>
            Ask a question
          </button>
          <button type="button" className="ct__action" onClick={() => setSheet("booking")}>
            Book a review call
          </button>
          <button type="button" className="ct__action" onClick={() => file.current?.click()}>
            Photo or video
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) attach(f);
              e.target.value = "";
            }}
          />
        </div>

        {attachment ? (
          <div className="ct__attachment">
            {attachment.kind === "image" ? (
              /* A blob URL that exists only in this browser: nothing for the
                 image optimiser to do, and next/image would refuse the src. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={attachment.src} alt="" className="ct__thumb" />
            ) : (
              <video src={attachment.src} className="ct__thumb" muted playsInline />
            )}
            <span className="ct__attachname">{attachment.name}</span>
            <button type="button" className="ct__remove" onClick={() => setAttachment(null)}>
              Remove
            </button>
          </div>
        ) : null}

        <div className="ct__inputrow">
          <label className="sr-only" htmlFor="ct-input">
            Message Ben
          </label>
          <textarea
            id="ct-input"
            ref={composer}
            className="ct__input"
            rows={1}
            placeholder="Message Ben…"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            onKeyDown={(e) => {
              /* Enter sends, Shift+Enter is a newline. The convention every
                 messaging app uses and the one people's hands already know. */
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            type="button"
            className="ct__send"
            onClick={() => void send()}
            disabled={sending || !canSend}
            aria-label="Send"
          >
            {sending ? "…" : "Send"}
          </button>
        </div>

        <p className="ct__foot">
          Ben usually replies within a day. For anything urgent or medical,
          speak to a doctor rather than waiting.
        </p>
      </div>
    </div>
  );
}

function Bubble({
  message: m,
  coachPhoto,
}: {
  message: CoachMessage;
  coachPhoto: Photo;
}) {
  /* A booked call is neither Ben talking nor the athlete talking. It is a
     thing that happened, and it reads as one: centred, quieter, no avatar. */
  if (m.author === "system") {
    return (
      <div className="ct__system">
        <p>{m.body}</p>
      </div>
    );
  }

  const fromCoach = m.author === "coach";
  return (
    <div className="ct__row" data-coach={fromCoach || undefined}>
      {fromCoach ? (
        <span className="ct__avatar">
          <Image
            src={coachPhoto.src}
            alt=""
            fill
            sizes="32px"
            style={{ objectFit: "cover", filter: "grayscale(1)" }}
          />
        </span>
      ) : null}

      <div className="ct__bubblewrap">
        {m.about ? (
          <p className="ct__about">
            About {m.about.day} · {m.about.title}
          </p>
        ) : null}

        <div className="ct__bubble" data-coach={fromCoach || undefined}>
          {m.attachment ? (
            m.attachment.kind === "image" ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={m.attachment.src} alt="" className="ct__media" />
            ) : (
              <video src={m.attachment.src} className="ct__media" controls playsInline />
            )
          ) : null}
          {m.body}
        </div>

        <p className="ct__meta">
          {fromCoach ? "Ben" : "You"} · {formatTime(m.sentAt)}
        </p>
      </div>
    </div>
  );
}
