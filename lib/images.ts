/**
 * SHRINKING A PHONE PHOTO BEFORE IT GOES ANYWHERE.
 *
 * A current iPhone shoots 12 megapixels, which lands between 3 and 6 MB per
 * frame — and it is common enough to be the normal case, not the awkward one.
 * Two places needed to deal with that and had been dealing with it
 * differently: the food log downscaled, and the coach thread refused anything
 * over 8 MB with "That photo is too large", which is a message that blames
 * somebody for owning a good camera.
 *
 * One function, used by both. Fit inside a box, re-encode as JPEG.
 *
 * WHY CANVAS AND NOT A LIBRARY
 * `createImageBitmap` and a canvas are built into every browser this app
 * supports, and the operations needed are "fit inside a box" and "re-encode".
 * An image library is tens of kilobytes for that.
 *
 * WHY IT DOES NOT UPSCALE. `Math.min(1, …)` — a small photo comes back the
 * size it went in. Blowing a 400px picture up to 1600 makes it blurry and
 * bigger, which is both halves of the trade going the wrong way.
 */

export type ShrinkOptions = {
  /** Longest edge in pixels. */
  maxEdge?: number;
  /** JPEG quality, 0 to 1. */
  quality?: number;
};

/** Big enough for Ben to see a knee angle, small enough to store. */
export const DEFAULT_MAX_EDGE = 1400;
export const DEFAULT_QUALITY = 0.72;

/** A JPEG data URL, fitted inside `maxEdge` on its longest side. */
export async function shrinkImage(
  file: Blob,
  { maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY }: ShrinkOptions = {},
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitInside(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no 2d context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  /* Frees the decoded pixels straight away rather than at the next GC. On a
     phone, three of these in a row is the difference between smooth and a
     stutter. Optional because Safari was late to it. */
  bitmap.close?.();

  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * The size a photo becomes. Pure, so the maths can be tested without a canvas.
 *
 * Rounded, because a canvas with a fractional width silently floors it and
 * the last column of pixels goes missing.
 */
export function fitInside(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Roughly how many bytes a data URL holds.
 *
 * Base64 is four characters for every three bytes, so the length over-states
 * the payload by a third. Used for showing a size, not for enforcing a limit,
 * so approximately right is right enough.
 */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return 0;
  const body = dataUrl.length - comma - 1;
  const padding = dataUrl.endsWith("==") ? 2 : dataUrl.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((body * 3) / 4) - padding);
}
