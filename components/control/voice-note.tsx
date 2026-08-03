"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMounted } from "@/lib/hooks/use-mounted";
import {
  deleteMedia,
  formatBytes,
  formatDuration,
  listMedia,
  mediaId,
  saveMedia,
  storageAvailable,
  type MediaRecord,
} from "@/lib/media/store";

/**
 * BEN'S VOICE NOTE.
 *
 * A written note explains what the week is; thirty seconds of Ben talking
 * explains why, and it is faster for him than typing. It attaches to the week
 * so the athlete hears it above the plan rather than as a stray file.
 *
 * WHY IT SAID "PERMISSION REFUSED" WITHOUT ASKING
 * -----------------------------------------------
 * next.config.ts sent `Permissions-Policy: microphone=()` on every route. An
 * empty allowlist is not "ask the user" — it denies the microphone to every
 * origin including this one, so no prompt ever appeared and getUserMedia
 * rejected instantly with NotAllowedError. The header now says `(self)`.
 *
 * The other half of that failure was here: one catch turned every possible
 * cause into the same sentence. A refused prompt, a laptop with no microphone,
 * a browser that cannot record and a blocked policy are four different
 * problems with four different remedies, and naming the wrong one costs
 * someone ten minutes.
 *
 * PLAYBACK IS THE POINT, NOT AN EXTRA. Ben records this in a gym with a fan
 * running. He has to hear it back before an athlete does, and replace it if it
 * is no good — so every note has a player, a duration and a delete.
 */

type Status = "idle" | "asking" | "recording" | "saving";

type Trouble = { message: string; fix: string };

