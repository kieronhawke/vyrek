"use client";

import { useRef, useState } from "react";

/**
 * A photo of the meal, attached to the entry.
 *
 * WHAT THIS DOES AND DOES NOT DO
 * ------------------------------
 * It attaches a picture to what is logged. It does **not** read the plate and
 * work out the macros, and it does not pretend to: there is no vision model
 * wired to this app, and inventing "roughly 620 kcal" from a photograph would
 * be a fabricated number in somebody's food diary. If Kieron wants automatic
 * estimation, it needs an AI key and it needs to be labelled as an estimate
 * wherever it appears.
 *
 * A photo is worth attaching anyway, and coaches use it more than the numbers:
 * Ben can look at a week of meals and tell an athlete something a macro split
 * never would. It also fixes the honest case where somebody eats out and the
 * dish is in no database — photograph it, log the closest match, and the
 * picture carries the truth the numbers cannot.
 *
 * STORED AS A DATA URL, DOWNSCALED FIRST. The log lives in this browser, and a
 * modern phone camera produces 4 MB per shot — a week of those would blow
 * through the storage quota and take the whole food log with it.
 */

const MAX_EDGE = 900;
const QUALITY = 0.72;

export function MealPhoto({
  photo,
  onPhoto,
}: {
  photo: string | null;
  onPhoto: (dataUrl: string | null) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function take(file: File) {
    setBusy(true);
    setError(null);
    try {
      onPhoto(await downscale(file));
    } catch {
      setError("That image could not be read. Try another.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mealphoto">
      <input
        ref={input}
        type="file"
        accept="image/*"
        /* `environment` opens the back camera straight into capture mode on a
           phone, rather than the photo library. */
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void take(file);
          e.target.value = "";
        }}
      />

      {photo ? (
        <div className="mealphoto__preview">
          {/* Deliberately a plain img: this is a data URL that exists only in
              this browser, so there is nothing for the image optimiser to do
              and next/image would refuse the src anyway. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="The meal you photographed" />
          <button
            type="button"
            className="mealphoto__remove"
            onClick={() => onPhoto(null)}
          >
            Remove photo
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="mealphoto__take"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {busy ? "Reading the photo…" : "Take a photo of the meal"}
        </button>
      )}

      {error ? <p className="mealphoto__error">{error}</p> : null}

      <p className="mealphoto__note">
        The photo is saved with the entry so Ben can see it. It does not work
        the macros out for you — pick the food as well.
      </p>
    </div>
  );
}

/**
 * Shrink to something a browser store can hold.
 *
 * Canvas rather than a library: it is built in, and the only operations
 * needed are "fit inside a box" and "re-encode as JPEG".
 */
async function downscale(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", QUALITY);
}
