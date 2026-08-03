"use client";

import { useEffect, useRef, useState } from "react";

/**
 * "BEN TALKS THROUGH THE WEEK."
 *
 * This was a `<button>` with no `onClick` and a model with no URL — a play
 * triangle, a label and a duration, and nothing behind any of it. Tapping it
 * did nothing at all, which is the worst version of this: it looked like a
 * working control that was broken, rather than like something not recorded yet.
 *
 * So the component does one of two honest things:
 *
 *   • **With a URL** — a real player. Play/pause, a scrub bar, elapsed and
 *     remaining, and it stops cleanly when the component unmounts.
 *   • **Without one** — says the week has no voice note, in plain words, and
 *     is not a button at all.
 *
 * `preload="none"` matters. This sits on the plan screen, which somebody opens
 * every day on mobile data, and a two-minute recording fetched on every visit
 * to a page nobody pressed play on is somebody else's bandwidth.
 */

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CoachMedia({
  label,
  durationSec,
  url,
}: {
  label: string;
  durationSec: number;
  url?: string;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [failed, setFailed] = useState(false);
  // The metadata duration once known; the model's figure until then, so the
  // control does not render "0:00" for a moment on first paint.
  const [duration, setDuration] = useState(durationSec);

  useEffect(() => {
    const el = audio.current;
    // Stop playback when the component goes away. Without this, navigating to
    // another tab leaves Ben talking from a page that no longer exists.
    return () => { el?.pause(); };
  }, []);

  if (!url) {
    return (
      <p className="week__media week__media--none">
        No voice note for this week.
      </p>
    );
  }

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      // `play()` rejects when a browser blocks autoplay or the file is bad.
      // An unhandled rejection here leaves the button showing "pause" over
      // silence, which is the exact bug being fixed.
      void el.play().then(() => setPlaying(true)).catch(() => setFailed(true));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = value;
    setElapsed(value);
  };

  return (
    <div className="week__media-player">
      <audio
        ref={audio}
        src={url}
        preload="none"
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const real = e.currentTarget.duration;
          if (Number.isFinite(real) && real > 0) setDuration(real);
        }}
        onEnded={() => { setPlaying(false); setElapsed(0); }}
        onError={() => setFailed(true)}
      />

      <button
        type="button"
        className="week__media-play"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        disabled={failed}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <div className="week__media-body">
        <p className="week__media-label">{label}</p>
        {failed ? (
          // Said plainly rather than left as a dead control.
          <p className="week__media-error">That recording would not load.</p>
        ) : (
          <>
            <input
              type="range"
              className="week__media-scrub"
              min={0}
              max={Math.max(1, duration)}
              step={1}
              value={Math.min(elapsed, duration)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label={`Scrub ${label}`}
            />
            <p className="week__media-time">
              <span>{clock(elapsed)}</span>
              <span>−{clock(Math.max(0, duration - elapsed))}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
