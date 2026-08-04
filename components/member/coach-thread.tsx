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
  assembleQuestion,
  attachmentProblem,
  topicById,
  type Attachment,
  type TopicId,
} from "@/lib/member/coach-actions";
import { CoachBooking, type ExistingBooking } from "@/components/member/coach-booking";
import { useRecord } from "@/lib/control/store";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatBookingTime } from "@/lib/booking/model";
import type { Photo } from "@/lib/photo-library";
import { dataUrlBytes, shrinkImage } from "@/lib/images";
import { SOUND_KEY, play, shouldPlay } from "@/lib/member/sounds";

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
type Sheet = "none" | "topics" | "build" | "questions" | "booking";

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
  /*
   * Anything the athlete adds persists; the seeded conversation does not need
   * to. Without this a booked call vanished on reload, which made the whole
   * "move or cancel it later" idea hollow — the reference it needs was gone.
   */
  const { value: mine, save: saveMine } = useRecord<CoachMessage[]>(
    "coach.thread.v1",
    [],
  );
  const hydrated = useHydrated();
  const thread = hydrated ? [...DEMO_THREAD, ...mine] : DEMO_THREAD;
  /** Which booking the manage sheet is pointed at, if any. */
  const [managing, setManaging] = useState<ExistingBooking | null>(null);
  /** Which follow-up we are on, and what has been tapped so far. */
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft>({ topic: null, body: "" });
  const [sheet, setSheet] = useState<Sheet>("none");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const file = useRef<HTMLInputElement | null>(null);
  /*
   * Sound is a preference and it is off until the page has been touched.
   * Browsers block audio before a gesture anyway, but the reason to track it
   * ourselves is different: a training app should never make a noise in a
   * quiet room nobody asked it to.
   */
  const { value: sound, save: saveSound } = useRecord<{ on: boolean }>(SOUND_KEY, {
    on: true,
  });
  const interacted = useRef(false);
  const reduced = useRef(false);
  const foot = useRef<HTMLDivElement | null>(null);
  const composer = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mark = () => {
      interacted.current = true;
    };
    window.addEventListener("pointerdown", mark, { once: true });
    window.addEventListener("keydown", mark, { once: true });
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
    };
  }, []);

  function cue(which: "send" | "receive") {
    if (
      shouldPlay({
        enabled: sound?.on ?? true,
        interacted: interacted.current,
        reducedMotion: reduced.current,
      })
    ) {
      play(which);
    }
  }

  /* A thread that does not open at the bottom is one nobody can find the
     latest message in. */
  useEffect(() => {
    foot.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);

  /*
   * The arrival sound, for a message from Ben that was not already there.
   *
   * Keyed on the last coach message rather than on the thread length, so
   * sending does not trigger it and a re-render does not repeat it. The ref
   * starts at whatever is on screen at mount, which is why opening the page
   * is silent — the sound means "this just came in", not "there is a
   * conversation here".
   */
  const heard = useRef<string | null>(null);
  useEffect(() => {
    const last = [...thread].reverse().find((m) => m.author === "coach");
    if (!last) return;
    if (heard.current === null) {
      heard.current = last.id;
      return;
    }
    if (heard.current !== last.id) {
      heard.current = last.id;
      cue("receive");
    }
  });

  /* Object URLs outlive the component unless they are revoked, and a session
     spent sending videos would leak every one of them. */
  useEffect(() => {
    return () => {
      if (attachment?.src.startsWith("blob:")) URL.revokeObjectURL(attachment.src);
    };
  }, [attachment]);

  function append(message: Partial<CoachMessage> & Pick<CoachMessage, "author" | "body">) {
    saveMine([
      ...mine,
      { id: `local-${mine.length + 1}-${Date.now()}`, sentAt: new Date().toISOString(), ...message },
    ]);
  }

  /** Rewrite the entry a booking wrote, so the thread shows the current time. */
  function updateBooking(ref: string, patch: Partial<CoachMessage>) {
    saveMine(mine.map((m) => (m.booking?.ref === ref ? { ...m, ...patch } : m)));
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
    cue("send");

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

  /**
   * Take a photo or a video and put it on the message.
   *
   * A phone camera produces three to six megabytes a shot, and the old rule
   * met that with "That photo is too large" — telling somebody off for owning
   * a good camera, on the one feature that is the whole reason to have a
   * coach rather than a spreadsheet. Photos are shrunk instead. Only video,
   * which cannot be re-encoded in a browser without a great deal of work,
   * still has a limit worth stating.
   *
   * The preview appears before the shrink finishes, because a picture that
   * shows up instantly and sharpens a moment later feels quick, and the same
   * work behind a spinner feels slow.
   */
  async function attach(f: File) {
    const problem = attachmentProblem(f);
    if (problem) {
      setNotice(problem);
      return;
    }

    const kind = f.type.startsWith("video/") ? "video" : "image";
    const preview = URL.createObjectURL(f);
    setAttachment({ kind, src: preview, name: f.name, size: f.size });
    setNotice(null);
    composer.current?.focus();

    if (kind !== "image") return;
    try {
      const shrunk = await shrinkImage(f);
      URL.revokeObjectURL(preview);
      setAttachment((a) =>
        /* Only if they have not swapped it for another one in the meantime —
           otherwise a slow shrink overwrites the picture they just chose. */
        a?.src === preview
          ? { ...a, src: shrunk, size: dataUrlBytes(shrunk) }
          : a,
      );
    } catch {
      /* Keep the original. A photo Ben can see beats an error message. */
    }
  }

  /**
   * Drop a file on the thread, or paste one into it.
   *
   * On a laptop the file picker is the slow way to do this and everybody
   * knows it — a screenshot is already on the clipboard and a video is
   * already in a folder. Neither needs a dialog.
   */
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void attach(f);
  }

  function onPaste(e: React.ClipboardEvent) {
    const item = [...e.clipboardData.items].find((i) => i.kind === "file");
    const f = item?.getAsFile();
    if (f) void attach(f);
  }

  const groups = groupByDay(thread);
  const canSend = Boolean(draft.body.trim() || attachment);

  return (
    <div
      className={`ct${dragging ? " is-dragging" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      <div className="ct__scroll">
        {groups.map((group) => (
          <div key={group.day} className="ct__day">
            <p className="ct__daylabel">{formatDay(group.day)}</p>
            {group.messages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                coachPhoto={coachPhoto}
                onManage={(b) => {
                  setManaging(b);
                  setSheet("booking");
                }}
              />
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
                  setAnswers([]);
                  setStep(0);
                  /* Guided where the answer depends on facts Ben would
                     otherwise have to write back and ask for; straight to
                     the openers where the question is already answerable. */
                  setSheet(t.build ? "build" : "questions");
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

      {sheet === "build" && draft.topic && topicById(draft.topic)?.build ? (
        (() => {
          const build = topicById(draft.topic)!.build!;
          const current = build.followUps[step];
          const finish = (all: string[]) => {
            setDraft((d) => ({ ...d, body: assembleQuestion(build.opener, all) }));
            setSheet("none");
            requestAnimationFrame(() => composer.current?.focus());
          };
          const choose = (text: string) => {
            const all = [...answers.slice(0, step), text];
            if (step + 1 < build.followUps.length) {
              setAnswers(all);
              setStep(step + 1);
            } else {
              finish(all);
            }
          };
          return (
            <div className="ct__sheet">
              <p className="ct__sheettitle">
                {current.ask}
                <span className="ct__sheetstep">
                  {step + 1} of {build.followUps.length}
                </span>
              </p>
              <div className="ct__questions">
                {current.options.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    className="ct__question"
                    onClick={() => choose(o.text)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="ct__sheetrow">
                <button
                  type="button"
                  className="ct__sheetclose"
                  onClick={() =>
                    step === 0 ? setSheet("topics") : setStep(step - 1)
                  }
                >
                  ← Back
                </button>
                {/* Every step is skippable. A guided flow that cannot be
                    escaped is a form, and somebody who just wants to type
                    should not have to answer three questions first. */}
                <button
                  type="button"
                  className="ct__sheetclose"
                  onClick={() => finish(answers.slice(0, step))}
                >
                  Skip and write my own
                </button>
              </div>
            </div>
          );
        })()
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
          existing={managing ?? undefined}
          onCancel={() => {
            setSheet("none");
            setManaging(null);
          }}
          onDropped={({ ref }) => {
            setSheet("none");
            setManaging(null);
            updateBooking(ref, {
              body: "Review call cancelled.",
              booking: undefined,
            });
            setNotice("Call cancelled.");
          }}
          onBooked={({ ref, startISO }) => {
            const moving = Boolean(managing);
            setSheet("none");
            setManaging(null);
            if (moving) {
              /* Rewritten in place rather than appended. A thread with three
                 entries for one call, two of them wrong, is worse than one
                 that says where the call actually is. */
              updateBooking(ref, {
                body: `Review call moved to ${formatBookingTime(startISO)}. Reference ${ref}.`,
                booking: { ref, startISO },
              });
              setNotice(`Moved to ${formatBookingTime(startISO)}.`);
              return;
            }
            append({
              author: "system",
              body: `Review call booked for ${formatBookingTime(startISO)}. Reference ${ref}.`,
              booking: { ref, startISO },
            });
            setNotice(`Booked for ${formatBookingTime(startISO)}.`);
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
          {/* Small, quiet, and on the right. A mute control belongs with the
              thing it mutes, and anybody who wants it will look here first. */}
          <button
            type="button"
            className="ct__sound"
            aria-pressed={sound?.on ?? true}
            aria-label={(sound?.on ?? true) ? "Turn chat sounds off" : "Turn chat sounds on"}
            title={(sound?.on ?? true) ? "Sounds on" : "Sounds off"}
            onClick={() => {
              const next = !(sound?.on ?? true);
              saveSound({ on: next });
              /* Play the cue when switching on, so the choice has an answer
                 rather than being a claim about the future. */
              if (next) play("receive");
            }}
          >
            {(sound?.on ?? true) ? "🔊" : "🔇"}
          </button>
          <input
            ref={file}
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void attach(f);
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
  onManage,
}: {
  message: CoachMessage;
  coachPhoto: Photo;
  onManage?: (booking: ExistingBooking) => void;
}) {
  /* A booked call is neither Ben talking nor the athlete talking. It is a
     thing that happened, and it reads as one: centred, quieter, no avatar. */
  if (m.author === "system") {
    return (
      <div className="ct__system">
        <p>{m.body}</p>
        {/* The call can be changed from where it was booked. Sending somebody
            hunting for the confirmation email to move a call they arranged
            here is the sort of thing that turns into a no-show. */}
        {m.booking && onManage ? (
          <button
            type="button"
            className="ct__manage"
            onClick={() => onManage(m.booking!)}
          >
            Move or cancel
          </button>
        ) : null}
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
