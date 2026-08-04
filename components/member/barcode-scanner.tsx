"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isBarcode } from "@/lib/member/off";
import type { Food } from "@/lib/member/food";

/**
 * POINT THE PHONE AT THE PACKET.
 *
 * Uses the browser's own `BarcodeDetector`, which is native on Android Chrome
 * and Safari 17+ — the two browsers this actually runs in. No scanning library
 * is bundled: the polyfills for this are 300kB of WebAssembly, which is a
 * ruinous thing to ship to somebody standing in a supermarket on 4G for a
 * feature they may never open.
 *
 * WHERE IT IS NOT SUPPORTED, IT SAYS SO AND OFFERS THE KEYPAD.
 * Every barcode on a shelf is printed underneath in digits. Typing thirteen
 * numbers is worse than pointing a camera and considerably better than not
 * being able to log the thing at all, and it is the same lookup either way.
 *
 * THE CAMERA IS STOPPED THE MOMENT THIS UNMOUNTS. A component that leaves the
 * torch-adjacent camera light on after the sheet closes is the sort of thing
 * people uninstall an app over.
 */

type Detected = { rawValue: string };
type DetectorLike = { detect: (source: CanvasImageSource) => Promise<Detected[]> };
type WithDetector = typeof globalThis & {
  BarcodeDetector?: new (opts?: { formats?: string[] }) => DetectorLike;
};

type Status = "idle" | "starting" | "scanning" | "looking-up" | "denied" | "unsupported";

export function BarcodeScanner({
  onFound,
  onClose,
}: {
  onFound: (food: Food) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const loop = useRef<number | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [manual, setManual] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (loop.current) window.clearTimeout(loop.current);
    loop.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  /** Ask the server, then hand back a real food or say we do not have it. */
  const lookup = useCallback(
    async (code: string) => {
      setStatus("looking-up");
      setMessage(null);
      try {
        const res = await fetch(`/api/member/food/barcode?code=${encodeURIComponent(code)}`);
        const body = (await res.json()) as { food: Food | null };
        if (body.food) {
          stop();
          onFound(body.food);
          return;
        }
        /* "We do not have this one" is a real answer and has to read as one.
           An empty sheet would look like the scanner had failed. */
        setMessage(
          `No nutrition on file for ${code}. Search for it by name, or add it by hand.`,
        );
      } catch {
        setMessage("Could not reach the food database. Try again in a moment.");
      }
      setStatus("scanning");
    },
    [onFound, stop],
  );

  useEffect(() => {
    const Detector = (globalThis as WithDetector).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;
    setStatus("starting");

    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          // The back camera, and a resolution that can actually resolve the
          // bars. `ideal` rather than `exact` so a laptop webcam still works.
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        });
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = media;
        if (video.current) {
          video.current.srcObject = media;
          await video.current.play().catch(() => {});
        }
        setStatus("scanning");

        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
        });

        const tick = async () => {
          if (cancelled || !video.current || video.current.readyState < 2) {
            loop.current = window.setTimeout(tick, 300);
            return;
          }
          try {
            const hits = await detector.detect(video.current);
            const code = hits.map((h) => h.rawValue).find((v) => isBarcode(v));
            if (code) {
              await lookup(code);
              // Pause before resuming so one packet does not fire repeatedly.
              loop.current = window.setTimeout(tick, 1500);
              return;
            }
          } catch {
            /* A frame that cannot be decoded is the normal case, not an
               error. Keep going. */
          }
          loop.current = window.setTimeout(tick, 300);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        setStatus((err as Error)?.name === "NotAllowedError" ? "denied" : "unsupported");
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [lookup, stop]);

  const canScan = status === "starting" || status === "scanning" || status === "looking-up";

  return (
    <div className="scanner">
      <div className="scanner__head">
        <p className="scanner__title">Scan a barcode</p>
        <button type="button" className="addfood__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      {canScan ? (
        <div className="scanner__stage">
          <video ref={video} className="scanner__video" muted playsInline />
          {/* A window over the middle of the frame. It is guidance, not a
              crop: the detector reads the whole frame. */}
          <div className="scanner__reticle" aria-hidden />
          <p className="scanner__hint" role="status">
            {status === "starting"
              ? "Starting the camera…"
              : status === "looking-up"
                ? "Looking it up…"
                : "Hold the barcode inside the box."}
          </p>
        </div>
      ) : null}

      {status === "denied" ? (
        <p className="scanner__note">
          The camera is blocked for this site. You can allow it in your browser
          settings, or type the numbers under the barcode below.
        </p>
      ) : null}

      {status === "unsupported" ? (
        <p className="scanner__note">
          This browser cannot scan barcodes. Type the numbers printed under the
          barcode instead — it is the same lookup.
        </p>
      ) : null}

      {message ? (
        <p className="scanner__note" role="status">
          {message}
        </p>
      ) : null}

      {/* Always present, not just as a fallback. Some packets are creased,
          some kitchens are dark, and the digits always work. */}
      <form
        className="scanner__manual"
        onSubmit={(e) => {
          e.preventDefault();
          const code = manual.replace(/\D/g, "");
          if (isBarcode(code)) void lookup(code);
          else setMessage("That is not a barcode — they are 8, 12 or 13 digits.");
        }}
      >
        <label className="sr-only" htmlFor="scanner-manual">
          Barcode number
        </label>
        <input
          id="scanner-manual"
          className="addfood__search"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Or type the barcode number"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
        />
        <button type="submit" className="addfood__commit">
          Look it up
        </button>
      </form>
    </div>
  );
}
