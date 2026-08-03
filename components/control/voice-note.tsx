"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMounted } from "@/lib/hooks/use-mounted";
import {
  deleteMedia,
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
 * MediaRecorder rather than a file picker: he is recording, not uploading, and
 * from a phone on the gym floor as often as from a desk.
 */
export function VoiceNote({ subject }: { subject: string }) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mounted = useMounted();
  /**
   * One object URL per record, revoked when the list changes or the component
   * goes away. It used to be minted inline in the JSX, which meant a fresh URL
   * on every render and the browser holding every one of those blobs alive —
   * a leak that grows with the size of a training video.
   */
  const urls = useMemo(
    () =>
      Object.fromEntries(
        items.map((m) => [m.id, URL.createObjectURL(m.blob)]),
      ) as Record<string, string>,
    [items],
  );
  useEffect(
    () => () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u)),
    [urls],
  );

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listMedia(subject).then((m) => setItems(m.filter((x) => x.kind === "voice-note")));
    return () => {
      if (ticker.current) clearInterval(ticker.current);
    };
  }, [subject]);


  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser will not record audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        // Release the microphone. Leaving it open keeps the browser's
        // recording indicator on, which is alarming and looks like a bug.
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const record: MediaRecord = {
          id: mediaId("voice-note"),
          kind: "voice-note",
          subject,
          label: "Ben talks through the week",
          mimeType: blob.type,
          bytes: blob.size,
          durationSec: seconds,
          coachFeedback: "",
          blob,
        };
        const ok = await saveMedia(record);
        if (ok) setItems((cur) => [...cur, record]);
        else setError("Could not save the recording on this device.");
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      setSeconds(0);
      ticker.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone permission was refused.");
    }
  }

  function stop() {
    recorder.current?.stop();
    recorder.current = null;
    setRecording(false);
    if (ticker.current) clearInterval(ticker.current);
  }

  async function remove(id: string) {
    await deleteMedia(id);
    setItems((cur) => cur.filter((m) => m.id !== id));
  }

  if (!mounted) return null;
  if (!storageAvailable()) return null;

  return (
    <div style={{ display: "grid", gap: "var(--space-1)" }}>
      <div style={{ display: "flex", gap: "var(--space-1)", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={recording ? stop : start}
          style={{
            minHeight: 44,
            padding: "0 18px",
            borderRadius: 999,
            border: "none",
            background: recording ? "var(--danger)" : "var(--accent)",
            color: recording ? "#fff" : "var(--accent-ink)",
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {recording ? `Stop · ${formatDuration(seconds)}` : "Record a voice note"}
        </button>
        <span className="eyebrow">
          {items.length ? `${items.length} attached` : "Optional — 30 seconds is plenty"}
        </span>
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {items.map((m) => (
        <div
          key={m.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "var(--space-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            flexWrap: "wrap",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={urls[m.id]} controls preload="metadata" style={{ flex: "1 1 220px" }} />
          <button
            type="button"
            onClick={() => remove(m.id)}
            style={{
              minHeight: 44,
              padding: "0 12px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
