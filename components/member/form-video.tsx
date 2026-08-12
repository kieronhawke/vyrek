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
 * FORM VIDEO — the athlete films a movement, Ben reviews it.
 *
 * The thing an online coach cannot otherwise do is see you move. Ben's own
 * email asks for exactly this: "please see station videos when possible so we
 * can look at your technique". Today that means a WhatsApp video with no
 * connection to the session it came from.
 *
 * Attached to a slot, so the video arrives with the session that produced it
 * and Ben's reply lands next to the work rather than in a separate thread.
 *
 * `capture="environment"` opens the camera directly on a phone, which is where
 * this gets used — filming a sled push in a gym, not uploading from a laptop.
 */
export function FormVideo({ subject, label }: { subject: string; label: string }) {
  const [items, setItems] = useState<MediaRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
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
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listMedia(subject).then((m) => setItems(m.filter((x) => x.kind === "form-video")));
  }, [subject]);


  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // 200MB is roughly a minute of phone video. Beyond that the browser starts
    // failing in ways that look like the app being broken.
    if (file.size > 200 * 1024 * 1024) {
      setError("That file is over 200MB. A 30-second clip is plenty.");
      if (input.current) input.current.value = "";
      return;
    }

    setBusy(true);
    const duration = await readDuration(file).catch(() => null);
    const record: MediaRecord = {
      id: mediaId("form-video"),
      kind: "form-video",
      subject,
      label: note.trim() || label,
      mimeType: file.type || "video/mp4",
      bytes: file.size,
      durationSec: duration,
      coachFeedback: "",
      blob: file,
    };

    const ok = await saveMedia(record);
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!ok) {
      setError("Could not save the video on this device.");
      return;
    }
    setNote("");
    setItems((cur) => [...cur, record]);
  }

  async function remove(id: string) {
    await deleteMedia(id);
    setItems((cur) => cur.filter((m) => m.id !== id));
  }

  if (!mounted) return null;
  if (!storageAvailable()) {
    return (
      <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        This browser will not store video. Send it to Ben directly for now.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-2)" }}>
      <div>
        <label htmlFor={`vnote-${subject}`} className="eyebrow" style={{ display: "block", marginBottom: 4 }}>
          What should Ben look at?
        </label>
        <input
          id={`vnote-${subject}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Sled push, hips feel high"
          style={{
            width: "100%",
            minHeight: 44,
            padding: "8px 10px",
            border: "1px solid var(--border-strong)",
            borderRadius: 4,
            background: "var(--bg)",
            color: "var(--text)",
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
          }}
        />
      </div>

      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 52,
          borderRadius: 999,
          background: "var(--accent)",
          color: "var(--accent-ink)",
          fontSize: "var(--text-base)",
          fontWeight: 700,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Saving…" : "Film or upload a clip"}
        <input
          ref={input}
          type="file"
          accept="video/*"
          capture="environment"
          onChange={onPick}
          disabled={busy}
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: "none",
          }}
        />
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {items.map((m) => (
        <figure
          key={m.id}
          style={{
            margin: 0,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-card)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={urls[m.id]}
            controls
            playsInline
            preload="metadata"
            style={{ width: "100%", display: "block", background: "#000" }}
          />
          <figcaption style={{ padding: "var(--space-2)" }}>
            <p style={{ margin: 0, fontSize: "var(--text-sm)", fontWeight: 650 }}>
              {m.label}
            </p>
            <p
              className="num"
              style={{ margin: "2px 0 0", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              {formatBytes(m.bytes)}
              {m.durationSec ? ` · ${formatDuration(m.durationSec)}` : ""}
            </p>

            {m.coachFeedback ? (
              <div
                style={{
                  marginTop: "var(--space-1)",
                  paddingTop: "var(--space-1)",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <p className="eyebrow" style={{ margin: "0 0 2px" }}>
                  Ben&apos;s feedback
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
                  {m.coachFeedback}
                </p>
              </div>
            ) : (
              <p
                style={{
                  margin: "var(--space-1) 0 0",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                Saved on this device. It reaches Ben once file storage is
                connected.
              </p>
            )}

            <button
              type="button"
              onClick={() => remove(m.id)}
              style={{
                marginTop: "var(--space-1)",
                minHeight: 44,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Duration without decoding the whole file. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (v: number | null) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null);
    el.onerror = () => done(null);
    setTimeout(() => done(null), 3000);
    el.src = url;
  });
}