export function VoiceNote({ subject }: { subject: string }) {
  const mounted = useMounted();
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [trouble, setTrouble] = useState<Trouble | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsed = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMedia(subject).then((m) => setItems(m.filter((x) => x.kind === "voice-note")));
    return () => {
      if (ticker.current) clearInterval(ticker.current);
    };
  }, [subject]);

  /**
   * One object URL per record, revoked when the list changes. Minting them in
   * the JSX makes a new one every render and holds every blob alive.
   */
  const urls = useMemo(
    () =>
      Object.fromEntries(items.map((m) => [m.id, URL.createObjectURL(m.blob)])) as Record<
        string,
        string
      >,
    [items],
  );
  useEffect(() => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)), [urls]);

  /** Names the actual cause, because each one has a different remedy. */
  function explain(error: unknown): Trouble {
    const name = error instanceof Error ? error.name : "";
    switch (name) {
      case "NotAllowedError":
        return {
          message: "The browser blocked the microphone.",
          fix: "If you were asked and said no, allow it from the padlock in the address bar and try again. If you were never asked at all, the page itself is blocking it — tell Kieron.",
        };
      case "NotFoundError":
      case "OverconstrainedError":
        return {
          message: "No microphone found on this device.",
          fix: "Plug one in, or upload an audio file instead.",
        };
      case "NotReadableError":
        return {
          message: "Something else is using the microphone.",
          fix: "Close any other call or recording app, then try again.",
        };
      case "SecurityError":
        return {
          message: "Recording needs a secure connection.",
          fix: "Open the console over https rather than http.",
        };
      default:
        return {
          message: "The recording could not start.",
          fix: "Upload an audio file instead, or try a different browser.",
        };
    }
  }

  async function store(blob: Blob, durationSec: number): Promise<boolean> {
    const record: MediaRecord = {
      id: mediaId("voice-note"),
      kind: "voice-note",
      subject,
      label: "Ben talks through the week",
      mimeType: blob.type || "audio/webm",
      bytes: blob.size,
      durationSec,
      coachFeedback: "",
      blob,
    };
    const ok = await saveMedia(record);
    if (ok) setItems((cur) => [...cur, record]);
    return ok;
  }

  async function start() {
    setTrouble(null);

    if (typeof MediaRecorder === "undefined") {
      setTrouble({
        message: "This browser will not record audio.",
        fix: "Use Chrome, Edge or Safari — or upload an audio file instead.",
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setTrouble({
        message: "This browser will not open the microphone.",
        fix: "Upload an audio file instead.",
      });
      return;
    }

    // "Asking" rather than "recording": the prompt can sit there as long as it
    // likes, and a button saying Stop before anything is recording is a lie.
    setStatus("asking");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      setStatus("idle");
      setTrouble(explain(error));
      return;
    }

    try {
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      elapsed.current = 0;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        // Release the microphone. Leaving it open keeps the browser's
        // recording indicator on, which is alarming and looks like a bug.
        stream.getTracks().forEach((t) => t.stop());
        if (ticker.current) clearInterval(ticker.current);
        setStatus("saving");
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        // The ref, not the state: onstop closes over the state value from the
        // render that started the recording, which is always zero.
        const ok = await store(blob, elapsed.current);
        setStatus("idle");
        if (!ok) {
          setTrouble({
            message: "The recording could not be saved on this device.",
            fix: "Storage may be full or blocked in this browser.",
          });
        }
      };
      rec.start();
      recorder.current = rec;
      setSeconds(0);
      setStatus("recording");
      ticker.current = setInterval(() => {
        elapsed.current += 1;
        setSeconds(elapsed.current);
      }, 1000);
    } catch (error) {
      stream.getTracks().forEach((t) => t.stop());
      setStatus("idle");
      setTrouble(explain(error));
    }
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
  }

  /** A way in when recording is impossible: a phone memo, uploaded. */
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setTrouble(null);
    setStatus("saving");
    const ok = await store(file, 0);
    setStatus("idle");
    if (fileInput.current) fileInput.current.value = "";
    if (!ok) {
      setTrouble({
        message: "That file could not be saved on this device.",
        fix: "Storage may be full or blocked in this browser.",
      });
    }
  }

  async function remove(id: string) {
    await deleteMedia(id);
    setItems((cur) => cur.filter((m) => m.id !== id));
  }

  if (!mounted || !storageAvailable()) return null;

  const busy = status === "asking" || status === "saving";

  return (
    <div className="vn">
      <div className="vn-controls">
        <button
          type="button"
          onClick={status === "recording" ? stop : start}
          disabled={busy}
          className="vn-record"
          data-recording={status === "recording" || undefined}
        >
          {status === "recording" ? (
            <>
              <span className="vn-dot" aria-hidden />
              Stop · <span className="num">{formatDuration(seconds)}</span>
            </>
          ) : status === "asking" ? (
            "Waiting for permission…"
          ) : status === "saving" ? (
            "Saving…"
          ) : (
            "Record a voice note"
          )}
        </button>

        <label className="vn-upload">
          Upload audio
          <input
            ref={fileInput}
            type="file"
            accept="audio/*"
            onChange={onFile}
            disabled={busy}
            className="sr-only"
          />
        </label>

        <span className="eyebrow vn-count">
          {items.length ? `${items.length} attached` : "Optional — 30 seconds is plenty"}
        </span>
      </div>

      {status === "asking" ? (
        <p className="vn-hint" role="status">
          Your browser is asking whether to allow the microphone. Choose Allow.
        </p>
      ) : null}

      {trouble ? (
        <p role="alert" className="vn-trouble">
          <strong>{trouble.message}</strong> {trouble.fix}
        </p>
      ) : null}

      {items.map((m) => (
        <div key={m.id} className="vn-item">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={urls[m.id]} controls preload="metadata" className="vn-player" />
          <span className="num vn-meta">
            {m.durationSec ? formatDuration(m.durationSec) : formatBytes(m.bytes)}
          </span>
          <button type="button" onClick={() => remove(m.id)} className="vn-delete">
            Delete
          </button>
        </div>
      ))}

      {items.length ? (
        <p className="vn-hint">
          Play it back before you send the week — the athlete hears exactly
          this.
        </p>
      ) : null}
    </div>
  );
}
