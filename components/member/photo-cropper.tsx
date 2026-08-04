"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * CHOOSE WHICH BIT OF THE PHOTO IS YOUR FACE.
 *
 * The avatar picker centre-cropped whatever was chosen and offered no way to
 * change it. A phone photo is portrait and the face is rarely in the middle,
 * so the common result was a square of somebody's chest — with no recourse
 * except picking a different picture and hoping.
 *
 * Pan and zoom, then crop. No library: the maths is a scale and an offset,
 * and the alternatives are 40kB+ for a control used once.
 *
 * WHY IT DRAWS TO A CANVAS AT THE END
 * The preview is a CSS transform, which is cheap and smooth while dragging.
 * The saved image has to be a real 256px square, so the same transform is
 * applied once to a canvas on save. Doing it per-frame would drop frames on a
 * phone for no visible gain.
 */

const OUT = 256;
const FRAME = 240;

type Point = { x: number; y: number };

export function PhotoCropper({
  file,
  onDone,
  onCancel,
}: {
  file: File;
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const drag = useRef<{ from: Point; start: Point } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** The scale at which the image exactly covers the frame. */
  const cover = natural ? Math.max(FRAME / natural.w, FRAME / natural.h) : 1;
  const scale = cover * zoom;

  /* Keep the frame covered. Without this, dragging far enough exposes a
     transparent corner and the saved avatar has a bite out of it. */
  const clamp = useCallback(
    (next: Point): Point => {
      if (!natural) return next;
      const w = natural.w * scale;
      const h = natural.h * scale;
      const maxX = Math.max(0, (w - FRAME) / 2);
      const maxY = Math.max(0, (h - FRAME) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [natural, scale],
  );

  useEffect(() => setOffset((o) => clamp(o)), [clamp]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { from: { x: e.clientX, y: e.clientY }, start: offset };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setOffset(
      clamp({
        x: d.start.x + (e.clientX - d.from.x),
        y: d.start.y + (e.clientY - d.from.y),
      }),
    );
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function save() {
    if (!src || !natural) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();

      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no 2d context");

      /* The same transform the preview is showing, at output resolution.
         `k` converts frame pixels to output pixels so what was on screen is
         what gets saved — the commonest bug in a cropper is the two drifting
         apart. */
      const k = OUT / FRAME;
      const w = natural.w * scale * k;
      const h = natural.h * scale * k;
      ctx.drawImage(
        img,
        OUT / 2 - w / 2 + offset.x * k,
        OUT / 2 - h / 2 + offset.y * k,
        w,
        h,
      );
      onDone(canvas.toDataURL("image/jpeg", 0.85));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="crop" role="dialog" aria-modal="true" aria-label="Crop your photo">
      <div className="crop__card">
        <p className="crop__title">Move and scale</p>

        <div
          className="crop__stage"
          style={{ width: FRAME, height: FRAME }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src && natural ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt=""
              draggable={false}
              className="crop__img"
              style={{
                width: natural.w * scale,
                height: natural.h * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          ) : null}
          <span className="crop__ring" aria-hidden />
        </div>

        <label className="crop__zoom">
          <span className="sr-only">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>

        <p className="crop__hint">Drag the photo to reposition it.</p>

        <div className="crop__actions">
          <button type="button" className="crop__save" onClick={() => void save()} disabled={busy || !natural}>
            {busy ? "Saving…" : "Use this photo"}
          </button>
          <button type="button" className="crop__cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
